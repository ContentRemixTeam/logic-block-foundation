#!/usr/bin/env python3
"""Build an offline, deterministic CRDB Master ↔ media crosswalk artifact."""
from __future__ import annotations

import argparse
from pathlib import Path

from replay_vault_foundation import _load_records, build_crdb_crosswalk, sha256_file, write_json


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--crdb", type=Path, required=True, help="Private CRDB snapshot JSON/CSV")
    parser.add_argument("--media", type=Path, required=True, help="Private media snapshot JSON/CSV")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--run-manifest", type=Path, help="Exact run manifest to hash; defaults to CRDB snapshot")
    args = parser.parse_args()
    run_sha = sha256_file(args.run_manifest or args.crdb)
    artifact = build_crdb_crosswalk(_load_records(args.crdb), _load_records(args.media), run_sha)
    # VTT rows are caption evidence only; they are intentionally excluded from canonical CRDB input.
    write_json(args.output, artifact)
    print(f"crosswalk records={len(artifact['records'])} counts={artifact['counts']} run_sha256={run_sha}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
