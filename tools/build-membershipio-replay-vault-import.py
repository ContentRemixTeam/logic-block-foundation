#!/usr/bin/env python3
"""Build a private, idempotent Replay Vault import package from Membership.io.

This script does not write to Supabase and does not download video files. It:
- enumerates the Becoming Boss Replay Vault playlists and lesson media;
- deduplicates lessons by Membership.io file hash;
- downloads caption VTT text and emits one exact cue per search segment;
- conservatively matches existing local Dropbox media;
- emits Dropbox candidates only; approval requires stable-ID, duration, coverage, and content receipts;
- records Searchie HLS sources as blocked migration evidence, never approved playback;
- writes CSV/JSON/SQL artifacts to a private output directory outside Git.

Credentials are loaded from MEMBERSHIPIO_EMAIL and MEMBERSHIPIO_PASSWORD in the
environment or ~/.hermes/env. Values are never printed or written to output.
"""
from __future__ import annotations

import argparse
import csv
import difflib
import hashlib
import html
import json
import os
import re
import stat
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable

from replay_vault_foundation import (
    FoundationError, atomic_write_private, canonical_json, parse_vtt_ms, private_atomic_open, sha256_bytes,
    stable_manifest_contract, timestamp_to_ms, transcript_digest, transcript_quality, write_json,
)

HUB_ID = 13921
HUB_HASH = "62R4w3ejNl"
HUB_TITLE = "Becoming Boss Mastermind Replay Vault"
API_BASE = "https://app.membership.io"
DEFAULT_OUTPUT = Path.home() / "Dropbox" / "Becoming Boss Mastermind Vault Migration" / "App Import"
DEFAULT_DROPBOX_ROOTS = [Path.home() / "Dropbox" / "Videos_Zoom Replays", Path.home() / "Dropbox" / "Zoom"]
MAX_RESPONSE_BYTES = 64 * 1024 * 1024
MEDIA_EXTENSIONS = {".mp4", ".mov", ".m4v", ".mkv", ".webm", ".mp3", ".m4a", ".wav", ".aac"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".m4v", ".mkv", ".webm"}
TIMESTAMP_RE = re.compile(
    r"(?P<start>(?:\d{1,2}:)?\d{1,2}:\d{2}[\.,]\d{3})\s*-->\s*"
    r"(?P<end>(?:\d{1,2}:)?\d{1,2}:\d{2}[\.,]\d{3})"
)
DATE_PATTERNS = [
    re.compile(r"\b(20\d{2})[-_/ .](\d{1,2})[-_/ .](\d{1,2})\b"),
    re.compile(r"\b(\d{1,2})[-_/ .](\d{1,2})[-_/ .](20\d{2})\b"),
    re.compile(
        r"\b(january|february|march|april|may|june|july|august|september|october|november|december|"
        r"jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?[,]?\s+(20\d{2})\b",
        re.I,
    ),
]
MONTHS = {
    "january": 1, "jan": 1, "february": 2, "feb": 2, "march": 3, "mar": 3,
    "april": 4, "apr": 4, "may": 5, "june": 6, "jun": 6, "july": 7, "jul": 7,
    "august": 8, "aug": 8, "september": 9, "sep": 9, "sept": 9, "october": 10,
    "oct": 10, "november": 11, "nov": 11, "december": 12, "dec": 12,
}


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.removeprefix("export ").strip()
        if key not in os.environ:
            os.environ[key] = value.strip().strip("\"'")


