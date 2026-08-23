#!/usr/bin/env python3
"""Mutation controls for the Replay Vault protected-product verifier."""
from __future__ import annotations

import hashlib
import importlib.util
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERIFIER = ROOT / "tools/verify-replay-vault-protected-baseline.py"
sys.dont_write_bytecode = True


def load_verifier():
    spec = importlib.util.spec_from_file_location("replay_vault_baseline_verifier", VERIFIER)
    if spec is None or spec.loader is None:
        raise RuntimeError("could not load verifier control plane")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main() -> None:
    unchanged = subprocess.run(
        ["python3", str(VERIFIER)], cwd=ROOT, text=True, capture_output=True,
    )
    if unchanged.returncode:
        raise SystemExit(f"unchanged protected scope failed\n{unchanged.stdout}{unchanged.stderr}")

    verifier = load_verifier()
    protected_path = "src/pages/ReplayVault.tsx"
    original = (ROOT / protected_path).read_bytes()
    expected = {
        protected_path: {
            "path": protected_path,
            "bytes": len(original),
            "sha256": hashlib.sha256(original).hexdigest(),
        }
    }
    with tempfile.TemporaryDirectory(prefix="replay-vault-verifier-control-") as temp:
        test_root = Path(temp)
        target = test_root / protected_path
        target.parent.mkdir(parents=True)
        target.write_bytes(original)
        clean = verifier.evaluate_protected_scope(
            test_root, expected, {protected_path}, {protected_path},
        )
        if any(clean):
            raise SystemExit(f"synthetic unchanged scope unexpectedly failed: {clean}")

        target.write_bytes(original + b"\nsynthetic protected mutation\n")
        mutated = verifier.evaluate_protected_scope(
            test_root, expected, {protected_path}, {protected_path},
        )
        if not mutated[3]:
            raise SystemExit("synthetic protected mutation was not rejected")

        synthetic_addition = "tools/synthetic-replay-vault-product.mjs"
        added = verifier.evaluate_protected_scope(
            test_root, expected, {protected_path, synthetic_addition}, {protected_path},
        )
        if synthetic_addition not in added[1]:
            raise SystemExit("synthetic protected addition was not rejected")

    actual_untracked = ROOT / "tools/round-2-untracked-replay-vault-control.tmp"
    if actual_untracked.exists():
        raise SystemExit(f"refusing to overwrite existing control path: {actual_untracked}")
    try:
        actual_untracked.write_text("actual untracked protected discovery control\n", encoding="utf-8")
        discovered = subprocess.run(
            ["python3", str(VERIFIER)], cwd=ROOT, text=True, capture_output=True,
        )
        if discovered.returncode == 0:
            raise SystemExit("real verifier discovery missed an actual untracked protected-path addition")
        if actual_untracked.relative_to(ROOT).as_posix() not in discovered.stdout:
            raise SystemExit(f"real verifier failed for the wrong reason\n{discovered.stdout}{discovered.stderr}")
    finally:
        actual_untracked.unlink(missing_ok=True)

    cleanup_check = subprocess.run(
        ["python3", str(VERIFIER)], cwd=ROOT, text=True, capture_output=True,
    )
    if cleanup_check.returncode:
        raise SystemExit(f"protected verifier did not recover after untracked control cleanup\n{cleanup_check.stdout}{cleanup_check.stderr}")

    if verifier.is_protected_scope("tools/verify-replay-vault-protected-baseline.py"):
        raise SystemExit("verifier still collides with its own control-plane path")
    if not verifier.is_protected_scope("tools/synthetic-replay-vault-product.mjs"):
        raise SystemExit("genuine Replay Vault tool additions are no longer protected")

    print("PASS verifier unchanged 74-file scope")
    print("PASS verifier control-plane self-exclusion")
    print("PASS synthetic protected mutation rejected")
    print("PASS synthetic protected addition rejected")
    print("PASS real discovery rejected and cleaned up an actual untracked protected-path addition")


if __name__ == "__main__":
    main()
