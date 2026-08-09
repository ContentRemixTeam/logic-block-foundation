from __future__ import annotations

import csv
import hashlib
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Mapping, Sequence

TOOLS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOLS))

from replay_vault_foundation import (  # noqa: E402
    FoundationError,
    build_crdb_crosswalk,
    deterministic_pair,
    extract_question_candidates,
    parse_vtt_ms,
    reconcile_dropbox_receipts,
    review_question_candidate,
    sha256_bytes,
    transcript_quality,
)


def digest(value: bytes = b"fixture") -> str:
    return hashlib.sha256(value).hexdigest()


def write_csv(path: Path, fields: list[str], rows: Sequence[Mapping[str, object]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


class TranscriptTests(unittest.TestCase):
    def test_vtt_round_trip_preserves_milliseconds(self) -> None:
        segments = parse_vtt_ms("WEBVTT\n\n00:00:01.234 --> 00:00:02.987\nFaith: Exact cue\n")
        self.assertEqual((segments[0]["starts_at_ms"], segments[0]["ends_at_ms"]), (1234, 2987))
        self.assertEqual(segments[0]["speaker"], "Faith")

    def test_quality_blocks_coverage_character_split_and_duplicate_explosion(self) -> None:
        char_split = [{"segment_index": i, "starts_at_ms": i * 100, "ends_at_ms": (i + 1) * 100, "transcript_text": ch}
                      for i, ch in enumerate("a b c d e f g h i j k l m n o p q r s t".split())]
        char_report = transcript_quality(char_split, 10_000)
        self.assertEqual(char_report["status"], "blocked")
        self.assertIn("character_split", char_report["flags"])
        duplicates = [{"segment_index": i, "starts_at_ms": i * 1000, "ends_at_ms": (i + 1) * 1000, "transcript_text": "same words"}
                      for i in range(6)]
        report = transcript_quality(duplicates, 6000)
        self.assertIn("duplicate_explosion", report["flags"])

    def test_complete_versions_prevent_stale_shorter_tail(self) -> None:
        old = [{"segment_index": i, "starts_at_ms": i * 1000, "ends_at_ms": (i + 1) * 1000, "transcript_text": f"old {i}"} for i in range(5)]
        new = [{"segment_index": i, "starts_at_ms": i * 1000, "ends_at_ms": (i + 1) * 1000, "transcript_text": f"new {i}"} for i in range(3)]
        old_hash = transcript_quality(old, 5000)["normalized_sha256"]
        new_hash = transcript_quality(new, 3000)["normalized_sha256"]
        active_sets = {old_hash: old, new_hash: new}
        active_version = new_hash
        self.assertEqual([row["segment_index"] for row in active_sets[active_version]], [0, 1, 2])
        self.assertNotEqual(old_hash, new_hash)


class PairingTests(unittest.TestCase):
    def setUp(self) -> None:
        self.transcript = {"stable_bridge_id": "stable-1", "title": "Call A", "duration_ms": 100_000, "coverage_ratio": 1.0, "media_type": "video"}

    def test_duplicate_exact_stable_id_quarantines(self) -> None:
        media = [{"id": "a", "stable_bridge_id": "stable-1"}, {"id": "b", "stable_bridge_id": "stable-1"}]
        self.assertEqual(deterministic_pair(self.transcript, media).reason, "duplicate_exact_stable_bridge")

    def test_duplicate_exact_titles_quarantine(self) -> None:
        transcript = {**self.transcript, "stable_bridge_id": "missing"}
        media = [{"id": "a", "title": "Call A"}, {"id": "b", "title": "Call A"}]
        self.assertEqual(deterministic_pair(transcript, media).decision, "quarantined")

    def test_title_only_never_approves(self) -> None:
        transcript = {**self.transcript, "stable_bridge_id": "missing"}
        decision = deterministic_pair(transcript, [{"id": "a", "title": "Call A", "duration_ms": 100_000}])
        self.assertEqual((decision.decision, decision.reason), ("candidate", "title_only_never_auto_approves"))

    def test_unique_stable_bridge_needs_duration_and_coverage(self) -> None:
        good = deterministic_pair(self.transcript, [{"id": "a", "stable_bridge_id": "stable-1", "duration_ms": 100_500, "media_type": "video"}])
        self.assertEqual(good.decision, "auto_approved")
        missing = deterministic_pair({**self.transcript, "coverage_ratio": None}, [{"id": "a", "stable_bridge_id": "stable-1", "duration_ms": 100_000, "media_type": "video"}])
        self.assertEqual(missing.decision, "quarantined")

    def test_crosswalk_is_deterministic_and_unmatched_stays_private(self) -> None:
        crdb = [{"source_record_id": "crdb-1", "raw_sha256": digest(), **self.transcript}]
        run_hash = digest(b"run")
        one = build_crdb_crosswalk(crdb, [], run_hash)
        two = build_crdb_crosswalk(crdb, [], run_hash)
        self.assertEqual(one, two)
        self.assertEqual(one["records"][0]["decision"], "unmatched")
        self.assertEqual(one["records"][0]["transcript_authority"], "crdb_master")


class DropboxReceiptTests(unittest.TestCase):
    def test_reconciler_accepts_exact_hashes_and_rejects_all_stale_bindings(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            manifest = root / "manifest.json"
            worker = root / "worker.py"
            receipts = root / "receipts.json"
            source_hash = digest(b"source")
            manifest.write_text(json.dumps({"records": [
                {"source_native_id": "media-1", "source_metadata_sha256": source_hash},
                {"source_native_id": "media-2", "source_metadata_sha256": digest(b"current-source")},
            ]}), encoding="utf-8")
            worker.write_text("# worker v1\n", encoding="utf-8")
            m_hash = hashlib.sha256(manifest.read_bytes()).hexdigest()
            w_hash = hashlib.sha256(worker.read_bytes()).hexdigest()
            base = {"attempt_id": "attempt-1", "source_native_id": "media-1", "manifest_sha256": m_hash,
                    "run_sha256": m_hash, "worker_sha256": w_hash, "source_metadata_sha256": source_hash,
                    "status": "verified", "dropbox_file_id": "id:1",
                    "dropbox_content_hash": "dbxhash", "size_bytes": 123, "duration_ms": 5000}
            stale = {**base, "attempt_id": "attempt-2", "source_native_id": "media-2", "manifest_sha256": digest(b"stale-m"),
                     "run_sha256": digest(b"stale-run"), "worker_sha256": digest(b"stale-w"),
                     "source_metadata_sha256": digest(b"stale-source")}
            receipts.write_text(json.dumps([base, stale]), encoding="utf-8")
            result = reconcile_dropbox_receipts(manifest, receipts, worker)
            self.assertEqual(result["counts"], {"accepted": 1, "rejected": 1})
            self.assertEqual(set(result["rejected"][0]["reasons"]), {"stale_manifest_sha256", "stale_run_sha256", "stale_worker_sha256", "stale_source_metadata_sha256"})


class PrivateQuestionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.segments = [
            {"segment_index": 0, "starts_at_ms": 1000, "ends_at_ms": 2500, "speaker": "Member", "transcript_text": "How do I handle my $25,000 debt?"},
            {"segment_index": 1, "starts_at_ms": 2600, "ends_at_ms": 5000, "speaker": "Guest Coach", "transcript_text": "Start with a cash plan."},
        ]
        self.version = {"id": "tv-1", "resource_id": "r-1", "authority": "crdb_master", "normalized_sha256": digest(b"transcript")}

    def test_caption_evidence_cannot_generate_questions(self) -> None:
        self.assertEqual(extract_question_candidates({**self.version, "authority": "migration_caption_evidence"}, self.segments), [])

    def test_generated_candidate_is_private_and_cannot_publish(self) -> None:
        candidate = extract_question_candidates(self.version, self.segments)[0]
        self.assertFalse(candidate["publishable"])
        self.assertIn("sensitive_detail_candidate", candidate["sensitivity_findings"])
        with self.assertRaisesRegex(FoundationError, "never publish"):
            review_question_candidate(candidate, "published", "editor", "looks good")

    def test_review_event_is_hash_bound_and_still_not_publishable(self) -> None:
        candidate = extract_question_candidates(self.version, self.segments)[0]
        after, event = review_question_candidate(candidate, "dedupe_pending", "editor", "queue for duplicate review")
        self.assertFalse(after["publishable"])
        self.assertEqual(event["before_sha256"], sha256_bytes(json.dumps(candidate, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()))


class ExistingImporterHardeningTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        path = TOOLS / "build-membershipio-replay-vault-import.py"
        spec = importlib.util.spec_from_file_location("membership_importer", path)
        assert spec and spec.loader
        cls.module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = cls.module
        spec.loader.exec_module(cls.module)

    def media(self, path: str, title: str, size: int = 1):
        return self.module.LocalMedia(Path(path), path, title, "", True, size)

    def test_importer_duplicate_source_id_never_selects_largest(self) -> None:
        small = self.media("/small.mp4", "small", 1)
        large = self.media("/large.mp4", "large", 999)
        selected, state, _, reason = self.module.select_local_match("x", "", "123456789", [small, large], {}, {}, {"123456789": [small, large]})
        self.assertEqual(state, "quarantined")
        self.assertEqual(reason, "duplicate_exact_source_id")
        self.assertIs(selected, small)

    def test_importer_title_similarity_never_approves(self) -> None:
        row = self.media("/call.mp4", "business strategy call")
        _, state, _, _ = self.module.select_local_match("Business strategy call", "", "", [row], {"business strategy call": [row]}, {}, {})
        self.assertEqual(state, "needs_review")

    def test_generated_sql_does_not_import_caption_evidence_segments(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            sql = self.module.build_sql(Path(tmp)).lower()
        self.assertNotIn("insert into public.mastermind_portal_transcript_segments", sql)
        self.assertNotIn("insert into public.replay_transcript_segments", sql)
        self.assertIn("migration_caption_evidence", sql)


class VerifierFixtureTests(unittest.TestCase):
    def make_package(self, root: Path, playback_review: str = "needs_review") -> None:
        resources = [{"portal_resource_id": "membershipio:file-1", "product_id": "1", "product_title": "Vault", "category_id": "c",
                      "category_title": "Calls", "lesson_id": "file-1", "title": "Synthetic call", "portal_path": "/mastermind/replay-vault?video=file-1",
                      "resource_type": "video", "access_scope": "replay_vault", "member_visible_default": "false", "is_current_replay": "false",
                      "replay_date": "", "available_until": "", "success_paths": "", "stages": "", "search_summary": "Synthetic",
                      "ingestion_status": "blocked_private_source", "transcript_evidence": "partial", "video_source_type": "membershipio_migration_required"}]
        evidence = [
            {"portal_resource_id": "membershipio:file-1", "source_system": "membershipio_inventory", "source_fingerprint": "membershipio:file-1",
             "source_ref": "file-1", "source_url": "https://app.membership.io/file/file-1", "dropbox_path": "", "transcript_source": "migration_caption_evidence",
             "match_confidence": "exact_file_hash", "match_score": "1.0", "review_status": "blocked", "notes": "{}"},
            {"portal_resource_id": "membershipio:file-1", "source_system": "portal_playback_source", "source_fingerprint": "dropbox:candidate",
             "source_ref": "/synthetic.mp4", "source_url": "", "dropbox_path": "/synthetic.mp4", "transcript_source": "migration_caption_evidence",
             "match_confidence": "title_only_never_auto_approves", "match_score": "1.0", "review_status": playback_review, "notes": "fixture"},
        ]
        segments = [{"portal_resource_id": "membershipio:file-1", "segment_index": 0, "starts_at_ms": 1234, "ends_at_ms": 2987, "speaker": "Faith", "transcript_text": "Synthetic exact cue"}]
        write_csv(root / "vault_resources.csv", list(resources[0]), resources)
        write_csv(root / "vault_source_evidence.csv", list(evidence[0]), evidence)
        write_csv(root / "vault_transcript_segments.csv", list(segments[0]), segments)
        (root / "vault_private_media_manifest.json").write_text(json.dumps([{"portal_resource_id": "membershipio:file-1"}]), encoding="utf-8")
        (root / "vault_import_upsert.sql").write_text("BEGIN; INSERT INTO public.mastermind_portal_resources(portal_resource_id) VALUES ('x') ON CONFLICT DO NOTHING; INSERT INTO public.mastermind_portal_source_evidence(source_fingerprint) VALUES ('x') ON CONFLICT DO NOTHING; -- migration_caption_evidence only\nCOMMIT;", encoding="utf-8")
        (root / "vault_import_summary.json").write_text(json.dumps({"unique_resource_count": 1, "transcript_segment_count": 1, "caption_status_counts": {"saved": 1}, "dropbox_match_status_counts": {"needs_review": 1}}), encoding="utf-8")
        (root / "vault_import_summary.md").write_text("synthetic", encoding="utf-8")

    def test_safe_fixture_passes_existing_import_verifier(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.make_package(root)
            result = subprocess.run([sys.executable, str(TOOLS / "verify-replay-vault-import.py"), "--package-dir", str(root), "--allow-smoke"], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
            self.assertIn("verifier passed", result.stdout)

    def test_auto_approved_fixture_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.make_package(root, "approved")
            result = subprocess.run([sys.executable, str(TOOLS / "verify-replay-vault-import.py"), "--package-dir", str(root), "--allow-smoke"], capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("offline inventory cannot approve playback", result.stderr)


class SchemaContractTests(unittest.TestCase):
    def test_additive_schema_contains_all_private_foundations(self) -> None:
        sql = (TOOLS.parent / "supabase/migrations/20260809130000_replay_vault_deterministic_ingestion.sql").read_text(encoding="utf-8").lower()
        for table in ["replay_ingestion_runs", "replay_source_assets", "replay_pairing_candidates", "replay_transcript_versions",
                      "replay_transcript_segments", "replay_media_migration_attempts", "replay_question_candidates",
                      "replay_question_clusters", "replay_answers", "replay_editorial_review_events"]:
            self.assertIn(f"create table if not exists public.{table}", sql)
        self.assertIn("migration_caption_evidence", sql)
        self.assertIn("create unique index if not exists replay_transcript_versions_one_active_idx", sql)
        self.assertIn("generated question candidates cannot publish", sql)
        self.assertIn("replay_published_resource_projection", sql)
        self.assertNotIn("drop table", sql)
        self.assertNotIn("truncate", sql)


if __name__ == "__main__":
    unittest.main()
