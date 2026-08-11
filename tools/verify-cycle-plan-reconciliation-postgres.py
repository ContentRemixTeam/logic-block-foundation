#!/usr/bin/env python3
"""Disposable PostgreSQL proof for the planner reconciliation transaction."""
from __future__ import annotations

import os
import shutil
import socket
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "test/cycle-plan-reconciliation/mock_schemas.sql"
MIGRATION = ROOT / "supabase/migrations/20260809160000_cycle_plan_reconciliation.sql"
TESTS = ROOT / "test/cycle-plan-reconciliation/sql_tests.sql"


def executable(name: str) -> str:
    value = shutil.which(name)
    if not value:
        raise SystemExit(f"Missing required local executable: {name}")
    return value


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def run(command: list[str], env: dict[str, str], *, capture: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(command, env=env, text=True, capture_output=capture)
    if result.returncode:
        output = (result.stdout or "") + (result.stderr or "")
        raise RuntimeError(f"Command failed ({result.returncode}): {' '.join(command)}\n{output}")
    return result


def main() -> None:
    initdb = executable("initdb")
    pg_ctl = executable("pg_ctl")
    psql = executable("psql")
    port = free_port()
    env = os.environ.copy()
    env.update({"LC_ALL": "en_US.UTF-8", "LANG": "en_US.UTF-8"})

    with tempfile.TemporaryDirectory(prefix="cycle-plan-pg-", dir="/tmp") as temp:
        base = Path(temp)
        data = base / "data"
        socket_dir = base / "socket"
        socket_dir.mkdir()
        log = base / "postgres.log"
        started = False
        try:
            run([initdb, "-D", str(data), "-A", "trust", "-U", "postgres", "--no-instructions"], env)
            run([
                pg_ctl, "-D", str(data), "-l", str(log),
                "-o", f"-p {port} -k {socket_dir} -h 127.0.0.1", "-w", "start",
            ], env)
            started = True
            base_command = [
                psql, "-X", "-v", "ON_ERROR_STOP=1", "-U", "postgres",
                "-h", str(socket_dir), "-p", str(port), "-d", "postgres",
            ]
            outputs = []
            for label, sql_file in [
                ("mock schemas", FIXTURE),
                ("migration apply 1", MIGRATION),
                ("migration apply 2", MIGRATION),
                ("behavior tests", TESTS),
            ]:
                result = run([*base_command, "-f", str(sql_file)], env)
                outputs.append(f"PASS {label}\n{result.stdout.strip()}")

            concurrent_payload = r'''{
              "payload_version":"cycle-plan-v1",
              "plan_key":"concurrent-plan-one",
              "cycle":{"start_date":"2027-01-01","end_date":"2027-03-31","goal":"Concurrent save proof"},
              "implementation_project":{"name":"Concurrent plan"},
              "tasks":[{"generation_key":"day-1:0","task_text":"One concurrent move"}]
            }'''
            concurrent_request_ids = [
                "cccccccc-cccc-cccc-cccc-cccccccccccc",
                "dddddddd-dddd-dddd-dddd-dddddddddddd",
            ]
            concurrent_sql = [
                (
                    "SELECT set_config('request.jwt.claims', "
                    "'{\"sub\":\"11111111-1111-1111-1111-111111111111\",\"role\":\"authenticated\"}', false); "
                    "SELECT public.reconcile_cycle_plan("
                    f"'{request_id}'::uuid, "
                    f"$payload${concurrent_payload}$payload$::jsonb);"
                )
                for request_id in concurrent_request_ids
            ]
            processes = [
                subprocess.Popen(
                    [*base_command, "-At", "-c", sql],
                    env=env,
                    text=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                )
                for sql in concurrent_sql
            ]
            concurrent_outputs = []
            for request_id, process in zip(concurrent_request_ids, processes):
                stdout, stderr = process.communicate(timeout=30)
                if process.returncode:
                    raise RuntimeError(f"Concurrent reconciliation failed: {stderr}")
                if f'"request_id": "{request_id}"' not in stdout:
                    raise RuntimeError(f"Caller {request_id} could not verify its receipt:\n{stdout}")
                concurrent_outputs.append(stdout)
            combined = "\n".join(concurrent_outputs)
            if combined.count('"replayed": false') != 1 or combined.count('"replayed": true') != 1:
                raise RuntimeError(f"Expected one original and one replayed concurrent result:\n{combined}")

            concurrency_assertion = r'''DO $$
            DECLARE v_count integer;
            BEGIN
              SELECT count(*) INTO v_count FROM public.cycle_plan_reconciliation_requests
                WHERE request_id IN (
                  'cccccccc-cccc-cccc-cccc-cccccccccccc',
                  'dddddddd-dddd-dddd-dddd-dddddddddddd'
                );
              IF v_count <> 1 THEN RAISE EXCEPTION 'concurrent request ledger count %', v_count; END IF;
              SELECT count(*) INTO v_count FROM public.cycles_90_day
                WHERE goal = 'Concurrent save proof';
              IF v_count <> 1 THEN RAISE EXCEPTION 'concurrent cycle count %', v_count; END IF;
              SELECT count(*) INTO v_count FROM public.projects p
                JOIN public.cycles_90_day c ON c.cycle_id = p.cycle_id
                WHERE c.goal = 'Concurrent save proof';
              IF v_count <> 1 THEN RAISE EXCEPTION 'concurrent project count %', v_count; END IF;
              SELECT count(*) INTO v_count FROM public.tasks t
                JOIN public.cycles_90_day c ON c.cycle_id = t.cycle_id
                WHERE c.goal = 'Concurrent save proof';
              IF v_count <> 1 THEN RAISE EXCEPTION 'concurrent task count %', v_count; END IF;
            END $$;'''
            run([*base_command, "-c", concurrency_assertion], env)
            outputs.append("PASS concurrent duplicate request serialization")
            print("\n".join(outputs))
            print("PASS disposable PostgreSQL planner reconciliation suite")
        finally:
            if started:
                subprocess.run(
                    [pg_ctl, "-D", str(data), "-m", "fast", "-w", "stop"],
                    env=env,
                    text=True,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )


if __name__ == "__main__":
    main()
