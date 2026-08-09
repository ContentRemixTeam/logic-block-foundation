#!/usr/bin/env python3
"""Build a complete immutable transcript-version artifact from offline CRDB fixtures/snapshots."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from replay_vault_foundation import (
    FoundationError,
    NORMALIZER_VERSION,
    parse_vtt_ms,
    require_sha256,
    sha256_bytes,
    stable_id,
    transcript_quality,
    write_json,
)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--metadata", type=Path, required=True, help="resource/source IDs, authority, source version, media duration")
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--segments", type=Path, help="JSON segment array with millisecond cues")
    source.add_argument("--vtt", type=Path, help="VTT evidence/cue source")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    metadata = json.loads(args.metadata.read_text(encoding="utf-8"))
    authority = str(metadata.get("authority") or "")
    if authority not in {"crdb_master", "reviewed_gap_fill", "migration_caption_evidence"}:
        raise FoundationError("invalid transcript authority")
    if authority == "crdb_master" and not metadata.get("source_record_id"):
        raise FoundationError("CRDB authority requires source_record_id")
    if args.vtt:
        raw = args.vtt.read_bytes()
        segments = parse_vtt_ms(raw.decode("utf-8", "replace"))
    else:
        raw = args.segments.read_bytes()
        value = json.loads(raw)
        segments = value.get("segments", value) if isinstance(value, dict) else value
    raw_sha = sha256_bytes(raw)
    if metadata.get("raw_sha256"):
        require_sha256(metadata["raw_sha256"], "raw_sha256")
        if metadata["raw_sha256"] != raw_sha:
            raise FoundationError("raw_sha256 does not match exact input bytes")
    quality = transcript_quality(segments, int(metadata.get("media_duration_ms") or 0))
    version_id = stable_id(
        "transcript-version", metadata["resource_id"], metadata["source_asset_id"],
        metadata["source_record_id"], metadata["source_version"], quality["normalized_sha256"], NORMALIZER_VERSION,
    )
    can_activate = authority in {"crdb_master", "reviewed_gap_fill"} and quality["status"] == "pass"
    artifact = {
        "schema_version": 1,
        "transcript_version": {
            "id": version_id,
            "resource_id": metadata["resource_id"],
            "source_asset_id": metadata["source_asset_id"],
            "authority": authority,
            "source_record_id": metadata["source_record_id"],
            "source_version": metadata["source_version"],
            "raw_sha256": raw_sha,
            "normalized_sha256": quality["normalized_sha256"],
            "normalizer_version": NORMALIZER_VERSION,
            "cue_count": len(segments),
            "text_chars": sum(len(str(row.get("transcript_text") or "")) for row in segments),
            "first_ms": quality["first_ms"],
            "last_ms": quality["last_ms"],
            "coverage_ratio": quality["coverage_ratio"],
            "quality_status": quality["status"],
            "privacy_status": "pending",
            "review_status": "pending",
            "is_active": False,
            "activation_eligible_after_review": can_activate,
        },
        # This array is the complete set for this version. Activation changes a version pointer;
        # it never index-upserts into a prior version, so a shorter correction cannot leave a tail.
        "segments": [{"transcript_version_id": version_id, **row} for row in segments],
        "quality_report": quality,
    }
    write_json(args.output, artifact)
    print(f"version={version_id} cues={len(segments)} authority={authority} quality={quality['status']} active=false")
    return 0 if quality["status"] == "pass" or authority == "migration_caption_evidence" else 2


if __name__ == "__main__":
    raise SystemExit(main())
