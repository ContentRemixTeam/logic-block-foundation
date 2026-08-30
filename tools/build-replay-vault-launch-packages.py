#!/usr/bin/env python3
"""Build private, receipted Replay Vault launch packages from verified artifacts.

The output contains private transcript text. It must stay outside the repository
and must only be sent to the service-role import path.
"""

from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
import os
import re
from pathlib import Path
from typing import Any, Iterator


EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PRIVATE_SENTINEL_RE = re.compile(r"PRIVATE_SENTINEL", re.I)
HEX64_RE = re.compile(r"^[0-9a-f]{64}$")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def load_csv_by_id(path: Path) -> dict[str, dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        rows = list(csv.DictReader(handle))
    result: dict[str, dict[str, str]] = {}
    for row in rows:
        portal_id = row.get("portal_resource_id", "").strip()
        if not portal_id or portal_id in result:
            raise ValueError(f"missing or duplicate portal_resource_id in {path.name}: {portal_id!r}")
        result[portal_id] = row
    return result


def transcript_groups(paths: list[Path]) -> Iterator[tuple[str, list[dict[str, Any]]]]:
    current_id = ""
    current: list[dict[str, Any]] = []
    seen: set[str] = set()
    for path in paths:
        with path.open(newline="", encoding="utf-8-sig") as handle:
            for row in csv.DictReader(handle):
                portal_id = row["portal_resource_id"].strip()
                if current_id and portal_id != current_id:
                    if current_id in seen:
                        raise ValueError(f"non-contiguous transcript resource: {current_id}")
                    seen.add(current_id)
                    yield current_id, current
                    current = []
                current_id = portal_id
                text = re.sub(r"\s+", " ", row["transcript_text"].strip())
                current.append(
                    {
                        "index": int(row["segment_index"]),
                        "start_ms": int(row["starts_at_ms"]),
                        "end_ms": int(row["ends_at_ms"]),
                        "text": text,
                    }
                )
    if current_id:
        if current_id in seen:
            raise ValueError(f"non-contiguous transcript resource: {current_id}")
        yield current_id, current


def require_hash(value: str, label: str) -> str:
    value = value.strip().lower()
    if not HEX64_RE.fullmatch(value):
        raise ValueError(f"invalid {label}")
    return value


def batch_hash(records: list[dict[str, Any]]) -> str:
    identities = sorted(
        f"{r['metadata']['portal_resource_id']}|{r['package']['media']['byte_sha256']}"
        for r in records
    )
    return hashlib.sha256("\n".join(identities).encode()).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--max-records", type=int, default=10)
    parser.add_argument("--max-uncompressed-mb", type=int, default=16)
    args = parser.parse_args()

    source = args.source_dir.resolve()
    output = args.output_dir.resolve()
    output.mkdir(parents=True, exist_ok=True)
    os.chmod(output, 0o700)

    receipt_path = source / "launch-batch-receipt.json"
    receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    expected_hashes = receipt["output_hashes"]
    required_hashes = {
        "vault_resources.filtered.csv": expected_hashes["resources"],
        "vault_media_migration_checkpoint.filtered.json": expected_hashes["checkpoint"],
        "excluded-by-faith-2026-08-30.csv": expected_hashes["excluded"],
        "transcript-repair-queue.csv": expected_hashes["transcript_repair_queue"],
    }
    for name, expected in required_hashes.items():
        actual = sha256_file(source / name)
        if actual != expected:
            raise ValueError(f"source hash mismatch for {name}")
    for chunk in receipt["transcript_chunks"]:
        if sha256_file(source / chunk["name"]) != chunk["sha256"]:
            raise ValueError(f"source hash mismatch for {chunk['name']}")

    resources = load_csv_by_id(source / "vault_resources.filtered.csv")
    excluded = load_csv_by_id(source / "excluded-by-faith-2026-08-30.csv")
    repairs = load_csv_by_id(source / "transcript-repair-queue.csv")
    checkpoint_doc = json.loads(
        (source / "vault_media_migration_checkpoint.filtered.json").read_text(encoding="utf-8")
    )
    checkpoint = {
        row["portal_resource_id"]: row for row in checkpoint_doc["records"].values()
    }

    expected_resources = int(receipt["importable_searchable_resources"])
    expected_cues = int(receipt["filtered_transcript_rows"])
    if len(resources) != expected_resources or len(checkpoint) != expected_resources:
        raise ValueError("resource/checkpoint count mismatch")
    if set(resources) != set(checkpoint):
        raise ValueError("resource/checkpoint identity mismatch")
    if set(resources) & (set(excluded) | set(repairs)):
        raise ValueError("excluded or repair resource leaked into launch resources")

    transcript_paths = sorted(source.glob("vault_transcript_segments.part-*.filtered.csv"))
    records: list[dict[str, Any]] = []
    batches: list[dict[str, Any]] = []
    total_cues = 0
    seen_resources: set[str] = set()
    exceptions: list[dict[str, Any]] = []
    max_bytes = args.max_uncompressed_mb * 1024 * 1024

    def flush() -> None:
        if not records:
            return
        sequence = len(batches) + 1
        key = f"vault-launch-2026-08-30-{sequence:04d}"
        payload = {"batch_key": key, "batch_sha256": batch_hash(records), "records": list(records)}
        filename = f"{key}.json.gz"
        path = output / filename
        with gzip.open(path, "wt", encoding="utf-8", compresslevel=6) as handle:
            json.dump(payload, handle, ensure_ascii=False, separators=(",", ":"))
        os.chmod(path, 0o600)
        batches.append(
            {
                "batch_key": key,
                "filename": filename,
                "sha256": sha256_file(path),
                "batch_sha256": payload["batch_sha256"],
                "record_count": len(records),
                "cue_count": sum(len(r["package"]["transcript"]["segments"]) for r in records),
                "compressed_bytes": path.stat().st_size,
            }
        )
        records.clear()

    for portal_id, segments in transcript_groups(transcript_paths):
        if portal_id not in resources:
            raise ValueError(f"unexpected transcript resource: {portal_id}")
        if portal_id in seen_resources:
            raise ValueError(f"duplicate transcript resource: {portal_id}")
        seen_resources.add(portal_id)
        meta = resources[portal_id]
        media = checkpoint[portal_id]
        reasons: list[str] = []
        if not segments or [x["index"] for x in segments] != list(range(len(segments))):
            reasons.append("noncontiguous_segments")
        if any(x["start_ms"] < 0 or x["end_ms"] <= x["start_ms"] or not x["text"] for x in segments):
            reasons.append("malformed_segment")
        joined = "\n".join(x["text"] for x in segments)
        if EMAIL_RE.search(joined) or PRIVATE_SENTINEL_RE.search(joined):
            reasons.append("private_pattern")
        duration_ms = round(float(media["duration_seconds"]) * 1000)
        last_ms = segments[-1]["end_ms"] if segments else 0
        tolerance = max(10_000, round(duration_ms * 0.01))
        if abs(duration_ms - last_ms) > tolerance:
            reasons.append("duration_mismatch")
        if media.get("status") != "verified_uploaded" or media.get("full_decode_passed") is not True:
            reasons.append("media_not_verified")
        for field in (
            "byte_sha256",
            "dropbox_content_hash",
            "decode_report_sha256",
            "range_report_sha256",
            "seek_report_sha256",
        ):
            try:
                require_hash(str(media.get(field, "")), field)
            except ValueError:
                reasons.append(f"invalid_{field}")
        if reasons:
            exceptions.append({"portal_resource_id": portal_id, "title": meta["title"], "reasons": reasons})
            continue

        native_id = portal_id.split(":", 1)[-1]
        package = {
            "metadata": {"portal_resource_id": portal_id},
            "package": {
                "source": {
                    "system": "membershipio_vault_migration",
                    "native_id": f"{native_id}:video",
                    "version": receipt["output_hashes"]["resources"],
                    "privacy_flag": "clear",
                    "title": meta["title"],
                    "event_date": meta["replay_date"] or None,
                    "metadata": {
                        "category": meta["category_title"],
                        "launch_batch": "2026-08-30",
                    },
                },
                "media": {
                    "native_id": native_id,
                    "version": media["manifest_sha256"] if "manifest_sha256" in media else checkpoint_doc["source_manifest_sha256"],
                    "size_bytes": int(media["size"]),
                    "duration_ms": duration_ms,
                    "mime_type": "video/mp4",
                    "container": "mp4",
                    "codecs": {},
                    "dropbox_file_id": media["dropbox_file_id"],
                    "dropbox_content_hash": require_hash(media["dropbox_content_hash"], "dropbox_content_hash"),
                    "byte_sha256": require_hash(media["byte_sha256"], "byte_sha256"),
                    "decode_report_sha256": require_hash(media["decode_report_sha256"], "decode_report_sha256"),
                    "range_report_sha256": require_hash(media["range_report_sha256"], "range_report_sha256"),
                    "seek_report_sha256": require_hash(media["seek_report_sha256"], "seek_report_sha256"),
                },
                "transcript": {"segments": segments},
            },
        }
        encoded_size = len(canonical_json(package).encode("utf-8"))
        current_size = sum(len(canonical_json(x).encode("utf-8")) for x in records)
        if records and (len(records) >= args.max_records or current_size + encoded_size > max_bytes):
            flush()
        records.append(package)
        total_cues += len(segments)
    flush()

    exception_path = output / "package-build-exceptions.json"
    exception_path.write_text(canonical_json(exceptions) + "\n", encoding="utf-8")
    os.chmod(exception_path, 0o600)
    manifest = {
        "schema_version": 1,
        "source_receipt_sha256": sha256_file(receipt_path),
        "source_expected_resources": expected_resources,
        "source_expected_cues": expected_cues,
        "packaged_resources": sum(b["record_count"] for b in batches),
        "packaged_cues": total_cues,
        "exception_resources": len(exceptions),
        "excluded_resources": len(excluded),
        "transcript_repair_resources": len(repairs),
        "batches": batches,
        "controls_required": {"launch_state": "disabled", "publication_enabled": False},
    }
    manifest_path = output / "import-manifest.json"
    manifest_path.write_text(canonical_json(manifest) + "\n", encoding="utf-8")
    os.chmod(manifest_path, 0o600)
    print(canonical_json(manifest))


if __name__ == "__main__":
    main()
