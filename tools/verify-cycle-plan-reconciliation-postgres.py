#!/usr/bin/env python3
"""Disposable PostgreSQL 16 proof for Wave 1 Planner reconciliation."""
from __future__ import annotations

import os
import json
import shutil
import subprocess
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "test/cycle-plan-reconciliation-v2/mock_current_schema.sql"
MIGRATION = ROOT / "supabase/migrations/20260822190000_cycle_plan_reconciliation_v2.sql"
BEHAVIOR = ROOT / "test/cycle-plan-reconciliation-v2/behavior.sql"


def executable(name: str) -> str:
    value = shutil.which(name)
    if not value:
        raise SystemExit(f"BLOCKED missing local executable: {name}")
    return value


def run(command: list[str], env: dict[str, str]) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(command, env=env, text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError(
            f"Command failed ({result.returncode}): {' '.join(command)}\n"
            f"{result.stdout}{result.stderr}"
        )
    return result


def verify_concurrent_first_cycle(base_command: list[str], env: dict[str, str]) -> None:
    user_id = "33333333-3333-4333-8333-333333333333"
    run([*base_command, "-c", f"INSERT INTO auth.users(id, email) VALUES ('{user_id}', 'carol@example.test')"], env)
    payload_template = """{
      "payload_version":"cycle-plan-v2",
      "logical_plan_key":"%s",
      "expected_version":null,
      "cycle":{"start_date":"2026-08-10","end_date":"2026-11-08","goal":"Concurrent goal"},
      "strategy":{},"offers":[],"limited_offers":[],"revenue_plan":{},"month_plans":[],
      "generated_projects":[],"generated_habits":[],"generated_tasks":[],"daily_plans":[],"details":{}
    }"""
    calls = [
        ("33333333-1111-4111-8111-111111111111", "33333333-aaaa-4aaa-8aaa-aaaaaaaaaaa1"),
        ("33333333-2222-4222-8222-222222222222", "33333333-bbbb-4bbb-8bbb-bbbbbbbbbbb2"),
    ]
    gate_sql = (
        "BEGIN; SELECT pg_advisory_xact_lock(hashtextextended("
        f"'{user_id}:2026-07-01', 0)); SELECT pg_sleep(1); COMMIT;"
    )
    gate = subprocess.Popen([*base_command, "-q", "-c", gate_sql], env=env, text=True,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    time.sleep(0.2)
    workers: list[subprocess.Popen[str]] = []
    for logical_key, request_id in calls:
        payload = payload_template % logical_key
        sql = (
            f"SET request.jwt.claims = '{{\"sub\":\"{user_id}\",\"role\":\"authenticated\"}}'; "
            f"SELECT public.reconcile_cycle_plan_v2('{request_id}', '{payload}'::jsonb)::text;"
        )
        workers.append(subprocess.Popen([*base_command, "-Atq", "-c", sql], env=env, text=True,
                                        stdout=subprocess.PIPE, stderr=subprocess.PIPE))
    gate_stdout, gate_stderr = gate.communicate(timeout=10)
    if gate.returncode:
        raise RuntimeError(f"Concurrency gate failed\n{gate_stdout}{gate_stderr}")
    receipts = []
    for worker in workers:
        stdout, stderr = worker.communicate(timeout=15)
        if worker.returncode:
            raise RuntimeError(f"Concurrent reconciliation failed\n{stdout}{stderr}")
        receipts.append(json.loads(stdout.strip()))
    if len({receipt["cycle_id"] for receipt in receipts}) != 1:
        raise RuntimeError(f"Concurrent first-cycle calls created different cycles: {receipts}")
    if len({receipt["planner_receipt_id"] for receipt in receipts}) != 1:
        raise RuntimeError(f"Concurrent first-cycle calls created different canonical receipts: {receipts}")
    count = run([
        *base_command, "-Atq", "-c",
        f"SELECT count(*) FROM public.cycles_90_day WHERE user_id = '{user_id}'",
    ], env).stdout.strip()
    if count != "1":
        raise RuntimeError(f"Concurrent first-cycle calls created {count} cycles")
    print("PASS concurrent first-cycle creation converged to one cycle and canonical receipt")


def main() -> None:
    initdb = executable("initdb")
    pg_ctl = executable("pg_ctl")
    psql = executable("psql")
    version = run([psql, "--version"], os.environ.copy()).stdout.strip()
    if " 16." not in version:
        raise SystemExit(f"BLOCKED PostgreSQL 16 required, found: {version}")

    port = 55439
    env = os.environ.copy()
    env.update({
        "LC_ALL": "C",
        "LANG": "C",
    })
    with tempfile.TemporaryDirectory(prefix="cycle-plan-v2-pg-", dir="/tmp") as temp:
        base = Path(temp)
        data = base / "data"
        socket_dir = base / "socket"
        socket_dir.mkdir()
        log = base / "postgres.log"
        started = False
        try:
            try:
                run([initdb, "-D", str(data), "-A", "trust", "-U", "postgres", "--no-instructions",
                     "-c", "shared_memory_type=mmap", "-c", "dynamic_shared_memory_type=mmap"], env)
            except RuntimeError as error:
                if "could not create shared memory segment: Operation not permitted" in str(error):
                    raise SystemExit(
                        "BLOCKED PostgreSQL 16 initdb cannot create its bootstrap shared-memory segment "
                        "inside this managed sandbox; no database behavior claim was made."
                    ) from error
                raise
            run([
                pg_ctl, "-D", str(data), "-l", str(log),
                "-o", f"-p {port} -k {socket_dir} -h ''", "-w", "start",
            ], env)
            started = True
            base_command = [
                psql, "-X", "-v", "ON_ERROR_STOP=1", "-U", "postgres",
                "-h", str(socket_dir), "-p", str(port), "-d", "postgres",
            ]
            for label, sql_file in [
                ("mock current-main schema", FIXTURE),
                ("candidate apply 1", MIGRATION),
                ("candidate apply 2", MIGRATION),
                ("behavior suite", BEHAVIOR),
            ]:
                result = run([*base_command, "-f", str(sql_file)], env)
                print(f"PASS {label}")
                if label == "behavior suite" and result.stdout.strip():
                    print(result.stdout.strip())
            verify_concurrent_first_cycle(base_command, env)
            print(f"PASS native disposable {version} behavioral probe")
        finally:
            if started:
                subprocess.run(
                    [pg_ctl, "-D", str(data), "-m", "fast", "-w", "stop"],
                    env=env, text=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                )


if __name__ == "__main__":
    main()
