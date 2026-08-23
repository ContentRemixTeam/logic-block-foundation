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
RECEIPT_CONTRACT = ROOT / "tools/verify-cycle-plan-receipt-contract.mjs"


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
    if len({receipt["payload_hash"] for receipt in receipts}) != 2:
        raise RuntimeError(f"Concurrent callers falsely reused one payload hash: {receipts}")
    readbacks = json.loads(run([
        *base_command, "-Atq", "-c",
        "SELECT jsonb_agg(jsonb_build_object("
        "'receipt', receipt, 'readback', jsonb_build_object("
        "'request_id', request_id, 'plan_id', plan_id, 'planner_receipt_id', planner_receipt_id, "
        "'cycle_id', cycle_id, 'payload_hash', payload_hash, 'content_hash', content_hash, "
        "'resulting_version', resulting_version, 'status', status, 'receipt', receipt)) ORDER BY request_id)::text "
        "FROM public.cycle_plan_reconciliation_requests_v2 "
        f"WHERE user_id = '{user_id}';",
    ], env).stdout.strip())
    contract = subprocess.run(
        [executable("node"), str(RECEIPT_CONTRACT)], input=json.dumps(readbacks),
        env=env, text=True, capture_output=True,
    )
    if contract.returncode:
        raise RuntimeError(f"Client receipt readback contract rejected a concurrent caller\n{contract.stdout}{contract.stderr}")
    count = run([
        *base_command, "-Atq", "-c",
        f"SELECT count(*) FROM public.cycles_90_day WHERE user_id = '{user_id}'",
    ], env).stdout.strip()
    if count != "1":
        raise RuntimeError(f"Concurrent first-cycle calls created {count} cycles")
    print("PASS concurrent first-cycle responses converged canonically and each passed the real client receipt contract")


def verify_concurrent_draft_cas(base_command: list[str], env: dict[str, str]) -> None:
    user_id = "88888888-8888-4888-8888-888888888888"
    run([*base_command, "-c", f"INSERT INTO auth.users(id, email) VALUES ('{user_id}', 'draft-race@example.test')"], env)
    created = json.loads(run([
        *base_command, "-Atq", "-c",
        f"SET request.jwt.claims = '{{\"sub\":\"{user_id}\",\"role\":\"authenticated\"}}'; "
        "SELECT public.save_cycle_draft_v2('{\"goal\":\"base\"}', 1, NULL, NULL, "
        "'88888888-0000-4000-8000-000000000001', NULL, NULL, NULL, true)::text;",
    ], env).stdout.strip())
    calls = [
        ("88888888-0000-4000-8000-000000000002", "race A"),
        ("88888888-0000-4000-8000-000000000003", "race B"),
    ]
    workers: list[subprocess.Popen[str]] = []
    for revision, goal in calls:
        sql = (
            f"SET request.jwt.claims = '{{\"sub\":\"{user_id}\",\"role\":\"authenticated\"}}'; "
            f"SELECT public.save_cycle_draft_v2('{{\"goal\":\"{goal}\"}}', 2, NULL, NULL, "
            f"'{revision}', '{created['id']}', '{created['updated_at']}', '{created['draft_revision']}', false)::text;"
        )
        workers.append(subprocess.Popen(
            [*base_command, "-Atq", "-c", sql], env=env, text=True,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        ))
    results = []
    for worker in workers:
        stdout, stderr = worker.communicate(timeout=15)
        if worker.returncode:
            raise RuntimeError(f"Concurrent draft CAS worker failed\n{stdout}{stderr}")
        results.append(json.loads(stdout.strip()))
    if sum(result.get("success") is True for result in results) != 1:
        raise RuntimeError(f"Concurrent stale saves did not produce exactly one winner: {results}")
    if sum(result.get("conflict_kind") == "draft_changed" for result in results) != 1:
        raise RuntimeError(f"Concurrent stale saves did not produce one typed conflict: {results}")
    row = run([
        *base_command, "-Atq", "-F", "|", "-c",
        f"SELECT draft_data->>'goal', draft_revision::text FROM public.cycle_drafts WHERE user_id = '{user_id}';",
    ], env).stdout.strip()
    winning_goal = next(goal for revision, goal in calls if revision in row)
    if not row.startswith(f"{winning_goal}|"):
        raise RuntimeError(f"Concurrent losing save mutated the winner: {row} / {results}")
    print("PASS concurrent cloud draft CAS produced one winner, one typed stale conflict, and no loser mutation")


