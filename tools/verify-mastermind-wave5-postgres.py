#!/usr/bin/env python3
"""Native PostgreSQL 16 proof for the Wave 5 private telemetry boundary."""

from __future__ import annotations

import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import uuid


ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "supabase/migrations"
PG = Path("/opt/homebrew/opt/postgresql@16/bin")
USER = "11111111-1111-4111-8111-111111111111"
CATALOG = "74000000-1000-4000-8000-000000000001"
ITEM = "74000000-1100-4000-8000-000000000001"
MEDIA = "74000000-1200-4000-8000-000000000001"
RESOURCE = "74000000-1300-4000-8000-000000000001"
TRANSCRIPT = "74000000-1400-4000-8000-000000000001"
PLAYBACK = "74000000-1500-4000-8000-000000000001"


def run(command: list[object], env: dict[str, str], *, ok: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run([str(part) for part in command], env=env, text=True, capture_output=True)
    if ok and result.returncode:
        raise RuntimeError(result.stdout + result.stderr)
    return result


def jwt(user_id: str) -> str:
    return f"SET request.jwt.claims='{{\"sub\":\"{user_id}\",\"role\":\"authenticated\"}}';"


def call(
    psql: list[object], env: dict[str, str], role: str, expression: str, user_id: str | None = None
) -> dict:
    claims = jwt(user_id) if user_id else ""
    result = run(
        [*psql, "-Atq", "-c", f"SET ROLE {role}; {claims} SELECT ({expression})::text;"], env
    )
    return json.loads(result.stdout.strip().splitlines()[-1])


def concurrent_authenticated_calls(
    psql: list[object], env: dict[str, str], expressions: list[str], user_id: str
) -> list[dict]:
    """Launch simultaneous real authenticated clients and parse every JSON receipt."""
    processes = [
        subprocess.Popen(
            [
                *[str(part) for part in psql],
                "-Atq",
                "-c",
                f"SET ROLE authenticated; {jwt(user_id)} SELECT pg_sleep(0.25); "
                f"SELECT ({expression})::text;",
            ],
            env=env,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        for expression in expressions
    ]
    receipts: list[dict] = []
    for process in processes:
        stdout, stderr = process.communicate(timeout=20)
        if process.returncode:
            raise RuntimeError(
                f"concurrent authenticated PostgreSQL process failed ({process.returncode}): {stdout}{stderr}"
            )
        try:
            receipts.append(json.loads(stdout.strip().splitlines()[-1]))
        except (IndexError, json.JSONDecodeError) as error:
            raise RuntimeError(f"concurrent client returned no parseable receipt: {stdout}{stderr}") from error
    return receipts


def scalar(psql: list[object], env: dict[str, str], sql: str) -> str:
    return run([*psql, "-Atq", "-c", sql], env).stdout.strip()


def rows(psql: list[object], env: dict[str, str], sql: str) -> list[dict]:
    output = scalar(psql, env, sql)
    return [json.loads(line) for line in output.splitlines() if line]


def rpc(cycle: str, assignment_item: str, action: str, request_id: str, event: str, progress: int | None) -> str:
    progress_sql = "NULL" if progress is None else str(progress)
    return (
        "public.record_my_assigned_learning_engagement("
        f"'{cycle}','{assignment_item}','{action}','{request_id}','{event}',{progress_sql})"
    )


def assert_uuid(value: object, label: str) -> None:
    try:
        uuid.UUID(str(value))
    except (ValueError, TypeError, AttributeError) as error:
        raise RuntimeError(f"{label} is not a UUID: {value}") from error


def assert_recorded(receipt: dict, reported: int | None) -> None:
    expected = {
        "status": "accepted",
        "reason": "recorded",
        "replayed": False,
        "reported_progress_basis_points": reported,
        "progress_basis_points": reported,
    }
    if any(receipt.get(key) != value for key, value in expected.items()):
        raise RuntimeError(f"invalid recorded receipt: {receipt}")
    assert_uuid(receipt.get("event_id"), "recorded event_id")


def assert_exact_json(actual: object, expected: object, path: str = "projection") -> None:
    """Require exact recursive keys, JSON value types, and fixture values."""
    if type(actual) is not type(expected):
        raise RuntimeError(
            f"server projection schema mismatch at {path}: "
            f"expected {type(expected).__name__}, got {type(actual).__name__}"
        )
    if isinstance(expected, dict):
        actual_keys, expected_keys = set(actual), set(expected)
        if actual_keys != expected_keys:
            raise RuntimeError(
                f"server projection schema mismatch at {path}: "
                f"expected keys {sorted(expected_keys)}, got {sorted(actual_keys)}"
            )
        for key, value in expected.items():
            assert_exact_json(actual[key], value, f"{path}.{key}")
    elif isinstance(expected, list):
        if len(actual) != len(expected):
            raise RuntimeError(f"server projection schema mismatch at {path}: array length changed")
        for index, value in enumerate(expected):
            assert_exact_json(actual[index], value, f"{path}[{index}]")
    elif actual != expected:
        raise RuntimeError(
            f"server projection value mismatch at {path}: expected {expected!r}, got {actual!r}"
        )


def setup_current_success_path(psql: list[object], env: dict[str, str]) -> tuple[str, str, str, str]:
    """Reuse Wave 4's accepted catalog -> assignment -> recommendation -> confirmation fixture path."""
    cycle = "74100000-2000-4000-8000-000000000001"
    plan = "74100000-2100-4000-8000-000000000001"
    ledger = "74100000-2200-4000-8000-000000000001"
    planner_receipt = "74100000-2300-4000-8000-000000000001"
    run([*psql, "-c", f"""
      INSERT INTO auth.users(id,email) VALUES('{USER}','wave5-telemetry@example.test');
      INSERT INTO public.entitlements(email,tier,status,starts_at,ends_at)
      VALUES('wave5-telemetry@example.test','mastermind','active',CURRENT_DATE-2,NULL);
      INSERT INTO public.curriculum_media_assets_private(media_asset_id,asset_key,canonical_resource_id,provider,
        provider_asset_id,private_locator,source_content_sha256,transcript_version_id,playback_attempt_id,created_by)
      VALUES('{MEDIA}','wave5-synthetic','{RESOURCE}','dropbox','PRIVATE-PROVIDER-ID',
        'id:AbCdEfGhIjKlMnOpQrStUvWxYz_12345','{'d' * 64}','{TRANSCRIPT}','{PLAYBACK}','wave5-test');
      INSERT INTO public.curriculum_catalog_versions(catalog_version_id,version_key,version_number,created_by,supersedes_version_id)
      SELECT '{CATALOG}','wave5-synthetic-v1',2,'wave5-test',catalog_version_id
        FROM public.curriculum_catalog_versions
       WHERE version_key = 'success-path-catalog-v1'
         AND lifecycle_state = 'active';
      INSERT INTO public.curriculum_catalog_items(catalog_item_id,catalog_version_id,stable_item_key,item_state,
        stage,milestone_key,milestone_title,item_role,item_order,title,intended_output,action_prompt,evidence_prompt,
        teacher_display_name,attribution_text,source_system,source_native_id,source_provenance,provenance_sha256,
        media_asset_id,canonical_resource_id,transcript_version_id,playback_attempt_id,publication_sha256,
        transcript_qa_state,provenance_qa_state,rights_qa_state,privacy_qa_state,edit_qa_state,caption_qa_state,
        playback_qa_state,action_qa_state,evidence_qa_state,qa_receipt_sha256,qa_approved_at,qa_approved_by,created_by)
      VALUES('{ITEM}','{CATALOG}','offer-synthetic','ready','offer','offer-foundation','Offer foundation','primary',1,
        'Synthetic Offer Lesson','One tested offer invitation','Draft one offer','Record the buyer response',
        'Synthetic Teacher','Synthetic fixture only','synthetic','PRIVATE-SOURCE-ID','PRIVATE-PROVENANCE','{'e' * 64}',
        '{MEDIA}','{RESOURCE}','{TRANSCRIPT}','{PLAYBACK}','{'f' * 64}','approved','approved','approved','approved',
        'approved','approved','approved','approved','approved','{'1' * 64}',clock_timestamp(),
        'synthetic-reviewer','wave5-test');
    """], env)
    call(psql, env, "service_role", f"public.publish_curriculum_catalog_version('{CATALOG}')")
    run([*psql, "-c", f"""
      INSERT INTO public.cycles_90_day(cycle_id,user_id,start_date,end_date,goal)
      VALUES('{cycle}','{USER}',CURRENT_DATE,CURRENT_DATE+89,'Validate synthetic engagement telemetry');
      INSERT INTO public.cycle_plan_intents_v2(plan_id,user_id,logical_plan_key,quarter_start,cycle_id,current_version,last_planner_receipt_id)
      VALUES('{plan}','{USER}','74100000-2400-4000-8000-000000000001',date_trunc('quarter',CURRENT_DATE)::date,
        '{cycle}',1,'{planner_receipt}');
      INSERT INTO public.cycle_plan_reconciliation_requests_v2(ledger_id,request_id,user_id,plan_id,planner_receipt_id,
        payload_hash,content_hash,payload_version,resulting_version,cycle_id,status,receipt,completed_at)
      VALUES('{ledger}','74100000-2500-4000-8000-000000000001','{USER}','{plan}','{planner_receipt}',
        '{'a' * 64}','{'b' * 64}','cycle-plan-v2',1,'{cycle}','complete','{{}}',clock_timestamp());
    """], env)
    assignment_receipt = call(
        psql,
        env,
        "service_role",
        "public.create_curriculum_cycle_assignment("
        f"'{USER}','{cycle}','{ledger}','{planner_receipt}','{CATALOG}','success_path',"
        f"ARRAY['{ITEM}']::uuid[],NULL,NULL,'wave5-synthetic')",
    )
    assignment = assignment_receipt["assignment_id"]
    assignment_item = scalar(
        psql,
        env,
        f"SELECT assignment_item_id FROM public.curriculum_cycle_assignment_items WHERE assignment_id='{assignment}';",
    )
    call(
        psql,
        env,
        "service_role",
        "public.create_success_path_recommendation("
        f"'{USER}','{cycle}','{ledger}','{planner_receipt}','{assignment}','{assignment_item}',"
        "'74100000-2600-4000-8000-000000000001','offer','offer-foundation','Offer foundation',"
        f"'offer-test','Send one synthetic offer invitation',30,'Synthetic confirmed bottleneck','{'c' * 64}','wave5-test')",
    )
    confirmation = call(
        psql,
        env,
        "authenticated",
        "public.confirm_my_success_path("
        f"'{cycle}','74100000-2700-4000-8000-000000000001',1,'offer','offer-foundation',"
        f"'Offer foundation','{assignment_item}','offer-test','Send one synthetic offer invitation',30,NULL)",
        USER,
    )
    if confirmation.get("status") != "saved":
        raise RuntimeError(f"synthetic Success Path did not confirm through the accepted producer: {confirmation}")
    current_slice = call(
        psql, env, "authenticated", f"public.resolve_my_success_path_learning_slice('{cycle}')", USER
    )
    if (
        current_slice.get("slice_state") != "ready"
        or current_slice.get("slice", {}).get("learning", {}).get("assignment_item_id") != assignment_item
    ):
        raise RuntimeError(f"synthetic Success Path is not current/authorized: {current_slice}")
    action = confirmation["action_id"]
    return cycle, assignment, assignment_item, action


def main() -> None:
    initdb, pg_ctl, psql_bin = PG / "initdb", PG / "pg_ctl", PG / "psql"
    if not all(path.exists() for path in (initdb, pg_ctl, psql_bin)):
        raise SystemExit("BLOCKED PostgreSQL 16 binaries unavailable")
    env = {**os.environ, "LC_ALL": "C"}
    with tempfile.TemporaryDirectory(prefix="wave5-pg16-") as temporary:
        base = Path(temporary)
        data, socket_dir = base / "data", base / "socket"
        socket_dir.mkdir()
        run([initdb, "-D", data, "--auth=trust", "--no-locale", "--username=postgres"], env)
        port = 54329
        while True:
            with socket.socket() as probe:
                try:
                    probe.bind(("127.0.0.1", port))
                    break
                except OSError:
                    port += 1
        started = False
        try:
            run(
                [pg_ctl, "-D", data, "-l", base / "postgres.log", "-o",
                 f"-F -k {socket_dir} -p {port} -c listen_addresses=''", "-w", "start"], env
            )
            started = True
            psql = [psql_bin, "-X", "-h", socket_dir, "-p", str(port), "-U", "postgres", "-d", "postgres",
                    "-v", "ON_ERROR_STOP=1"]
            bootstrap = """CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS; CREATE SCHEMA auth; CREATE EXTENSION pgcrypto; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text UNIQUE,raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claims',true)::jsonb->>'sub','')::uuid $$; CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT COALESCE(NULLIF(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb) $$; CREATE PUBLICATION supabase_realtime; CREATE SCHEMA storage; CREATE SCHEMA realtime; CREATE TABLE realtime.messages(topic text,payload jsonb); ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY; CREATE FUNCTION realtime.topic() RETURNS text LANGUAGE sql STABLE AS $$ SELECT COALESCE(current_setting('realtime.topic',true),'') $$; CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean DEFAULT false); CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text,owner uuid,metadata jsonb); GRANT USAGE ON SCHEMA public,auth,storage,realtime TO anon,authenticated,service_role; GRANT ALL ON ALL TABLES IN SCHEMA public TO anon,authenticated,service_role; GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon,authenticated,service_role; GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon,authenticated,service_role; GRANT SELECT,INSERT ON realtime.messages TO authenticated,service_role; GRANT EXECUTE ON FUNCTION auth.uid(),auth.jwt(),realtime.topic() TO anon,authenticated,service_role;"""
            run([*psql, "-c", bootstrap], env)
            run([*psql, "-c", "ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role; ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon,authenticated,service_role; ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon,authenticated,service_role; INSERT INTO auth.users(id,email) VALUES('72011c8d-a746-47e8-8f45-79789388260b','legacy-feature-fixture@example.test');"], env)
            for migration in sorted(MIGRATIONS.glob("*.sql")):
                run([*psql, "-f", migration], env)
            run([*psql, "-f", MIGRATIONS / "20260824210000_success_path_member_authority_engagement.sql"], env)

            shape = scalar(psql, env, "SELECT count(*)||':'||(SELECT count(*) FROM pg_trigger WHERE tgrelid='public.assigned_learning_engagement_events'::regclass AND tgname='assigned_learning_engagement_events_append_only') FROM pg_constraint WHERE conrelid='public.assigned_learning_engagement_events'::regclass;")
            if shape != "7:1":
                raise RuntimeError(f"unexpected engagement constraints/trigger {shape}")
            acl = scalar(psql, env, "SELECT has_function_privilege('authenticated','public.record_my_assigned_learning_engagement(uuid,uuid,uuid,uuid,text,integer)','EXECUTE')::int||':'||has_table_privilege('authenticated','public.assigned_learning_engagement_events','SELECT')::int||':'||has_function_privilege('service_role','public.project_assigned_learning_review_queue(timestamptz)','EXECUTE')::int;")
            if acl != "1:0:1":
                raise RuntimeError(f"ACL boundary failed {acl}")
            transition_acl = scalar(psql, env, "SELECT has_function_privilege('authenticated','public.preview_my_success_path_transition(uuid,uuid,bigint,text,text,uuid,uuid,uuid,text,text,text,text,text,integer)','EXECUTE')::int||':'||has_function_privilege('authenticated','public.confirm_my_success_path_transition(uuid,uuid,jsonb,text,boolean)','EXECUTE')::int||':'||has_function_privilege('authenticated','public.preview_my_success_path_transition_member(uuid,uuid,bigint,text,text,uuid,uuid,uuid,text,text,text,text,text,integer)','EXECUTE')::int||':'||has_function_privilege('authenticated','public.confirm_my_success_path_transition_member(uuid,uuid,jsonb,text,boolean)','EXECUTE')::int;")
            if transition_acl != "0:0:1:1":
                raise RuntimeError(f"transition RPC ACL boundary failed {transition_acl}")
            projected = json.loads(scalar(psql, env, "SELECT public.success_path_member_transition_diff(jsonb_build_object('transition',jsonb_build_object('kind','focus_change','reason_code','member_requested','assignment_reroute',false,'learning_item_changed',false,'operator_note','SECRET'),'stage',jsonb_build_object('old','start','new','start'),'milestone',jsonb_build_object('old',jsonb_build_object('key','m1','title','One','assignment_id',gen_random_uuid()),'new',jsonb_build_object('key','m2','title','Two')),'action',jsonb_build_object('old',jsonb_build_object('text','Old','estimated_minutes',20,'task_id',gen_random_uuid()),'new',jsonb_build_object('text','New','estimated_minutes',10,'logical_action_key','SECRET')),'history',jsonb_build_object('prior_task_preserved',true,'prior_task_completion_preserved',false,'evidence_preserved',true,'actions_preserved',false,'checkins_preserved',true),'private_locator','SECRET'))::text;"))
            expected_projection = {
                "transition": {"kind": "focus_change", "reason_code": "member_requested"},
                "stage": {"old": "start", "new": "start"},
                "milestone": {
                    "old": {"key": "m1", "title": "One"},
                    "new": {"key": "m2", "title": "Two"},
                },
                "learning": {"assignment_reroute": False, "learning_item_changed": False},
                "action": {
                    "old": {"text": "Old", "estimated_minutes": 20},
                    "new": {"text": "New", "estimated_minutes": 10},
                },
                "history": {
                    "prior_task_preserved": True,
                    "prior_task_completion_preserved": False,
                    "evidence_preserved": True,
                    "actions_preserved": False,
                    "checkins_preserved": True,
                },
            }
            assert_exact_json(projected, expected_projection)
            classes = scalar(psql, env, "SELECT string_agg(public.classify_assigned_learning_engagement(opened,watched,actioned,returned,last_at,'2026-08-24T12:00:00Z'),',' ORDER BY n) FROM (VALUES (1,false,false,false,false,NULL::timestamptz),(2,true,true,false,false,'2026-08-24T11:00:00Z'::timestamptz),(3,true,true,false,false,'2026-08-01'::timestamptz),(4,true,true,true,true,'2026-08-24'::timestamptz),(5,true,true,true,false,'2026-08-24'::timestamptz)) v(n,opened,watched,actioned,returned,last_at);")
            if classes != "assigned_not_opened,watched_no_action,stalled,returned,in_progress":
                raise RuntimeError(f"classification parity helper drifted {classes}")
            denied = call(psql, env, "authenticated", "public.record_my_assigned_learning_engagement(gen_random_uuid(),gen_random_uuid(),NULL,gen_random_uuid(),'playback_progress',NULL)")
            if denied != {"reason": "unavailable", "status": "denied"}:
                raise RuntimeError(f"closed unauth denial drifted {denied}")

            cycle, _assignment, assignment_item, action = setup_current_success_path(psql, env)

            same_request = "66666666-6666-4666-8666-666666666666"
            same_expression = rpc(cycle, assignment_item, action, same_request, "assignment_opened", None)
            same_receipts = concurrent_authenticated_calls(psql, env, [same_expression, same_expression], USER)
            if sorted(receipt.get("replayed") for receipt in same_receipts) != [False, True]:
                raise RuntimeError(f"same-request callers did not split original/replay: {same_receipts}")
            original, replay = sorted(same_receipts, key=lambda receipt: receipt["replayed"])
            assert_recorded(original, None)
            if replay != {**original, "replayed": True}:
                raise RuntimeError(f"same-request replay changed accepted identity/values: {same_receipts}")
            same_rows = rows(psql, env, f"SELECT jsonb_build_object('request_count',(SELECT count(*) FROM public.assigned_learning_engagement_requests WHERE user_id='{USER}' AND request_id='{same_request}'),'event_count',(SELECT count(*) FROM public.assigned_learning_engagement_events WHERE user_id='{USER}' AND request_id='{same_request}'),'request_receipt',(SELECT receipt FROM public.assigned_learning_engagement_requests WHERE user_id='{USER}' AND request_id='{same_request}'),'event_receipt',(SELECT receipt FROM public.assigned_learning_engagement_events WHERE user_id='{USER}' AND request_id='{same_request}'))::text;")[0]
            if same_rows != {"request_count": 1, "event_count": 1, "request_receipt": original, "event_receipt": original}:
                raise RuntimeError(f"same-request durable rows contradict receipts: {same_rows} {same_receipts}")
            print("PASS concurrent same request/payload uses the authenticated RPC and converges to one event/request plus exact replay")

            before_conflict = scalar(psql, env, f"SELECT (SELECT count(*) FROM public.assigned_learning_engagement_requests WHERE user_id='{USER}')||':'||(SELECT count(*) FROM public.assigned_learning_engagement_events WHERE user_id='{USER}');")
            conflict = call(psql, env, "authenticated", rpc(cycle, assignment_item, action, same_request, "playback_started", None), USER)
            after_conflict = scalar(psql, env, f"SELECT (SELECT count(*) FROM public.assigned_learning_engagement_requests WHERE user_id='{USER}')||':'||(SELECT count(*) FROM public.assigned_learning_engagement_events WHERE user_id='{USER}');")
            if conflict != {"status": "conflict", "reason": "request_conflict"} or after_conflict != before_conflict:
                raise RuntimeError(f"changed-payload conflict was not closed/no-write: {conflict} {before_conflict}->{after_conflict}")
            print("PASS committed request with changed payload returns exact request_conflict and writes no rows")

            progress_requests = ["77777777-7777-4777-8777-777777777774", "77777777-7777-4777-8777-777777777777"]
            progress_values = [4000, 7000]
            progress_receipts = concurrent_authenticated_calls(
                psql, env,
                [rpc(cycle, assignment_item, action, request_id, "playback_progress", progress)
                 for request_id, progress in zip(progress_requests, progress_values)],
                USER,
            )
            progress_rows = rows(psql, env, f"SELECT jsonb_build_object('request_id',request_id,'reported',reported_progress_basis_points,'accepted',accepted_progress_basis_points,'receipt',receipt)::text FROM public.assigned_learning_engagement_requests WHERE user_id='{USER}' AND request_id IN ('{progress_requests[0]}','{progress_requests[1]}') ORDER BY reported_progress_basis_points;")
            if len(progress_rows) != 2 or [row["reported"] for row in progress_rows] != progress_values:
                raise RuntimeError(f"distinct progress requests lost their payload bindings: {progress_rows}")
            for index, (receipt, progress) in enumerate(zip(progress_receipts, progress_values)):
                if receipt.get("status") != "accepted" or receipt.get("replayed") is not False or receipt.get("reported_progress_basis_points") != progress:
                    raise RuntimeError(f"progress caller {progress} received an invalid receipt: {receipt}")
                if progress == 7000:
                    assert_recorded(receipt, 7000)
                elif receipt.get("reason") == "recorded":
                    assert_recorded(receipt, 4000)
                elif receipt != {"status": "accepted", "reason": "heartbeat_deduplicated", "event_id": None,
                                "replayed": False, "reported_progress_basis_points": 4000,
                                "progress_basis_points": 7000}:
                    raise RuntimeError(f"4000 receipt is untruthful for serialization order: {receipt}")
                if progress_rows[index]["receipt"] != receipt or progress_rows[index]["accepted"] != receipt["progress_basis_points"]:
                    raise RuntimeError(f"durable progress receipt fields contradict caller response: {progress_rows[index]} {receipt}")
            final_progress = scalar(psql, env, f"SELECT coalesce(max(progress_basis_points),0)||':'||count(*) FROM public.assigned_learning_engagement_events WHERE user_id='{USER}' AND cycle_id='{cycle}' AND assignment_item_id='{assignment_item}' AND event_type='playback_progress';")
            progress_event_count = sum(receipt["reason"] == "recorded" for receipt in progress_receipts)
            if final_progress != f"7000:{progress_event_count}":
                raise RuntimeError(f"serialized progress maximum/event count is wrong: {final_progress} {progress_receipts}")
            print("PASS distinct concurrent progress requests preserve payload receipts and serialize to monotonic accepted maximum 7000")

            heartbeat_request = "88888888-8888-4888-8888-888888888888"
            heartbeat_expression = rpc(cycle, assignment_item, action, heartbeat_request, "playback_progress", 3000)
            heartbeat = call(psql, env, "authenticated", heartbeat_expression, USER)
            expected_heartbeat = {"status": "accepted", "reason": "heartbeat_deduplicated", "event_id": None,
                                  "replayed": False, "reported_progress_basis_points": 3000,
                                  "progress_basis_points": 7000}
            if heartbeat != expected_heartbeat:
                raise RuntimeError(f"suppressed heartbeat receipt drifted: {heartbeat}")
            heartbeat_rows = rows(psql, env, f"SELECT jsonb_build_object('request_count',(SELECT count(*) FROM public.assigned_learning_engagement_requests WHERE user_id='{USER}' AND request_id='{heartbeat_request}'),'event_count',(SELECT count(*) FROM public.assigned_learning_engagement_events WHERE user_id='{USER}' AND request_id='{heartbeat_request}'),'reported',reported_progress_basis_points,'accepted',accepted_progress_basis_points,'receipt',receipt)::text FROM public.assigned_learning_engagement_requests WHERE user_id='{USER}' AND request_id='{heartbeat_request}';")
            if heartbeat_rows != [{"request_count": 1, "event_count": 0, "reported": 3000, "accepted": 7000,
                                   "receipt": expected_heartbeat}]:
                raise RuntimeError(f"suppressed heartbeat durability failed: {heartbeat_rows}")
            before_replay = scalar(psql, env, f"SELECT (SELECT count(*) FROM public.assigned_learning_engagement_requests WHERE user_id='{USER}')||':'||(SELECT count(*) FROM public.assigned_learning_engagement_events WHERE user_id='{USER}');")
            heartbeat_replay = call(psql, env, "authenticated", heartbeat_expression, USER)
            after_replay = scalar(psql, env, f"SELECT (SELECT count(*) FROM public.assigned_learning_engagement_requests WHERE user_id='{USER}')||':'||(SELECT count(*) FROM public.assigned_learning_engagement_events WHERE user_id='{USER}');")
            if heartbeat_replay != {**expected_heartbeat, "replayed": True} or after_replay != before_replay:
                raise RuntimeError(f"heartbeat replay changed receipt/rows: {heartbeat_replay} {before_replay}->{after_replay}")
            print("PASS suppressed heartbeat persists without an event and exact replay adds no rows")

            mutation = run([*psql, "-c", "UPDATE public.assigned_learning_engagement_events SET event_type='playback_started';"], env, ok=False)
            if mutation.returncode == 0 or "append-only" not in mutation.stderr:
                raise RuntimeError("append-only mutation control failed")
            print("PASS Wave 5 PostgreSQL 16 frontier double-apply, raw/member RPC ACLs, recursively safe projection, five-state shared classification, closed denial, authenticated RPC request idempotency/conflict, serialized monotonic progress, durable heartbeat suppression/replay, and append-only controls")
        finally:
            if started:
                run([pg_ctl, "-D", data, "-m", "fast", "-w", "stop"], env, ok=False)


if __name__ == "__main__":
    main()
