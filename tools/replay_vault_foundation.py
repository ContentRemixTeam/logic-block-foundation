#!/usr/bin/env python3
"""Deterministic, offline Replay Vault ingestion/editorial primitives.

This module performs no network or database mutation.  Inputs and outputs are
private, hash-bound JSON/CSV artifacts suitable for later server-side import.
"""
from __future__ import annotations

import csv
import hashlib
import html
import json
import re
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
    r"(?P<end>(?:\d{1,3}:)?\d{1,2}:\d{2}[.,]\d{3})"
)
QUESTION_RE = re.compile(r"\b(?:how|what|when|where|why|who|which|can|could|do|does|did|is|are|should|would|will)\b", re.I)
SENSITIVE_RE = re.compile(
    r"\b(?:\$\s*\d|\d[\d,]*(?:\.\d+)?\s*(?:dollars?|usd)|diagnos|medicat|pregnan|divorc|"
    r"custody|address|phone|email|client\s+(?:named|called)|bank|debt)\b",
    re.I,
)
NAME_RE = re.compile(r"\b(?:my name is|i(?:'m| am)|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b")
URL_RE = re.compile(r"(?:https?://|www\.|\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b)", re.I)


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
    lines = vtt.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    segments: list[dict[str, Any]] = []
    index = 0
    while index < len(lines):
        match = TIMESTAMP_RE.search(lines[index])
        if not match:
            index += 1
            continue
        start_ms = timestamp_to_ms(match.group("start"))
        end_ms = timestamp_to_ms(match.group("end"))
        index += 1
        text_lines: list[str] = []
        while index < len(lines) and lines[index].strip():
            text_lines.append(lines[index].strip())
            index += 1
        text = strip_vtt_markup(" ".join(text_lines))
        if text:
            speaker_match = re.match(r"^([^:]{2,80}):\s+(.+)$", text)
            segments.append({
                "segment_index": len(segments),
                "starts_at_ms": start_ms,
                "ends_at_ms": end_ms,
                "speaker": speaker_match.group(1).strip() if speaker_match else "",
                "transcript_text": text,
            })
        index += 1
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
    if max_duplicate_run >= 5:
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
    blockers = {"empty_text", "malformed_timestamp", "start_regression", "duplicate_explosion", "character_split", "coverage_low", "coverage_high", "cue_beyond_media"}
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


def _load_records(path: Path) -> list[dict[str, Any]]:
    if path.suffix.lower() == ".csv":
        with path.open(newline="", encoding="utf-8") as handle:
            return list(csv.DictReader(handle))
    value = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(value, dict):
        value = value.get("records", [])
    if not isinstance(value, list) or not all(isinstance(row, dict) for row in value):
        raise FoundationError(f"expected record list in {path}")
    return value


def build_crdb_crosswalk(crdb_rows: Sequence[Mapping[str, Any]], media_rows: Sequence[Mapping[str, Any]], run_sha256: str) -> dict[str, Any]:
    require_sha256(run_sha256, "run_sha256")
    decisions: list[dict[str, Any]] = []
    for row in sorted(crdb_rows, key=lambda item: str(item.get("source_record_id") or item.get("id") or "")):
        source_record_id = str(row.get("source_record_id") or row.get("id") or "")
        if not source_record_id:
            raise FoundationError("CRDB row missing source_record_id")
        transcript_hash = require_sha256(row.get("raw_sha256") or row.get("transcript_sha256"), "CRDB raw_sha256")
        decision = deterministic_pair(row, media_rows)
        decisions.append({
            "candidate_id": stable_id("crosswalk", run_sha256, source_record_id, transcript_hash, RULE_VERSION),
            "run_sha256": run_sha256,
            "rule_version": RULE_VERSION,
            "source_record_id": source_record_id,
            "transcript_sha256": transcript_hash,
            "transcript_authority": "crdb_master",
            **decision.as_dict(),
        })
    counts = Counter(row["decision"] for row in decisions)
    return {"schema_version": 1, "rule_version": RULE_VERSION, "run_sha256": run_sha256, "records": decisions, "counts": dict(sorted(counts.items()))}