def verify_concurrent_legacy_adoption(base_command: list[str], env: dict[str, str]) -> None:
    user_id = "77777777-7777-4777-8777-777777777777"
    legacy_cycle = run([
        *base_command, "-Atq", "-c",
        "INSERT INTO auth.users(id, email) VALUES "
        f"('{user_id}', 'grace@example.test'); "
        "INSERT INTO public.cycles_90_day(user_id, start_date, end_date, goal) VALUES "
        f"('{user_id}', '2029-01-05', '2029-04-04', 'Legacy concurrent cycle') RETURNING cycle_id;",
    ], env).stdout.strip()
    run([
        *base_command, "-c",
        "INSERT INTO public.daily_plans(user_id, cycle_id, date, top_3_today, thought, feeling, made_offer) VALUES "
        f"('{user_id}', '{legacy_cycle}', '2029-01-06', '[\"Member owned\"]', 'Member thought', 'steady', true);",
    ], env)
    payload_template = """{
      "payload_version":"cycle-plan-v2",
      "logical_plan_key":"%s",
      "expected_version":null,
      "cycle":{"start_date":"2029-01-05","end_date":"2029-04-04","goal":"Concurrent adopted goal"},
      "strategy":{},"offers":[],"limited_offers":[],"revenue_plan":{},"month_plans":[],
      "generated_projects":[],"generated_habits":[],"generated_tasks":[],
      "daily_plans":[{"date":"2029-01-06","top_3_today":["Generated overwrite"],"thought":"Generated overwrite"}],
      "details":{}
    }"""
    calls = [
        ("77777777-1111-4111-8111-111111111111", "77777777-aaaa-4aaa-8aaa-aaaaaaaaaaa1"),
        ("77777777-2222-4222-8222-222222222222", "77777777-bbbb-4bbb-8bbb-bbbbbbbbbbb2"),
    ]
    gate_sql = (
        "BEGIN; SELECT pg_advisory_xact_lock(hashtextextended("
        f"'{user_id}:2029-01-01', 0)); SELECT pg_sleep(1); COMMIT;"
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
        raise RuntimeError(f"Legacy concurrency gate failed\n{gate_stdout}{gate_stderr}")
    receipts = []
    for worker in workers:
        stdout, stderr = worker.communicate(timeout=15)
        if worker.returncode:
            raise RuntimeError(f"Concurrent legacy adoption failed\n{stdout}{stderr}")
        receipts.append(json.loads(stdout.strip()))
    if {receipt["cycle_id"] for receipt in receipts} != {legacy_cycle}:
        raise RuntimeError(f"Concurrent calls did not adopt the one legacy cycle: {receipts}")
    if len({receipt["planner_receipt_id"] for receipt in receipts}) != 1:
        raise RuntimeError(f"Concurrent legacy calls did not converge on one receipt: {receipts}")
    state = run([
        *base_command, "-Atq", "-F", "|", "-c",
        "SELECT count(*), top_3_today::text, thought, feeling, made_offer::text "
        "FROM public.daily_plans JOIN public.cycles_90_day USING (cycle_id) "
        f"WHERE daily_plans.user_id = '{user_id}' AND date = '2029-01-06' "
        "GROUP BY top_3_today, thought, feeling, made_offer;",
    ], env).stdout.strip()
    if state != '1|["Member owned"]|Member thought|steady|true':
        raise RuntimeError(f"Concurrent adoption overwrote member Daily Plan state: {state}")
    count = run([
        *base_command, "-Atq", "-c",
        f"SELECT count(*) FROM public.cycles_90_day WHERE user_id = '{user_id}'",
    ], env).stdout.strip()
    if count != "1":
        raise RuntimeError(f"Concurrent legacy adoption created {count} owner cycles")
    print("PASS concurrent legacy adoption/create converged and preserved the edited Daily Plan")


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
            verify_concurrent_draft_cas(base_command, env)
            verify_concurrent_legacy_adoption(base_command, env)
            print(f"PASS native disposable {version} behavioral probe")
        finally:
            if started:
                subprocess.run(
                    [pg_ctl, "-D", str(data), "-m", "fast", "-w", "stop"],
                    env=env, text=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                )


if __name__ == "__main__":
    main()
