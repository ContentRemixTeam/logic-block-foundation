#!/usr/bin/env python3
"""Verify a generated private Replay Vault import package without exposing sources."""
from __future__ import annotations

import argparse
import csv
import json
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import urlparse

DEFAULT_PACKAGE = Path.home() / "Dropbox" / "Becoming Boss Mastermind Vault Migration" / "App Import"
REQUIRED_FILES = {
    "vault_resources.csv",
    "vault_source_evidence.csv",
    "vault_transcript_segments.csv",
    "vault_private_media_manifest.json",
    "vault_import_upsert.sql",
    "vault_import_summary.json",
    "vault_import_summary.md",
}


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--package-dir", type=Path, default=DEFAULT_PACKAGE)
    parser.add_argument("--minimum-resources", type=int, default=2000)
    parser.add_argument("--allow-smoke", action="store_true")
    args = parser.parse_args()

    package_dir = args.package_dir.expanduser().resolve()
    missing = sorted(name for name in REQUIRED_FILES if not (package_dir / name).exists())
    assert not missing, f"missing package files: {missing}"

    resources = read_csv(package_dir / "vault_resources.csv")
    evidence = read_csv(package_dir / "vault_source_evidence.csv")
    segments = read_csv(package_dir / "vault_transcript_segments.csv")
    summary = json.loads((package_dir / "vault_import_summary.json").read_text(encoding="utf-8"))
    private_manifest = json.loads((package_dir / "vault_private_media_manifest.json").read_text(encoding="utf-8"))
    sql = (package_dir / "vault_import_upsert.sql").read_text(encoding="utf-8")

    minimum = 1 if args.allow_smoke else args.minimum_resources
    assert len(resources) >= minimum, f"resource inventory shrank: {len(resources)} < {minimum}"
    assert len(resources) == len(private_manifest), "resource/private-manifest count mismatch"
    assert summary["unique_resource_count"] == len(resources), "summary resource count mismatch"
    assert summary["transcript_segment_count"] == len(segments), "summary segment count mismatch"

    resource_ids = [row["portal_resource_id"] for row in resources]
    assert len(resource_ids) == len(set(resource_ids)), "duplicate portal resource IDs"
    assert all(value.startswith("membershipio:") for value in resource_ids), "unexpected resource ID namespace"
    assert all(row["access_scope"] == "replay_vault" for row in resources), "non-Vault access scope in Vault package"
    assert all(row["member_visible_default"] == "false" for row in resources), "Vault import must stay hidden by default"
    assert all(row["portal_path"].startswith("/mastermind/replay-vault?video=") for row in resources), "invalid Vault route"
    assert all(row["resource_type"] in {"video", "audio"} for row in resources), "unexpected resource type"

    known_ids = set(resource_ids)
    assert all(row["portal_resource_id"] in known_ids for row in evidence), "orphan source evidence"
    assert all(row["portal_resource_id"] in known_ids for row in segments), "orphan transcript segment"

    fingerprints = [(row["portal_resource_id"], row["source_fingerprint"]) for row in evidence]
    assert len(fingerprints) == len(set(fingerprints)), "duplicate source-evidence fingerprints"

    inventory_rows = [row for row in evidence if row["source_system"] == "membershipio_inventory"]
    playback_rows = [row for row in evidence if row["source_system"] == "portal_playback_source"]
    assert len(inventory_rows) == len(resources), "each Vault resource needs one Membership.io inventory row"
    assert all(row["review_status"] == "blocked" for row in inventory_rows), "Membership.io HLS must never be approved playback"
    assert all(not row["dropbox_path"] for row in inventory_rows), "inventory rows must not masquerade as Dropbox playback"

    approved_playback = [row for row in playback_rows if row["review_status"] == "approved"]
    assert not approved_playback, (
        "offline inventory cannot approve playback: exact stable-ID + duration + coverage + content-bound Dropbox receipt is required"
    )
    assert all(row["review_status"] in {"needs_review", "blocked"} for row in playback_rows), "invalid private playback candidate state"
    assert all(".." not in row["dropbox_path"] for row in playback_rows), "unsafe Dropbox traversal path"
    assert all(row["transcript_source"] in {"", "migration_caption_evidence"} for row in evidence), (
        "VTT must remain migration_caption_evidence until CRDB authority is linked"
    )
    assert all(row["ingestion_status"] != "ready_for_search" for row in resources), "caption evidence cannot be search-ready"
    assert all(row["transcript_evidence"] != "yes" for row in resources), "caption evidence cannot claim canonical transcript"

    for row in inventory_rows:
        url = row["source_url"]
        if url:
            host = urlparse(url).hostname or ""
            assert host.endswith("membership.io"), f"unexpected private source host: {host}"

    by_resource: defaultdict[str, list[dict[str, str]]] = defaultdict(list)
    for row in segments:
        by_resource[row["portal_resource_id"]].append(row)
        assert "starts_at_ms" in row and "ends_at_ms" in row, "millisecond transcript cue columns required"
        start = int(row["starts_at_ms"])
        end = int(row["ends_at_ms"])
        assert start >= 0 and end >= start, "invalid transcript cue timestamps"
        assert row["transcript_text"].strip(), "empty transcript cue"
    for resource_id, rows in by_resource.items():
        indices = sorted(int(row["segment_index"]) for row in rows)
        assert indices == list(range(len(indices))), f"non-contiguous cue indices: {resource_id}"

    lowered_sql = sql.lower()
    executable_sql = "\n".join(
        line for line in lowered_sql.splitlines() if not line.lstrip().startswith("--")
    )
    assert "begin;" in executable_sql and "commit;" in executable_sql, "import SQL is not transactional"
    assert "on conflict" in executable_sql, "metadata import SQL is not idempotent"
    assert "insert into public.mastermind_portal_transcript_segments" not in executable_sql, (
        "legacy segment index upsert risks stale tails and caption-evidence authority"
    )
    assert "insert into public.replay_transcript_segments" not in executable_sql, (
        "Membership.io caption evidence cannot enter canonical transcript versions"
    )
    assert "truncate" not in executable_sql and "delete from" not in executable_sql and "drop table public." not in executable_sql, (
        "destructive SQL detected"
    )
    for table in [
        "mastermind_portal_resources",
        "mastermind_portal_source_evidence",
    ]:
        assert table in lowered_sql, f"import SQL missing {table}"

    counts = {
        "resources": len(resources),
        "source_evidence": len(evidence),
        "transcript_segments": len(segments),
        "resources_with_segments": len(by_resource),
        "approved_dropbox_playback": len(approved_playback),
        "playback_needs_review": sum(row["review_status"] == "needs_review" for row in playback_rows),
        "caption_statuses": summary.get("caption_status_counts", {}),
        "match_statuses": summary.get("dropbox_match_status_counts", {}),
        "resource_types": dict(Counter(row["resource_type"] for row in resources)),
    }
    print(json.dumps(counts, indent=2))
    print("Replay Vault import verifier passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