def authenticate() -> str:
    load_env_file(Path.home() / ".hermes" / "env")
    email = os.environ.get("MEMBERSHIPIO_EMAIL")
    password = os.environ.get("MEMBERSHIPIO_PASSWORD")
    if not email or not password:
        raise RuntimeError("MEMBERSHIPIO_EMAIL and MEMBERSHIPIO_PASSWORD are required")
    payload = json.dumps({"email": email, "password": password}).encode()
    request = urllib.request.Request(
        f"{API_BASE}/api/v2/authenticate-user",
        data=payload,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        body = json.load(response)
    token = body.get("accessToken") or body.get("token")
    if not token:
        raise RuntimeError("Membership.io authentication response did not contain an access token")
    return token


def request_json(token: str, url: str, timeout: int = 90) -> Any:
    request = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json", "User-Agent": "VaultMigration/2.0"},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        raw = response.read(MAX_RESPONSE_BYTES + 1)
    if len(raw) > MAX_RESPONSE_BYTES:
        raise RuntimeError("Membership.io JSON response exceeds bound")
    return json.loads(raw)


def request_text(token: str, url: str, timeout: int = 90) -> str:
    request = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {token}", "Accept": "text/vtt,text/plain,*/*", "User-Agent": "VaultMigration/2.0"},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        raw = response.read(MAX_RESPONSE_BYTES + 1)
    if len(raw) > MAX_RESPONSE_BYTES:
        raise RuntimeError("Membership.io VTT response exceeds bound")
    return raw.decode("utf-8")


def fetch_playlists(token: str) -> list[dict[str, Any]]:
    query = urllib.parse.urlencode({"filter[hub_id]": HUB_ID, "limit": 100, "page": 1})
    body = request_json(token, f"{API_BASE}/api/internal/v2/playlists?{query}")
    rows = body.get("data", body) if isinstance(body, dict) else body
    if not isinstance(rows, list):
        raise RuntimeError("Unexpected playlist response")
    return rows


def fetch_playlist_files(token: str, playlist: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    query = urllib.parse.urlencode([("fields[]", "attachedFiles")])
    body = request_json(token, f"{API_BASE}/api/playlists/{playlist['hash']}/files?{query}")
    rows = body.get("data", body) if isinstance(body, dict) else body
    if not isinstance(rows, list):
        raise RuntimeError(f"Unexpected file response for playlist {playlist.get('hash')}")
    return playlist, rows


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    text = html.unescape(str(value))
    text = re.sub(r"<[^>]+>", " ", text)
    return " ".join(text.split()).strip()


def normalize_title(value: str) -> str:
    text = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode().lower()
    text = re.sub(r"\b(20\d{2}|19\d{2})[-_/ ]?\d{1,2}[-_/ ]?\d{1,2}\b", " ", text)
    text = re.sub(r"^\d{6,8}[ _-]*", " ", text)
    text = re.sub(
        r"\b(replay|recording|zoom|becoming boss|mastermind|coaching call|workshop replay|with faith mariah|with faith)\b",
        " ", text,
    )
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return " ".join(text.split())


def extract_date(value: str) -> str:
    text = value or ""
    match = DATE_PATTERNS[0].search(text)
    if match:
        y, m, d = map(int, match.groups())
    else:
        match = DATE_PATTERNS[1].search(text)
        if match:
            m, d, y = map(int, match.groups())
        else:
            match = DATE_PATTERNS[2].search(text)
            if not match:
                return ""
            m = MONTHS[match.group(1).lower().rstrip(".")]
            d = int(match.group(2))
            y = int(match.group(3))
    try:
        return date(y, m, d).isoformat()
    except ValueError:
        return ""


def to_milliseconds(value: str) -> int:
    return timestamp_to_ms(value)


def strip_vtt_markup(value: str) -> str:
    text = re.sub(r"<[^>]+>", " ", value)
    text = html.unescape(text)
    return " ".join(text.split()).strip()


def parse_vtt(vtt: str) -> list[dict[str, Any]]:
    return parse_vtt_ms(vtt)


@dataclass(frozen=True)
class LocalMedia:
    local_path: Path
    dropbox_path: str
    normalized_title: str
    event_date: str
    is_video: bool
    size: int


def build_local_media_index(roots: Iterable[Path]) -> list[LocalMedia]:
    rows: list[LocalMedia] = []
    dropbox_root = (Path.home() / "Dropbox").resolve()
    for root in roots:
        if not root.exists():
            continue
        for path in root.rglob("*"):
            if not path.is_file() or path.suffix.lower() not in MEDIA_EXTENSIONS:
                continue
            try:
                relative = path.resolve().relative_to(dropbox_root)
            except ValueError:
                continue
            rows.append(LocalMedia(
                local_path=path,
                dropbox_path="/" + relative.as_posix(),
                normalized_title=normalize_title(path.stem),
                event_date=extract_date(str(path)),
                is_video=path.suffix.lower() in VIDEO_EXTENSIONS,
                size=path.stat().st_size,
            ))
    return rows


def select_local_match(
    title: str,
    created_at: str,
    source_id: str,
    local_rows: list[LocalMedia],
    exact_index: dict[str, list[LocalMedia]],
    token_index: dict[str, list[LocalMedia]],
    source_id_index: dict[str, list[LocalMedia]],
) -> tuple[LocalMedia | None, str, float, str]:
    normalized = normalize_title(title)
    title_date = extract_date(title)
    source_digits = re.sub(r"\D", "", source_id or "")
    if 9 <= len(source_digits) <= 12:
        source_matches = list(source_id_index.get(source_digits, []))
        if len(source_matches) > 1:
            return source_matches[0], "quarantined", 1.0, "duplicate_exact_source_id"
        if len(source_matches) == 1:
            return source_matches[0], "needs_review", 1.0, "stable_id_missing_duration_coverage_evidence"

    if not normalized:
        return None, "none", 0.0, "empty_normalized_title"

    exact = list(exact_index.get(normalized, []))
    if len(exact) > 1:
        return exact[0], "quarantined", 1.0, "duplicate_exact_normalized_title"
    if len(exact) == 1:
        exact_row = exact[0]
        if title_date and exact_row.event_date and exact_row.event_date != title_date:
            return exact_row, "quarantined", 1.0, "exact_title_event_date_conflict"
        return exact_row, "needs_review", 1.0, "title_only_never_auto_approves"

    candidate_map: dict[str, LocalMedia] = {}
    for token in {part for part in normalized.split() if len(part) >= 4}:
        for row in token_index.get(token, []):
            candidate_map[row.dropbox_path] = row
    candidates = list(candidate_map.values()) or local_rows

    scored: list[tuple[float, LocalMedia]] = []
    for row in candidates:
        if not row.normalized_title:
            continue
        if title_date and row.event_date and row.event_date != title_date:
            continue
        ratio = difflib.SequenceMatcher(None, normalized, row.normalized_title).ratio()
        containment = min(len(normalized), len(row.normalized_title)) >= 14 and (
            normalized in row.normalized_title or row.normalized_title in normalized
        )
        if containment:
            ratio = max(ratio, 0.965)
        if ratio >= 0.90:
            scored.append((ratio, row))
    if not scored:
        return None, "none", 0.0, "no_candidate"
    scored.sort(key=lambda item: (item[0], item[1].is_video, item[1].size), reverse=True)
    top_score, top_row = scored[0]
    runner_up = scored[1][0] if len(scored) > 1 else 0.0
    if top_score >= 0.975 and top_score - runner_up >= 0.035 and (not title_date or top_row.event_date == title_date):
        return top_row, "needs_review", top_score, "title_similarity_never_auto_approves"
    return top_row, "needs_review", top_score, "ambiguous_title_similarity"


def sql_literal(path: Path) -> str:
    # Portable package-local path; never embed a host absolute path.
    return path.name.replace("'", "''")


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, Any]]) -> None:
    with private_atomic_open(path, newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def build_sql(output_dir: Path) -> str:
    resources = sql_literal(output_dir / "vault_resources.csv")
    evidence = sql_literal(output_dir / "vault_source_evidence.csv")
    return f"""-- Generated private Replay Vault import. Run only after 20260808120000_mastermind_portal_private_search.sql.
-- Metadata/evidence upserts only; VTT caption rows remain private evidence and are never imported as canonical/searchable transcript.
-- Canonical transcript versions must be built from the CRDB crosswalk and activated with activate_replay_transcript_version().
BEGIN;

CREATE TEMP TABLE tmp_vault_resources (
  portal_resource_id text, product_id text, product_title text, category_id text,
  category_title text, lesson_id text, title text, portal_path text, resource_type text,
  access_scope text, member_visible_default boolean, is_current_replay boolean,
  replay_date date, available_until date, success_paths text, stages text,
  search_summary text, ingestion_status text, transcript_evidence text, video_source_type text
);
\\copy tmp_vault_resources FROM '{resources}' WITH (FORMAT csv, HEADER true, NULL '')

INSERT INTO public.mastermind_portal_resources (
  portal_resource_id, product_id, product_title, category_id, category_title,
  lesson_id, title, portal_path, resource_type, access_scope, member_visible_default,
  is_current_replay, replay_date, available_until, success_paths, stages,
  search_summary, ingestion_status, transcript_evidence, video_source_type
)
SELECT portal_resource_id, product_id, product_title, category_id, category_title,
  lesson_id, title, portal_path, resource_type, access_scope, member_visible_default,
  is_current_replay, replay_date, available_until,
  CASE WHEN coalesce(success_paths, '') = '' THEN '{{}}'::text[] ELSE string_to_array(success_paths, '|') END,
  CASE WHEN coalesce(stages, '') = '' THEN '{{}}'::text[] ELSE string_to_array(stages, '|') END,
  search_summary, ingestion_status, transcript_evidence, video_source_type
FROM tmp_vault_resources
ON CONFLICT (portal_resource_id) DO UPDATE SET
  product_id = excluded.product_id, product_title = excluded.product_title,
  category_id = excluded.category_id, category_title = excluded.category_title,
  lesson_id = excluded.lesson_id, title = excluded.title, portal_path = excluded.portal_path,
  resource_type = excluded.resource_type, access_scope = excluded.access_scope,
  member_visible_default = excluded.member_visible_default,
  search_summary = excluded.search_summary, ingestion_status = excluded.ingestion_status,
  transcript_evidence = excluded.transcript_evidence, video_source_type = excluded.video_source_type,
  updated_at = now();

CREATE TEMP TABLE tmp_vault_evidence (
  portal_resource_id text, source_system text, source_fingerprint text, source_ref text,
  source_url text, dropbox_path text, transcript_source text, match_confidence text,
  match_score numeric, review_status text, notes text
);
\\copy tmp_vault_evidence FROM '{evidence}' WITH (FORMAT csv, HEADER true, NULL '')

INSERT INTO public.mastermind_portal_source_evidence (
  resource_id, source_system, source_fingerprint, source_ref, source_url, dropbox_path,
  transcript_source, match_confidence, match_score, review_status, notes
)
SELECT r.id, e.source_system, e.source_fingerprint, e.source_ref, e.source_url,
  e.dropbox_path, e.transcript_source, e.match_confidence, e.match_score,
  e.review_status, e.notes
FROM tmp_vault_evidence e
JOIN public.mastermind_portal_resources r USING (portal_resource_id)
ON CONFLICT (resource_id, source_fingerprint) DO UPDATE SET
  source_ref = excluded.source_ref, source_url = excluded.source_url,
  dropbox_path = excluded.dropbox_path, transcript_source = excluded.transcript_source,
  match_confidence = excluded.match_confidence, match_score = excluded.match_score,
  review_status = excluded.review_status, notes = excluded.notes, updated_at = now();

-- vault_transcript_segments.csv is migration_caption_evidence only. It is intentionally not copied
-- into legacy mastermind_portal_transcript_segments, preventing stale-tail upserts and accidental search authority.

COMMIT;
"""


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--limit", type=int, default=0, help="Limit unique files for a smoke test")
    parser.add_argument("--skip-captions", action="store_true")
    parser.add_argument("--max-workers", type=int, default=8)
    args = parser.parse_args()

    started = time.time()
    output_dir: Path = args.output_dir.expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    os.chmod(output_dir, stat.S_IRWXU)

    token = authenticate()
    playlists = fetch_playlists(token)
    files_by_playlist: dict[str, list[dict[str, Any]]] = {}
    with ThreadPoolExecutor(max_workers=min(args.max_workers, 8)) as executor:
        futures = [executor.submit(fetch_playlist_files, token, playlist) for playlist in playlists]
        for future in as_completed(futures):
            playlist, rows = future.result()
            files_by_playlist[str(playlist["hash"])] = rows

    unique_files: dict[str, dict[str, Any]] = {}
    placements: defaultdict[str, list[dict[str, Any]]] = defaultdict(list)
    for playlist in sorted(playlists, key=lambda row: (str(row.get("hash") or ""), str(row.get("id") or ""))):
        playlist_hash = str(playlist.get("hash") or "")
        for item in sorted(files_by_playlist.get(playlist_hash, []), key=lambda row: int(row.get("position") or 0)):
            if item.get("content_type") != "media" and item.get("collection_name") not in {"videos", "audio"}:
                continue
            file_hash = str(item.get("hash") or "")
            if not file_hash:
                continue
            unique_files.setdefault(file_hash, item)
            placements[file_hash].append({
                "playlist_id": str(playlist.get("id") or ""),
                "playlist_hash": playlist_hash,
                "playlist_title": clean_text(playlist.get("title")),
                "position": int(item.get("position") or 0),
            })

    duplicate_source_ids = [key for key, count in Counter(str(row.get("source_id") or "") for row in unique_files.values() if row.get("source_id")).items() if count > 1]
    if duplicate_source_ids:
        raise RuntimeError(f"duplicate Membership.io source IDs: {sorted(duplicate_source_ids)}")
    for file_hash in placements:
        placements[file_hash].sort(key=lambda row: (row["playlist_hash"], row["position"], row["playlist_id"]))
    file_rows = sorted(unique_files.values(), key=lambda item: (clean_text(item.get("title")).lower(), str(item.get("hash"))))
    if args.limit > 0:
        file_rows = file_rows[: args.limit]

    local_media = build_local_media_index(DEFAULT_DROPBOX_ROOTS)
    local_exact_index: defaultdict[str, list[LocalMedia]] = defaultdict(list)
    local_token_index: defaultdict[str, list[LocalMedia]] = defaultdict(list)
    local_source_id_index: defaultdict[str, list[LocalMedia]] = defaultdict(list)
    for local_row in local_media:
        local_exact_index[local_row.normalized_title].append(local_row)
        for token_part in {part for part in local_row.normalized_title.split() if len(part) >= 4}:
            local_token_index[token_part].append(local_row)
        for numeric_id in set(re.findall(r"(?<!\d)(\d{9,12})(?!\d)", str(local_row.local_path))):
            local_source_id_index[numeric_id].append(local_row)
    def fetch_caption(item: dict[str, Any]) -> tuple[str, list[dict[str, Any]], str, str]:
        file_hash = str(item["hash"])
        if args.skip_captions:
            return file_hash, [], "skipped", ""
        url = f"{API_BASE}/file/{file_hash}/embed/caption?type=vtt"
        try:
            body = request_text(token, url)
            segments = parse_vtt(body)
            duration_ms = round(float(item.get("length") or 0) * 1000)
            quality = transcript_quality(segments, duration_ms)
            if quality["status"] != "pass":
                raise FoundationError("caption VTT failed transcript quality: " + ",".join(quality["flags"]))
            return file_hash, segments, "saved", hashlib.sha256(body.encode("utf-8")).hexdigest()
        except urllib.error.HTTPError as error:
            return file_hash, [], f"http_{error.code}", ""
        except Exception as error:  # noqa: BLE001 - record bounded failure class, not credential data
            return file_hash, [], f"error_{type(error).__name__}", ""


    resources: list[dict[str, Any]] = []
    evidence: list[dict[str, Any]] = []
    private_manifest: list[dict[str, Any]] = []
    match_counts: Counter[str] = Counter()
    caption_counts: Counter[str] = Counter()
    segment_count = 0
    segment_path = output_dir / "vault_transcript_segments.csv"
    streaming_segment_fields = [
        "portal_resource_id", "segment_index", "starts_at_ms", "ends_at_ms", "speaker", "transcript_text",
    ]

    with private_atomic_open(segment_path, newline="") as segment_handle:
        segment_writer = csv.DictWriter(segment_handle, fieldnames=streaming_segment_fields, extrasaction="ignore")
        segment_writer.writeheader()
        batch_size = max(8, args.max_workers * 4)
        processed = 0
        for batch_start in range(0, len(file_rows), batch_size):
            batch = file_rows[batch_start : batch_start + batch_size]
            with ThreadPoolExecutor(max_workers=max(1, args.max_workers)) as executor:
                future_items = {executor.submit(fetch_caption, item): item for item in batch}
                completed = [(future_items[future], future.result()) for future in as_completed(future_items)]
                for item, result in sorted(completed, key=lambda pair: str(pair[0].get("hash") or "")):
                    file_hash, segments, status, caption_raw_sha256 = result
                    transcript_source = "migration_caption_evidence" if segments else ""
                    title = clean_text(item.get("title")) or f"Vault video {file_hash}"
                    placement_rows = placements[file_hash]
                    primary = placement_rows[0]
                    caption_counts[status] += 1
                    local_match, match_status, match_score, match_reason = select_local_match(
                        title,
                        str(item.get("created_at") or ""),
                        str(item.get("source_id") or ""),
                        local_media,
                        local_exact_index,
                        local_token_index,
                        local_source_id_index,
                    )
                    match_counts[match_status] += 1
                    portal_resource_id = f"membershipio:{file_hash}"
                    replay_date = extract_date(title)
                    has_transcript = bool(segments)
                    approved_dropbox = False
                    ingestion_status = "blocked_private_source" if has_transcript else "needs_transcript"
                    video_source_type = "dropbox_private" if approved_dropbox else "membershipio_migration_required"
                    category_titles = sorted({row["playlist_title"] for row in placement_rows if row["playlist_title"]})
                    summary = f"Vault replay in {', '.join(category_titles[:4])}."
                    if len(category_titles) > 4:
                        summary += f" Also appears in {len(category_titles) - 4} more Vault playlists."
                    resources.append({
                        "portal_resource_id": portal_resource_id,
                        "product_id": str(HUB_ID),
                        "product_title": HUB_TITLE,
                        "category_id": primary["playlist_hash"],
                        "category_title": primary["playlist_title"],
                        "lesson_id": file_hash,
                        "title": title,
                        "portal_path": f"/mastermind/replay-vault?video={urllib.parse.quote(file_hash)}",
                        "resource_type": "video" if item.get("collection_name") == "videos" else "audio",
                        "access_scope": "replay_vault",
                        "member_visible_default": "false",
                        "is_current_replay": "false",
                        "replay_date": replay_date,
                        "available_until": "",
                        "success_paths": "",
                        "stages": "",
                        "search_summary": summary,
                        "ingestion_status": ingestion_status,
                        "transcript_evidence": "partial" if has_transcript else "no",
                        "video_source_type": video_source_type,
                    })
                    source_url = clean_text(item.get("source_url"))
                    inventory_notes = json.dumps({
                        "hub_hash": HUB_HASH,
                        "playlist_placements": placement_rows,
                        "collection_name": item.get("collection_name"),
                        "caption_status": status,
                        "caption_raw_sha256": caption_raw_sha256,
                        "caption_normalized_sha256": transcript_digest(segments) if segments else "",
                        "dropbox_match_status": match_status,
                        "dropbox_match_reason": match_reason,
                    }, ensure_ascii=False, separators=(",", ":"))
                    evidence.append({
                        "portal_resource_id": portal_resource_id,
                        "source_system": "membershipio_inventory",
                        "source_fingerprint": f"membershipio:{file_hash}",
                        "source_ref": file_hash,
                        "source_url": source_url,
                        "dropbox_path": "",
                        "transcript_source": transcript_source,
                        "match_confidence": "exact_file_hash",
                        "match_score": "1.0",
                        "review_status": "blocked",
                        "notes": inventory_notes,
                    })
                    if segments:
                        evidence.append({
                            "portal_resource_id": portal_resource_id,
                            "source_system": "membershipio_caption_evidence",
                            "source_fingerprint": f"sha256:{caption_raw_sha256}",
                            "source_ref": file_hash,
                            "source_url": "",
                            "dropbox_path": "",
                            "transcript_source": "migration_caption_evidence",
                            "match_confidence": "exact_caption_bytes",
                            "match_score": "1.0",
                            "review_status": "blocked",
                            "notes": json.dumps({"authority": "migration_caption_evidence", "normalized_sha256": transcript_digest(segments)}, separators=(",", ":")),
                        })
                    if local_match:
                        evidence.append({
                            "portal_resource_id": portal_resource_id,
                            "source_system": "portal_playback_source",
                            "source_fingerprint": "dropbox:" + hashlib.sha256(local_match.dropbox_path.encode()).hexdigest()[:24],
                            "source_ref": local_match.dropbox_path,
                            "source_url": "",
                            "dropbox_path": local_match.dropbox_path,
                            "transcript_source": transcript_source,
                            "match_confidence": match_reason,
                            "match_score": f"{match_score:.3f}",
                            "review_status": "blocked" if match_status == "quarantined" else "needs_review",
                            "notes": f"Matched from local Dropbox inventory; {match_reason}",
                        })
                    for segment in segments:
                        segment_writer.writerow({"portal_resource_id": portal_resource_id, **segment})
                        segment_count += 1
                    private_manifest.append({
                        "portal_resource_id": portal_resource_id,
                        "file_id": item.get("id"),
                        "file_hash": file_hash,
                        "source_id": item.get("source_id"),
                        "title": title,
                        "collection_name": item.get("collection_name"),
                        "duration": item.get("length"),
                        "created_at": item.get("created_at"),
                        "updated_at": item.get("updated_at"),
                        "membershipio_source_url": source_url,
                        "membershipio_watch_url": item.get("watch_url"),
                        "membershipio_embed_url": item.get("embed_url"),
                        "caption_status": status,
                        "caption_segments": len(segments),
                        "caption_raw_sha256": caption_raw_sha256,
                        "caption_normalized_sha256": transcript_digest(segments) if segments else "",
                        "dropbox_path": local_match.dropbox_path if local_match else "",
                        "dropbox_match_status": match_status,
                        "dropbox_match_score": round(match_score, 3),
                        "dropbox_match_reason": match_reason,
                        "placements": placement_rows,
                    })
                    processed += 1
                    if processed % 100 == 0:
                        print(f"processed {processed}/{len(file_rows)} resources; {segment_count} cues", flush=True)
    resource_fields = [
        "portal_resource_id", "product_id", "product_title", "category_id", "category_title",
        "lesson_id", "title", "portal_path", "resource_type", "access_scope",
        "member_visible_default", "is_current_replay", "replay_date", "available_until",
        "success_paths", "stages", "search_summary", "ingestion_status",
        "transcript_evidence", "video_source_type",
    ]
    evidence_fields = [
        "portal_resource_id", "source_system", "source_fingerprint", "source_ref", "source_url",
        "dropbox_path", "transcript_source", "match_confidence", "match_score", "review_status", "notes",
    ]
    segment_fields = [
        "portal_resource_id", "segment_index", "starts_at_ms", "ends_at_ms", "speaker", "transcript_text",
    ]
    resources.sort(key=lambda row: row["portal_resource_id"])
    evidence.sort(key=lambda row: (row["portal_resource_id"], row["source_system"], row["source_fingerprint"]))
    private_manifest.sort(key=lambda row: row["portal_resource_id"])
    write_csv(output_dir / "vault_resources.csv", resource_fields, resources)
    write_csv(output_dir / "vault_source_evidence.csv", evidence_fields, evidence)
    atomic_write_private(output_dir / "vault_import_upsert.sql", build_sql(output_dir).encode("utf-8"))
    manifest_path = output_dir / "vault_private_media_manifest.json"
    write_json(manifest_path, private_manifest)

    semantic_artifact = {
        "schema_version": 2,
        "resources": resources,
        "evidence": evidence,
        "private_manifest": [stable_manifest_contract(row) for row in private_manifest],
        "transcript_segment_count": segment_count,
    }
    summary = {
        "schema_version": 2,
        "semantic_content_sha256": sha256_bytes(canonical_json(semantic_artifact)),
        "hub_id": HUB_ID,
        "hub_hash": HUB_HASH,
        "playlist_count": len(playlists),
        "unique_resource_count": len(resources),
        "playlist_placement_count": sum(len(placements[str(item["hash"])]) for item in file_rows),
        "transcript_segment_count": segment_count,
        "caption_status_counts": dict(caption_counts),
        "dropbox_match_status_counts": dict(match_counts),
        "approved_dropbox_playback_count": sum(
            1 for row in evidence if row["source_system"] == "portal_playback_source" and row["review_status"] == "approved"
        ),
        "needs_review_dropbox_count": sum(
            1 for row in evidence if row["source_system"] == "portal_playback_source" and row["review_status"] == "needs_review"
        ),
        "searchie_migration_required_count": sum(1 for row in resources if row["video_source_type"] == "membershipio_migration_required"),
        "local_media_inventory_count": len(local_media),
    }
    write_json(output_dir / "vault_import_summary.json", summary)
    atomic_write_private(output_dir / "vault_import_summary.md", (
        "# Replay Vault Import Summary\n\n"
        + "\n".join(f"- {key.replace('_', ' ').title()}: {value}" for key, value in summary.items())
        + "\n\n## Safety\n\n"
        + "- No Supabase writes were performed.\n"
        + "- Membership.io source URLs remain blocked migration evidence.\n"
        + "- No local Dropbox match is auto-approved without stable-ID, duration, and transcript-coverage evidence.\n"
        + "- Membership.io VTT captions remain migration_caption_evidence until canonical CRDB authority is linked.\n"
        + "- Private URLs and transcript text are stored outside Git.\n"
    ).encode("utf-8"))
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
