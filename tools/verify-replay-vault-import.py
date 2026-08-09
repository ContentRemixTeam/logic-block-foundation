#!/usr/bin/env python3
"""Verify a generated private Replay Vault import package without exposing sources."""
from __future__ import annotations

import argparse
import csv
import json
import os
import re
import stat
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

from replay_vault_foundation import canonical_json, read_bounded_bytes, sha256_bytes

DEFAULT_PACKAGE = Path.home() / "Dropbox" / "Becoming Boss Mastermind Vault Migration" / "App Import"
MAX_JSON_BYTES = 64 * 1024 * 1024
MAX_RESOURCES = 100_000
MAX_EVIDENCE = 500_000
MAX_SEGMENTS = 10_000_000
REQUIRED_FILES = {
    "vault_resources.csv", "vault_source_evidence.csv", "vault_transcript_segments.csv",
    "vault_private_media_manifest.json", "vault_import_upsert.sql", "vault_import_summary.json",
    "vault_import_summary.md",
}


class VerificationError(ValueError):
    pass


def require(condition: bool, message: str) -> None:
    if not condition:
        raise VerificationError(message)


def private_regular(path: Path) -> None:
    require(not path.is_symlink(), f"symlink package file rejected: {path.name}")
    info = path.stat(follow_symlinks=False)
    require(stat.S_ISREG(info.st_mode), f"non-regular package file: {path.name}")
    require(stat.S_IMODE(info.st_mode) == 0o600, f"private package file must be mode 0600: {path.name}")


def iter_csv(path: Path, maximum: int):
    private_regular(path)
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        require(reader.fieldnames is not None, f"CSV header missing: {path.name}")
        for count, row in enumerate(reader, 1):
            require(count <= maximum, f"CSV row bound exceeded: {path.name}")
            yield row


def safe_dropbox_path(value: str) -> bool:
    if not value.startswith("/") or "\\" in value or "://" in value or "\x00" in value:
        return False
    parts = value.split("/")[1:]
    if not parts or any(part in {"", ".", ".."} for part in parts):
        return False
    if parts[0].lower() in {"users", "volumes", "private", "etc", "var", "tmp", "home"}:
        return False
    return True


def load_json(path: Path):
    private_regular(path)
    try:
        return json.loads(read_bounded_bytes(path, limit=MAX_JSON_BYTES))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise VerificationError(f"invalid bounded JSON: {path.name}") from error


