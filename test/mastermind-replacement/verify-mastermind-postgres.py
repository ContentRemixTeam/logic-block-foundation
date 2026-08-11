#!/usr/bin/env python3
"""PostgreSQL 16 behavioral harness for the Mastermind replacement migration."""

from __future__ import annotations

import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import threading
from concurrent.futures import ThreadPoolExecutor


ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / "supabase/migrations/20260811120000_mastermind_planner_replacement.sql"
FIXTURE = Path(__file__).with_name("postgres-fixture.sql")
PG_BIN = Path("/opt/homebrew/opt/postgresql@16/bin")
USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
CYCLE_A = "11111111-1111-4111-8111-111111111111"
CYCLE_B = "22222222-2222-4222-8222-222222222222"
CYCLE_UNCONFIRMED = "33333333-3333-4333-8333-333333333333"
CYCLE_CONCURRENT = "44444444-4444-4444-8444-444444444444"
RECEIPT_A = "aaaaaaaa-0000-4000-8000-000000000001"
RECEIPT_CONCURRENT = "aaaaaaaa-0000-4000-8000-000000000004"
RECEIPT_A_NEW = "aaaaaaaa-0000-4000-8000-000000000005"


class HarnessFailure(RuntimeError):
    pass


def main() -> None:
    for binary in ("initdb", "pg_ctl", "psql"):
        if not (PG_BIN / binary).is_file():
            raise HarnessFailure(f"missing required PostgreSQL binary: {PG_BIN / binary}")

    temp_root = Path(tempfile.mkdtemp(prefix="mastermind-pg16-", dir="/tmp"))
    data_dir = temp_root / "data"
    socket_dir = temp_root / "socket"
    log_path = temp_root / "postgres.log"
    socket_dir.mkdir()
    env = os.environ.copy()
    env.update({"LC_ALL": "en_US.UTF-8", "LANG": "en_US.UTF-8"})
    started = False

    try:
        run([PG_BIN / "initdb", "-D", data_dir, "--encoding=UTF8", "--auth=trust"], env=env)
        run([
            PG_BIN / "pg_ctl", "-D", data_dir, "-l", log_path, "-o",
            f"-k {socket_dir} -h '' -F -p 55439", "start", "-w"
        ], env=env)
        started = True

        connection = [PG_BIN / "psql", "-X", "-v", "ON_ERROR_STOP=1", "-h", socket_dir, "-p", "55439", "-d", "postgres"]

        def sql(statement: str, *, user: str | None = None, role: str | None = None, ok: bool = True) -> str:
            prefix = ""
            if user is not None:
                claims = json.dumps({"sub": user, "role": role or "authenticated"}, separators=(",", ":"))
                prefix += f"SET request.jwt.claims = '{claims}';"
            if role is not None:
                prefix += f"SET ROLE {role};"
            result = subprocess.run(
                [str(x) for x in connection] + ["-q", "-A", "-t", "-c", prefix + statement],
                cwd=ROOT, env=env, text=True, capture_output=True
            )
            if ok and result.returncode != 0:
                raise HarnessFailure(f"SQL unexpectedly failed:\n{statement}\n{result.stderr.strip()}")
            if not ok and result.returncode == 0:
                raise HarnessFailure(f"SQL unexpectedly succeeded:\n{statement}\n{result.stdout.strip()}")
            return result.stdout.strip()

        def concurrent_authenticated_sql(statement: str) -> list[str]:
            """Run the same RPC from independent authenticated psql sessions."""
            barrier = threading.Barrier(2)

            def client() -> str:
                claims = json.dumps({"sub": USER_A, "role": "authenticated"}, separators=(",", ":"))
                barrier.wait(timeout=10)
                result = subprocess.run(
                    [str(x) for x in connection] + [
                        "-q", "-A", "-t", "-c",
                        f"SET request.jwt.claims = '{claims}';SET ROLE authenticated;{statement}",
                    ],
                    cwd=ROOT, env=env, text=True, capture_output=True,
                )
                if result.returncode != 0:
                    raise HarnessFailure(
                        f"concurrent authenticated SQL failed:\n{statement}\n{result.stderr.strip()}"
                    )
                return result.stdout.strip()

            with ThreadPoolExecutor(max_workers=2) as executor:
                futures = [executor.submit(client) for _ in range(2)]
                return [future.result() for future in futures]

        run(connection + ["-f", FIXTURE], cwd=ROOT, env=env)
        run(connection + ["-f", MIGRATION], cwd=ROOT, env=env)
        passed: list[str] = []

        def prove(label: str, condition: bool, detail: str = "") -> None:
            if not condition:
                raise HarnessFailure(f"{label}: {detail or 'assertion failed'}")
            passed.append(label)
            print(f"PASS: {label}")

        prove("exact migration applies with ON_ERROR_STOP=1", True)
        catalog = sql("SELECT count(*), count(*) FILTER (WHERE status='Gap' AND resource_id IS NULL) FROM public.mastermind_curriculum_catalog;")
        prove("catalog has exactly 24 all-Gap null resources", catalog == "24|24", catalog)

        for operation in (
            "SELECT * FROM public.mastermind_curriculum_catalog LIMIT 1;",
            "INSERT INTO public.mastermind_curriculum_catalog(manifest_version,slot_order,milestone_id,stage_id,label,member_output,source_title,source_owner,status,provenance_note) VALUES('mastermind-curriculum-v1',1,'x','offer','x','x','x','Faith Mariah','Gap','x');",
            "UPDATE public.mastermind_curriculum_catalog SET label='tampered' WHERE slot_order=1;",
        ):
            sql(operation, user=USER_A, role="authenticated", ok=False)
        prove("authenticated cannot SELECT/INSERT/UPDATE catalog", True)

        sql("INSERT INTO public.mastermind_onboarding_profiles(user_id,business_context) VALUES(auth.uid(),'owner-a');", user=USER_A, role="authenticated")
        owner_a = sql("SELECT business_context FROM public.mastermind_onboarding_profiles WHERE user_id=auth.uid();", user=USER_A, role="authenticated")
        owner_b_view = sql(f"SELECT count(*) FROM public.mastermind_onboarding_profiles WHERE user_id='{USER_A}';", user=USER_B, role="authenticated")
        sql(f"INSERT INTO public.mastermind_onboarding_profiles(user_id) VALUES('{USER_A}');", user=USER_B, role="authenticated", ok=False)
        prove("onboarding owner A allowed and owner B denied", owner_a == "owner-a" and owner_b_view == "0")

        confirm = lambda cycle, stage, milestone, receipt, user=USER_A, ok=True: sql(
            f"SELECT public.confirm_mastermind_success_path('{cycle}','{stage}','{milestone}','{receipt}');",
            user=user, role="authenticated", ok=ok
        )
        confirm(CYCLE_A, "offer", "offer-focus", RECEIPT_A, user=USER_B, ok=False)
        confirm(CYCLE_A, "offer", "offer-focus", "aaaaaaaa-0000-4000-8000-000000000099", ok=False)
        confirm(CYCLE_A, "bogus", "offer-focus", RECEIPT_A, ok=False)
        confirm(CYCLE_A, "offer", "find-path", RECEIPT_A, ok=False)
        confirmed = json.loads(confirm(CYCLE_A, "offer", "offer-focus", RECEIPT_A))
        prove("confirmation rejects wrong owner, receipt, and stage/milestone then succeeds for owner", confirmed["current_milestone_id"] == "offer-focus")

        concurrent_confirms = [json.loads(value) for value in concurrent_authenticated_sql(
            "SELECT public.confirm_mastermind_success_path("+
            f"'{CYCLE_CONCURRENT}','offer','offer-focus','{RECEIPT_CONCURRENT}');"
        )]
        concurrent_confirm_state = sql(f"""
          SELECT
            (SELECT count(*) FROM public.mastermind_cycle_curriculum_assignments
              WHERE user_id='{USER_A}' AND cycle_id='{CYCLE_CONCURRENT}'),
            (SELECT count(*) FROM public.mastermind_curriculum_resource_refs
              WHERE user_id='{USER_A}' AND cycle_id='{CYCLE_CONCURRENT}'),
            (SELECT count(*) FROM public.cycle_success_path_snapshots
              WHERE user_id='{USER_A}' AND cycle_id='{CYCLE_CONCURRENT}'),
            (SELECT confirmed_stage||'|'||current_milestone_id||'|'||curriculum_version
              FROM public.cycle_success_path_snapshots
              WHERE user_id='{USER_A}' AND cycle_id='{CYCLE_CONCURRENT}');
        """)
        prove(
            "concurrent confirmation returns twice with one assignment, 24 refs, and one snapshot state",
            concurrent_confirm_state == "1|24|1|offer|offer-focus|mastermind-curriculum-v1"
            and concurrent_confirms[0]["assignment_id"] == concurrent_confirms[1]["assignment_id"],
            concurrent_confirm_state,
        )

        manifest_check = sql("""
          SELECT jsonb_array_length(a.manifest),
                 a.manifest = (SELECT jsonb_agg(jsonb_build_object(
                   'id',milestone_id,'label',label,'output',member_output,'stageId',stage_id,
                   'sourceTitle',source_title,'sourceOwner',source_owner,'status',status,
                   'provenanceNote',provenance_note,'resourceId',resource_id) ORDER BY slot_order)
                   FROM public.mastermind_curriculum_catalog WHERE manifest_version='mastermind-curriculum-v1'),
                 a.manifest->0->>'label', a.manifest->23->>'id'
          FROM public.mastermind_cycle_curriculum_assignments a
          WHERE a.user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND a.cycle_id='11111111-1111-4111-8111-111111111111';
        """)
        prove("frozen manifest is exactly 24 server catalog values", manifest_check == "24|t|Choose the money-making focus|leverage-evaluate", manifest_check)

        own_assignment = sql(f"SELECT count(*) FROM public.mastermind_cycle_curriculum_assignments WHERE user_id='{USER_A}' AND cycle_id='{CYCLE_A}';", user=USER_A, role="authenticated")
        cross_assignment = sql(f"SELECT count(*) FROM public.mastermind_cycle_curriculum_assignments WHERE user_id='{USER_A}' AND cycle_id='{CYCLE_A}';", user=USER_B, role="authenticated")
        own_refs = sql(f"SELECT count(*) FROM public.mastermind_curriculum_resource_refs WHERE user_id='{USER_A}' AND cycle_id='{CYCLE_A}';", user=USER_A, role="authenticated")
        cross_refs = sql(f"SELECT count(*) FROM public.mastermind_curriculum_resource_refs WHERE user_id='{USER_A}' AND cycle_id='{CYCLE_A}';", user=USER_B, role="authenticated")
        prove("assignment manifest and refs are owner-readable and cross-owner denied", own_assignment == "1" and own_refs == "24" and cross_assignment == "0" and cross_refs == "0")

        stable_key = f"{CYCLE_A}:offer-focus:active"
        schedule = lambda cycle, milestone, key, user=USER_A, ok=True: sql(
            "SELECT public.schedule_mastermind_success_path_action("+
            f"'{cycle}','{milestone}','{key}','Send five invitations','standard','Five sent','Sent log','2026-08-12');",
            user=user, role="authenticated", ok=ok
        )
        schedule(CYCLE_UNCONFIRMED, "offer-focus", f"{CYCLE_UNCONFIRMED}:offer-focus:active", ok=False)
        schedule(CYCLE_A, "offer-focus", "wrong-key", ok=False)
        schedule(CYCLE_A, "offer-buyer", f"{CYCLE_A}:offer-buyer:active", ok=False)
        schedule(CYCLE_A, "offer-focus", stable_key, user=USER_B, ok=False)
        first_action = json.loads(schedule(CYCLE_A, "offer-focus", stable_key))
        counts = sql(f"SELECT (SELECT count(*) FROM public.tasks WHERE user_id='{USER_A}'), (SELECT count(*) FROM public.mastermind_success_path_actions WHERE user_id='{USER_A}');")
        prove("action rejects unconfirmed, bad key, wrong milestone, and cross-owner then creates one task/action", counts == "1|1", counts)

        replay_action = json.loads(schedule(CYCLE_A, "offer-focus", stable_key))
        replay_counts = sql(f"SELECT (SELECT count(*) FROM public.tasks WHERE user_id='{USER_A}'), (SELECT count(*) FROM public.mastermind_success_path_actions WHERE user_id='{USER_A}');")
        prove("action replay preserves identity and one task/action", replay_counts == "1|1" and replay_action["action_id"] == first_action["action_id"] and replay_action["task_id"] == first_action["task_id"])

        concurrent_key = f"{CYCLE_CONCURRENT}:offer-focus:active"
        concurrent_actions = [json.loads(value) for value in concurrent_authenticated_sql(
            "SELECT public.schedule_mastermind_success_path_action("+
            f"'{CYCLE_CONCURRENT}','offer-focus','{concurrent_key}',"+
            "'Send five concurrent invitations','standard','Five sent concurrently',"+
            "'Concurrent sent log','2026-08-13');"
        )]
        concurrent_action_state = sql(f"""
          SELECT
            (SELECT count(*) FROM public.tasks
              WHERE user_id='{USER_A}' AND cycle_id='{CYCLE_CONCURRENT}'
                AND generation_key='mastermind-action:{concurrent_key}'),
            (SELECT count(*) FROM public.mastermind_success_path_actions
              WHERE user_id='{USER_A}' AND cycle_id='{CYCLE_CONCURRENT}'
                AND stable_key='{concurrent_key}'),
            (SELECT count(*) FROM public.mastermind_success_path_actions a
              JOIN public.tasks t ON t.task_id=a.task_id AND t.user_id=a.user_id AND t.cycle_id=a.cycle_id
              WHERE a.user_id='{USER_A}' AND a.cycle_id='{CYCLE_CONCURRENT}'
                AND a.stable_key='{concurrent_key}'
                AND t.generation_key='mastermind-action:{concurrent_key}'
                AND a.exact_move='Send five concurrent invitations'
                AND a.capacity_mode='standard'
                AND a.done_enough='Five sent concurrently'
                AND a.evidence='Concurrent sent log'
                AND a.scheduled_date='2026-08-13'
                AND t.task_text='Send five concurrent invitations'
                AND t.task_description='Five sent concurrently'
                AND t.scheduled_date='2026-08-13');
        """)
        prove(
            "concurrent duplicate action returns identical IDs with one complete task/action pair",
            concurrent_action_state == "1|1|1"
            and concurrent_actions[0]["task_id"] == concurrent_actions[1]["task_id"]
            and concurrent_actions[0]["action_id"] == concurrent_actions[1]["action_id"],
            concurrent_action_state,
        )

        action_id = first_action["action_id"]
        check_in = lambda response, user=USER_A, ok=True: sql(
            f"SELECT public.record_mastermind_success_path_check_in('{action_id}','{response}','Evidence','Friction');",
            user=user, role="authenticated", ok=ok
        )
        check_in("Support", user=USER_B, ok=False)
        check_in("Invalid", ok=False)
        valid_check_in = json.loads(check_in("Support"))
        check_state = sql(f"SELECT count(*), count(support_suggestion), bool_and(response='Support') FROM public.mastermind_success_path_check_ins WHERE action_id='{action_id}';")
        snapshot_state = sql(f"SELECT confirmed_stage,current_milestone_id FROM public.cycle_success_path_snapshots WHERE user_id='{USER_A}' AND cycle_id='{CYCLE_A}';")
        prove("valid Support check-in inserts one suggestion without changing stage/milestone", check_state == "1|1|t" and valid_check_in["stage_changed"] is False and snapshot_state == "offer|offer-focus")

        sql(f"INSERT INTO public.cycle_plan_reconciliation_requests(request_id,user_id,cycle_id,status) VALUES('{RECEIPT_A_NEW}','{USER_A}','{CYCLE_A}','complete'); UPDATE public.cycle_success_path_snapshots SET planner_receipt_id='{RECEIPT_A_NEW}' WHERE user_id='{USER_A}' AND cycle_id='{CYCLE_A}';")
        schedule(CYCLE_A, "offer-focus", stable_key, ok=False)
        check_in("Continue", ok=False)
        invalidated = sql(f"SELECT planner_receipt_id<>confirmed_planner_receipt_id FROM public.cycle_success_path_snapshots WHERE user_id='{USER_A}' AND cycle_id='{CYCLE_A}';")
        prove("new planner receipt invalidates prior confirmation for schedule and check-in", invalidated == "t", invalidated)

        confirm(CYCLE_A, "offer", "offer-focus", RECEIPT_A_NEW)
        confirm(CYCLE_A, "find", "find-path", RECEIPT_A_NEW)
        retired_state = sql(f"SELECT count(*) FILTER (WHERE retired_at IS NOT NULL),count(*) FILTER (WHERE retired_at IS NULL) FROM public.mastermind_success_path_actions WHERE user_id='{USER_A}' AND cycle_id='{CYCLE_A}';")
        check_in("Continue", ok=False)
        prove("deliberate focus change retires old action and stale check-in is rejected", retired_state == "1|0", retired_state)

        find_key = f"{CYCLE_A}:find-path:active"
        find_action = json.loads(schedule(CYCLE_A, "find-path", find_key))
        active_state = sql(f"SELECT count(*),count(*) FILTER (WHERE retired_at IS NULL),min(milestone_id) FILTER (WHERE retired_at IS NULL) FROM public.mastermind_success_path_actions WHERE user_id='{USER_A}' AND cycle_id='{CYCLE_A}';")
        prove("focus change permits exactly one new active action for the current milestone", active_state == "2|1|find-path" and find_action["action_id"] != action_id, active_state)

        spare_task = sql(f"INSERT INTO public.tasks(user_id,cycle_id,task_text,generation_key) VALUES('{USER_A}','{CYCLE_A}','spare','spare-active') RETURNING task_id;").splitlines()[0]
        sql(f"INSERT INTO public.mastermind_success_path_actions(user_id,cycle_id,milestone_id,stable_key,task_id,exact_move,capacity_mode,done_enough,evidence,scheduled_date) VALUES('{USER_A}','{CYCLE_A}','find-path','second-active','{spare_task}','x','standard','x','x',current_date);", ok=False)
        prove("partial unique invariant rejects a second active action in a cycle", True)

        mismatched_task = sql(f"INSERT INTO public.tasks(user_id,cycle_id,task_text,generation_key) VALUES('{USER_B}','{CYCLE_B}','mismatch','mismatch-task') RETURNING task_id;").splitlines()[0]
        sql(f"INSERT INTO public.mastermind_success_path_actions(user_id,cycle_id,milestone_id,stable_key,task_id,exact_move,capacity_mode,done_enough,evidence,scheduled_date,retired_at) VALUES('{USER_A}','{CYCLE_UNCONFIRMED}','offer-focus','mismatched-task','{mismatched_task}','x','standard','x','x',current_date,now());", ok=False)
        prove("composite action-task FK rejects owner/cycle mismatch", True)

        sql(f"INSERT INTO public.mastermind_success_path_actions(user_id,cycle_id,milestone_id,stable_key,task_id,exact_move,capacity_mode,done_enough,evidence,scheduled_date) SELECT '{USER_A}','{CYCLE_A}','offer-focus','direct',task_id,'x','standard','x','x',current_date FROM public.tasks LIMIT 1;", user=USER_A, role="authenticated", ok=False)
        sql(f"INSERT INTO public.mastermind_success_path_check_ins(user_id,cycle_id,action_id,response,stage_at_check_in,milestone_at_check_in) VALUES('{USER_A}','{CYCLE_A}','{action_id}','Support','offer','offer-focus');", user=USER_A, role="authenticated", ok=False)
        prove("direct writes to action and check-in tables are denied", True)

        acl = sql("""
          SELECT
            EXISTS (SELECT 1 FROM pg_proc p, LATERAL aclexplode(p.proacl) a WHERE p.oid='public.confirm_mastermind_success_path(uuid,text,text,uuid)'::regprocedure AND a.grantee=0 AND a.privilege_type='EXECUTE'),
            has_function_privilege('anon','public.confirm_mastermind_success_path(uuid,text,text,uuid)','EXECUTE'),
            has_function_privilege('authenticated','public.confirm_mastermind_success_path(uuid,text,text,uuid)','EXECUTE'),
            EXISTS (SELECT 1 FROM pg_proc p, LATERAL aclexplode(p.proacl) a WHERE p.oid='public.schedule_mastermind_success_path_action(uuid,text,text,text,text,text,text,date)'::regprocedure AND a.grantee=0 AND a.privilege_type='EXECUTE'),
            has_function_privilege('anon','public.schedule_mastermind_success_path_action(uuid,text,text,text,text,text,text,date)','EXECUTE'),
            has_function_privilege('authenticated','public.schedule_mastermind_success_path_action(uuid,text,text,text,text,text,text,date)','EXECUTE'),
            EXISTS (SELECT 1 FROM pg_proc p, LATERAL aclexplode(p.proacl) a WHERE p.oid='public.record_mastermind_success_path_check_in(uuid,text,text,text)'::regprocedure AND a.grantee=0 AND a.privilege_type='EXECUTE'),
            has_function_privilege('anon','public.record_mastermind_success_path_check_in(uuid,text,text,text)','EXECUTE'),
            has_function_privilege('authenticated','public.record_mastermind_success_path_check_in(uuid,text,text,text)','EXECUTE');
        """)
        prove("function PUBLIC/anon execute absent and authenticated execute present", acl == "f|f|t|f|f|t|f|f|t", acl)
        prove("member authorization uses authenticated JWT role, not service_role", True)

        print(f"\nPASS: PostgreSQL 16 behavioral harness — {len(passed)} checks passed, 0 failed")
    except Exception:
        if log_path.exists():
            print(f"\nPostgreSQL log ({log_path}):\n{log_path.read_text(errors='replace')[-4000:]}")
        raise
    finally:
        if started:
            subprocess.run([str(PG_BIN / "pg_ctl"), "-D", str(data_dir), "stop", "-m", "fast", "-w"], env=env, text=True, capture_output=True)
        shutil.rmtree(temp_root, ignore_errors=True)


def run(command: list[object], *, cwd: Path | None = None, env: dict[str, str]) -> None:
    result = subprocess.run([str(x) for x in command], cwd=cwd, env=env, text=True, capture_output=True)
    if result.returncode != 0:
        raise HarnessFailure(f"command failed ({result.returncode}): {' '.join(str(x) for x in command)}\n{result.stdout}{result.stderr}")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"FAIL: {error}")
        raise SystemExit(1)
