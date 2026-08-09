#!/usr/bin/env python3
"""Stream-verify a private Replay Vault import package against a trusted root."""
from __future__ import annotations
import argparse, csv, hashlib, io, json, os, re, stat
from collections import Counter
from pathlib import Path
from typing import Any, Iterator
from urllib.parse import urlparse
from replay_vault_foundation import canonical_json, read_bounded_bytes, sha256_bytes, stable_manifest_contract

DEFAULT_PACKAGE = Path.home() / "Dropbox" / "Becoming Boss Mastermind Vault Migration" / "App Import"
MAX_JSON_BYTES = 64 * 1024 * 1024
MAX_SUMMARY_BYTES = 1024 * 1024
MAX_CSV_BYTES = 64 * 1024 * 1024
MAX_CSV_FIELD_BYTES = 4 * 1024 * 1024
MAX_RESOURCES, MAX_EVIDENCE, MAX_SEGMENTS = 100_000, 500_000, 10_000_000
REQUIRED_FILES = {"vault_resources.csv", "vault_source_evidence.csv", "vault_transcript_segments.csv", "vault_private_media_manifest.json", "vault_import_upsert.sql", "vault_import_summary.json", "vault_import_summary.md"}

class VerificationError(ValueError): pass

def require(condition: bool, message: str) -> None:
    if not condition: raise VerificationError(message)

def private_regular(path: Path) -> None:
    require(not path.is_symlink(), f"symlink package file rejected: {path.name}")
    info = path.stat(follow_symlinks=False)
    require(stat.S_ISREG(info.st_mode), f"non-regular package file: {path.name}")
    require(stat.S_IMODE(info.st_mode) == 0o600, f"private package file must be mode 0600: {path.name}")

def _open_bounded_text(path: Path, limit: int):
    private_regular(path)
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
    try: fd = os.open(path, flags)
    except OSError as error: raise VerificationError(f"unsafe input: {path.name}") from error
    info = os.fstat(fd)
    if not stat.S_ISREG(info.st_mode) or info.st_size > limit:
        os.close(fd); raise VerificationError(f"input byte bound exceeded: {path.name}")
    return io.TextIOWrapper(os.fdopen(fd, "rb", closefd=True), encoding="utf-8", newline="")

def iter_csv(path: Path, maximum: int) -> Iterator[dict[str, str]]:
    old_limit = csv.field_size_limit()
    csv.field_size_limit(MAX_CSV_FIELD_BYTES)
    try:
        with _open_bounded_text(path, MAX_CSV_BYTES) as handle:
            reader = csv.DictReader(handle)
            require(reader.fieldnames is not None, f"CSV header missing: {path.name}")
            for count, row in enumerate(reader, 1):
                require(count <= maximum, f"CSV row bound exceeded: {path.name}")
                yield row
    except (UnicodeDecodeError, csv.Error) as error:
        raise VerificationError(f"invalid bounded CSV: {path.name}") from error
    finally: csv.field_size_limit(old_limit)

def iter_json_array(path: Path, maximum: int = MAX_RESOURCES) -> Iterator[dict[str, Any]]:
    """Incrementally decode one bounded top-level JSON array."""
    decoder, buffer, position, eof = json.JSONDecoder(), "", 0, False
    with _open_bounded_text(path, MAX_JSON_BYTES) as handle:
        def fill() -> None:
            nonlocal buffer, position, eof
            if position: buffer, position = buffer[position:], 0
            chunk = handle.read(64 * 1024)
            if chunk: buffer += chunk
            else: eof = True
        fill()
        while True:
            while position < len(buffer) and buffer[position].isspace(): position += 1
            if position < len(buffer): break
            if eof: raise VerificationError(f"invalid bounded JSON array: {path.name}")
            fill()
        require(buffer[position] == "[", f"JSON record array required: {path.name}"); position += 1
        count, expect_value = 0, True
        while True:
            while True:
                while position < len(buffer) and buffer[position].isspace(): position += 1
                if position < len(buffer) or eof: break
                fill()
            if position < len(buffer) and buffer[position] == "]":
                position += 1; break
            if not expect_value:
                require(position < len(buffer) and buffer[position] == ",", f"invalid JSON array separator: {path.name}")
                position += 1
            while True:
                try: value, end = decoder.raw_decode(buffer, position); break
                except json.JSONDecodeError as error:
                    if eof: raise VerificationError(f"invalid bounded JSON: {path.name}") from error
                    fill()
            position = end; count += 1
            require(count <= maximum, f"JSON row bound exceeded: {path.name}")
            require(isinstance(value, dict), f"manifest row must be object: {path.name}")
            yield value; expect_value = False
        while True:
            if any(not ch.isspace() for ch in buffer[position:]): raise VerificationError(f"trailing JSON data: {path.name}")
            if eof: break
            fill()