def reconcile_dropbox_receipts(manifest_path: Path, receipts_path: Path, worker_path: Path) -> dict[str, Any]:
    manifest_sha = sha256_file(manifest_path)
    manifest_value = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest_records = manifest_value.get("records", []) if isinstance(manifest_value, dict) else manifest_value
    if not isinstance(manifest_records, list):
        raise FoundationError("manifest records must be a list")
    current_source_hashes = {
        str(item.get("source_native_id") or item.get("file_hash") or ""): str(item.get("source_metadata_sha256") or "")
        for item in manifest_records if isinstance(item, dict)
    }
    receipts = _load_records(receipts_path)
    worker_sha = sha256_file(worker_path)
    accepted: list[dict[str, Any]] = []
    rejected: list[dict[str, Any]] = []
    for row in receipts:
        source_id = str(row.get("source_native_id") or row.get("file_hash") or "")
        reasons: list[str] = []
        if row.get("manifest_sha256") != manifest_sha:
            reasons.append("stale_manifest_sha256")
        if row.get("run_sha256") != manifest_sha:
            reasons.append("stale_run_sha256")
        if row.get("worker_sha256") != worker_sha:
            reasons.append("stale_worker_sha256")
        source_hash = str(row.get("source_metadata_sha256") or "")
        try:
            require_sha256(source_hash, "source_metadata_sha256")
        except FoundationError:
            reasons.append("invalid_source_metadata_sha256")
        expected_source_hash = current_source_hashes.get(source_id, "")
        if not expected_source_hash or source_hash != expected_source_hash:
            reasons.append("stale_source_metadata_sha256")
        if row.get("status") != "verified":
            reasons.append("receipt_not_verified")
        for required in ("dropbox_file_id", "dropbox_content_hash", "size_bytes"):
            if not row.get(required):
                reasons.append(f"missing_{required}")
        result = {"source_native_id": source_id, "attempt_id": row.get("attempt_id"), "reasons": sorted(set(reasons))}
        if reasons:
            rejected.append(result)
        else:
            accepted.append({
                "playback_evidence_id": stable_id("dropbox-evidence", row["attempt_id"], row["dropbox_file_id"], row["dropbox_content_hash"]),
                "source_native_id": source_id,
                "attempt_id": row["attempt_id"],
                "manifest_sha256": manifest_sha,
                "run_sha256": manifest_sha,
                "worker_sha256": worker_sha,
                "source_metadata_sha256": source_hash,
                "dropbox_file_id": row["dropbox_file_id"],
                "dropbox_content_hash": row["dropbox_content_hash"],
                "size_bytes": int(row["size_bytes"]),
                "duration_ms": int(row.get("duration_ms") or 0),
                "review_status": "candidate",
            })
    return {"schema_version": 1, "manifest_sha256": manifest_sha, "worker_sha256": worker_sha, "accepted": accepted, "rejected": rejected, "counts": {"accepted": len(accepted), "rejected": len(rejected)}}


def extract_question_candidates(transcript_version: Mapping[str, Any], segments: Sequence[Mapping[str, Any]]) -> list[dict[str, Any]]:
    authority = str(transcript_version.get("authority") or "")
    if authority not in {"crdb_master", "reviewed_gap_fill"}:
        return []
    version_id = str(transcript_version.get("id") or "")
    resource_id = str(transcript_version.get("resource_id") or "")
    version_hash = require_sha256(transcript_version.get("normalized_sha256"), "normalized_sha256")
    candidates: list[dict[str, Any]] = []
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


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(json.dumps(value, indent=2, sort_keys=True, ensure_ascii=False) + "\n", encoding="utf-8")
    temporary.replace(path)


__all__ = [
    "FoundationError", "RULE_VERSION", "NORMALIZER_VERSION", "canonical_json", "sha256_bytes", "sha256_file", "stable_id",
    "normalize_title", "timestamp_to_ms", "parse_vtt_ms", "transcript_digest", "transcript_quality", "deterministic_pair",
    "build_crdb_crosswalk", "reconcile_dropbox_receipts", "extract_question_candidates", "review_question_candidate", "write_json", "_load_records",
]
