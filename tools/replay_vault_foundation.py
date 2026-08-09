#!/usr/bin/env python3
"""Deterministic, offline Replay Vault ingestion/editorial primitives.

This module performs no network or database mutation.  Inputs and outputs are
private, hash-bound JSON/CSV artifacts suitable for later server-side import.
"""
from __future__ import annotations

import csv
import contextlib
import hashlib
import html
import json
import os
import re
import stat
import tempfile
import unicodedata
import uuid
from collections import Counter, defaultdict
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence

RULE_VERSION = "replay-pairing-v1"
NORMALIZER_VERSION = "replay-transcript-v1"
QUESTION_EXTRACTOR_VERSION = "replay-question-private-v1"
NAMESPACE = uuid.UUID("cb779544-1249-5ed0-a376-366d89915b3c")
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
TIMESTAMP_RE = re.compile(
    r"(?P<start>(?:\d{1,3}:)?\d{1,2}:\d{2}[.,]\d{3})\s*-->\s*"
    r"(?P<end>(?:\d{1,3}:)?\d{1,2}:\d{2}[.,]\d{3})(?:\s+[A-Za-z][^\r\n]*)?"
)
QUESTION_RE = re.compile(r"\b(?:how|what|when|where|why|who|which|can|could|do|does|did|is|are|should|would|will)\b", re.I)
SENSITIVE_RE = re.compile(
    r"\b(?:\$\s*\d|\d[\d,]*(?:\.\d+)?\s*(?:dollars?|usd)|diagnos|medicat|pregnan|divorc|"
    r"custody|address|phone|email|client\s+(?:named|called)|bank|debt)\b",
    re.I,
)
NAME_RE = re.compile(r"\b(?:my name is|i(?:'m| am)|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b")
URL_RE = re.compile(r"(?:https?://|www\.|\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b)", re.I)
MAX_SOURCE_BYTES = 64 * 1024 * 1024
DROPBOX_CONTENT_HASH_RE = re.compile(r"^[0-9a-f]{64}$")
DROPBOX_FILE_ID_RE = re.compile(r"^id:[A-Za-z0-9_-]{3,}$")


class FoundationError(ValueError):
    """Typed fail-closed validation error."""


def canonical_json(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def read_bounded_bytes(path: Path, *, limit: int = MAX_SOURCE_BYTES) -> bytes:
    """Read a regular file without following a final symlink, with a hard bound."""
    path = Path(path)
    current = path.parent
    while current != current.parent:
        if current.is_symlink() and current not in {Path("/var"), Path("/tmp")}:
            raise FoundationError(f"symlink input ancestor rejected: {current}")
        current = current.parent
    if path.is_symlink():
        raise FoundationError(f"symlink input rejected: {path}")
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
    try:
        fd = os.open(path, flags)
    except OSError as error:
        raise FoundationError(f"unsafe or unreadable input: {path}") from error
    try:
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode):
            raise FoundationError(f"input is not a regular file: {path}")
        if info.st_size > limit:
            raise FoundationError(f"input exceeds {limit} bytes: {path}")
        chunks: list[bytes] = []
        remaining = limit + 1
        while remaining:
            block = os.read(fd, min(1024 * 1024, remaining))
            if not block:
                break
            chunks.append(block)
            remaining -= len(block)
        value = b"".join(chunks)
        if len(value) > limit:
            raise FoundationError(f"input exceeds {limit} bytes: {path}")
        return value
    finally:
        os.close(fd)


def _require_safe_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    current = path.parent
    while current != current.parent:
        if current.is_symlink() and current not in {Path("/var"), Path("/tmp")}:
            raise FoundationError(f"symlink output ancestor rejected: {current}")
        current = current.parent
    if path.is_symlink():
        raise FoundationError(f"symlink output rejected: {path}")


def atomic_write_private(path: Path, data: bytes, *, overwrite: bool = True) -> None:
    """Atomically persist private bytes as 0600 without following symlinks."""
    path = Path(path)
    _require_safe_parent(path)
    if path.exists() and not overwrite:
        existing = read_bounded_bytes(path, limit=max(MAX_SOURCE_BYTES, len(data)))
        if existing == data:
            return
        raise FoundationError(f"immutable output already exists with different bytes: {path}")
    fd, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    temporary = Path(temporary_name)
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, "wb", closefd=True) as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        if path.is_symlink():
            raise FoundationError(f"symlink output rejected: {path}")
        os.replace(temporary, path)
        os.chmod(path, 0o600, follow_symlinks=False)
        directory_fd = os.open(path.parent, os.O_RDONLY)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
    finally:
        try:
            temporary.unlink()
        except FileNotFoundError:
            pass