def verify(package_dir: Path, minimum: int) -> dict[str, object]:
    require(not package_dir.is_symlink(), "symlink package directory rejected")
    missing = sorted(name for name in REQUIRED_FILES if not (package_dir / name).exists())
    require(not missing, f"missing package files: {missing}")
    for name in REQUIRED_FILES:
        private_regular(package_dir / name)

    resources = list(iter_csv(package_dir / "vault_resources.csv", MAX_RESOURCES))
    summary = load_json(package_dir / "vault_import_summary.json")
    private_manifest = load_json(package_dir / "vault_private_media_manifest.json")
    require(isinstance(summary, dict), "summary must be an object")
    require(isinstance(private_manifest, list) and all(isinstance(row, dict) for row in private_manifest), "manifest must be a record list")
    require(len(resources) >= minimum, f"resource inventory shrank: {len(resources)} < {minimum}")
    require(len(resources) == len(private_manifest), "resource/private-manifest count mismatch")
    require(summary.get("unique_resource_count") == len(resources), "summary resource count mismatch")

    resource_ids: set[str] = set()
    for row in resources:
        resource_id = row.get("portal_resource_id", "")
        require(resource_id not in resource_ids, "duplicate portal resource IDs")
        resource_ids.add(resource_id)
        require(resource_id.startswith("membershipio:"), "unexpected resource ID namespace")
        require(row.get("access_scope") == "replay_vault", "non-Vault access scope in Vault package")
        require(row.get("member_visible_default") == "false", "Vault import must stay hidden by default")
        require(row.get("portal_path", "").startswith("/mastermind/replay-vault?video="), "invalid Vault route")
        require(row.get("resource_type") in {"video", "audio"}, "unexpected resource type")
        require(row.get("ingestion_status") != "ready_for_search", "caption evidence cannot be search-ready")
        require(row.get("transcript_evidence") != "yes", "caption evidence cannot claim canonical transcript")

    evidence: list[dict[str, str]] = []
    fingerprints: set[tuple[str, str]] = set()
    inventory_count = 0
    playback_needs_review = 0
    for row in iter_csv(package_dir / "vault_source_evidence.csv", MAX_EVIDENCE):
        evidence.append(row)
        resource_id = row.get("portal_resource_id", "")
        require(resource_id in resource_ids, "orphan source evidence")
        fingerprint = (resource_id, row.get("source_fingerprint", ""))
        require(fingerprint not in fingerprints, "duplicate source-evidence fingerprints")
        fingerprints.add(fingerprint)
        require(row.get("transcript_source") in {"", "migration_caption_evidence"}, "VTT must remain migration_caption_evidence until CRDB authority is linked")
        if row.get("source_system") == "membershipio_inventory":
            inventory_count += 1
            require(row.get("review_status") == "blocked", "Membership.io HLS must never be approved playback")
            require(not row.get("dropbox_path"), "inventory rows must not masquerade as Dropbox playback")
            url = row.get("source_url", "")
            if url:
                parsed = urlparse(url)
                require(parsed.scheme == "https" and parsed.hostname in {"app.membership.io", "membership.io"}, f"unexpected private source host: {parsed.hostname or ''}")
        if row.get("source_system") == "portal_playback_source":
            require(row.get("review_status") in {"needs_review", "blocked"}, "offline inventory cannot approve playback")
            path = row.get("dropbox_path", "")
            require(safe_dropbox_path(path), "unsafe or host-local Dropbox path")
            playback_needs_review += row.get("review_status") == "needs_review"
    require(inventory_count == len(resources), "each Vault resource needs one Membership.io inventory row")

    segment_count = 0
    last_index: dict[str, int] = {}
    last_end: dict[str, int] = {}
    resources_with_segments: set[str] = set()
    for row in iter_csv(package_dir / "vault_transcript_segments.csv", MAX_SEGMENTS):
        segment_count += 1
        resource_id = row.get("portal_resource_id", "")
        require(resource_id in resource_ids, "orphan transcript segment")
        try:
            index = int(row.get("segment_index", ""))
            start = int(row.get("starts_at_ms", ""))
            end = int(row.get("ends_at_ms", ""))
        except ValueError as error:
            raise VerificationError("non-integer transcript cue") from error
        require(index == last_index.get(resource_id, -1) + 1, f"non-contiguous cue indices: {resource_id}")
        require(start >= 0 and end > start, "invalid transcript cue timestamps")
        require(start >= last_end.get(resource_id, 0), "overlapping transcript cues")
        require(bool(row.get("transcript_text", "").strip()), "empty transcript cue")
        last_index[resource_id] = index
        last_end[resource_id] = end
        resources_with_segments.add(resource_id)
    require(summary.get("transcript_segment_count") == segment_count, "summary segment count mismatch")

    sql_path = package_dir / "vault_import_upsert.sql"
    sql = read_bounded_bytes(sql_path, limit=4 * 1024 * 1024).decode("utf-8")
    lowered_sql = sql.lower()
    executable_sql = "\n".join(line for line in lowered_sql.splitlines() if not line.lstrip().startswith("--"))
    require("begin;" in executable_sql and "commit;" in executable_sql, "import SQL is not transactional")
    require("on conflict" in executable_sql, "metadata import SQL is not idempotent")
    require("insert into public.mastermind_portal_transcript_segments" not in executable_sql, "legacy segment index upsert risks stale tails")
    require("insert into public.replay_transcript_segments" not in executable_sql, "caption evidence cannot enter canonical transcript versions")
    require(not any(token in executable_sql for token in ("truncate", "delete from", "drop table public.")), "destructive SQL detected")
    require(not re.search(r"\\copy[^\n]+from\s+'/(?:users|volumes|private|tmp|var|home)/", executable_sql), "SQL embeds host absolute path")
    for table in ("mastermind_portal_resources", "mastermind_portal_source_evidence"):
        require(table in lowered_sql, f"import SQL missing {table}")

    semantic = {"schema_version": 2, "resources": resources, "evidence": evidence,
                "private_manifest": private_manifest, "transcript_segment_count": segment_count}
    require(summary.get("semantic_content_sha256") == sha256_bytes(canonical_json(semantic)), "semantic content hash mismatch")
    return {
        "resources": len(resources), "source_evidence": len(evidence), "transcript_segments": segment_count,
        "resources_with_segments": len(resources_with_segments), "approved_dropbox_playback": 0,
        "playback_needs_review": playback_needs_review, "caption_statuses": summary.get("caption_status_counts", {}),
        "match_statuses": summary.get("dropbox_match_status_counts", {}),
        "resource_types": dict(Counter(row["resource_type"] for row in resources)),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--package-dir", type=Path, default=DEFAULT_PACKAGE)
    parser.add_argument("--minimum-resources", type=int, default=2000)
    parser.add_argument("--allow-smoke", action="store_true")
    args = parser.parse_args()
    package_dir = args.package_dir.expanduser()
    minimum = 1 if args.allow_smoke else args.minimum_resources
    counts = verify(package_dir, minimum)
    print(json.dumps(counts, indent=2))
    print("Replay Vault import verifier passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