def load_json(path: Path, *, limit: int = MAX_SUMMARY_BYTES):
    private_regular(path)
    try: return json.loads(read_bounded_bytes(path, limit=limit))
    except (UnicodeDecodeError, json.JSONDecodeError) as error: raise VerificationError(f"invalid bounded JSON: {path.name}") from error

def safe_dropbox_path(value: str) -> bool:
    if not value.startswith("/") or "\\" in value or "://" in value or "\x00" in value: return False
    parts = value.split("/")[1:]
    return bool(parts) and not any(part in {"", ".", ".."} for part in parts) and parts[0].lower() not in {"users", "volumes", "private", "etc", "var", "tmp", "home"}

def _hash_array(digest, rows) -> None:
    digest.update(b"["); first = True
    for row in rows:
        if not first: digest.update(b",")
        digest.update(canonical_json(row)); first = False
    digest.update(b"]")

def semantic_hash(package_dir: Path, segment_count: int) -> str:
    digest = hashlib.sha256(); digest.update(b'{"evidence":')
    _hash_array(digest, iter_csv(package_dir / "vault_source_evidence.csv", MAX_EVIDENCE))
    digest.update(b',"private_manifest":')
    _hash_array(digest, (stable_manifest_contract(row) for row in iter_json_array(package_dir / "vault_private_media_manifest.json")))
    digest.update(b',"resources":')
    _hash_array(digest, iter_csv(package_dir / "vault_resources.csv", MAX_RESOURCES))
    digest.update(b',"schema_version":2,"transcript_segment_count":')
    digest.update(str(segment_count).encode("ascii")); digest.update(b"}")
    return digest.hexdigest()

