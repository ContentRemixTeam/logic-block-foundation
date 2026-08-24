#!/usr/bin/env python3
"""Run Wave 3 behavior, RLS, ACL, privacy, idempotency, and concurrency proof on PostgreSQL 16."""

from __future__ import annotations

import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    ROOT / "test/cycle-plan-reconciliation-v2/mock_current_schema.sql",
    ROOT / "test/mastermind-wave2/mock-predecessor-extension.sql",
    ROOT / "supabase/migrations/20260822190000_cycle_plan_reconciliation_v2.sql",
    ROOT / "supabase/migrations/20260822200000_mastermind_capability_projection.sql",
    ROOT / "supabase/migrations/20260822210000_planner_learning_catalog_assignments.sql",
    ROOT / "supabase/migrations/20260822220000_success_path_execution_ledger.sql",
]
WAVE3 = FILES[-1]
USERS = {
    "nonmember": "11111111-1111-4111-8111-111111111111",
    "active": "22222222-2222-4222-8222-222222222222",
    "expired": "33333333-3333-4333-8333-333333333333",
    "unavailable": "44444444-4444-4444-8444-444444444444",
    "review": "55555555-5555-4555-8555-555555555555",
    "other": "66666666-6666-4666-8666-666666666666",
}
IDS = {
    "media": "a3000000-0000-4000-8000-000000000001",
    "resource": "a3000000-0000-4000-8000-000000000002",
    "transcript": "a3000000-0000-4000-8000-000000000003",
    "playback": "a3000000-0000-4000-8000-000000000004",
    "catalog": "a3000000-1000-4000-8000-000000000001",
    "item": "a3000000-1100-4000-8000-000000000001",
    "item_later": "a3000000-1100-4000-8000-000000000002",
    "cycle": "a3000000-2000-4000-8000-000000000001",
    "plan": "a3000000-2000-4000-8000-000000000002",
    "ledger": "a3000000-2000-4000-8000-000000000003",
    "receipt": "a3000000-2000-4000-8000-000000000004",
    "other_cycle": "a3000000-3000-4000-8000-000000000001",
}


def executable(name: str) -> str:
    found = shutil.which(name)
    if found:
        return found
    for prefix in ("/opt/homebrew/opt/postgresql@16/bin", "/usr/local/opt/postgresql@16/bin"):
        candidate = Path(prefix) / name
        if candidate.exists():
            return str(candidate)
    raise SystemExit(f"BLOCKED missing local executable: {name}")


