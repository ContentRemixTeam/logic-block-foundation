#!/usr/bin/env python3
"""Manage private Questions Answered review artifacts. This CLI cannot publish."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import stat
import tempfile
from pathlib import Path
from typing import Any

PRIVATE_MODE = 0o600
MAX_BYTES = 20 * 1024 * 1024
ALLOWED_TRANSITIONS = {
    ("extracted_private", "privacy_review"),
    ("privacy_review", "editorial_review"),
    ("editorial_review", "seek_verification"),
    ("seek_verification", "approved"),
}

class PrivateArtifactError(ValueError):
    pass


def _required(value: Any, label: str, limit: int = 1000) -> str:
    text = str(value or "").strip()
    if not text or len(text) > limit:
        raise PrivateArtifactError(f"invalid {label}")
    return text


def _private_regular(path: Path, *, must_exist: bool) -> None:
    path = path.expanduser()
    if path.is_symlink():
        raise PrivateArtifactError("symlinks are not allowed")
    if must_exist:
        try:
            info = path.stat()
        except FileNotFoundError as exc:
            raise PrivateArtifactError("private input missing") from exc
        if not stat.S_ISREG(info.st_mode) or info.st_size > MAX_BYTES:
            raise PrivateArtifactError("invalid private input")
        if stat.S_IMODE(info.st_mode) & 0o077:
            raise PrivateArtifactError("private input mode must be 0600 or stricter")
    else:
        parent = path.parent
        if parent.is_symlink() or not parent.is_dir():
            raise PrivateArtifactError("invalid output parent")
        if path.exists():
            info = path.stat()
            if not stat.S_ISREG(info.st_mode) or stat.S_IMODE(info.st_mode) & 0o077:
                raise PrivateArtifactError("existing output is not private")


def read_private_json(path: Path) -> Any:
    _private_regular(path, must_exist=True)
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (UnicodeError, json.JSONDecodeError) as exc:
        raise PrivateArtifactError("invalid private JSON") from exc


def atomic_private_json(path: Path, value: Any) -> None:
    _private_regular(path, must_exist=False)
    payload=(json.dumps(value,sort_keys=True,indent=2,ensure_ascii=False)+"\n").encode("utf-8")
    if len(payload)>MAX_BYTES:
        raise PrivateArtifactError("private output too large")
    fd=-1; tmp_name=""
    try:
        fd,tmp_name=tempfile.mkstemp(prefix=f".{path.name}.",suffix=".tmp",dir=path.parent)
        os.fchmod(fd,PRIVATE_MODE)
        with os.fdopen(fd,"wb",closefd=True) as handle:
            fd=-1; handle.write(payload); handle.flush(); os.fsync(handle.fileno())
        os.replace(tmp_name,path)
        os.chmod(path,PRIVATE_MODE)
        dir_fd=os.open(path.parent,os.O_RDONLY)
        try: os.fsync(dir_fd)
        finally: os.close(dir_fd)
    finally:
        if fd>=0: os.close(fd)
        if tmp_name and os.path.exists(tmp_name): os.unlink(tmp_name)


def canonical_hash(value: Any) -> str:
    return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(",",":"),ensure_ascii=False).encode()).hexdigest()


def candidate_content(candidate: dict[str, Any]) -> dict[str, Any]:
    excluded={"content_sha256","events","state","privacy_reviewer","editorial_reviewer","seek_reviewer"}
    return {key:value for key,value in candidate.items() if key not in excluded}


def bounded_excerpt(segments: list[dict[str,Any]], start_ms: int, end_ms: int) -> str:
    rows=[]
    for row in sorted(segments,key=lambda item:int(item["segment_index"])):
        starts=int(row["starts_at_ms"]); ends=int(row["ends_at_ms"])
        if starts<end_ms and ends>start_ms:
            text=" ".join(_required(row.get("transcript_text_private") or row.get("transcript_text"),"segment text").split())
            rows.append(f"{int(row['segment_index'])}:{starts}:{ends}:{text}")
    if not rows: raise PrivateArtifactError("bounded source cues missing")
    return "\n".join(rows)


def extract(version_doc: dict[str,Any], segments_doc: Any, request: dict[str,Any]) -> dict[str,Any]:
    version=version_doc.get("transcript_version",version_doc)
    segments=segments_doc.get("segments",segments_doc) if isinstance(segments_doc,dict) else segments_doc
    if not isinstance(segments,list) or not segments: raise PrivateArtifactError("segments required")
    resource_id=_required(version.get("resource_id"),"resource id")
    transcript_id=_required(version.get("id"),"transcript version id")
    transcript_hash=_required(version.get("normalized_sha256"),"transcript hash",64)
    playback_id=_required(request.get("playback_attempt_id"),"playback attempt id")
    media_hash=_required(request.get("media_snapshot_sha256"),"media hash",64)
    if any(len(x)!=64 or any(c not in "0123456789abcdef" for c in x) for x in (transcript_hash,media_hash)):
        raise PrivateArtifactError("invalid binding hash")
    qidx=int(request["question_segment_index"]); qs=int(request["question_start_ms"])
    ans=int(request["answer_start_ms"]); end=int(request["answer_end_ms"])
    duration=int(request["media_duration_ms"]); last=int(version["last_ms"])
    question_cue=next((r for r in segments if int(r["segment_index"])==qidx),None)
    if not question_cue or not (0<=qs<ans<end<=last and end<=duration) or not (int(question_cue["starts_at_ms"])<=qs<int(question_cue["ends_at_ms"])):
        raise PrivateArtifactError("timestamps must have strict positive durations inside bound transcript/media")
    excerpt=bounded_excerpt(segments,qs,end)
    candidate={
        "candidate_id":hashlib.sha256(f"{transcript_id}:{qidx}:{_required(request.get('extractor_version'),'extractor')}".encode()).hexdigest()[:32],
        "resource_id":resource_id,"transcript_version_id":transcript_id,"playback_attempt_id":playback_id,
        "transcript_snapshot_sha256":transcript_hash,"media_snapshot_sha256":media_hash,
        "question_segment_index":qidx,"question_start_ms":qs,"answer_start_ms":ans,"answer_end_ms":end,
        "raw_excerpt_private":excerpt,"raw_excerpt_sha256":hashlib.sha256(excerpt.encode()).hexdigest(),
        "proposed_question_private":_required(request.get("proposed_question_private"),"proposed question"),
        "extractor_version":_required(request.get("extractor_version"),"extractor"),
        "origin":"generated","state":"extracted_private","private":True,"publishable":False,"events":[],
    }
    candidate["content_sha256"]=canonical_hash(candidate_content(candidate))
    return candidate


def transition(candidate: dict[str,Any], target: str, actor: str, reason: str, checklist: str) -> tuple[dict[str,Any],dict[str,Any]]:
    before=str(candidate.get("state")); target=_required(target,"target state")
    actor=_required(actor,"actor",200); reason=_required(reason,"reason"); checklist=_required(checklist,"checklist")
    expected=canonical_hash(candidate_content(candidate))
    if candidate.get("private") is not True or candidate.get("publishable") is not False or expected!=candidate.get("content_sha256"):
        raise PrivateArtifactError("stale or non-private candidate")
    if (before,target) not in ALLOWED_TRANSITIONS: raise PrivateArtifactError("invalid transition")
    after=dict(candidate)
    if before=="extracted_private":
        if candidate.get("origin")!="generated": raise PrivateArtifactError("invalid promotion source")
        after["origin"]="human_curated"
        after["content_sha256"]=canonical_hash(candidate_content(after))
    elif candidate.get("origin")!="human_curated": raise PrivateArtifactError("human curation required")
    if target=="editorial_review": after["privacy_reviewer"]=actor
    if target=="seek_verification":
        if actor==candidate.get("privacy_reviewer"): raise PrivateArtifactError("privacy and editorial reviewers must differ")
        after["editorial_reviewer"]=actor
    if target=="approved":
        if actor in {candidate.get("privacy_reviewer"),candidate.get("editorial_reviewer")}:
            raise PrivateArtifactError("privacy, editorial, and seek reviewers must differ")
        after["seek_reviewer"]=actor
    after["state"]=target
    event={"schema_version":1,"private":True,"subject_id":candidate["candidate_id"],"before_state":before,"after_state":target,
           "actor":actor,"reason":reason,"review_checklist_version":checklist,
           "before_sha256":hashlib.sha256(f"{candidate['content_sha256']}:{before}".encode()).hexdigest(),
           "after_sha256":hashlib.sha256(f"{after['content_sha256']}:{target}".encode()).hexdigest()}
    events=list(candidate.get("events",[])); events.append(event); after["events"]=events
    return after,event


def main() -> int:
    parser=argparse.ArgumentParser(description=__doc__)
    sub=parser.add_subparsers(dest="command",required=True)
    make=sub.add_parser("extract-private")
    for flag in ("transcript-version","segments","request","output"): make.add_argument(f"--{flag}",type=Path,required=True)
    review=sub.add_parser("transition-private")
    review.add_argument("--candidate",type=Path,required=True); review.add_argument("--target-state",required=True)
    review.add_argument("--actor",required=True); review.add_argument("--reason",required=True); review.add_argument("--checklist-version",required=True)
    review.add_argument("--output",type=Path,required=True); review.add_argument("--event-output",type=Path,required=True)
    args=parser.parse_args()
    if args.command=="extract-private":
        result=extract(read_private_json(args.transcript_version),read_private_json(args.segments),read_private_json(args.request))
        atomic_private_json(args.output,result); print("private_candidates=1 publishable=0"); return 0
    candidate=read_private_json(args.candidate)
    after,event=transition(candidate,args.target_state,args.actor,args.reason,args.checklist_version)
    atomic_private_json(args.output,after); atomic_private_json(args.event_output,event)
    print(f"state={after['state']} private=true publishable=false"); return 0

if __name__=="__main__":
    try: raise SystemExit(main())
    except PrivateArtifactError as exc: raise SystemExit(f"refused: {exc}")
