#!/usr/bin/env python3
"""Verify every protected Replay Vault file and reject scope additions."""
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "outputs/mastermind-success-path-overnight/replay-vault-protected-baseline.json"


def is_protected_scope(path: str) -> bool:
    lower = path.lower()
    return (
        path == "src/pages/ReplayVault.tsx"
        or path.startswith("src/components/replay-vault/")
        or path.startswith("supabase/functions/_shared/replayVault")
        or path.startswith("supabase/functions/_shared/vault")
        or path.startswith("supabase/functions/search-mastermind-resources/")
        or path.startswith("supabase/functions/vault-member-")
        or (path.startswith("supabase/migrations/") and "replay_vault" in lower)
        or (path.startswith("tools/") and ("replay-vault" in lower or "replay_vault" in lower))
    )


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    expected = {entry["path"]: entry for entry in manifest["files"]}
    if manifest["file_count"] != 74 or len(expected) != 74:
        raise SystemExit(f"FAIL protected manifest expected 74 unique files, found {len(expected)}")

    tracked = subprocess.run(
        ["git", "ls-files"], cwd=ROOT, check=True, text=True, capture_output=True,
    ).stdout.splitlines()
    actual_scope = {path for path in tracked if is_protected_scope(path)}
    base_tracked = subprocess.run(
        ["git", "ls-tree", "-r", "--name-only", manifest["base_commit"]],
        cwd=ROOT, check=True, text=True, capture_output=True,
    ).stdout.splitlines()
    base_scope = {path for path in base_tracked if is_protected_scope(path)}
    missing = sorted(set(expected) - actual_scope)
    additions = sorted(actual_scope - base_scope)
    removals = sorted(base_scope - actual_scope)
    mismatches: list[str] = []
    for relative_path, entry in expected.items():
        source = ROOT / relative_path
        if not source.is_file():
            mismatches.append(f"missing:{relative_path}")
            continue
        content = source.read_bytes()
        digest = hashlib.sha256(content).hexdigest()
        if len(content) != entry["bytes"] or digest != entry["sha256"]:
            mismatches.append(
                f"changed:{relative_path}:bytes={len(content)}:sha256={digest}"
            )

    if missing or additions or removals or mismatches:
        if missing:
            print("Missing protected paths:", *missing, sep="\n  ")
        if additions:
            print("Unrecorded protected-scope paths:", *additions, sep="\n  ")
        if removals:
            print("Removed protected-scope paths:", *removals, sep="\n  ")
        if mismatches:
            print("Protected content mismatches:", *mismatches, sep="\n  ")
        raise SystemExit(1)

    print("PASS protected Replay Vault baseline: 74/74 hashes and byte counts match; 0 scope additions")


if __name__ == "__main__":
    main()
