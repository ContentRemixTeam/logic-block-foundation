#!/usr/bin/env python3
"""Reconcile Dropbox upload receipts against exact manifest/worker/source hashes."""
from __future__ import annotations

import argparse
from pathlib import Path

from replay_vault_foundation import reconcile_dropbox_receipts, write_json


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--receipts", type=Path, required=True)
    parser.add_argument("--worker", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = reconcile_dropbox_receipts(args.manifest, args.receipts, args.worker)
    write_json(args.output, result)
    print(f"accepted={result['counts']['accepted']} rejected={result['counts']['rejected']}")
    return 0 if not result["rejected"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
