#!/usr/bin/env python3
"""Enrich the private Replay Vault manifest with exact Membership.io file metadata.

Reads/writes only the private Dropbox package. It does not download media or write to
Supabase. Credentials come from ~/.hermes/env or process environment.
"""
from __future__ import annotations

import argparse
import csv
import contextlib
import hashlib
import io
import json
import os
import stat
import time
import urllib.error
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

from replay_vault_foundation import atomic_write_private, canonical_json, read_bounded_bytes, sha256_bytes, write_json

API_BASE = "https://app.membership.io"
DEFAULT_PACKAGE = Path.home() / "Dropbox" / "Becoming Boss Mastermind Vault Migration" / "App Import"


def load_env() -> None:
    path = Path.home() / ".hermes" / "env"
    if path.exists():
        for raw in path.read_text(encoding="utf-8", errors="ignore").splitlines():
            if "=" not in raw or raw.lstrip().startswith("#"):
                continue
            key, value = raw.strip().split("=", 1)
            os.environ.setdefault(key.removeprefix("export ").strip(), value.strip().strip("\"'"))


def authenticate() -> str:
    load_env()
    email = os.environ.get("MEMBERSHIPIO_EMAIL")
    password = os.environ.get("MEMBERSHIPIO_PASSWORD")
    if not email or not password:
        raise RuntimeError("MEMBERSHIPIO_EMAIL and MEMBERSHIPIO_PASSWORD are required")
    request = urllib.request.Request(
        f"{API_BASE}/api/v2/authenticate-user",
        data=json.dumps({"email": email, "password": password}).encode(),
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        body = json.load(response)
    token = body.get("accessToken") or body.get("token")
    if not token:
        raise RuntimeError("Authentication succeeded without a bearer token")
    return token


def fetch_detail(token: str, file_hash: str, retries: int = 5) -> tuple[str, dict[str, Any] | None, str]:
    url = f"{API_BASE}/api/files/{file_hash}"
    for attempt in range(retries):
        request = urllib.request.Request(
            url,
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json", "User-Agent": "VaultMigration/2.0"},
        )
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                body = json.load(response)
            detail = body.get("data", body) if isinstance(body, dict) else None
            return file_hash, detail if isinstance(detail, dict) else None, "saved"
        except urllib.error.HTTPError as error:
            if error.code in {429, 500, 502, 503, 504} and attempt + 1 < retries:
                time.sleep(2 ** attempt)
                continue
            return file_hash, None, f"http_{error.code}"
        except Exception as error:  # noqa: BLE001
            if attempt + 1 < retries:
                time.sleep(2 ** attempt)
                continue
            return file_hash, None, f"error_{type(error).__name__}"
    return file_hash, None, "failed"


def safe_float(value: Any) -> float:
    try:
        return max(0.0, float(value or 0))
    except (TypeError, ValueError):
        return 0.0


def safe_int(value: Any) -> int:
    try:
        return max(0, int(value or 0))
    except (TypeError, ValueError):
        return 0


def source_metadata_contract(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "portal_resource_id": str(row.get("portal_resource_id") or ""),
        "file_hash": str(row.get("file_hash") or ""),
        "source_id": str(row.get("source_id") or ""),
        "title": str(row.get("title") or ""),
        "collection_name": str(row.get("collection_name") or ""),
        "duration_seconds": safe_float(row.get("duration_seconds") or row.get("duration")),
        "source_size_bytes": safe_int(row.get("source_size_bytes")),
        "source_status": str(row.get("source_status") or ""),
        "has_transcription": bool(row.get("has_transcription")),
        "source_url_fingerprint": sha256_bytes(str(row.get("membershipio_source_url") or "").encode()),
        "created_at": str(row.get("created_at") or ""),
        "updated_at": str(row.get("updated_at") or ""),
        "placements": row.get("placements") if isinstance(row.get("placements"), list) else [],
    }


@contextlib.contextmanager
def exclusive_lock(output_dir: Path):
    output_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    lock = output_dir / ".replay-vault-enrich.lock"
    if lock.is_symlink():
        raise RuntimeError("symlink lock rejected")
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0)
    try:
        fd = os.open(lock, flags, 0o600)
    except FileExistsError as error:
        raise RuntimeError("another enrichment process holds the lock") from error
    try:
        os.close(fd)
        yield
    finally:
        lock.unlink(missing_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-manifest", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--expected-input-sha256", required=True)
    parser.add_argument("--max-workers", type=int, default=8)
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()

    manifest_path = args.input_manifest.expanduser()
    output_dir = args.output_dir.expanduser()
    with exclusive_lock(output_dir):
        opening_bytes = read_bounded_bytes(manifest_path)
        input_manifest_sha256 = sha256_bytes(opening_bytes)
        if input_manifest_sha256 != args.expected_input_sha256:
            raise RuntimeError("input manifest CAS mismatch")
        rows = json.loads(opening_bytes)
        if not isinstance(rows, list) or not all(isinstance(row, dict) for row in rows):
            raise RuntimeError("input manifest must be a JSON record list")
        rows.sort(key=lambda row: str(row.get("portal_resource_id") or row.get("file_hash") or ""))
        keys = [str(row.get("file_hash") or "") for row in rows]
        if not all(keys) or len(keys) != len(set(keys)):
            raise RuntimeError("manifest has missing or duplicate file_hash")
        for row in rows:
            if row.get("dropbox_match_status") == "approved":
                pairing = row.get("pairing_evidence") if isinstance(row.get("pairing_evidence"), dict) else {}
                if not (pairing.get("stable_bridge_exact") and pairing.get("candidate_count") == 1
                        and pairing.get("duration_pass") and pairing.get("coverage_pass")):
                    row["dropbox_match_status"] = "needs_review"
                    row["dropbox_match_reason"] = "legacy_approval_revoked_missing_stable_duration_coverage"
        target_rows = rows[: args.limit] if args.limit > 0 else rows
        token = authenticate()
        status_counts: Counter[str] = Counter()
        by_hash = {str(row["file_hash"]): row for row in rows}
        batch_size = max(8, args.max_workers * 4)
        processed = 0
        for start in range(0, len(target_rows), batch_size):
            batch = target_rows[start : start + batch_size]
            with ThreadPoolExecutor(max_workers=max(1, args.max_workers)) as executor:
                futures = [executor.submit(fetch_detail, token, str(row["file_hash"])) for row in batch]
                completed = sorted((future.result() for future in as_completed(futures)), key=lambda result: result[0])
                for file_hash, detail, status in completed:
                    status_counts[status] += 1
                    row = by_hash[file_hash]
                    row["detail_status"] = status
                    if detail is not None:
                        meta = detail.get("meta") if isinstance(detail.get("meta"), dict) else {}
                        media = detail.get("media") if isinstance(detail.get("media"), list) else []
                        media_size = max((safe_int(item.get("size")) for item in media if isinstance(item, dict)), default=0)
                        row["duration_seconds"] = safe_float(meta.get("length"))
                        row["source_size_bytes"] = max(safe_int(detail.get("size")), media_size)
                        row["source_status"] = detail.get("status")
                        row["has_transcription"] = bool(detail.get("has_transcription"))
                        contract = source_metadata_contract(row)
                        row["source_url_fingerprint"] = contract["source_url_fingerprint"]
                        row["source_metadata_sha256"] = sha256_bytes(canonical_json(contract))
                    processed += 1
                    if processed % 100 == 0:
                        print(f"enriched {processed}/{len(target_rows)}", flush=True)

        if sha256_bytes(read_bounded_bytes(manifest_path)) != input_manifest_sha256:
            raise RuntimeError("input manifest changed during enrichment")
        output_bytes = json.dumps(rows, indent=2, sort_keys=True, ensure_ascii=False).encode("utf-8") + b"\n"
        output_manifest_sha256 = sha256_bytes(output_bytes)
        versioned_manifest = output_dir / f"vault_private_media_manifest.{output_manifest_sha256}.json"
        atomic_write_private(versioned_manifest, output_bytes, overwrite=False)

        recovery_rows = [row for row in rows if row.get("dropbox_match_status") != "approved"]
        fields = ["portal_resource_id", "file_hash", "source_id", "title", "collection_name",
                  "duration_seconds", "source_size_bytes", "dropbox_match_status", "dropbox_match_score",
                  "dropbox_match_reason", "membershipio_source_url", "source_metadata_sha256", "source_url_fingerprint"]
        queue_buffer = io.StringIO(newline="")
        writer = csv.DictWriter(queue_buffer, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(recovery_rows)
        queue_bytes = queue_buffer.getvalue().encode("utf-8")
        queue_sha = sha256_bytes(queue_bytes)
        atomic_write_private(output_dir / f"vault_media_recovery_queue.{queue_sha}.csv", queue_bytes, overwrite=False)

        def aggregate(group: list[dict[str, Any]]) -> dict[str, Any]:
            total_seconds = sum(safe_float(row.get("duration_seconds")) for row in group)
            total_bytes = sum(safe_int(row.get("source_size_bytes")) for row in group)
            return {"files": len(group), "hours": round(total_seconds / 3600, 2), "bytes": total_bytes,
                    "gib": round(total_bytes / (1024 ** 3), 2),
                    "missing_duration": sum(safe_float(row.get("duration_seconds")) == 0 for row in group),
                    "missing_size": sum(safe_int(row.get("source_size_bytes")) == 0 for row in group)}

        summary = {
            "schema_version": 2, "input_manifest_sha256": input_manifest_sha256,
            "output_manifest_sha256": output_manifest_sha256,
            "enricher_sha256": sha256_bytes(read_bounded_bytes(Path(__file__))),
            "recovery_queue_sha256": queue_sha, "detail_status_counts": dict(sorted(status_counts.items())),
            "all": aggregate(rows),
            "approved_dropbox": aggregate([row for row in rows if row.get("dropbox_match_status") == "approved"]),
            "needs_review": aggregate([row for row in rows if row.get("dropbox_match_status") == "needs_review"]),
            "unmatched": aggregate([row for row in rows if row.get("dropbox_match_status") == "none"]),
            "recovery_queue": aggregate(recovery_rows),
        }
        summary_sha = sha256_bytes(canonical_json(summary))
        write_json(output_dir / f"vault_media_recovery_summary.{summary_sha}.json", summary, overwrite=False)
        print(json.dumps(summary, indent=2, sort_keys=True))
        return 0 if not any(key != "saved" for key in status_counts) else 2


if __name__ == "__main__":
    raise SystemExit(main())
