#!/usr/bin/env python3
"""Create/review private Questions Answered candidates; this tool cannot publish."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from replay_vault_foundation import extract_question_candidates, review_question_candidate, write_json


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    extract = sub.add_parser("extract")
    extract.add_argument("--transcript-version", type=Path, required=True)
    extract.add_argument("--segments", type=Path, required=True)
    extract.add_argument("--output", type=Path, required=True)
    review = sub.add_parser("review")
    review.add_argument("--candidate", type=Path, required=True)
    review.add_argument("--target-state", required=True)
    review.add_argument("--actor", required=True)
    review.add_argument("--reason", required=True)
    review.add_argument("--output", type=Path, required=True)
    review.add_argument("--event-output", type=Path, required=True)
    args = parser.parse_args()

    if args.command == "extract":
        version = json.loads(args.transcript_version.read_text(encoding="utf-8"))
        segments_value = json.loads(args.segments.read_text(encoding="utf-8"))
        segments = segments_value.get("segments", segments_value) if isinstance(segments_value, dict) else segments_value
        candidates = extract_question_candidates(version, segments)
        write_json(args.output, {"schema_version": 1, "private": True, "publishable": False, "candidates": candidates})
        print(f"private_candidates={len(candidates)} publishable=0")
        return 0

    candidate = json.loads(args.candidate.read_text(encoding="utf-8"))
    after, event = review_question_candidate(candidate, args.target_state, args.actor, args.reason)
    write_json(args.output, after)
    write_json(args.event_output, event)
    print(f"candidate={after['candidate_id']} state={after['state']} publishable=false")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
