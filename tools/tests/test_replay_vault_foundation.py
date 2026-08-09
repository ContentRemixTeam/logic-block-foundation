from __future__ import annotations

import csv
import hashlib
import hmac
import io
import importlib.util
import json
import os
import stat
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path
from typing import Mapping, Sequence
from unittest import mock

TOOLS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOLS))

from replay_vault_foundation import (  # noqa: E402
    FoundationError, atomic_write_private, build_crdb_crosswalk, canonical_json,
    deterministic_pair, extract_question_candidates, parse_vtt_ms, reconcile_dropbox_receipts,
    review_question_candidate, sha256_bytes, stable_manifest_contract, transcript_digest, transcript_quality, write_json,
)


def digest(value: bytes = b"fixture") -> str:
    return hashlib.sha256(value).hexdigest()


def private(path: Path) -> None:
    os.chmod(path, 0o600)


def write_csv(path: Path, fields: list[str], rows: Sequence[Mapping[str, object]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    private(path)


def load_script(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, TOOLS / filename)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot import {filename}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class TranscriptTests(unittest.TestCase):
    def test_vtt_round_trip_preserves_milliseconds(self) -> None:
        segments = parse_vtt_ms("WEBVTT\n\n00:00:01.234 --> 00:00:02.987\nFaith: Exact cue\n")
        self.assertEqual((segments[0]["starts_at_ms"], segments[0]["ends_at_ms"]), (1234, 2987))
        self.assertEqual(segments[0]["speaker"], "Faith")

    def test_vtt_rejects_malformed_truncated_empty_and_reversed(self) -> None:
        fixtures = [
            "", "WEBVTT\n", "WEBVTT\n\n00:XX:00.000 --> 00:00:01.000\nbad\n",
            "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\n",
            "WEBVTT\n\n00:00:02.000 --> 00:00:01.000\nbad\n",
            "WEBVTT\n\norphan words\n",
            "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nfirst\n00:00:01.000 --> 00:00:02.000\nsecond\n",
        ]
        for value in fixtures:
            with self.subTest(value=value), self.assertRaises(FoundationError):
                parse_vtt_ms(value)

    def test_quality_blocks_empty_overlap_zero_duplicate_url_and_character_split(self) -> None:
        self.assertEqual(transcript_quality([], 0)["status"], "blocked")
        duplicate = [
            {"segment_index": 0, "starts_at_ms": 0, "ends_at_ms": 1000, "transcript_text": "same"},
            {"segment_index": 1, "starts_at_ms": 1000, "ends_at_ms": 2000, "transcript_text": "same"},
        ]
        self.assertEqual(transcript_quality(duplicate, 2000)["status"], "blocked")
        overlap = [
            {"segment_index": 0, "starts_at_ms": 0, "ends_at_ms": 1000, "transcript_text": "one"},
            {"segment_index": 1, "starts_at_ms": 900, "ends_at_ms": 900, "transcript_text": "https://bad.test"},
        ]
        report = transcript_quality(overlap, 1000)
        self.assertTrue({"overlap", "zero_duration", "url_or_email_candidate"}.issubset(report["flags"]))
        char_split = [{"segment_index": i, "starts_at_ms": i * 100, "ends_at_ms": (i + 1) * 100, "transcript_text": ch}
                      for i, ch in enumerate("a b c d e f g h i j k l m n o p q r s t".split())]
        self.assertIn("character_split", transcript_quality(char_split, 2000)["flags"])


class PairingAndCrosswalkTests(unittest.TestCase):
    def setUp(self) -> None:
        self.transcript = {"stable_bridge_id": "stable-1", "title": "Call A", "duration_ms": 100_000,
                           "coverage_ratio": 1.0, "media_type": "video"}

    def test_pairing_fail_closed_rules(self) -> None:
        duplicate = [{"id": "a", "stable_bridge_id": "stable-1"}, {"id": "b", "stable_bridge_id": "stable-1"}]
        self.assertEqual(deterministic_pair(self.transcript, duplicate).reason, "duplicate_exact_stable_bridge")
        title_only = deterministic_pair({**self.transcript, "stable_bridge_id": "missing"},
                                        [{"id": "a", "title": "Call A", "duration_ms": 100_000}])
        self.assertEqual((title_only.decision, title_only.reason), ("candidate", "title_only_never_auto_approves"))
        good = deterministic_pair(self.transcript, [{"id": "a", "stable_bridge_id": "stable-1", "duration_ms": 100_500, "media_type": "video"}])
        self.assertEqual(good.decision, "auto_approved")

    def test_crosswalk_recomputes_source_hash_and_is_semantic(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "source.txt"
            source.write_bytes(b"actual source")
            row = {"source_record_id": "crdb-1", "source_path": str(source), **self.transcript}
            one = build_crdb_crosswalk([row], [], digest(b"run"))
            two = build_crdb_crosswalk([row], [], digest(b"run"))
            self.assertEqual(one, two)
            self.assertEqual(one["records"][0]["transcript_sha256"], digest(b"actual source"))
            semantic = {key: value for key, value in one.items() if key != "semantic_sha256"}
            self.assertEqual(one["semantic_sha256"], sha256_bytes(canonical_json(semantic)))

    def test_crosswalk_rejects_declared_mismatch_duplicate_and_symlink(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "source.txt"
            source.write_bytes(b"actual")
            base = {"source_record_id": "dup", "source_path": str(source), **self.transcript}
            with self.assertRaisesRegex(FoundationError, "duplicate"):
                build_crdb_crosswalk([base, base], [], digest(b"run"))
            with self.assertRaisesRegex(FoundationError, "hash mismatch"):
                build_crdb_crosswalk([{**base, "raw_sha256": digest(b"lie")}], [], digest(b"run"))
            link = Path(tmp) / "link.txt"
            link.symlink_to(source)
            with self.assertRaisesRegex(FoundationError, "symlink"):
                build_crdb_crosswalk([{**base, "source_record_id": "link", "source_path": str(link)}], [], digest(b"run"))


class DropboxReceiptTests(unittest.TestCase):
    secret = b"test-only-runtime-secret-32-bytes-minimum"
    fields = ["portal_resource_id", "file_hash", "title", "dropbox_path", "dropbox_file_id",
              "dropbox_content_hash", "size", "duration_seconds", "completed_at", "receipt_hmac_sha256"]

    def fixture(self, root: Path):
        manifest = root / "manifest.json"
        worker = root / "worker.py"
        item = {"portal_resource_id": "membershipio:file-1", "file_hash": "file-1", "title": "Call",
                "expected_dropbox_path": "/Vault/Call.mp4", "source_size_bytes": 123,
                "duration_seconds": 5, "membershipio_source_url": "https://app.membership.io/file/file-1"}
        manifest.write_text(json.dumps([item]), encoding="utf-8")
        worker.write_text("# worker\n", encoding="utf-8")
        row = {"portal_resource_id": "membershipio:file-1", "file_hash": "file-1", "title": "Call",
               "dropbox_path": "/Vault/Call.mp4", "dropbox_file_id": "id:abc_123",
               "dropbox_content_hash": digest(b"dropbox"), "size": 123, "duration_seconds": 5,
               "completed_at": "2026-08-09T12:00:00Z"}
        row["receipt_hmac_sha256"] = hmac.new(self.secret, canonical_json({key: str(row[key]) for key in sorted(set(self.fields) - {"receipt_hmac_sha256"})}), hashlib.sha256).hexdigest()
        return manifest, worker, row

    def bindings(self, row):
        return {row["portal_resource_id"]: {"provider": "dropbox", "file_hash": row["file_hash"],
                "dropbox_path": row["dropbox_path"], "dropbox_file_id": row["dropbox_file_id"],
                "dropbox_content_hash": row["dropbox_content_hash"], "size": row["size"]}}

    def reconcile(self, manifest, receipts, worker, row, secret=None):
        return reconcile_dropbox_receipts(manifest, receipts, worker, hmac_secret=secret or self.secret,
                                          expected_bindings=self.bindings(row))

    def test_accepts_only_real_active_worker_schema_and_exact_evidence(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            manifest, worker, row = self.fixture(root)
            receipts = root / "receipts.csv"
            write_csv(receipts, self.fields, [row])
            result = self.reconcile(manifest, receipts, worker, row)
            self.assertEqual(result["counts"], {"accepted": 1, "rejected": 0})
            accepted = result["accepted"][0]
            self.assertEqual(accepted["provider"], "dropbox")
            self.assertRegex(result["provenance"]["accepted_receipts"][0]["receipt_sha256"], r"^[0-9a-f]{64}$")

    def test_rejects_foreign_fabricated_path_host_schema_and_duplicates(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            manifest, worker, row = self.fixture(root)
            receipts = root / "receipts.json"
            hostile = {**row, "dropbox_path": "https://evil.test/Call.mp4", "dropbox_file_id": "ARBITRARY",
                       "dropbox_content_hash": "ARBITRARY", "size": 1, "duration_seconds": 999,
                       "source_url": "https://evil.test"}
            receipts.write_text(json.dumps([hostile, hostile]), encoding="utf-8")
            result = self.reconcile(manifest, receipts, worker, row)
            self.assertEqual(result["counts"], {"accepted": 0, "rejected": 2})
            reasons = set().union(*(set(row["reasons"]) for row in result["rejected"]))
            self.assertTrue({"invalid_active_worker_receipt_schema", "invalid_dropbox_path",
                             "invalid_dropbox_file_id", "invalid_dropbox_content_hash",
                             "size_mismatch", "duration_mismatch", "duplicate_receipt_portal_resource_id"}.issubset(reasons))

    def test_attacker_without_secret_cannot_forge_and_field_mutation_fails(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); manifest, worker, row = self.fixture(root); receipts = root / "receipts.csv"
            forged = dict(row)
            forged["receipt_hmac_sha256"] = hmac.new(b"attacker-secret-is-not-the-real-one!!", canonical_json({key: str(forged[key]) for key in sorted(set(self.fields) - {"receipt_hmac_sha256"})}), hashlib.sha256).hexdigest()
            write_csv(receipts, self.fields, [forged])
            result = self.reconcile(manifest, receipts, worker, row)
            self.assertIn("invalid_receipt_hmac", result["rejected"][0]["reasons"])
            altered = dict(row); altered["dropbox_content_hash"] = digest(b"altered")
            write_csv(receipts, self.fields, [altered])
            result = self.reconcile(manifest, receipts, worker, row)
            self.assertIn("invalid_receipt_hmac", result["rejected"][0]["reasons"])

    def test_completed_at_is_provenance_not_semantic_identity(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); manifest, worker, first = self.fixture(root)
            hashes = []
            base_manifest = json.loads(manifest.read_text())
            for index, timestamp in enumerate(("2026-08-09T12:00:00Z", "2026-08-09T12:00:01Z")):
                manifest.write_text(json.dumps([{**base_manifest[0], "created_at": timestamp, "updated_at": timestamp}]))
                row = dict(first); row["completed_at"] = timestamp
                evidence = {key: str(row[key]) for key in sorted(set(self.fields) - {"receipt_hmac_sha256"})}
                row["receipt_hmac_sha256"] = hmac.new(self.secret, canonical_json(evidence), hashlib.sha256).hexdigest()
                receipts = root / f"receipts-{index}.csv"; write_csv(receipts, self.fields, [row])
                hashes.append(self.reconcile(manifest, receipts, worker, row)["semantic_sha256"])
            self.assertEqual(hashes[0], hashes[1])



class PrivateArtifactTests(unittest.TestCase):
    def test_atomic_private_mode_immutable_and_symlink_safe(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            output = root / "private.json"
            write_json(output, {"x": 1})
            self.assertEqual(stat.S_IMODE(output.stat().st_mode), 0o600)
            write_json(output, {"x": 1}, overwrite=False)
            with self.assertRaisesRegex(FoundationError, "different bytes"):
                write_json(output, {"x": 2}, overwrite=False)
            target = root / "target"
            target.write_text("safe", encoding="utf-8")
            link = root / "link"
            link.symlink_to(target)
            with self.assertRaisesRegex(FoundationError, "symlink"):
                atomic_write_private(link, b"hostile")
            ancestor = root / "ancestor"
            ancestor.symlink_to(root)
            with self.assertRaisesRegex(FoundationError, "symlink"):
                atomic_write_private(ancestor / "nested", b"hostile")
            self.assertEqual(target.read_text(), "safe")


class PrivateQuestionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.segments = [
            {"segment_index": 0, "starts_at_ms": 1000, "ends_at_ms": 2500, "speaker": "Member", "transcript_text": "How do I handle my $25,000 debt?"},
            {"segment_index": 1, "starts_at_ms": 2600, "ends_at_ms": 5000, "speaker": "Guest", "transcript_text": "Start with a cash plan."},
        ]
        self.version = {"id": "tv-1", "resource_id": "r-1", "authority": "crdb_master",
                        "normalized_sha256": transcript_digest(self.segments)}

    def test_source_digest_is_recomputed_and_generated_never_publishes(self) -> None:
        self.assertEqual(extract_question_candidates({**self.version, "authority": "migration_caption_evidence"}, self.segments), [])
        with self.assertRaisesRegex(FoundationError, "do not match"):
            extract_question_candidates({**self.version, "normalized_sha256": digest(b"lie")}, self.segments)
        candidate = extract_question_candidates(self.version, self.segments)[0]
        self.assertFalse(candidate["publishable"])
        with self.assertRaisesRegex(FoundationError, "never publish"):
            review_question_candidate(candidate, "published", "editor", "looks good")


class ImporterDeterminismTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.module = load_script("membership_importer", "build-membershipio-replay-vault-import.py")

    def run_fixture(self, output: Path, delays: dict[str, float], timestamp: str = "") -> dict[str, bytes]:
        files = [
            {"hash": "b", "id": 2, "title": "Beta", "content_type": "media", "collection_name": "videos", "position": 2,
             "source_id": "222222222", "length": 2, "created_at": timestamp, "updated_at": timestamp, "source_url": "https://app.membership.io/file/b"},
            {"hash": "a", "id": 1, "title": "Alpha", "content_type": "media", "collection_name": "videos", "position": 1,
             "source_id": "111111111", "length": 2, "created_at": timestamp, "updated_at": timestamp, "source_url": "https://app.membership.io/file/a"},
        ]
        playlist = {"hash": "playlist", "id": 1, "title": "Calls"}
        def caption(_token, url):
            key = url.split("/file/")[1].split("/")[0]
            time.sleep(delays[key])
            return f"WEBVTT\n\n00:00:00.000 --> 00:00:01.000\n{key} first\n\n00:00:01.000 --> 00:00:02.000\n{key} second\n"
        argv = ["importer", "--output-dir", str(output), "--max-workers", "2"]
        with mock.patch.object(sys, "argv", argv), mock.patch.object(self.module, "authenticate", return_value="token"), \
             mock.patch.object(self.module, "fetch_playlists", return_value=[playlist]), \
             mock.patch.object(self.module, "fetch_playlist_files", return_value=(playlist, files)), \
             mock.patch.object(self.module, "request_text", side_effect=caption), \
             mock.patch.object(self.module, "build_local_media_index", return_value=[]):
            self.assertEqual(self.module.main(), 0)
        names = ["vault_resources.csv", "vault_source_evidence.csv", "vault_transcript_segments.csv",
                 "vault_private_media_manifest.json", "vault_import_upsert.sql", "vault_import_summary.json", "vault_import_summary.md"]
        return {name: (output / name).read_bytes() for name in names}

    def test_importer_timestamps_do_not_change_semantic_root(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            one = self.run_fixture(root / "one", {"a": 0, "b": 0}, "2026-08-09T12:00:00Z")
            two = self.run_fixture(root / "two", {"a": 0, "b": 0}, "2026-08-09T12:00:01Z")
            self.assertEqual(json.loads(one["vault_import_summary.json"])["semantic_content_sha256"],
                             json.loads(two["vault_import_summary.json"])["semantic_content_sha256"])

    def test_concurrent_completion_order_is_byte_stable_and_private(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            one = self.run_fixture(root / "one", {"a": 0.02, "b": 0.0})
            two = self.run_fixture(root / "two", {"a": 0.0, "b": 0.02})
            self.assertEqual(one, two)
            for path in (root / "one").iterdir():
                self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600, path.name)
            sql = one["vault_import_upsert.sql"].decode()
            self.assertNotIn(str(root), sql)


class VerifierFixtureTests(unittest.TestCase):
    def make_package(self, root: Path, *, host: str = "app.membership.io", dropbox_path: str = "/Vault/synthetic.mp4",
                     resource_type: str = "video") -> None:
        resources = [{"portal_resource_id": "membershipio:file-1", "product_id": "1", "product_title": "Vault", "category_id": "c",
                      "category_title": "Calls", "lesson_id": "file-1", "title": "Synthetic call", "portal_path": "/mastermind/replay-vault?video=file-1",
                      "resource_type": resource_type, "access_scope": "replay_vault", "member_visible_default": "false", "is_current_replay": "false",
                      "replay_date": "", "available_until": "", "success_paths": "", "stages": "", "search_summary": "Synthetic",
                      "ingestion_status": "blocked_private_source", "transcript_evidence": "partial", "video_source_type": "membershipio_migration_required"}]
        evidence = [
            {"portal_resource_id": "membershipio:file-1", "source_system": "membershipio_inventory", "source_fingerprint": "membershipio:file-1",
             "source_ref": "file-1", "source_url": f"https://{host}/file/file-1", "dropbox_path": "", "transcript_source": "migration_caption_evidence",
             "match_confidence": "exact_file_hash", "match_score": "1.0", "review_status": "blocked", "notes": "{}"},
            {"portal_resource_id": "membershipio:file-1", "source_system": "portal_playback_source", "source_fingerprint": "dropbox:candidate",
             "source_ref": dropbox_path, "source_url": "", "dropbox_path": dropbox_path, "transcript_source": "migration_caption_evidence",
             "match_confidence": "title_only_never_auto_approves", "match_score": "1.0", "review_status": "needs_review", "notes": "fixture"},
        ]
        segments = [{"portal_resource_id": "membershipio:file-1", "segment_index": 0, "starts_at_ms": 1234, "ends_at_ms": 2987,
                     "speaker": "Faith", "transcript_text": "Synthetic exact cue"}]
        manifest = [{"portal_resource_id": "membershipio:file-1"}]
        semantic = {"schema_version": 2, "resources": resources, "evidence": evidence,
                    "private_manifest": [stable_manifest_contract(row) for row in manifest], "transcript_segment_count": 1}
        write_csv(root / "vault_resources.csv", list(resources[0]), resources)
        write_csv(root / "vault_source_evidence.csv", list(evidence[0]), evidence)
        write_csv(root / "vault_transcript_segments.csv", list(segments[0]), segments)
        write_json(root / "vault_private_media_manifest.json", manifest)
        atomic_write_private(root / "vault_import_upsert.sql", b"BEGIN; \\copy x FROM 'vault_resources.csv'; INSERT INTO public.mastermind_portal_resources(portal_resource_id) VALUES ('x') ON CONFLICT DO NOTHING; INSERT INTO public.mastermind_portal_source_evidence(source_fingerprint) VALUES ('x') ON CONFLICT DO NOTHING; COMMIT;")
        write_json(root / "vault_import_summary.json", {"schema_version": 2, "unique_resource_count": 1,
                   "transcript_segment_count": 1, "semantic_content_sha256": sha256_bytes(canonical_json(semantic)),
                   "caption_status_counts": {"saved": 1}, "dropbox_match_status_counts": {"needs_review": 1}})
        atomic_write_private(root / "vault_import_summary.md", b"synthetic")

    def run_verify(self, root: Path, optimized: bool = False):
        command = [sys.executable]
        if optimized:
            command.append("-O")
        expected = json.loads((root / "vault_import_summary.json").read_text())["semantic_content_sha256"]
        command += [str(TOOLS / "verify-replay-vault-import.py"), "--package-dir", str(root), "--allow-smoke",
                    "--expected-semantic-content-sha256", expected]
        return subprocess.run(command, capture_output=True, text=True)

    def test_safe_fixture_passes(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.make_package(root)
            result = self.run_verify(root)
            self.assertEqual(result.returncode, 0, result.stderr + result.stdout)

    def test_python_optimized_still_rejects_bad_package(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.make_package(root, resource_type="pdf")
            normal = self.run_verify(root)
            optimized = self.run_verify(root, optimized=True)
            self.assertNotEqual(normal.returncode, 0)
            self.assertNotEqual(optimized.returncode, 0)
            self.assertIn("unexpected resource type", optimized.stderr)

    def test_rejects_deceptive_host_host_path_mode_and_symlink(self) -> None:
        for host, path in [("evilmembership.io", "/Vault/x.mp4"), ("app.membership.io", "/Users/faith/private.mp4")]:
            with self.subTest(host=host, path=path), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                self.make_package(root, host=host, dropbox_path=path)
                self.assertNotEqual(self.run_verify(root).returncode, 0)
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.make_package(root)
            os.chmod(root / "vault_resources.csv", 0o644)
            self.assertIn("0600", self.run_verify(root).stderr)
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.make_package(root)
            target = root / "target"
            (root / "vault_import_summary.md").replace(target)
            (root / "vault_import_summary.md").symlink_to(target)
            self.assertIn("symlink", self.run_verify(root).stderr)

    def test_rejects_foreign_missing_duplicate_manifest_even_after_self_rehash(self) -> None:
        for ids in (["membershipio:foreign"], [], ["membershipio:file-1", "membershipio:file-1"]):
            with self.subTest(ids=ids), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp); self.make_package(root)
                trusted = json.loads((root / "vault_import_summary.json").read_text())["semantic_content_sha256"]
                manifest = [{"portal_resource_id": rid} for rid in ids]; write_json(root / "vault_private_media_manifest.json", manifest)
                resources = list(csv.DictReader((root / "vault_resources.csv").read_text().splitlines()))
                evidence = list(csv.DictReader((root / "vault_source_evidence.csv").read_text().splitlines()))
                semantic = {"schema_version": 2, "resources": resources, "evidence": evidence,
                            "private_manifest": [stable_manifest_contract(row) for row in manifest], "transcript_segment_count": 1}
                summary = json.loads((root / "vault_import_summary.json").read_text()); summary["semantic_content_sha256"] = sha256_bytes(canonical_json(semantic)); write_json(root / "vault_import_summary.json", summary)
                command = [sys.executable, str(TOOLS / "verify-replay-vault-import.py"), "--package-dir", str(root), "--allow-smoke", "--expected-semantic-content-sha256", trusted]
                self.assertNotEqual(subprocess.run(command, capture_output=True, text=True).returncode, 0)

    def test_verifier_rejects_actual_oversized_csv_before_parsing(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); self.make_package(root); path = root / "vault_resources.csv"
            with path.open("r+b") as handle:
                handle.seek(64 * 1024 * 1024); handle.write(b"x")
            self.assertIn("byte bound", self.run_verify(root).stderr)



class EnricherImmutabilityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.module = load_script("manifest_enricher", "enrich-replay-vault-media-manifest.py")

    def test_network_json_is_byte_bounded_before_materialization(self) -> None:
        oversized = io.BytesIO(b"{" + b"x" * self.module.MAX_NETWORK_JSON_BYTES + b"}")
        with self.assertRaisesRegex(RuntimeError, "exceeds"):
            self.module.read_network_json(oversized)

    def test_enricher_timestamps_do_not_change_source_semantic_hash(self) -> None:
        row = {"portal_resource_id": "membershipio:a", "file_hash": "a", "created_at": "one", "updated_at": "one"}
        first = sha256_bytes(canonical_json(self.module.source_metadata_contract(row)))
        row.update(created_at="two", updated_at="two")
        self.assertEqual(first, sha256_bytes(canonical_json(self.module.source_metadata_contract(row))))

    def test_content_addressed_output_cas_lock_and_no_active_overwrite(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "active.json"
            source.write_text(json.dumps([{"portal_resource_id": "membershipio:a", "file_hash": "a", "title": "A",
                                           "dropbox_match_status": "none", "membershipio_source_url": "https://app.membership.io/file/a"}]), encoding="utf-8")
            opening = source.read_bytes()
            source_hash = digest(opening)
            output = root / "versions"
            argv = ["enrich", "--input-manifest", str(source), "--output-dir", str(output),
                    "--expected-input-sha256", source_hash, "--max-workers", "1"]
            detail = {"meta": {"length": 5}, "size": 123, "status": "ready", "has_transcription": True}
            with mock.patch.object(sys, "argv", argv), mock.patch.object(self.module, "authenticate", return_value="token"), \
                 mock.patch.object(self.module, "fetch_detail", return_value=("a", detail, "saved")):
                self.assertEqual(self.module.main(), 0)
            self.assertEqual(source.read_bytes(), opening)
            manifests = list(output.glob("vault_private_media_manifest.*.json"))
            self.assertEqual(len(manifests), 1)
            self.assertEqual(manifests[0].stem.split(".")[-1], digest(manifests[0].read_bytes()))
            self.assertEqual(stat.S_IMODE(manifests[0].stat().st_mode), 0o600)
            lock = output / ".replay-vault-enrich.lock"
            lock.write_text("busy", encoding="utf-8")
            with mock.patch.object(sys, "argv", argv), self.assertRaisesRegex(RuntimeError, "holds the lock"):
                self.module.main()
            lock.unlink()
            bad_argv = [*argv[:-3], digest(b"wrong"), "--max-workers", "1"]
            with mock.patch.object(sys, "argv", bad_argv), self.assertRaisesRegex(RuntimeError, "CAS mismatch"):
                self.module.main()


if __name__ == "__main__":
    unittest.main()