def run(command: list[str], env: dict[str, str], *, ok: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(command, env=env, text=True, capture_output=True)
    if ok and result.returncode:
        raise RuntimeError(f"Command failed ({result.returncode}): {' '.join(command)}\n{result.stdout}{result.stderr}")
    if not ok and result.returncode == 0:
        raise RuntimeError(f"Command unexpectedly succeeded: {' '.join(command)}\n{result.stdout}")
    return result


def jwt(user_id: str) -> str:
    return f"SET request.jwt.claims='{{\"sub\":\"{user_id}\",\"role\":\"authenticated\"}}';"


def call(psql: list[str], env: dict[str, str], user_id: str, expression: str) -> dict[str, Any]:
    sql = f"SET ROLE authenticated; {jwt(user_id)} SELECT ({expression})::text;"
    output = run([*psql, "-Atq", "-c", sql], env).stdout.strip().splitlines()
    return json.loads(output[-1])


PRIVATE_DENIAL_FIELDS = {
    "recommendation_reason", "recommendation_evidence", "recommendation_evidence_sha256",
    "stage", "recommended_stage", "confirmed_stage", "milestone", "milestone_key",
    "milestone_title", "recommended_milestone", "active_milestone", "action", "action_id",
    "action_text", "logical_action_key", "generation_key", "task_id", "evidence",
    "evidence_id", "evidence_receipt_id", "evidence_type", "structured_value", "payload",
    "payload_sha256", "member_note", "reference_label", "support", "support_request_id",
    "support_status", "operator_notes", "operator_reason", "internal_reason", "status_reason",
    "actor_reference", "actor_identity", "actor_role", "actor_kind", "internal_actor_metadata",
    "count", "counts", "resource_count", "title", "titles", "placement", "placements", "label",
    "labels", "discovery", "search_metadata", "media", "media_asset_id", "transcript",
    "transcript_id", "transcript_version_id", "playback_attempt_id", "publication_sha256",
    "private_locator", "provider_asset_id", "source_native_id", "source_provenance", "vault",
    "vault_resource_id", "canonical_resource_id", "planner_receipt_id", "planner_request_ledger_id",
    "assignment_id", "assignment_item_id", "catalog_version_id", "catalog_version_key",
    "catalog_item_id", "catalog_content_sha256", "authority_sha256", "stable_item_key",
}

TIMELINE_PRIVATE_FIELDS = PRIVATE_DENIAL_FIELDS | {
    "reason", "private_payload", "support_operator", "created_by", "confirmed_by", "qa_approved_by",
}


def nested_keys(value: Any) -> set[str]:
    if isinstance(value, dict):
        keys = set(value)
        for child in value.values():
            keys |= nested_keys(child)
        return keys
    if isinstance(value, list):
        keys: set[str] = set()
        for child in value:
            keys |= nested_keys(child)
        return keys
    return set()


def assert_denial(label: str, value: dict[str, Any], sentinels: tuple[str, ...]) -> None:
    serialized = json.dumps(value, sort_keys=True, separators=(",", ":"))
    if value.get("success_path") is not None:
        raise RuntimeError(f"{label} exposed a Success Path: {serialized}")
    leaked = sorted(nested_keys(value) & PRIVATE_DENIAL_FIELDS)
    if leaked:
        raise RuntimeError(f"{label} leaked protected keys {leaked}: {serialized}")
    for sentinel in sentinels:
        if sentinel.lower() in serialized.lower():
            raise RuntimeError(f"{label} leaked sentinel {sentinel}: {serialized}")


def assert_timeline_private_free(label: str, value: dict[str, Any], sentinels: tuple[str, ...]) -> None:
    events = value.get("events", [])
    serialized = json.dumps(events, sort_keys=True, separators=(",", ":"))
    leaked = sorted(nested_keys(events) & TIMELINE_PRIVATE_FIELDS)
    if leaked:
        raise RuntimeError(f"{label} leaked timeline-private keys {leaked}: {serialized}")
    for sentinel in sentinels:
        if sentinel.lower() in serialized.lower():
            raise RuntimeError(f"{label} leaked timeline sentinel {sentinel}: {serialized}")


def quote_json(value: Any) -> str:
    return "'" + json.dumps(value, sort_keys=True, separators=(",", ":")).replace("'", "''") + "'::jsonb"


def success_path_after_mutation(
    psql: list[str], env: dict[str, str], user_id: str, cycle_id: str, mutation: str,
) -> dict[str, Any]:
    sql = (
        "BEGIN; SET LOCAL session_replication_role=replica; " + mutation
        + f" SET LOCAL ROLE authenticated; {jwt(user_id)}"
        + f" SELECT public.resolve_my_success_path('{cycle_id}')::text; ROLLBACK;"
    )
    lines = run([*psql, "-Atq", "-c", sql], env).stdout.strip().splitlines()
    return json.loads(lines[-1])


def main() -> None:
    initdb, pg_ctl, psql_bin = executable("initdb"), executable("pg_ctl"), executable("psql")
    version = run([psql_bin, "--version"], os.environ.copy()).stdout.strip()
    if " 16." not in version:
        raise SystemExit(f"BLOCKED PostgreSQL 16 required, found {version}")
    env = os.environ.copy()
    env.update({"LC_ALL": "C", "LANG": "C"})
    port = 55444
    with tempfile.TemporaryDirectory(prefix="mastermind-wave3-pg16-", dir="/tmp") as temp:
        base = Path(temp)
        socket_dir = base / "socket"
        socket_dir.mkdir()
        log = base / "postgres.log"
        started = False
        try:
            for memory in ("mmap", "sysv"):
                data = base / f"data-{memory}"
                attempt = run([
                    initdb, "-D", str(data), "-A", "trust", "-U", "postgres", "--no-instructions",
                    "-c", f"shared_memory_type={memory}", "-c", f"dynamic_shared_memory_type={memory}",
                ], env, ok=False) if False else subprocess.run([
                    initdb, "-D", str(data), "-A", "trust", "-U", "postgres", "--no-instructions",
                    "-c", f"shared_memory_type={memory}", "-c", f"dynamic_shared_memory_type={memory}",
                ], env=env, text=True, capture_output=True)
                if attempt.returncode == 0:
                    break
                if not any(marker in (attempt.stdout + attempt.stderr) for marker in (
                    "Operation not permitted", "Cannot allocate memory", "could not create shared memory segment",
                )):
                    raise RuntimeError(attempt.stdout + attempt.stderr)
            else:
                raise SystemExit("BLOCKED PostgreSQL 16 initdb cannot allocate mmap or SysV bootstrap shared memory; no Wave 3 database claim was made.")
            run([pg_ctl, "-D", str(data), "-l", str(log), "-o",
                 f"-F -k {socket_dir} -p {port} -c listen_addresses='' -c shared_memory_type={memory} -c dynamic_shared_memory_type={memory}",
                 "-w", "start"], env)
            started = True
            psql = [psql_bin, "-X", "-h", str(socket_dir), "-p", str(port), "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"]
            for sql_file in FILES:
                run([*psql, "-f", str(sql_file)], env)
            run([*psql, "-f", str(WAVE3)], env)
            print("PASS Wave 3 migration applies twice after exact focused Wave 1/Wave 2 predecessors")

            users = ",".join(f"('{uid}','{name}@example.test')" for name, uid in USERS.items())
            seed = f"""
            INSERT INTO auth.users(id,email) VALUES {users};
            INSERT INTO public.entitlements(email,tier,status,starts_at,ends_at) VALUES
              ('active@example.test','mastermind','active',CURRENT_DATE-10,NULL),
              ('other@example.test','mastermind','active',CURRENT_DATE-10,NULL),
              ('expired@example.test','mastermind','active','2020-01-01','2020-12-31'),
              ('unavailable@example.test','mastermind','active',CURRENT_DATE-10,NULL),
              ('review@example.test','mastermind','active',CURRENT_DATE-10,NULL),
              ('REVIEW@example.test','mastermind','expired','2020-01-01','2020-12-31');
            SELECT public.set_capability_verification_hold('{USERS['unavailable']}','mastermind.learning.assigned',
              'verification_unavailable','stale_evidence',clock_timestamp()-interval '1 day',clock_timestamp()+interval '1 day','test');
            INSERT INTO public.curriculum_media_assets_private(media_asset_id,asset_key,canonical_resource_id,provider,
              provider_asset_id,private_locator,source_content_sha256,transcript_version_id,playback_attempt_id,created_by)
            VALUES('{IDS['media']}','wave3-asset','{IDS['resource']}','synthetic','PRIVATE-PROVIDER-SENTINEL',
              'private://WAVE3-LOCATOR-SENTINEL','{'a'*64}','{IDS['transcript']}','{IDS['playback']}','test');
            INSERT INTO public.curriculum_catalog_versions(catalog_version_id,version_key,version_number,created_by)
            VALUES('{IDS['catalog']}','wave3-synthetic-v1',1,'test');
            INSERT INTO public.curriculum_catalog_items(catalog_item_id,catalog_version_id,stable_item_key,item_state,
              stage,milestone_key,milestone_title,item_role,item_order,title,intended_output,action_prompt,evidence_prompt,
              teacher_display_name,attribution_text,source_system,source_native_id,source_provenance,provenance_sha256,
              media_asset_id,canonical_resource_id,transcript_version_id,playback_attempt_id,publication_sha256,
              transcript_qa_state,provenance_qa_state,rights_qa_state,privacy_qa_state,edit_qa_state,caption_qa_state,
              playback_qa_state,action_qa_state,evidence_qa_state,qa_receipt_sha256,qa_approved_at,qa_approved_by,created_by)
            VALUES('{IDS['item']}','{IDS['catalog']}','offer-primary','ready','offer','offer-foundation','Offer foundation',
              'primary',1,'PRIVATE-TITLE-SENTINEL','Create one tested offer','Draft one offer promise','Record a business response',
              'PRIVATE-TEACHER-SENTINEL','Synthetic only','synthetic','private-source','Synthetic fixture','{'b'*64}',
              '{IDS['media']}','{IDS['resource']}','{IDS['transcript']}','{IDS['playback']}','{'c'*64}',
              'approved','approved','approved','approved','approved','approved','approved','approved','approved','{'d'*64}',
              clock_timestamp(),'reviewer','test');
            INSERT INTO public.curriculum_catalog_items(catalog_item_id,catalog_version_id,stable_item_key,item_state,
              stage,milestone_key,milestone_title,item_role,item_order,title,intended_output,action_prompt,evidence_prompt,
              teacher_display_name,attribution_text,source_system,source_native_id,source_provenance,provenance_sha256,
              media_asset_id,canonical_resource_id,transcript_version_id,playback_attempt_id,publication_sha256,
              transcript_qa_state,provenance_qa_state,rights_qa_state,privacy_qa_state,edit_qa_state,caption_qa_state,
              playback_qa_state,action_qa_state,evidence_qa_state,qa_receipt_sha256,qa_approved_at,qa_approved_by,created_by)
            VALUES('{IDS['item_later']}','{IDS['catalog']}','offer-validation-primary','ready','offer','offer-validation','Offer validation',
              'primary',2,'PRIVATE-LATER-TITLE-SENTINEL','Validate the offer with one buyer','Ask one buyer','Record buyer response',
              'PRIVATE-TEACHER-SENTINEL','Synthetic only','synthetic','private-source-later','Synthetic fixture','{'6'*64}',
              '{IDS['media']}','{IDS['resource']}','{IDS['transcript']}','{IDS['playback']}','{'7'*64}',
              'approved','approved','approved','approved','approved','approved','approved','approved','approved','{'8'*64}',
              clock_timestamp(),'reviewer','test');
            """
            run([*psql, "-c", seed], env)
            run([*psql, "-Atq", "-c", f"SET ROLE service_role; SELECT public.publish_curriculum_catalog_version('{IDS['catalog']}');"], env)
            authority = f"""
            INSERT INTO public.cycles_90_day(cycle_id,user_id,start_date,end_date,goal) VALUES
              ('{IDS['cycle']}','{USERS['active']}',CURRENT_DATE,CURRENT_DATE+89,'PRIVATE-GOAL-SENTINEL'),
              ('{IDS['other_cycle']}','{USERS['other']}',CURRENT_DATE,CURRENT_DATE+89,'OTHER-PRIVATE-GOAL');
            INSERT INTO public.cycle_plan_intents_v2(plan_id,user_id,logical_plan_key,quarter_start,cycle_id,current_version,last_planner_receipt_id)
            VALUES('{IDS['plan']}','{USERS['active']}','a3000000-2000-4000-8000-000000000005',date_trunc('quarter',CURRENT_DATE)::date,
              '{IDS['cycle']}',1,'{IDS['receipt']}');
            INSERT INTO public.cycle_plan_reconciliation_requests_v2(ledger_id,request_id,user_id,plan_id,planner_receipt_id,
              payload_hash,content_hash,payload_version,resulting_version,cycle_id,status,receipt,completed_at)
            VALUES('{IDS['ledger']}','a3000000-2000-4000-8000-000000000006','{USERS['active']}','{IDS['plan']}',
              '{IDS['receipt']}','{'e'*64}','{'f'*64}','cycle-plan-v2',1,'{IDS['cycle']}','complete','{{}}',clock_timestamp());
            """
            run([*psql, "-c", authority], env)
            assignment = json.loads(run([*psql, "-Atq", "-c",
                "SET ROLE service_role; SELECT public.create_curriculum_cycle_assignment("
                f"'{USERS['active']}','{IDS['cycle']}','{IDS['ledger']}','{IDS['receipt']}','{IDS['catalog']}',"
                f"'success_path',ARRAY['{IDS['item']}','{IDS['item_later']}']::uuid[],NULL,NULL,'wave3-test')::text;"], env).stdout.strip())
            assignment_id = assignment["assignment_id"]
            item_id = run([*psql, "-Atq", "-c",
                f"SELECT assignment_item_id FROM public.curriculum_cycle_assignment_items WHERE assignment_id='{assignment_id}' AND assignment_order=1;"], env).stdout.strip()
            later_item_id = run([*psql, "-Atq", "-c",
                f"SELECT assignment_item_id FROM public.curriculum_cycle_assignment_items WHERE assignment_id='{assignment_id}' AND assignment_order=2;"], env).stdout.strip()
            recommendation_request = "a3000000-4000-4000-8000-000000000001"
            recommend_sql = (
                "SET ROLE service_role; SELECT public.create_success_path_recommendation("
                f"'{USERS['active']}','{IDS['cycle']}','{IDS['ledger']}','{IDS['receipt']}','{assignment_id}','{item_id}',"
                f"'{recommendation_request}','offer','offer-foundation','Offer foundation','first-move',"
                f"'Draft one offer promise',30,'Planner result and confirmed bottleneck','{'1'*64}','wave3-inference')::text;"
            )
            recommendation = json.loads(run([*psql, "-Atq", "-c", recommend_sql], env).stdout.strip())
            replayed_recommendation = json.loads(run([*psql, "-Atq", "-c", recommend_sql], env).stdout.strip())
            if recommendation["status"] != "unconfirmed" or not replayed_recommendation["replayed"]:
                raise RuntimeError("recommendation receipt/idempotency failed")
            path = call(psql, env, USERS["active"], f"public.resolve_my_success_path('{IDS['cycle']}')")
            if path["path_state"] != "unconfirmed" or path["success_path"]["confirmed_stage"] is not None \
                    or path["success_path"]["action"] is not None:
                raise RuntimeError(f"null recommendation confirmation did not serialize unconfirmed: {path}")
            print("PASS recommendation is receipt-bound and null confirmation remains explicitly unconfirmed")

            sentinels = ("PRIVATE-GOAL-SENTINEL", "PRIVATE-TITLE-SENTINEL", "PRIVATE-LATER-TITLE-SENTINEL",
                         "PRIVATE-TEACHER-SENTINEL", "PRIVATE-PROVIDER-SENTINEL", "WAVE3-LOCATOR-SENTINEL",
                         "Planner result and confirmed bottleneck", IDS["media"], IDS["resource"], IDS["transcript"],
                         IDS["playback"], IDS["catalog"], IDS["item"], IDS["item_later"], assignment_id, item_id,
                         later_item_id)
            denials = [
                ("nonmember", USERS["nonmember"], IDS["cycle"]),
                ("expired", USERS["expired"], IDS["cycle"]),
                ("verification unavailable", USERS["unavailable"], IDS["cycle"]),
                ("review required", USERS["review"], IDS["cycle"]),
                ("cross-owner", USERS["other"], IDS["cycle"]),
            ]
            for label, user_id, cycle_id in denials:
                assert_denial(label, call(psql, env, user_id, f"public.resolve_my_success_path('{cycle_id}')"), sentinels)

            resolver_leak_mutation = f"""
            CREATE OR REPLACE FUNCTION public.resolve_my_success_path(p_cycle_id uuid) RETURNS jsonb
            LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $mutation$
            BEGIN RETURN jsonb_build_object('capability_state','denied','reason','executable_privacy_mutation_control',
              'path_state',NULL,'success_path',NULL,
              'recommendation_reason','PRIVATE-RECOMMENDATION-REASON',
              'authority',jsonb_build_object('canonical_resource_id','{IDS['resource']}',
                'media_asset_id','{IDS['media']}','transcript_version_id','{IDS['transcript']}',
                'playback_attempt_id','{IDS['playback']}','publication_sha256','{'c'*64}',
                'private_locator','private://EXECUTABLE-MUTATION'));
            END $mutation$;
            """
            mutation_control = success_path_after_mutation(
                psql, env, USERS["nonmember"], IDS["cycle"], resolver_leak_mutation
            )
            if mutation_control.get("reason") != "executable_privacy_mutation_control":
                raise RuntimeError("database resolver mutation did not execute")
            try:
                assert_denial("executable privacy mutation", mutation_control, sentinels)
            except RuntimeError:
                pass
            else:
                raise RuntimeError("executable privacy mutation control did not fail")
            assert_denial("rollback restoration", call(psql, env, USERS["nonmember"],
                f"public.resolve_my_success_path('{IDS['cycle']}')"), sentinels)
            print("PASS nonmember/expired/unavailable/review-required/cross-owner denials are metadata-free with executable mutation control")

            confirm_request = "a3000000-4000-4000-8000-000000000002"
            confirm_expr = (
                f"public.confirm_my_success_path('{IDS['cycle']}','{confirm_request}',1,'offer','offer-foundation',"
                f"'Offer foundation','{item_id}','first-move','Draft one offer promise',30,NULL)"
            )
            confirm_sql = f"SET ROLE authenticated; {jwt(USERS['active'])} SELECT ({confirm_expr})::text;"
            workers = [subprocess.Popen([*psql, "-Atq", "-c", confirm_sql], env=env, text=True,
                                        stdout=subprocess.PIPE, stderr=subprocess.PIPE) for _ in range(2)]
            results = [worker.communicate(timeout=20) + (worker.returncode,) for worker in workers]
            if any(result[2] != 0 for result in results):
                raise RuntimeError(f"concurrent confirmation retry failed: {results}")
            confirmed = call(psql, env, USERS["active"], f"public.resolve_my_success_path('{IDS['cycle']}')")
            action = confirmed["success_path"]["action"]
            action_id, task_id = action["action_id"], action["task_id"]
            counts = run([*psql, "-Atq", "-c",
                f"SELECT count(*)||':'||(SELECT count(*) FROM public.tasks WHERE user_id='{USERS['active']}' AND cycle_id='{IDS['cycle']}') "
                f"FROM public.success_path_actions WHERE user_id='{USERS['active']}' AND cycle_id='{IDS['cycle']}';"], env).stdout.strip()
            if counts != "1:1":
                raise RuntimeError(f"canonical action/task duplicated under confirmation concurrency: {counts}")
            print("PASS canonical action same-owner binding and concurrent retry produce one neutral Planner task")

            observed = "2026-08-23T12:00:00+00:00"
            evidence_request = "a3000000-4000-4000-8000-000000000003"
            evidence_expr = (f"public.submit_my_success_path_evidence('{IDS['cycle']}','{evidence_request}',2,'{action_id}',"
                f"'customer_response','{{\"result\":\"one qualified reply\"}}'::jsonb,'A prospect replied','CRM note 17','{observed}')")
            evidence_sql = f"SET ROLE authenticated; {jwt(USERS['active'])} SELECT ({evidence_expr})::text;"
            workers = [subprocess.Popen([*psql, "-Atq", "-c", evidence_sql], env=env, text=True,
                                        stdout=subprocess.PIPE, stderr=subprocess.PIPE) for _ in range(2)]
            evidence_results = [worker.communicate(timeout=20) + (worker.returncode,) for worker in workers]
            if any(result[2] != 0 for result in evidence_results):
                raise RuntimeError(f"concurrent evidence retry failed: {evidence_results}")
            evidence_receipts = [json.loads(result[0].strip()) for result in evidence_results]
            evidence = evidence_receipts[0]
            if len({row["evidence_receipt_id"] for row in evidence_receipts}) != 1 \
                    or sorted(row["replayed"] for row in evidence_receipts) != [False, True]:
                raise RuntimeError(f"concurrent evidence retries did not converge canonically: {evidence_receipts}")
            evidence_count = run([*psql, "-Atq", "-c",
                f"SELECT count(*) FROM public.success_path_evidence_receipts WHERE user_id='{USERS['active']}' AND request_id='{evidence_request}';"], env).stdout.strip()
            if evidence_count != "1":
                raise RuntimeError(f"concurrent evidence retry appended {evidence_count} rows")
            conflict = run([*psql, "-c", f"SET ROLE authenticated; {jwt(USERS['active'])} SELECT public.submit_my_success_path_evidence("
                f"'{IDS['cycle']}','{evidence_request}',2,'{action_id}','customer_response','{{\"result\":\"changed\"}}'::jsonb,NULL,NULL,'{observed}');"], env, ok=False)
            if "conflict" not in conflict.stderr:
                raise RuntimeError(f"evidence conflicting replay failed for wrong reason: {conflict.stderr}")
            unsafe_payloads = [
                '{"metric":"watch_percentage","value":100}',
                '{"nested":{"Metric Name":"WATCH PERCENTAGE","value":100}}',
                '{"values":[{"result":"Lesson Completion"}]}',
                '{"result":{"task completion":{"check mark":true}}}',
                '{"context":"Video playback progress"}',
                '{"course metadata":{"title":"private"}}',
            ]
            for index, payload in enumerate(unsafe_payloads, start=90):
                unsafe = run([*psql, "-c", f"SET ROLE authenticated; {jwt(USERS['active'])} SELECT public.submit_my_success_path_evidence("
                    f"'{IDS['cycle']}','a3000000-4000-4000-8000-0000000000{index}',2,'{action_id}','deliverable',"
                    f"{quote_json(json.loads(payload))},NULL,NULL,'{observed}');"], env, ok=False)
                if "invalid business evidence" not in unsafe.stderr:
                    raise RuntimeError(f"recursive watch/task proxy was not rejected: {payload}: {unsafe.stderr}")
            print("PASS business evidence concurrent exact retry converges, changed payload conflicts, and recursive watch/task/course proxies fail")

            checkin_requests = ["a3000000-4000-4000-8000-000000000004", "a3000000-4000-4000-8000-000000000024"]
            checkin_exprs = [(f"public.evaluate_my_success_path_week('{IDS['cycle']}','{request_id}','2026-w34',2,"
                f"'{action_id}','{evidence['evidence_receipt_id']}','support',NULL,NULL)") for request_id in checkin_requests]
            checkin_sqls = [f"SET ROLE authenticated; {jwt(USERS['active'])} SELECT ({expr})::text;" for expr in checkin_exprs]
            workers = [subprocess.Popen([*psql, "-Atq", "-c", sql], env=env, text=True,
                                        stdout=subprocess.PIPE, stderr=subprocess.PIPE) for sql in checkin_sqls]
            results = [worker.communicate(timeout=20) + (worker.returncode,) for worker in workers]
            if any(result[2] != 0 for result in results):
                raise RuntimeError(f"same-period check-in concurrency failed: {results}")
            checkin_receipts = [json.loads(result[0].strip()) for result in results]
            if len({row["checkin_id"] for row in checkin_receipts}) != 1 \
                    or sorted(row["replayed"] for row in checkin_receipts) != [False, True]:
                raise RuntimeError(f"distinct-request same-period semantics were not canonical: {checkin_receipts}")
            checkin = checkin_receipts[0]
            support_id = checkin["support_request_id"]
            period_count = run([*psql, "-Atq", "-c",
                f"SELECT count(*) FROM public.success_path_checkins WHERE user_id='{USERS['active']}' AND period_key='2026-w34';"], env).stdout.strip()
            if period_count != "1":
                raise RuntimeError(f"same-period concurrency produced {period_count} check-ins")
            run([*psql, "-c", f"SET session_replication_role=replica; INSERT INTO public.success_path_support_events("
                "support_event_id,request_id,request_sha256,user_id,cycle_id,path_id,support_request_id,event_type,"
                "actor_kind,actor_reference,reason,status_receipt_id) VALUES("
                f"'a3000000-5000-4000-8000-000000000001','a3000000-4000-4000-8000-000000000005','{'9'*64}',"
                f"'{USERS['other']}','{IDS['other_cycle']}','a3000000-5000-4000-8000-000000000002',"
                "'a3000000-5000-4000-8000-000000000003','acknowledged','support_operator','other-operator',"
                "'cross-owner collision fixture','a3000000-5000-4000-8000-000000000004'); SET session_replication_role=origin;"], env)
            acknowledged = json.loads(run([*psql, "-Atq", "-c", "SET ROLE service_role; SELECT public.update_success_path_support("
                f"'{support_id}','a3000000-4000-4000-8000-000000000005','acknowledged','coach-role','triage complete')::text;"], env).stdout.strip())
            resolved = json.loads(run([*psql, "-Atq", "-c", "SET ROLE service_role; SELECT public.update_success_path_support("
                f"'{support_id}','a3000000-4000-4000-8000-000000000006','resolved','coach-role','member has next step')::text;"], env).stdout.strip())
            if acknowledged["status"] != "acknowledged" or resolved["status"] != "resolved":
                raise RuntimeError("support lifecycle failed")
            active_ack_count = run([*psql, "-Atq", "-c",
                f"SELECT count(*) FROM public.success_path_support_events WHERE user_id='{USERS['active']}' AND support_request_id='{support_id}' AND request_id='a3000000-4000-4000-8000-000000000005';"], env).stdout.strip()
            if active_ack_count != "1":
                raise RuntimeError("cross-owner request-ID collision prevented/scattered the owner-scoped support receipt")
            print("PASS distinct-request same-period concurrency yields one canonical receipt and typed support lifecycle receipts")

            run([*psql, "-c", f"UPDATE public.tasks SET task_text='Member rewrote this task',is_completed=true WHERE task_id='{task_id}';"], env)
            evidence2 = call(psql, env, USERS["active"],
                f"public.submit_my_success_path_evidence('{IDS['cycle']}','a3000000-4000-4000-8000-000000000007',2,'{action_id}',"
                f"'business_metric','{{\"before\":0,\"after\":1}}'::jsonb,NULL,'Metric card','{observed}')")
            reduced = call(psql, env, USERS["active"],
                f"public.evaluate_my_success_path_week('{IDS['cycle']}','a3000000-4000-4000-8000-000000000008','2026-w35',2,"
                f"'{action_id}','{evidence2['evidence_receipt_id']}','reduce','Send one offer follow-up',15)")
            reduced_action = reduced["action_id"]
            state_after_reduce = call(psql, env, USERS["active"], f"public.resolve_my_success_path('{IDS['cycle']}')")
            if state_after_reduce["success_path"]["confirmed_stage"] != "offer" \
                    or state_after_reduce["success_path"]["active_milestone"]["key"] != "offer-foundation" \
                    or state_after_reduce["success_path"]["capacity_mode"] != "reduced":
                raise RuntimeError("reduce silently rerouted strategy/stage/milestone")
            preserved = run([*psql, "-Atq", "-c",
                f"SELECT task_text||':'||is_completed::text||':'||generation_active::text||':'||(deleted_at IS NULL)::text FROM public.tasks WHERE task_id='{task_id}';"], env).stdout.strip()
            if preserved != "Member rewrote this task:true:false:true":
                raise RuntimeError(f"member-modified/completed task history was stolen: {preserved}")
            active_after_reduce = run([*psql, "-Atq", "-c",
                f"SELECT count(*) FROM public.tasks WHERE user_id='{USERS['active']}' AND cycle_id='{IDS['cycle']}' AND system_source='guided_action_v1' AND generation_active AND NOT is_completed AND deleted_at IS NULL;"], env).stdout.strip()
            if active_after_reduce != "1":
                raise RuntimeError(f"reduce left {active_after_reduce} active incomplete canonical tasks")
            reduced_task_id = run([*psql, "-Atq", "-c",
                f"SELECT task_id FROM public.success_path_actions WHERE action_id='{reduced_action}';"], env).stdout.strip()
            run([*psql, "-c", f"UPDATE public.tasks SET task_text='Member edited reduced task',is_completed=true WHERE task_id='{reduced_task_id}';"], env)
            print("PASS reduce retires only prior generation activity, preserves exact member text/completion and undeleted history, and leaves one active incomplete action")

            evidence3 = call(psql, env, USERS["active"],
                f"public.submit_my_success_path_evidence('{IDS['cycle']}','a3000000-4000-4000-8000-000000000009',3,'{reduced_action}',"
                f"'experiment_result','{{\"result\":\"follow-up sent\"}}'::jsonb,NULL,NULL,'{observed}')")
            context_only = call(psql, env, USERS["active"],
                f"public.submit_my_success_path_evidence('{IDS['cycle']}','a3000000-4000-4000-8000-000000000029',3,'{reduced_action}',"
                f"'capacity_observation','{{\"available_hours\":2}}'::jsonb,'Low-capacity context',NULL,'{observed}')")
            no_evidence_advance = run([*psql, "-c", f"SET ROLE authenticated; {jwt(USERS['active'])} SELECT public.preview_my_success_path_transition("
                f"'{IDS['cycle']}','a3000000-4000-4000-8000-000000000010',3,'milestone_advance','member_requested',NULL,"
                f"'{assignment_id}','{item_id}','offer','offer-foundation','Offer foundation','first-move','Next offer action',20);"], env, ok=False)
            if "observable business evidence" not in no_evidence_advance.stderr:
                raise RuntimeError("milestone advancement did not require business evidence")
            context_advance = run([*psql, "-c", f"SET ROLE authenticated; {jwt(USERS['active'])} SELECT public.preview_my_success_path_transition("
                f"'{IDS['cycle']}','a3000000-4000-4000-8000-000000000030',3,'milestone_advance','reviewed_business_evidence',"
                f"'{context_only['evidence_receipt_id']}','{assignment_id}','{later_item_id}','offer','offer-validation','Offer validation',"
                f"'validate-move','Ask one buyer for a decision',20);"], env, ok=False)
            if "eligible business evidence" not in context_advance.stderr:
                raise RuntimeError(f"context-only evidence supported advancement: {context_advance.stderr}")
            same_milestone = run([*psql, "-c", f"SET ROLE authenticated; {jwt(USERS['active'])} SELECT public.preview_my_success_path_transition("
                f"'{IDS['cycle']}','a3000000-4000-4000-8000-000000000031',3,'milestone_advance','reviewed_business_evidence',"
                f"'{evidence3['evidence_receipt_id']}','{assignment_id}','{item_id}','offer','offer-foundation','Offer foundation',"
                f"'next-move','Test the offer with one buyer',20);"], env, ok=False)
            if "later frozen assignment item" not in same_milestone.stderr:
                raise RuntimeError(f"same-milestone/item advancement no-op was accepted: {same_milestone.stderr}")
            preview_request = "a3000000-4000-4000-8000-000000000011"
            preview_expr = (
                f"public.preview_my_success_path_transition('{IDS['cycle']}','{preview_request}',3,"
                f"'milestone_advance','reviewed_business_evidence','{evidence3['evidence_receipt_id']}','{assignment_id}','{later_item_id}',"
                f"'offer','offer-validation','Offer validation','validate-move','Test the offer with one buyer',20)"
            )
            preview_sql = f"SET ROLE authenticated; {jwt(USERS['active'])} SELECT ({preview_expr})::text;"
            workers = [subprocess.Popen([*psql, "-Atq", "-c", preview_sql], env=env, text=True,
                                        stdout=subprocess.PIPE, stderr=subprocess.PIPE) for _ in range(2)]
            preview_results = [worker.communicate(timeout=20) + (worker.returncode,) for worker in workers]
            if any(result[2] != 0 for result in preview_results):
                raise RuntimeError(f"concurrent transition preview retry failed: {preview_results}")
            proposals = [json.loads(result[0].strip()) for result in preview_results]
            if len({row["proposal_id"] for row in proposals}) != 1 \
                    or sorted(row["replayed"] for row in proposals) != [False, True]:
                raise RuntimeError(f"concurrent previews did not converge canonically: {proposals}")
            proposal = proposals[0]
            proposal_count = run([*psql, "-Atq", "-c",
                f"SELECT count(*) FROM public.success_path_focus_proposals WHERE user_id='{USERS['active']}' AND request_id='{preview_request}';"], env).stdout.strip()
            if proposal_count != "1":
                raise RuntimeError(f"concurrent preview appended {proposal_count} proposal rows")
            diff, diff_hash = proposal["impact_diff"], proposal["impact_diff_sha256"]
            required_diff_paths = [
                ("transition", "kind"), ("path", "expected_state_version"), ("stage", "old"),
                ("stage", "new"), ("milestone", "old"), ("milestone", "new"),
                ("learning_authority", "old"), ("learning_authority", "new"),
                ("action", "old"), ("action", "new"), ("evidence", "evidence_receipt_id"),
                ("history", "canonical_identity_semantics"),
            ]
            if any(parent not in diff or child not in diff[parent] for parent, child in required_diff_paths):
                raise RuntimeError(f"canonical reviewed diff is incomplete: {diff}")
            if diff["learning_authority"]["new"]["assignment_item_id"] != later_item_id \
                    or diff["learning_authority"]["new"]["publication_sha256"] != "7" * 64 \
                    or diff["milestone"]["new"]["assignment_order"] != 2:
                raise RuntimeError(f"reviewed diff did not bind later frozen Learning authority: {diff}")
            mutation_confirm = (
                f"SET LOCAL ROLE authenticated; {jwt(USERS['active'])} SELECT public.confirm_my_success_path_transition("
                f"'{proposal['proposal_id']}','a3000000-4000-4000-8000-000000000032',"
                f"{quote_json(diff)},'{diff_hash}',true);"
            )
            proposal_mutations = {
                "action text": f"UPDATE public.success_path_focus_proposals SET proposed_action_text='MUTATED ACTION' WHERE proposal_id='{proposal['proposal_id']}';",
                "assignment item": f"UPDATE public.success_path_focus_proposals SET proposed_assignment_item_id='{item_id}' WHERE proposal_id='{proposal['proposal_id']}';",
                "catalog authority": f"UPDATE public.success_path_focus_proposals SET proposed_catalog_content_sha256='{'0'*64}' WHERE proposal_id='{proposal['proposal_id']}';",
                "stale path": "UPDATE public.success_path_cycle_states SET state_version=state_version+1;",
            }
            for label, mutation in proposal_mutations.items():
                failed = run([*psql, "-c", f"BEGIN; SET LOCAL session_replication_role=replica; {mutation} {mutation_confirm} ROLLBACK;"], env, ok=False)
                if not failed.stderr:
                    raise RuntimeError(f"proposal {label} mutation did not block confirmation")
            adversaries = [
                ("false", quote_json(diff), f"'{'0'*64}'", "true"),
                ("incomplete", quote_json({"encoding_contract": diff["encoding_contract"]}), f"'{diff_hash}'", "true"),
                ("false-confirm", quote_json(diff), f"'{diff_hash}'", "false"),
            ]
            reordered = json.loads(json.dumps(diff))
            reordered["impact_order"].reverse()
            adversaries.append(("reordered", quote_json(reordered), f"'{diff_hash}'", "true"))
            for label, diff_sql, hash_sql, confirm_sql_value in adversaries:
                failed = run([*psql, "-c", f"SET ROLE authenticated; {jwt(USERS['active'])} SELECT public.confirm_my_success_path_transition("
                    f"'{proposal['proposal_id']}','a3000000-4000-4000-8000-000000000012',{diff_sql},{hash_sql},{confirm_sql_value});"], env, ok=False)
                if not failed.stderr:
                    raise RuntimeError(f"{label} transition adversary did not fail")
            transition = call(psql, env, USERS["active"],
                f"public.confirm_my_success_path_transition('{proposal['proposal_id']}','a3000000-4000-4000-8000-000000000013',"
                f"{quote_json(diff)},'{diff_hash}',true)")
            if transition["path_version"] != 4:
                raise RuntimeError("exact reviewed transition did not activate")
            advanced = call(psql, env, USERS["active"], f"public.resolve_my_success_path('{IDS['cycle']}')")
            if advanced["success_path"]["active_milestone"]["key"] != "offer-validation":
                raise RuntimeError(f"real milestone advancement did not activate later item: {advanced}")
            reduced_preserved = run([*psql, "-Atq", "-c",
                f"SELECT task_text||':'||is_completed::text||':'||generation_active::text||':'||(deleted_at IS NULL)::text FROM public.tasks WHERE task_id='{reduced_task_id}';"], env).stdout.strip()
            if reduced_preserved != "Member edited reduced task:true:false:true":
                raise RuntimeError(f"transition overwrote/deleted prior canonical task: {reduced_preserved}")
            active_after_transition = run([*psql, "-Atq", "-c",
                f"SELECT count(*) FROM public.tasks WHERE user_id='{USERS['active']}' AND cycle_id='{IDS['cycle']}' AND system_source='guided_action_v1' AND generation_active AND NOT is_completed AND deleted_at IS NULL;"], env).stdout.strip()
            if active_after_transition != "1":
                raise RuntimeError(f"transition left {active_after_transition} active incomplete canonical tasks")
            print("PASS concurrent preview converges; milestone advancement uses eligible evidence and exact later frozen item; recomputed diff rejects mutations and false/incomplete/reordered confirmation")

            transition_action = transition["action_id"]
            transition_task_id = run([*psql, "-Atq", "-c",
                f"SELECT task_id FROM public.success_path_actions WHERE action_id='{transition_action}';"], env).stdout.strip()
            backward_evidence = call(psql, env, USERS["active"],
                f"public.submit_my_success_path_evidence('{IDS['cycle']}','a3000000-4000-4000-8000-000000000033',4,'{transition_action}',"
                f"'business_metric','{{\"before\":1,\"after\":2}}'::jsonb,NULL,NULL,'{observed}')")
            backward = run([*psql, "-c", f"SET ROLE authenticated; {jwt(USERS['active'])} SELECT public.preview_my_success_path_transition("
                f"'{IDS['cycle']}','a3000000-4000-4000-8000-000000000034',4,'milestone_advance','reviewed_business_evidence',"
                f"'{backward_evidence['evidence_receipt_id']}','{assignment_id}','{item_id}','offer','offer-foundation','Offer foundation',"
                f"'backward-move','Go backward',20);"], env, ok=False)
            if "later frozen assignment item" not in backward.stderr:
                raise RuntimeError(f"backward frozen assignment item was not rejected: {backward.stderr}")
            run([*psql, "-c", f"UPDATE public.tasks SET task_text='Member edited transition task',is_completed=true WHERE task_id='{transition_task_id}';"], env)
            recovery_expr = (f"public.recover_my_success_path_after_absence('{IDS['cycle']}',"
                f"'a3000000-4000-4000-8000-000000000014',4,'Send one short buyer question',10)")
            recovery_sql = f"SET ROLE authenticated; {jwt(USERS['active'])} SELECT ({recovery_expr})::text;"
            workers = [subprocess.Popen([*psql, "-Atq", "-c", recovery_sql], env=env, text=True,
                                        stdout=subprocess.PIPE, stderr=subprocess.PIPE) for _ in range(2)]
            recovery_results = [worker.communicate(timeout=20) + (worker.returncode,) for worker in workers]
            if any(result[2] != 0 for result in recovery_results):
                raise RuntimeError(f"concurrent absence recovery retry failed: {recovery_results}")
            recoveries = [json.loads(result[0].strip()) for result in recovery_results]
            recovery = recoveries[0]
            if len({row["action_id"] for row in recoveries}) != 1 \
                    or sorted(row["replayed"] for row in recoveries) != [False, True] \
                    or any(row["overdue_items_created"] != 0 for row in recoveries):
                raise RuntimeError(f"absence recovery did not converge canonically: {recoveries}")
            action_task_counts = run([*psql, "-Atq", "-c",
                f"SELECT count(*)||':'||(SELECT count(*) FROM public.tasks WHERE user_id='{USERS['active']}' AND cycle_id='{IDS['cycle']}') "
                f"FROM public.success_path_actions WHERE user_id='{USERS['active']}' AND cycle_id='{IDS['cycle']}';"], env).stdout.strip()
            if action_task_counts != "4:4":
                raise RuntimeError(f"one-to-one canonical action/task history failed: {action_task_counts}")
            transition_preserved = run([*psql, "-Atq", "-c",
                f"SELECT task_text||':'||is_completed::text||':'||generation_active::text||':'||(deleted_at IS NULL)::text FROM public.tasks WHERE task_id='{transition_task_id}';"], env).stdout.strip()
            if transition_preserved != "Member edited transition task:true:false:true":
                raise RuntimeError(f"recovery overwrote/deleted prior canonical task: {transition_preserved}")
            active_after_recovery = run([*psql, "-Atq", "-c",
                f"SELECT count(*) FROM public.tasks WHERE user_id='{USERS['active']}' AND cycle_id='{IDS['cycle']}' AND system_source='guided_action_v1' AND generation_active AND NOT is_completed AND deleted_at IS NULL;"], env).stdout.strip()
            if active_after_recovery != "1":
                raise RuntimeError(f"recovery left {active_after_recovery} active incomplete canonical tasks")
            print("PASS concurrent absence recovery converges and preserves prior task text/completion/undeleted history while leaving one active incomplete action")

            stale_receipt = success_path_after_mutation(psql, env, USERS["active"], IDS["cycle"],
                f"UPDATE public.cycle_plan_intents_v2 SET last_planner_receipt_id='b3000000-2000-4000-8000-000000000004' WHERE plan_id='{IDS['plan']}';")
            assert_denial("stale Planner receipt", stale_receipt, sentinels)
            frozen = success_path_after_mutation(psql, env, USERS["active"], IDS["cycle"],
                f"UPDATE public.curriculum_cycle_assignment_items SET authority_sha256='{'0'*64}' WHERE assignment_id='{assignment_id}';")
            assert_denial("frozen assignment authority", frozen, sentinels)
            malformed = success_path_after_mutation(psql, env, USERS["active"], IDS["cycle"],
                "UPDATE public.success_path_cycle_states SET assignment_version=999;")
            assert_denial("malformed state", malformed, sentinels)
            reduce_checkin_id = run([*psql, "-Atq", "-c",
                f"SELECT checkin_id FROM public.success_path_checkins WHERE user_id='{USERS['active']}' AND period_key='2026-w35';"], env).stdout.strip()
            support_checkin_id = run([*psql, "-Atq", "-c",
                f"SELECT checkin_id FROM public.success_path_support_requests WHERE support_request_id='{support_id}';"], env).stdout.strip()
            malformed_mutations = {
                "confirmed stage": "UPDATE public.success_path_cycle_states SET confirmed_stage='find';",
                "confirmed milestone": "UPDATE public.success_path_cycle_states SET active_milestone_key='offer-foundation';",
                "current action pointer": f"UPDATE public.success_path_cycle_states SET current_action_id='{reduced_action}';",
                "active assignment item": f"UPDATE public.success_path_cycle_states SET active_assignment_item_id='{item_id}';",
                "evidence pointer": f"UPDATE public.success_path_checkins SET evidence_receipt_id='{evidence2['evidence_receipt_id']}' WHERE checkin_id='{support_checkin_id}';",
                "support pointer": f"UPDATE public.success_path_support_requests SET checkin_id='{reduce_checkin_id}' WHERE support_request_id='{support_id}';",
                "stale action version": f"UPDATE public.success_path_actions SET path_version=4 WHERE action_id='{recovery['action_id']}';",
            }
            for label, mutation in malformed_mutations.items():
                malformed_receipt = success_path_after_mutation(psql, env, USERS["active"], IDS["cycle"], mutation)
                assert_denial(f"malformed {label}", malformed_receipt, sentinels)
                if malformed_receipt.get("success_path") is not None:
                    raise RuntimeError(f"malformed {label} did not return empty metadata-free envelope")
            print("PASS stale Planner/frozen authority plus malformed stage/milestone/action/item/evidence/support/version state serialize metadata-free")

            timeline = call(psql, env, USERS["active"], f"public.resolve_my_success_path_timeline('{IDS['cycle']}')")
            timeline_text = json.dumps(timeline, sort_keys=True)
            if timeline["timeline_state"] != "saved" or "triage complete" in timeline_text or "member has next step" in timeline_text:
                raise RuntimeError("member timeline missing or leaked private operator reason")
            assert_timeline_private_free("member timeline", timeline,
                ("coach-role", "triage complete", "member has next step", USERS["active"]))
            other_timeline = call(psql, env, USERS["other"], f"public.resolve_my_success_path_timeline('{IDS['cycle']}')")
            if other_timeline["events"] != []:
                raise RuntimeError("cross-owner timeline leaked events")
            timeline_leak_mutation = """
            CREATE OR REPLACE FUNCTION public.resolve_my_success_path_timeline(p_cycle_id uuid) RETURNS jsonb
            LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $mutation$
            BEGIN RETURN jsonb_build_object('capability_state','granted','reason','timeline_available',
              'timeline_state','saved','events',jsonb_build_array(jsonb_build_object(
                'event_type','support_resolved','actor_reference','PRIVATE-ACTOR-REFERENCE',
                'internal_actor_metadata',jsonb_build_object('actor_role','PRIVATE-OPERATOR-ROLE',
                  'operator_notes','PRIVATE-OPERATOR-NOTES')))); END $mutation$;
            """
            timeline_mutation_sql = (
                "BEGIN; " + timeline_leak_mutation
                + f" SET LOCAL ROLE authenticated; {jwt(USERS['active'])}"
                + f" SELECT public.resolve_my_success_path_timeline('{IDS['cycle']}')::text; ROLLBACK;"
            )
            timeline_mutation_lines = run([*psql, "-Atq", "-c", timeline_mutation_sql], env).stdout.strip().splitlines()
            timeline_mutation = json.loads(timeline_mutation_lines[-1])
            try:
                assert_timeline_private_free("executable timeline mutation", timeline_mutation,
                    ("PRIVATE-ACTOR-REFERENCE", "PRIVATE-OPERATOR-ROLE", "PRIVATE-OPERATOR-NOTES"))
            except RuntimeError:
                pass
            else:
                raise RuntimeError("executable timeline privacy mutation control did not fail")
            restored_timeline = call(psql, env, USERS["active"], f"public.resolve_my_success_path_timeline('{IDS['cycle']}')")
            assert_timeline_private_free("timeline rollback restoration", restored_timeline,
                ("coach-role", "triage complete", "member has next step", USERS["active"]))
            print("PASS timeline recursively excludes actor/operator metadata with executable mutation and rollback controls")

            tables = [
                "success_path_cycle_states", "success_path_actions", "success_path_confirmations",
                "success_path_evidence_receipts", "success_path_checkins", "success_path_support_requests",
                "success_path_focus_proposals", "success_path_focus_transitions", "success_path_absence_recoveries",
                "success_path_support_events", "success_path_timeline_events",
            ]
            privileges = ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"]
            for table in tables:
                for role in ("anon", "authenticated", "service_role"):
                    for privilege in privileges:
                        result = run([*psql, "-Atq", "-c",
                            f"SELECT has_table_privilege('{role}','public.{table}','{privilege}');"], env).stdout.strip()
                        if result != "f":
                            raise RuntimeError(f"{role} retained {privilege} on {table}")
                public_grants = run([*psql, "-Atq", "-c",
                    f"SELECT count(*) FROM information_schema.table_privileges WHERE table_schema='public' AND table_name='{table}' AND grantee='PUBLIC' AND privilege_type=ANY(ARRAY{privileges!r}::text[]);"], env).stdout.strip()
                if public_grants != "0":
                    raise RuntimeError(f"PUBLIC retained {public_grants} effective grants on {table}")
            authenticated_statements = (
                "INSERT INTO public.success_path_timeline_events DEFAULT VALUES",
                "UPDATE public.success_path_cycle_states SET state_version=999",
                "DELETE FROM public.success_path_evidence_receipts",
                "TRUNCATE public.success_path_checkins",
                "CREATE TRIGGER browser_trigger BEFORE UPDATE ON public.success_path_cycle_states FOR EACH ROW EXECUTE FUNCTION public.success_path_forbid_history_mutation()",
            )
            for statement in authenticated_statements:
                denied = run([*psql, "-c", f"SET ROLE authenticated; {jwt(USERS['active'])} {statement};"], env, ok=False)
                if "permission denied" not in denied.stderr.lower():
                    raise RuntimeError(f"direct DML/DDL failed for wrong reason: {statement}: {denied.stderr}")
            direct_select = run([*psql, "-c", f"SET ROLE authenticated; {jwt(USERS['active'])} SELECT * FROM public.success_path_timeline_events;"], env, ok=False)
            if "permission denied" not in direct_select.stderr.lower():
                raise RuntimeError("authenticated direct timeline SELECT was not denied")
            service_statements = (
                "TRUNCATE public.success_path_evidence_receipts",
                f"INSERT INTO public.success_path_timeline_events(user_id,cycle_id,path_id,path_version,event_type,event_key,actor_kind,actor_reference,reason) VALUES('{USERS['active']}','{IDS['cycle']}',(SELECT path_id FROM public.success_path_cycle_states LIMIT 1),5,'evidence_submitted','forged-service-append','system','forged','forged')",
                "DELETE FROM public.success_path_support_events",
                "SELECT * FROM public.success_path_cycle_states",
            )
            for statement in service_statements:
                denied = run([*psql, "-c", f"SET ROLE service_role; {statement};"], env, ok=False)
                if "permission denied" not in denied.stderr.lower():
                    raise RuntimeError(f"service_role direct bypass failed for wrong reason: {statement}: {denied.stderr}")
            service_allowed = {
                "recommendation": recommend_sql,
                "support": ("SET ROLE service_role; SELECT public.update_success_path_support("
                    f"'{support_id}','a3000000-4000-4000-8000-000000000006','resolved','coach-role','member has next step')::text;"),
            }
            for label, sql in service_allowed.items():
                receipt = json.loads(run([*psql, "-Atq", "-c", sql], env).stdout.strip())
                if not receipt.get("replayed"):
                    raise RuntimeError(f"legitimate service_role {label} RPC replay failed: {receipt}")
            function_acl_checks = {
                "create_success_path_recommendation(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,text,text,integer,text,text,text)": True,
                "update_success_path_support(uuid,uuid,text,text,text)": True,
                "resolve_my_success_path(uuid)": False,
                "success_path_append_timeline(uuid,uuid,uuid,bigint,text,text,text,text,text,jsonb,jsonb)": False,
                "success_path_attach_canonical_action(uuid,uuid,uuid,bigint,text,uuid,uuid,text,bigint,text,integer,text)": False,
            }
            for signature, expected in function_acl_checks.items():
                actual = run([*psql, "-Atq", "-c",
                    f"SELECT has_function_privilege('service_role','public.{signature}','EXECUTE');"], env).stdout.strip()
                if actual != ("t" if expected else "f"):
                    raise RuntimeError(f"service_role function ACL drift for {signature}: {actual}")

            expected_signatures = {
                "create_success_path_recommendation": "uuid, uuid, uuid, uuid, uuid, uuid, uuid, text, text, text, text, text, integer, text, text, text",
                "resolve_my_success_path": "uuid",
                "confirm_my_success_path": "uuid, uuid, bigint, text, text, text, uuid, text, text, integer, text",
                "submit_my_success_path_evidence": "uuid, uuid, bigint, uuid, text, jsonb, text, text, timestamp with time zone",
                "evaluate_my_success_path_week": "uuid, uuid, text, bigint, uuid, uuid, text, text, integer",
                "preview_my_success_path_transition": "uuid, uuid, bigint, text, text, uuid, uuid, uuid, text, text, text, text, text, integer",
                "confirm_my_success_path_transition": "uuid, uuid, jsonb, text, boolean",
                "recover_my_success_path_after_absence": "uuid, uuid, bigint, text, integer",
                "update_success_path_support": "uuid, uuid, text, text, text",
                "resolve_my_success_path_timeline": "uuid",
            }
            for name, expected in expected_signatures.items():
                rows = run([*psql, "-Atq", "-c",
                    f"SELECT oidvectortypes(p.proargtypes) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='{name}';"], env).stdout.strip().splitlines()
                if rows != [expected]:
                    raise RuntimeError(f"pg_proc signature drift for {name}: {rows}")
            nullable_contract = {
                ("success_path_cycle_states", "confirmed_stage"): "YES",
                ("success_path_cycle_states", "active_assignment_item_id"): "YES",
                ("success_path_cycle_states", "assignment_id"): "NO",
                ("success_path_cycle_states", "catalog_content_sha256"): "NO",
                ("success_path_actions", "logical_action_key"): "NO",
                ("success_path_actions", "task_id"): "NO",
                ("success_path_evidence_receipts", "structured_value"): "NO",
                ("success_path_evidence_receipts", "member_note"): "YES",
                ("success_path_focus_proposals", "impact_diff"): "NO",
                ("success_path_focus_proposals", "evidence_receipt_id"): "YES",
            }
            for (table, column), expected in nullable_contract.items():
                actual = run([*psql, "-Atq", "-c",
                    f"SELECT is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='{table}' AND column_name='{column}';"], env).stdout.strip()
                if actual != expected:
                    raise RuntimeError(f"information_schema nullability drift for {table}.{column}: {actual}")
            relationship_count = run([*psql, "-Atq", "-c",
                "SELECT count(*) FROM pg_constraint WHERE connamespace='public'::regnamespace AND convalidated AND conname=ANY(ARRAY["
                "'success_path_state_frozen_assignment_fkey','success_path_state_active_item_fkey','success_path_actions_owner_task_fkey',"
                "'success_path_evidence_owner_path_fkey','success_path_checkins_owner_evidence_fkey','success_path_support_checkin_fkey',"
                "'success_path_proposals_item_fkey','success_path_transitions_proposal_fkey']);"], env).stdout.strip()
            if relationship_count != "8":
                raise RuntimeError(f"database relationship contract drift: {relationship_count}/8")
            labels = run([*psql, "-Atq", "-c",
                f"SELECT count(*) FROM public.tasks WHERE user_id='{USERS['active']}' AND (coalesce(system_source,'') ILIKE '%mastermind%' "
                "OR coalesce(category,'') ILIKE '%mastermind%' OR array_to_string(coalesce(context_tags,'{}'::text[]),',') ILIKE '%mastermind%');"], env).stdout.strip()
            if labels != "0":
                raise RuntimeError("ordinary Planner tasks leaked Mastermind labels")
            print("PASS all four roles have no direct Wave 3 table privileges; service_role forged append/delete/truncate fail while only narrow RPCs execute")
            print("PASS pg_proc signatures, information_schema nullability, and validated relationship contracts match manual TypeScript surface")
            print("PASS Wave 3 PostgreSQL 16 behavior/RLS/ACL/concurrency/privacy suite")
        finally:
            if started:
                subprocess.run([pg_ctl, "-D", str(data), "-m", "fast", "-w", "stop"], env=env,
                               text=True, capture_output=True)


if __name__ == "__main__":
    main()