def verify(package_dir: Path, minimum: int, expected_semantic_content_sha256: str) -> dict[str, object]:
    require(re.fullmatch(r"[0-9a-f]{64}", expected_semantic_content_sha256 or "") is not None, "trusted expected semantic root is required")
    require(not package_dir.is_symlink(), "symlink package directory rejected")
    missing = sorted(name for name in REQUIRED_FILES if not (package_dir / name).exists()); require(not missing, f"missing package files: {missing}")
    for name in REQUIRED_FILES: private_regular(package_dir / name)
    summary = load_json(package_dir / "vault_import_summary.json"); require(isinstance(summary, dict), "summary must be an object")
    resource_ids: set[str] = set(); resource_types: Counter[str] = Counter(); resource_count = 0
    for row in iter_csv(package_dir / "vault_resources.csv", MAX_RESOURCES):
        resource_count += 1; rid = row.get("portal_resource_id", "")
        require(rid not in resource_ids, "duplicate portal resource IDs"); resource_ids.add(rid)
        require(rid.startswith("membershipio:"), "unexpected resource ID namespace")
        require(row.get("access_scope") == "replay_vault", "non-Vault access scope in Vault package")
        require(row.get("member_visible_default") == "false", "Vault import must stay hidden by default")
        require(row.get("portal_path", "").startswith("/mastermind/replay-vault?video="), "invalid Vault route")
        require(row.get("resource_type") in {"video", "audio"}, "unexpected resource type")
        require(row.get("ingestion_status") != "ready_for_search", "caption evidence cannot be search-ready")
        require(row.get("transcript_evidence") != "yes", "caption evidence cannot claim canonical transcript")
        resource_types[row["resource_type"]] += 1
    require(resource_count >= minimum, f"resource inventory shrank: {resource_count} < {minimum}")
    require(summary.get("unique_resource_count") == resource_count, "summary resource count mismatch")
    manifest_ids: set[str] = set(); manifest_count = 0
    for row in iter_json_array(package_dir / "vault_private_media_manifest.json"):
        manifest_count += 1; rid = str(row.get("portal_resource_id") or "")
        require(bool(rid), "manifest portal_resource_id missing")
        require(rid not in manifest_ids, "duplicate manifest portal resource IDs"); manifest_ids.add(rid)
        require(rid in resource_ids, "foreign manifest portal resource ID")
    require(manifest_count == resource_count, "resource/private-manifest count mismatch")
    require(manifest_ids == resource_ids, "manifest/resource IDs must be exactly one-to-one")
    fingerprints: set[tuple[str, str]] = set(); inventory_count = playback_needs_review = evidence_count = 0
    for row in iter_csv(package_dir / "vault_source_evidence.csv", MAX_EVIDENCE):
        evidence_count += 1; rid = row.get("portal_resource_id", ""); require(rid in resource_ids, "orphan source evidence")
        fingerprint = (rid, row.get("source_fingerprint", "")); require(fingerprint not in fingerprints, "duplicate source-evidence fingerprints"); fingerprints.add(fingerprint)
        require(row.get("transcript_source") in {"", "migration_caption_evidence"}, "VTT must remain migration_caption_evidence until CRDB authority is linked")
        if row.get("source_system") == "membershipio_inventory":
            inventory_count += 1; require(row.get("review_status") == "blocked", "Membership.io HLS must never be approved playback"); require(not row.get("dropbox_path"), "inventory rows must not masquerade as Dropbox playback")
            url = row.get("source_url", "")
            if url:
                parsed = urlparse(url); require(parsed.scheme == "https" and parsed.hostname in {"app.membership.io", "membership.io"}, f"unexpected private source host: {parsed.hostname or ''}")
        if row.get("source_system") == "portal_playback_source":
            require(row.get("review_status") in {"needs_review", "blocked"}, "offline inventory cannot approve playback")
            require(safe_dropbox_path(row.get("dropbox_path", "")), "unsafe or host-local Dropbox path"); playback_needs_review += row.get("review_status") == "needs_review"
    require(inventory_count == resource_count, "each Vault resource needs one Membership.io inventory row")
    segment_count = 0; last_index: dict[str,int] = {}; last_end: dict[str,int] = {}; resources_with_segments: set[str] = set()
    for row in iter_csv(package_dir / "vault_transcript_segments.csv", MAX_SEGMENTS):
        segment_count += 1; rid = row.get("portal_resource_id", ""); require(rid in resource_ids, "orphan transcript segment")
        try: index, start, end = int(row.get("segment_index", "")), int(row.get("starts_at_ms", "")), int(row.get("ends_at_ms", ""))
        except ValueError as error: raise VerificationError("non-integer transcript cue") from error
        require(index == last_index.get(rid, -1) + 1, f"non-contiguous cue indices: {rid}"); require(start >= 0 and end > start, "invalid transcript cue timestamps"); require(start >= last_end.get(rid, 0), "overlapping transcript cues"); require(bool(row.get("transcript_text", "").strip()), "empty transcript cue")
        last_index[rid], last_end[rid] = index, end; resources_with_segments.add(rid)
    require(summary.get("transcript_segment_count") == segment_count, "summary segment count mismatch")
    sql = read_bounded_bytes(package_dir / "vault_import_upsert.sql", limit=4*1024*1024).decode(); lower = sql.lower(); executable = "\n".join(line for line in lower.splitlines() if not line.lstrip().startswith("--"))
    require("begin;" in executable and "commit;" in executable, "import SQL is not transactional"); require("on conflict" in executable, "metadata import SQL is not idempotent")
    require("insert into public.mastermind_portal_transcript_segments" not in executable and "insert into public.replay_transcript_segments" not in executable, "caption evidence cannot enter canonical transcripts")
    require(not any(token in executable for token in ("truncate", "delete from", "drop table public.")), "destructive SQL detected")
    require(not re.search(r"\\copy[^\n]+from\s+'/(?:users|volumes|private|tmp|var|home)/", executable), "SQL embeds host absolute path")
    for table in ("mastermind_portal_resources", "mastermind_portal_source_evidence"): require(table in lower, f"import SQL missing {table}")
    computed = semantic_hash(package_dir, segment_count)
    require(summary.get("semantic_content_sha256") == computed, "semantic content hash mismatch")
    require(computed == expected_semantic_content_sha256, "package semantic root does not match trusted invocation root")
    return {"resources": resource_count, "source_evidence": evidence_count, "transcript_segments": segment_count, "resources_with_segments": len(resources_with_segments), "approved_dropbox_playback": 0, "playback_needs_review": playback_needs_review, "caption_statuses": summary.get("caption_status_counts", {}), "match_statuses": summary.get("dropbox_match_status_counts", {}), "resource_types": dict(resource_types), "trusted_semantic_content_sha256": computed}

def main() -> int:
    parser = argparse.ArgumentParser(); parser.add_argument("--package-dir", type=Path, default=DEFAULT_PACKAGE); parser.add_argument("--minimum-resources", type=int, default=2000); parser.add_argument("--allow-smoke", action="store_true"); parser.add_argument("--expected-semantic-content-sha256", required=True, help="trusted producer root supplied out-of-band")
    args = parser.parse_args(); counts = verify(args.package_dir.expanduser(), 1 if args.allow_smoke else args.minimum_resources, args.expected_semantic_content_sha256)
    print(json.dumps(counts, indent=2)); print("Replay Vault import verifier passed"); return 0
if __name__ == "__main__": raise SystemExit(main())
