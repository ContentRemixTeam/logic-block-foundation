#!/usr/bin/env python3
"""Resumably migrate Membership.io Vault media into private Dropbox storage.

One file at a time: HLS download -> ffprobe -> Dropbox upload session -> Dropbox
content-hash verification -> checkpoint -> delete temporary file. The worker never
creates public shared links. It is safe to resume after interruption.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import shutil
import stat
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DEFAULT_PACKAGE = Path.home() / "Dropbox" / "Becoming Boss Mastermind Vault Migration" / "App Import"
TOKEN_FILE = Path.home() / ".hermes" / "dropbox_token.json"
TARGET_ROOT = "/Becoming Boss Mastermind Vault Migration/App Video Archive"
CHUNK_SIZE = 32 * 1024 * 1024


def sanitize_filename(title: str, file_hash: str) -> str:
    clean = re.sub(r"[\\/:*?\"<>|\x00-\x1f]+", " ", title or "")
    clean = " ".join(clean.split()).strip(" .")[:140] or "Vault replay"
    return f"{file_hash} - {clean}.mp4"


def load_token_data() -> dict[str, Any]:
    return json.loads(TOKEN_FILE.read_text(encoding="utf-8"))


def access_token() -> str:
    data = load_token_data()
    expires_at = float(data.get("expires_at") or 0)
    if not data.get("access_token") or expires_at < time.time() + 300:
        return refresh_token()
    return str(data["access_token"])


def refresh_token() -> str:
    data = load_token_data()
    payload = urllib.parse.urlencode({
        "grant_type": "refresh_token",
        "refresh_token": data["refresh_token"],
        "client_id": data["client_id"],
    }).encode()
    request = urllib.request.Request("https://api.dropbox.com/oauth2/token", data=payload, method="POST")
    with urllib.request.urlopen(request, timeout=30) as response:
        refreshed = json.load(response)
    data["access_token"] = refreshed["access_token"]
    data["expires_at"] = time.time() + int(refreshed.get("expires_in") or 14400)
    temporary = TOKEN_FILE.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(data, indent=2), encoding="utf-8")
    os.chmod(temporary, stat.S_IRUSR | stat.S_IWUSR)
    temporary.replace(TOKEN_FILE)
    return str(data["access_token"])


def decode_http_error(error: urllib.error.HTTPError) -> str:
    try:
        return error.read().decode("utf-8", "replace")[:1000]
    except Exception:
        return str(error)


def dropbox_api(endpoint: str, body: dict[str, Any]) -> dict[str, Any]:
    for attempt in range(3):
        request = urllib.request.Request(
            "https://api.dropboxapi.com/2/" + endpoint,
            data=json.dumps(body).encode(),
            headers={"Authorization": f"Bearer {access_token()}", "Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                payload = response.read().decode()
            return json.loads(payload) if payload else {}
        except urllib.error.HTTPError as error:
            detail = decode_http_error(error)
            if "expired_access_token" in detail and attempt < 2:
                refresh_token()
                continue
            if error.code in {429, 500, 502, 503, 504} and attempt < 2:
                time.sleep(2 ** attempt)
                continue
            raise RuntimeError(f"Dropbox {endpoint} failed ({error.code}): {detail}") from error
    raise RuntimeError(f"Dropbox {endpoint} retry exhausted")


def dropbox_content_api(endpoint: str, body: bytes, arg: dict[str, Any], timeout: int = 900) -> dict[str, Any]:
    for attempt in range(3):
        request = urllib.request.Request(
            "https://content.dropboxapi.com/2/" + endpoint,
            data=body,
            headers={
                "Authorization": f"Bearer {access_token()}",
                "Content-Type": "application/octet-stream",
                "Dropbox-API-Arg": json.dumps(arg, separators=(",", ":")),
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                payload = response.read().decode()
            return {} if payload.strip() in {"", "null"} else json.loads(payload)
        except urllib.error.HTTPError as error:
            detail = decode_http_error(error)
            if "expired_access_token" in detail and attempt < 2:
                refresh_token()
                continue
            if error.code in {429, 500, 502, 503, 504} and attempt < 2:
                time.sleep(2 ** attempt)
                continue
            raise RuntimeError(f"Dropbox {endpoint} failed ({error.code}): {detail}") from error
    raise RuntimeError(f"Dropbox {endpoint} retry exhausted")


def dropbox_content_hash(path: Path) -> str:
    overall = hashlib.sha256()
    with path.open("rb") as handle:
        while True:
            block = handle.read(4 * 1024 * 1024)
            if not block:
                break
            overall.update(hashlib.sha256(block).digest())
    return overall.hexdigest()


def get_remote_metadata(path: str) -> dict[str, Any] | None:
    try:
        return dropbox_api("files/get_metadata", {"path": path, "include_deleted": False})
    except RuntimeError as error:
        if "path/not_found" in str(error):
            return None
        raise


def upload_verified(local_path: Path, destination: str) -> dict[str, Any]:
    local_hash = dropbox_content_hash(local_path)
    existing = get_remote_metadata(destination)
    if existing:
        if existing.get("content_hash") == local_hash and int(existing.get("size") or 0) == local_path.stat().st_size:
            return existing
        raise RuntimeError(f"Dropbox destination exists with different content: {destination}")

    start = dropbox_content_api("files/upload_session/start", b"", {})
    session_id = start.get("session_id")
    if not session_id:
        raise RuntimeError("Dropbox upload session did not return session_id")
    offset = 0
    with local_path.open("rb") as handle:
        while True:
            chunk = handle.read(CHUNK_SIZE)
            if not chunk:
                break
            dropbox_content_api(
                "files/upload_session/append_v2",
                chunk,
                {"cursor": {"session_id": session_id, "offset": offset}},
            )
            offset += len(chunk)
    result = dropbox_content_api(
        "files/upload_session/finish",
        b"",
        {
            "cursor": {"session_id": session_id, "offset": offset},
            "commit": {"path": destination, "mode": "add", "autorename": False, "mute": True},
        },
    )
    if result.get("content_hash") != local_hash:
        raise RuntimeError("Dropbox content hash did not match local media")
    if int(result.get("size") or 0) != local_path.stat().st_size:
        raise RuntimeError("Dropbox size did not match local media")
    return result


def probe_duration(path: Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True,
        text=True,
        timeout=120,
    )
    if result.returncode != 0:
        raise RuntimeError("ffprobe failed: " + result.stderr[-500:])
    try:
        return float(result.stdout.strip())
    except ValueError as error:
        raise RuntimeError("ffprobe returned no duration") from error


def download_hls(source_url: str, destination: Path) -> float:
    result = subprocess.run(
        [
            "ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-stats",
            "-i", source_url, "-map", "0:v?", "-map", "0:a?", "-c", "copy",
            "-movflags", "+faststart", str(destination),
        ],
        capture_output=True,
        text=True,
        timeout=12 * 3600,
    )
    if result.returncode != 0:
        raise RuntimeError("ffmpeg failed: " + result.stderr[-1000:])
    if not destination.exists() or destination.stat().st_size < 50_000:
        raise RuntimeError("downloaded media is missing or implausibly small")
    return probe_duration(destination)


def validate_duration(actual: float, expected: float) -> None:
    if actual <= 0:
        raise RuntimeError("downloaded media has zero duration")
    if expected <= 0:
        return
    tolerance = max(15.0, expected * 0.05)
    if abs(actual - expected) > tolerance:
        raise RuntimeError(f"duration mismatch: expected {expected:.2f}s, got {actual:.2f}s")


def load_checkpoint(path: Path) -> dict[str, dict[str, Any]]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def save_checkpoint(path: Path, checkpoint: dict[str, dict[str, Any]]) -> None:
    temporary = path.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(checkpoint, indent=2, ensure_ascii=False), encoding="utf-8")
    os.chmod(temporary, stat.S_IRUSR | stat.S_IWUSR)
    temporary.replace(path)


def write_receipts(package_dir: Path, checkpoint: dict[str, dict[str, Any]]) -> None:
    receipts_path = package_dir / "vault_media_migration_receipts.csv"
    fields = [
        "portal_resource_id", "file_hash", "title", "dropbox_path", "dropbox_file_id",
        "dropbox_content_hash", "size", "duration_seconds", "completed_at",
    ]
    successful = [row for row in checkpoint.values() if row.get("status") == "verified_uploaded"]
    with receipts_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(sorted(successful, key=lambda row: row["file_hash"]))
    os.chmod(receipts_path, stat.S_IRUSR | stat.S_IWUSR)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--package-dir", type=Path, default=DEFAULT_PACKAGE)
    parser.add_argument("--statuses", default="none,needs_review")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--smallest-first", action="store_true")
    parser.add_argument("--continue-on-error", action="store_true")
    args = parser.parse_args()

    for command in ["ffmpeg", "ffprobe"]:
        if not shutil.which(command):
            raise RuntimeError(f"{command} is required")

    package_dir = args.package_dir.expanduser().resolve()
    manifest_path = package_dir / "vault_private_media_manifest.json"
    manifest: list[dict[str, Any]] = json.loads(manifest_path.read_text(encoding="utf-8"))
    allowed_statuses = {status.strip() for status in args.statuses.split(",") if status.strip()}
    queue = [row for row in manifest if row.get("dropbox_match_status") in allowed_statuses]
    if args.smallest_first:
        queue.sort(key=lambda row: int(row.get("source_size_bytes") or 0))

    checkpoint_path = package_dir / "vault_media_migration_checkpoint.json"
    checkpoint = load_checkpoint(checkpoint_path)
    pending_all = [
        row for row in queue
        if checkpoint.get(str(row["file_hash"]), {}).get("status") != "verified_uploaded"
        and int(checkpoint.get(str(row["file_hash"]), {}).get("attempts") or 0) < 3
    ]
    terminal_failures = sum(
        checkpoint.get(str(row["file_hash"]), {}).get("status") == "failed"
        and int(checkpoint.get(str(row["file_hash"]), {}).get("attempts") or 0) >= 3
        for row in queue
    )
    pending = pending_all[: args.limit] if args.limit > 0 else pending_all
    total_bytes = sum(int(row.get("source_size_bytes") or 0) for row in pending)
    print(json.dumps({
        "selected": len(queue),
        "already_verified": len(queue) - len(pending_all),
        "remaining_total": len(pending_all),
        "terminal_failures": terminal_failures,
        "pending_this_run": len(pending),
        "pending_gib": round(total_bytes / (1024 ** 3), 2),
        "statuses": sorted(allowed_statuses),
        "dry_run": args.dry_run,
    }, indent=2), flush=True)
    if args.dry_run:
        return 0

    failures = 0
    for index, row in enumerate(pending, 1):
        file_hash = str(row["file_hash"])
        title = str(row.get("title") or "Vault replay")
        source_url = str(row.get("membershipio_source_url") or "")
        if not source_url:
            raise RuntimeError(f"Missing Membership.io source URL: {file_hash}")
        destination = TARGET_ROOT + "/" + sanitize_filename(title, file_hash)
        suffix = ".mp4"
        temporary_dir = Path(tempfile.mkdtemp(prefix="vault-media-"))
        local_path = temporary_dir / (file_hash + suffix)
        started = time.time()
        previous_attempts = int(checkpoint.get(file_hash, {}).get("attempts") or 0)
        try:
            print(f"[{index}/{len(pending)}] download {file_hash} {title[:80]}", flush=True)
            actual_duration = download_hls(source_url, local_path)
            validate_duration(actual_duration, float(row.get("duration_seconds") or 0))
            print(f"[{index}/{len(pending)}] upload {local_path.stat().st_size / (1024 ** 3):.2f} GiB", flush=True)
            receipt = upload_verified(local_path, destination)
            checkpoint[file_hash] = {
                "status": "verified_uploaded",
                "portal_resource_id": row["portal_resource_id"],
                "file_hash": file_hash,
                "title": title,
                "dropbox_path": receipt.get("path_display") or destination,
                "dropbox_file_id": receipt.get("id"),
                "dropbox_content_hash": receipt.get("content_hash"),
                "size": int(receipt.get("size") or 0),
                "duration_seconds": round(actual_duration, 3),
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "elapsed_seconds": round(time.time() - started, 2),
                "attempts": previous_attempts + 1,
            }
            save_checkpoint(checkpoint_path, checkpoint)
            write_receipts(package_dir, checkpoint)
            print(f"[{index}/{len(pending)}] VERIFIED {destination}", flush=True)
        except Exception as error:  # noqa: BLE001
            failures += 1
            checkpoint[file_hash] = {
                "status": "failed",
                "portal_resource_id": row["portal_resource_id"],
                "file_hash": file_hash,
                "title": title,
                "error": str(error)[:1200],
                "failed_at": datetime.now(timezone.utc).isoformat(),
                "attempts": previous_attempts + 1,
            }
            save_checkpoint(checkpoint_path, checkpoint)
            print(f"[{index}/{len(pending)}] FAILED {file_hash}: {error}", flush=True)
            if not args.continue_on_error:
                return 1
        finally:
            shutil.rmtree(temporary_dir, ignore_errors=True)

    write_receipts(package_dir, checkpoint)
    completed = sum(row.get("status") == "verified_uploaded" for row in checkpoint.values())
    print(json.dumps({"verified_uploaded": completed, "failures_this_run": failures}, indent=2), flush=True)
    return 0 if failures == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
