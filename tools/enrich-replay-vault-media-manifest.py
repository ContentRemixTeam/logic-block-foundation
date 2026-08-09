#!/usr/bin/env python3
"""Enrich the private Replay Vault manifest with exact Membership.io file metadata.

Reads/writes only the private Dropbox package. It does not download media or write to
Supabase. Credentials come from ~/.hermes/env or process environment.
"""
from __future__ import annotations

import argparse
import csv
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


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--package-dir", type=Path, default=DEFAULT_PACKAGE)
    parser.add_argument("--max-workers", type=int, default=8)
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()

    package_dir = args.package_dir.expanduser().resolve()
    manifest_path = package_dir / "vault_private_media_manifest.json"
    rows: list[dict[str, Any]] = json.loads(manifest_path.read_text(encoding="utf-8"))
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
            for future in as_completed(futures):
                file_hash, detail, status = future.result()
                status_counts[status] += 1
                row = by_hash[file_hash]
                row["detail_status"] = status
                if detail is not None:
                    safe_detail: dict[str, Any] = detail
                    meta = safe_detail.get("meta") if isinstance(safe_detail.get("meta"), dict) else {}
                    media = safe_detail.get("media") if isinstance(safe_detail.get("media"), list) else []
                    media_size = max((safe_int(item.get("size")) for item in media if isinstance(item, dict)), default=0)
                    row["duration_seconds"] = safe_float(meta.get("length"))
                    row["source_size_bytes"] = max(safe_int(safe_detail.get("size")), media_size)
                    row["source_status"] = safe_detail.get("status")
                    row["has_transcription"] = bool(safe_detail.get("has_transcription"))
                processed += 1
                if processed % 100 == 0:
                    print(f"enriched {processed}/{len(target_rows)}", flush=True)

    temporary = manifest_path.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(rows, indent=2, ensure_ascii=False), encoding="utf-8")
    os.chmod(temporary, stat.S_IRUSR | stat.S_IWUSR)
    temporary.replace(manifest_path)

    recovery_rows = [row for row in rows if row.get("dropbox_match_status") != "approved"]
    queue_path = package_dir / "vault_media_recovery_queue.csv"
    fields = [
        "portal_resource_id", "file_hash", "source_id", "title", "collection_name",
        "duration_seconds", "source_size_bytes", "dropbox_match_status",
        "dropbox_match_score", "dropbox_match_reason", "membershipio_source_url",
    ]
    with queue_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(recovery_rows)
    os.chmod(queue_path, stat.S_IRUSR | stat.S_IWUSR)

    def aggregate(group: list[dict[str, Any]]) -> dict[str, Any]:
        total_seconds = sum(safe_float(row.get("duration_seconds")) for row in group)
        total_bytes = sum(safe_int(row.get("source_size_bytes")) for row in group)
        return {
            "files": len(group),
            "hours": round(total_seconds / 3600, 2),
            "bytes": total_bytes,
            "gib": round(total_bytes / (1024 ** 3), 2),
            "missing_duration": sum(safe_float(row.get("duration_seconds")) == 0 for row in group),
            "missing_size": sum(safe_int(row.get("source_size_bytes")) == 0 for row in group),
        }

    summary = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "detail_status_counts": dict(status_counts),
        "all": aggregate(rows),
        "approved_dropbox": aggregate([row for row in rows if row.get("dropbox_match_status") == "approved"]),
        "needs_review": aggregate([row for row in rows if row.get("dropbox_match_status") == "needs_review"]),
        "unmatched": aggregate([row for row in rows if row.get("dropbox_match_status") == "none"]),
        "recovery_queue": aggregate(recovery_rows),
    }
    (package_dir / "vault_media_recovery_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))
    return 0 if not any(key != "saved" for key in status_counts) else 2


if __name__ == "__main__":
    raise SystemExit(main())
