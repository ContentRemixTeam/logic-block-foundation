#!/usr/bin/env python3
"""Disposable PostgreSQL proof for the hidden Coaching Queue pilot."""
from __future__ import annotations

import os
import shutil
import socket
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "test/coaching-queue/mock_schemas.sql"
MIGRATION = ROOT / "supabase/migrations/20260811130000_hidden_coaching_queue_pilot.sql"
TESTS = ROOT / "test/coaching-queue/sql_tests.sql"


def executable(name: str) -> str:
    value = shutil.which(name)
    if not value:
        raise SystemExit(f"Missing required local executable: {name}")
    return value


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def run(command: list[str], env: dict[str, str]) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(command, env=env, text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError(
            f"Command failed ({result.returncode}): {' '.join(command)}\n"
            f"{result.stdout}{result.stderr}"
        )
    return result


def verify_concurrent_completion(base_command: list[str], env: dict[str, str]) -> None:
    request = run([
        *base_command, "-Atc",
        "SELECT request_id FROM public.coaching_requests "
        "WHERE user_id='33333333-3333-3333-3333-333333333333' "
        "AND call_id=(SELECT call_id FROM public.coaching_calls WHERE title='Next coaching call')",
    ], env).stdout.strip()
    if not request:
        raise RuntimeError("Concurrent replay fixture request was not found")

    run([*base_command, "-c", f"""
      CREATE OR REPLACE FUNCTION public.slow_test_coaching_outcome() RETURNS trigger
      LANGUAGE plpgsql AS $$ BEGIN
        IF NEW.request_id = '{request}'::uuid THEN PERFORM pg_sleep(1); END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER slow_test_coaching_outcome
      BEFORE INSERT ON public.coaching_outcomes
      FOR EACH ROW EXECUTE FUNCTION public.slow_test_coaching_outcome();
    """], env)

    call_sql = (
        "SELECT set_config('request.jwt.claims', "
        "'{\"sub\":\"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\",\"role\":\"authenticated\"}', false);"
        f"SELECT public.complete_coaching_request('{request}', 'completed', 'Concurrent decision', "
        "'Concurrent next action', current_date + 1, NULL, false, NULL, true);"
    )
    processes = [subprocess.Popen(
        [*base_command, "-Atc", call_sql], env=env, text=True,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    ) for _ in range(2)]
    outputs: list[str] = []
    for process in processes:
        stdout, stderr = process.communicate(timeout=20)
        if process.returncode:
            raise RuntimeError(f"Concurrent completion failed ({process.returncode}): {stdout}{stderr}")
        outputs.append(stdout)
    joined = "\n".join(outputs)
    if joined.count('"replayed": false') != 1 or joined.count('"replayed": true') != 1:
        raise RuntimeError(f"Concurrent completion did not return create + replay receipts:\n{joined}")

    counts = run([*base_command, "-Atc", f"""
      SELECT (SELECT count(*) FROM public.coaching_outcomes WHERE request_id='{request}') || ':' ||
             (SELECT count(*) FROM public.tasks WHERE external_id='coaching:{request}');
    """], env).stdout.strip()
    if counts != "1:1":
        raise RuntimeError(f"Concurrent completion persisted wrong counts: {counts}")


def main() -> None:
    initdb = executable("initdb")
    pg_ctl = executable("pg_ctl")
    psql = executable("psql")
    port = free_port()
    env = os.environ.copy()
    env.update({"LC_ALL": "en_US.UTF-8", "LANG": "en_US.UTF-8"})

    with tempfile.TemporaryDirectory(prefix="coaching-queue-pg-", dir="/tmp") as temp:
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
            receipts = []
            for label, sql_file in [
                ("mock schemas", FIXTURE),
                ("migration apply 1", MIGRATION),
                ("migration apply 2", MIGRATION),
                ("behavior tests", TESTS),
            ]:
                result = run([*base_command, "-f", str(sql_file)], env)
                receipts.append(f"PASS {label}: {result.stdout.strip().splitlines()[-1] if result.stdout.strip() else 'ok'}")
            verify_concurrent_completion(base_command, env)
            receipts.append("PASS concurrent completion: one creation + one successful replay")
            print("\n".join(receipts))
            print("PASS disposable PostgreSQL Coaching Queue suite")
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