@contextlib.contextmanager
def private_atomic_open(path: Path, *, newline: str | None = None):
    """Yield a private UTF-8 temp stream, then atomically install it."""
    path = Path(path)
    _require_safe_parent(path)
    fd, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    temporary = Path(temporary_name)
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8", newline=newline, closefd=True) as handle:
            yield handle
            handle.flush()
            os.fsync(handle.fileno())
        if path.is_symlink():
            raise FoundationError(f"symlink output rejected: {path}")
        os.replace(temporary, path)
        os.chmod(path, 0o600, follow_symlinks=False)
    finally:
        try:
            temporary.unlink()
        except FileNotFoundError:
            pass


def require_sha256(value: Any, field: str) -> str:
    normalized = str(value or "").lower()
    if not SHA256_RE.fullmatch(normalized):
        raise FoundationError(f"{field} must be a lowercase SHA-256")
    return normalized


def stable_id(kind: str, *parts: Any) -> str:
    if not parts or any(part is None or str(part) == "" for part in parts):
        raise FoundationError(f"{kind} stable ID has an empty identity component")
    return str(uuid.uuid5(NAMESPACE, kind + "\x1f" + "\x1f".join(map(str, parts))))


def normalize_title(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode().lower()
    text = re.sub(r"\b(?:19|20)\d{2}[-_/ ]?\d{1,2}[-_/ ]?\d{1,2}\b", " ", text)
    text = re.sub(r"\b(?:replay|recording|zoom|becoming boss|mastermind|coaching call|with faith mariah)\b", " ", text)
    return " ".join(re.sub(r"[^a-z0-9]+", " ", text).split())


def timestamp_to_ms(value: str) -> int:
    parts = value.replace(",", ".").split(":")
    if len(parts) not in {2, 3}:
        raise FoundationError(f"invalid timestamp: {value!r}")
    try:
        seconds = Decimal(parts[-1])
        minutes = int(parts[-2])
        hours = int(parts[-3]) if len(parts) == 3 else 0
    except (InvalidOperation, ValueError) as error:
        raise FoundationError(f"invalid timestamp: {value!r}") from error
    if seconds < 0 or seconds >= 60 or minutes < 0 or minutes >= 60 or hours < 0:
        raise FoundationError(f"out-of-range timestamp: {value!r}")
    return int(((Decimal(hours * 3600 + minutes * 60) + seconds) * 1000).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def strip_vtt_markup(value: str) -> str:
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", value)).split()).strip()


def parse_vtt_ms(vtt: str) -> list[dict[str, Any]]:
    """Parse a complete WebVTT document and reject any ambiguous corruption."""
    if not isinstance(vtt, str) or not vtt.strip():
        raise FoundationError("empty VTT")
    if "\x00" in vtt:
        raise FoundationError("VTT contains NUL")
    lines = vtt.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    if lines[0].lstrip("\ufeff").strip().split(" ", 1)[0] != "WEBVTT":
        raise FoundationError("VTT header missing")
    segments: list[dict[str, Any]] = []
    index = 1
    while index < len(lines):
        line = lines[index].strip()
        if not line:
            index += 1
            continue
        if line.startswith(("NOTE", "STYLE", "REGION")):
            index += 1
            while index < len(lines) and lines[index].strip():
                index += 1
            continue
        if "-->" not in line:
            if index + 1 >= len(lines) or "-->" not in lines[index + 1]:
                raise FoundationError(f"orphan VTT content at line {index + 1}")
            index += 1
            line = lines[index].strip()
        match = TIMESTAMP_RE.fullmatch(line)
        if not match:
            raise FoundationError(f"malformed VTT timing at line {index + 1}")
        start_ms = timestamp_to_ms(match.group("start"))
        end_ms = timestamp_to_ms(match.group("end"))
        if end_ms <= start_ms:
            raise FoundationError(f"reversed or zero-duration VTT cue at line {index + 1}")
        index += 1
        text_lines: list[str] = []
        while index < len(lines) and lines[index].strip():
            if "-->" in lines[index]:
                raise FoundationError(f"truncated VTT cue before line {index + 1}")
            text_lines.append(lines[index].strip())
            index += 1
        text = strip_vtt_markup(" ".join(text_lines))
        if not text:
            raise FoundationError(f"empty VTT cue at line {index + 1}")
        speaker_match = re.match(r"^([^:]{2,80}):\s+(.+)$", text)
        segments.append({
            "segment_index": len(segments), "starts_at_ms": start_ms, "ends_at_ms": end_ms,
            "speaker": speaker_match.group(1).strip() if speaker_match else "", "transcript_text": text,
        })
        index += 1
    if not segments:
        raise FoundationError("VTT contains no cues")
    return segments


def transcript_digest(segments: Sequence[Mapping[str, Any]]) -> str:
    canonical = [
        [int(row["segment_index"]), int(row["starts_at_ms"]), int(row["ends_at_ms"]), str(row.get("speaker") or ""), str(row["transcript_text"])]
        for row in segments
    ]
    return sha256_bytes(canonical_json(canonical))


def transcript_quality(segments: Sequence[Mapping[str, Any]], media_duration_ms: int = 0) -> dict[str, Any]:
    flags: Counter[str] = Counter()
    previous_start = -1
    previous_end = -1
    previous_text = ""
    duplicate_run = 0
    max_duplicate_run = 0
    words: list[str] = []
    for expected, row in enumerate(segments):
        start = int(row.get("starts_at_ms", -1))
        end = int(row.get("ends_at_ms", -1))
        text = str(row.get("transcript_text") or "").strip()
        if int(row.get("segment_index", -1)) != expected:
            flags["non_contiguous_index"] += 1
        if not text:
            flags["empty_text"] += 1
        if start < 0 or end < start:
            flags["malformed_timestamp"] += 1
        if start < previous_start:
            flags["start_regression"] += 1
        if previous_end >= 0 and start < previous_end:
            flags["overlap"] += 1
        if end == start:
            flags["zero_duration"] += 1
        if media_duration_ms and end > media_duration_ms + 1000:
            flags["cue_beyond_media"] += 1
        if text == previous_text and text:
            duplicate_run += 1
            flags["consecutive_duplicate"] += 1
        else:
            duplicate_run = 1
        max_duplicate_run = max(max_duplicate_run, duplicate_run)
        words.extend(re.findall(r"[A-Za-z]+", text))
        if URL_RE.search(text):
            flags["url_or_email_candidate"] += 1
        previous_start, previous_end, previous_text = start, end, text
    if not segments:
        flags["empty_transcript"] += 1
    if max_duplicate_run >= 2:
        flags["duplicate_explosion"] += 1
    average_word_length = sum(map(len, words)) / len(words) if words else 0.0
    if len(words) >= 20 and average_word_length < 2.5:
        flags["character_split"] += 1
    first_ms = int(segments[0]["starts_at_ms"]) if segments else 0
    last_ms = int(segments[-1]["ends_at_ms"]) if segments else 0
    coverage = last_ms / media_duration_ms if media_duration_ms else None
    if coverage is not None and coverage < 0.90:
        flags["coverage_low"] += 1
    if coverage is not None and coverage > 1.05:
        flags["coverage_high"] += 1
    blockers = {"empty_transcript", "empty_text", "malformed_timestamp", "start_regression", "overlap", "zero_duration", "consecutive_duplicate", "duplicate_explosion", "character_split", "coverage_low", "coverage_high", "cue_beyond_media", "url_or_email_candidate"}
    status = "blocked" if any(flags[name] for name in blockers) else "pass"
    return {
        "status": status,
        "flags": dict(sorted(flags.items())),
        "cue_count": len(segments),
        "first_ms": first_ms,
        "last_ms": last_ms,
        "coverage_ratio": round(coverage, 6) if coverage is not None else None,
        "average_word_length": round(average_word_length, 3),
        "normalized_sha256": transcript_digest(segments),
    }


@dataclass(frozen=True)
class PairingDecision:
    decision: str
    reason: str
    media_id: str | None
    evidence: dict[str, Any]

    def as_dict(self) -> dict[str, Any]:
        return {"decision": self.decision, "reason": self.reason, "media_id": self.media_id, "evidence": self.evidence}


def _duration_pass(transcript: Mapping[str, Any], media: Mapping[str, Any]) -> tuple[bool, int, float | None]:
    transcript_duration = int(transcript.get("duration_ms") or transcript.get("last_ms") or 0)
    media_duration = int(media.get("duration_ms") or 0)
    if not transcript_duration or not media_duration:
        return False, abs(transcript_duration - media_duration), None
    delta = abs(transcript_duration - media_duration)
    percent = delta / media_duration
    return delta <= max(10_000, int(media_duration * 0.01)), delta, percent


def deterministic_pair(transcript: Mapping[str, Any], media_rows: Sequence[Mapping[str, Any]]) -> PairingDecision:
    """Pair only a unique exact stable bridge plus duration/coverage evidence.

    Titles can rank review candidates but can never produce auto_approved.
    Duplicate exact stable IDs or normalized titles quarantine the record.
    """
    stable_id_value = str(transcript.get("stable_bridge_id") or "")
    title = normalize_title(transcript.get("title"))
    exact_stable = [row for row in media_rows if stable_id_value and str(row.get("stable_bridge_id") or "") == stable_id_value]
    exact_title = [row for row in media_rows if title and normalize_title(row.get("title")) == title]
    if len(exact_stable) > 1:
        return PairingDecision("quarantined", "duplicate_exact_stable_bridge", None, {"candidate_count": len(exact_stable)})
    if len(exact_title) > 1:
        return PairingDecision("quarantined", "duplicate_exact_normalized_title", None, {"candidate_count": len(exact_title)})
    if len(exact_stable) == 1:
        row = exact_stable[0]
        duration_ok, delta_ms, delta_percent = _duration_pass(transcript, row)
        coverage = transcript.get("coverage_ratio")
        coverage_ok = coverage is not None and 0.90 <= float(coverage) <= 1.05
        compatible = not transcript.get("media_type") or transcript.get("media_type") == row.get("media_type")
        evidence = {"candidate_count": 1, "stable_bridge_exact": True, "duration_delta_ms": delta_ms, "duration_delta_percent": delta_percent, "coverage_ratio": coverage, "media_type_compatible": compatible}
        if duration_ok and coverage_ok and compatible and not transcript.get("source_privacy_flag") and not row.get("source_privacy_flag"):
            return PairingDecision("auto_approved", "unique_stable_bridge_duration_coverage", str(row.get("id") or row.get("source_native_id")), evidence)
        return PairingDecision("quarantined", "stable_bridge_corroboration_failed", str(row.get("id") or row.get("source_native_id")), evidence)
    if len(exact_title) == 1:
        return PairingDecision("candidate", "title_only_never_auto_approves", str(exact_title[0].get("id") or exact_title[0].get("source_native_id")), {"candidate_count": 1, "stable_bridge_exact": False})
    return PairingDecision("unmatched", "no_unique_stable_bridge", None, {"candidate_count": 0})


def _load_records(path: Path, *, max_bytes: int = MAX_SOURCE_BYTES) -> list[dict[str, Any]]:
    data = read_bounded_bytes(path, limit=max_bytes)
    if path.suffix.lower() == ".csv":
        text = data.decode("utf-8")
        return list(csv.DictReader(text.splitlines()))
    value = json.loads(data)
    if isinstance(value, dict):
        value = value.get("records", [])
    if not isinstance(value, list) or not all(isinstance(row, dict) for row in value):
        raise FoundationError(f"expected record list in {path}")
    return value


def build_crdb_crosswalk(crdb_rows: Sequence[Mapping[str, Any]], media_rows: Sequence[Mapping[str, Any]], run_sha256: str) -> dict[str, Any]:
    require_sha256(run_sha256, "run_sha256")
    decisions: list[dict[str, Any]] = []
    seen_source_ids: set[str] = set()
    seen_candidate_ids: set[str] = set()
    for row in sorted(crdb_rows, key=lambda item: str(item.get("source_record_id") or item.get("id") or "")):
        source_record_id = str(row.get("source_record_id") or row.get("id") or "")
        if not source_record_id:
            raise FoundationError("CRDB row missing source_record_id")
        if source_record_id in seen_source_ids:
            raise FoundationError(f"duplicate CRDB source_record_id: {source_record_id}")
        seen_source_ids.add(source_record_id)
        source_path = row.get("source_path")
        if not source_path:
            raise FoundationError(f"CRDB row {source_record_id} missing bounded source_path")
        transcript_hash = sha256_bytes(read_bounded_bytes(Path(str(source_path))))
        declared = row.get("raw_sha256") or row.get("transcript_sha256")
        if declared and require_sha256(declared, "CRDB raw_sha256") != transcript_hash:
            raise FoundationError(f"CRDB source hash mismatch: {source_record_id}")
        decision = deterministic_pair(row, media_rows)
        candidate_id = stable_id("crosswalk", run_sha256, source_record_id, transcript_hash, RULE_VERSION)
        if candidate_id in seen_candidate_ids:
            raise FoundationError(f"duplicate crosswalk candidate_id: {candidate_id}")
        seen_candidate_ids.add(candidate_id)
        decisions.append({
            "candidate_id": candidate_id, "run_sha256": run_sha256, "rule_version": RULE_VERSION,
            "source_record_id": source_record_id, "transcript_sha256": transcript_hash,
            "transcript_authority": "crdb_master", **decision.as_dict(),
        })
    counts = Counter(row["decision"] for row in decisions)
    semantic = {"schema_version": 2, "rule_version": RULE_VERSION, "run_sha256": run_sha256,
                "records": decisions, "counts": dict(sorted(counts.items()))}
    return {**semantic, "semantic_sha256": sha256_bytes(canonical_json(semantic))}


def _normalized_dropbox_path(value: Any) -> str:
    raw = str(value or "")
    if not raw.startswith("/") or "\\" in raw or "://" in raw or "\x00" in raw:
        raise FoundationError("invalid Dropbox path")
    parts = raw.split("/")[1:]
    if not parts or any(part in {"", ".", ".."} for part in parts):
        raise FoundationError("invalid Dropbox path")
    normalized = "/" + "/".join(parts)
    if normalized != raw:
        raise FoundationError("non-normalized Dropbox path")
    return normalized


def _source_metadata_contract(item: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "portal_resource_id": str(item.get("portal_resource_id") or ""),
        "file_hash": str(item.get("file_hash") or ""),
        "source_id": str(item.get("source_id") or ""),
        "title": str(item.get("title") or ""),
        "collection_name": str(item.get("collection_name") or ""),
        "duration_seconds": float(item.get("duration_seconds") or item.get("duration") or 0),
        "source_size_bytes": int(item.get("source_size_bytes") or 0),
        "source_status": str(item.get("source_status") or ""),
        "has_transcription": bool(item.get("has_transcription")),
        "source_url_fingerprint": sha256_bytes(str(item.get("membershipio_source_url") or "").encode()),
        "created_at": str(item.get("created_at") or ""),
        "updated_at": str(item.get("updated_at") or ""),
        "placements": item.get("placements") if isinstance(item.get("placements"), list) else [],
    }


def reconcile_dropbox_receipts(manifest_path: Path, receipts_path: Path, worker_path: Path) -> dict[str, Any]:
    """Validate only the active migration worker's bounded nine-field receipt contract."""
    manifest_sha = sha256_bytes(read_bounded_bytes(manifest_path))
    manifest_value = json.loads(read_bounded_bytes(manifest_path))
    manifest_records = manifest_value.get("records", []) if isinstance(manifest_value, dict) else manifest_value
    if not isinstance(manifest_records, list) or not all(isinstance(row, dict) for row in manifest_records):
        raise FoundationError("manifest records must be a list")
    expected: dict[str, Mapping[str, Any]] = {}
    for item in manifest_records:
        portal_id = str(item.get("portal_resource_id") or "")
        file_hash = str(item.get("file_hash") or "")
        if not portal_id or not file_hash:
            raise FoundationError("manifest item missing portal_resource_id or file_hash")
        if portal_id in expected:
            raise FoundationError(f"duplicate manifest portal_resource_id: {portal_id}")
        expected[portal_id] = item
    worker_sha = sha256_bytes(read_bounded_bytes(worker_path))
    receipts = _load_records(receipts_path)
    fields = {"portal_resource_id", "file_hash", "title", "dropbox_path", "dropbox_file_id",
              "dropbox_content_hash", "size", "duration_seconds", "completed_at"}
    accepted: list[dict[str, Any]] = []
    rejected: list[dict[str, Any]] = []
    seen_receipts: set[str] = set()
    for row in receipts:
        portal_id = str(row.get("portal_resource_id") or "")
        reasons: list[str] = []
        if set(row) != fields:
            reasons.append("invalid_active_worker_receipt_schema")
        if portal_id in seen_receipts:
            reasons.append("duplicate_receipt_portal_resource_id")
        seen_receipts.add(portal_id)
        item = expected.get(portal_id)
        if item is None:
            reasons.append("unknown_portal_resource_id")
        if item is not None:
            if str(row.get("file_hash") or "") != str(item.get("file_hash") or ""):
                reasons.append("file_hash_mismatch")
            if str(row.get("title") or "") != str(item.get("title") or ""):
                reasons.append("title_mismatch")
        try:
            dropbox_path = _normalized_dropbox_path(row.get("dropbox_path"))
        except FoundationError:
            dropbox_path = ""
            reasons.append("invalid_dropbox_path")
        expected_path = str((item or {}).get("expected_dropbox_path") or (item or {}).get("dropbox_path") or "")
        if item is not None:
            try:
                if not expected_path or dropbox_path != _normalized_dropbox_path(expected_path):
                    reasons.append("dropbox_path_mismatch")
            except FoundationError:
                reasons.append("manifest_dropbox_path_invalid")
        if not DROPBOX_FILE_ID_RE.fullmatch(str(row.get("dropbox_file_id") or "")):
            reasons.append("invalid_dropbox_file_id")
        if not DROPBOX_CONTENT_HASH_RE.fullmatch(str(row.get("dropbox_content_hash") or "")):
            reasons.append("invalid_dropbox_content_hash")
        try:
            size = int(row.get("size") or 0)
            if size <= 0:
                raise ValueError
            expected_size = int((item or {}).get("source_size_bytes") or 0)
            if expected_size and size != expected_size:
                reasons.append("size_mismatch")
        except (TypeError, ValueError):
            size = 0
            reasons.append("invalid_size")
        try:
            duration = float(row.get("duration_seconds") or 0)
            if duration <= 0:
                raise ValueError
            expected_duration = float((item or {}).get("duration_seconds") or (item or {}).get("duration") or 0)
            if expected_duration and abs(duration - expected_duration) > max(1.0, expected_duration * 0.01):
                reasons.append("duration_mismatch")
        except (TypeError, ValueError):
            duration = 0.0
            reasons.append("invalid_duration_seconds")
        completed = str(row.get("completed_at") or "")
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z", completed):
            reasons.append("invalid_completed_at")
        result = {"portal_resource_id": portal_id, "reasons": sorted(set(reasons))}
        if reasons:
            rejected.append(result)
        else:
            receipt_sha = sha256_bytes(canonical_json({key: row[key] for key in sorted(fields)}))
            source_metadata_sha = sha256_bytes(canonical_json(_source_metadata_contract(item or {})))
            accepted.append({
                "playback_evidence_id": stable_id("dropbox-evidence", portal_id, row["dropbox_file_id"], row["dropbox_content_hash"]),
                "provider": "dropbox", "portal_resource_id": portal_id, "file_hash": row["file_hash"],
                "dropbox_path": dropbox_path, "dropbox_file_id": row["dropbox_file_id"],
                "dropbox_content_hash": row["dropbox_content_hash"], "size_bytes": size,
                "duration_ms": round(duration * 1000), "completed_at": completed,
                "manifest_sha256": manifest_sha, "worker_sha256": worker_sha,
                "source_metadata_sha256": source_metadata_sha, "receipt_sha256": receipt_sha,
                "review_status": "candidate",
            })
    accepted.sort(key=lambda row: row["portal_resource_id"])
    rejected.sort(key=lambda row: row["portal_resource_id"])
    semantic = {"schema_version": 2, "provider": "dropbox", "manifest_sha256": manifest_sha,
                "worker_sha256": worker_sha, "accepted": accepted, "rejected": rejected,
                "counts": {"accepted": len(accepted), "rejected": len(rejected)}}
    return {**semantic, "semantic_sha256": sha256_bytes(canonical_json(semantic))}


def extract_question_candidates(transcript_version: Mapping[str, Any], segments: Sequence[Mapping[str, Any]]) -> list[dict[str, Any]]:
    authority = str(transcript_version.get("authority") or "")
    if authority not in {"crdb_master", "reviewed_gap_fill"}:
        return []
    version_id = str(transcript_version.get("id") or "")
    resource_id = str(transcript_version.get("resource_id") or "")
    version_hash = require_sha256(transcript_version.get("normalized_sha256"), "normalized_sha256")
    if transcript_digest(segments) != version_hash:
        raise FoundationError("question source segments do not match normalized_sha256")
    candidates: list[dict[str, Any]] = []
    seen_candidate_ids: set[str] = set()
    for index, row in enumerate(segments):
        text = str(row.get("transcript_text") or "").strip()
        if "?" not in text and not QUESTION_RE.search(text[:80]):
            continue
        answer_rows = list(segments[index + 1:index + 5])
        if not answer_rows:
            continue
        answer_end = int(answer_rows[-1]["ends_at_ms"])
        sensitivity = sorted({
            flag for flag, pattern in (("pii_name_candidate", NAME_RE), ("sensitive_detail_candidate", SENSITIVE_RE), ("url_or_email_candidate", URL_RE))
            if pattern.search(" ".join([text, *[str(answer.get("transcript_text") or "") for answer in answer_rows]]))
        })
        candidate_id = stable_id("question", resource_id, version_id, row["segment_index"], version_hash, QUESTION_EXTRACTOR_VERSION)
        if candidate_id in seen_candidate_ids:
            raise FoundationError(f"duplicate question candidate_id: {candidate_id}")
        seen_candidate_ids.add(candidate_id)
        candidates.append({
            "candidate_id": candidate_id,
            "resource_id": resource_id,
            "transcript_version_id": version_id,
            "transcript_sha256": version_hash,
            "question_segment_index": int(row["segment_index"]),
            "question_start_ms": int(row["starts_at_ms"]),
            "answer_start_ms": int(answer_rows[0]["starts_at_ms"]),
            "answer_end_ms": answer_end,
            "raw_excerpt_sha256": sha256_bytes(canonical_json([text, *[answer.get("transcript_text") for answer in answer_rows]])),
            "proposed_question_private": text,
            "answerer_hint_private": str(answer_rows[0].get("speaker") or ""),
            "sensitivity_findings": sensitivity,
            "extractor_version": QUESTION_EXTRACTOR_VERSION,
            "state": "extracted_private",
            "publishable": False,
        })
    return candidates


ALLOWED_QUESTION_TRANSITIONS = {
    "extracted_private": {"dedupe_pending", "rejected", "archived"},
    "dedupe_pending": {"privacy_review", "rejected", "archived"},
    "privacy_review": {"editorial_review", "privacy_blocked", "rejected", "archived"},
    "editorial_review": {"seek_verification", "rejected", "archived"},
    "seek_verification": {"approved", "rejected", "archived"},
    "approved": {"reverify_required", "archived"},
    "reverify_required": {"privacy_review", "rejected", "archived"},
}


def review_question_candidate(candidate: Mapping[str, Any], target_state: str, actor: str, reason: str) -> tuple[dict[str, Any], dict[str, Any]]:
    before = dict(candidate)
    current = str(before.get("state") or "")
    if target_state == "published":
        raise FoundationError("offline/generated question candidates can never publish")
    if target_state not in ALLOWED_QUESTION_TRANSITIONS.get(current, set()):
        raise FoundationError(f"invalid question transition: {current} -> {target_state}")
    if not actor.strip() or not reason.strip():
        raise FoundationError("review actor and reason are required")
    after = {**before, "state": target_state, "publishable": False}
    event = {
        "event_id": stable_id("question-review", before["candidate_id"], sha256_bytes(canonical_json(before)), target_state, actor, reason),
        "candidate_id": before["candidate_id"],
        "before_sha256": sha256_bytes(canonical_json(before)),
        "after_sha256": sha256_bytes(canonical_json(after)),
        "actor": actor,
        "decision": target_state,
        "reason": reason,
        "checklist_version": "questions-private-review-v1",
    }
    return after, event


def write_json(path: Path, value: Any, *, overwrite: bool = True) -> None:
    data = json.dumps(value, indent=2, sort_keys=True, ensure_ascii=False).encode("utf-8") + b"\n"
    atomic_write_private(path, data, overwrite=overwrite)


__all__ = [
    "FoundationError", "RULE_VERSION", "NORMALIZER_VERSION", "canonical_json", "sha256_bytes", "sha256_file", "stable_id",
    "normalize_title", "timestamp_to_ms", "parse_vtt_ms", "transcript_digest", "transcript_quality", "deterministic_pair",
    "build_crdb_crosswalk", "reconcile_dropbox_receipts", "extract_question_candidates", "review_question_candidate", "write_json", "atomic_write_private", "private_atomic_open", "read_bounded_bytes", "_load_records",
]
