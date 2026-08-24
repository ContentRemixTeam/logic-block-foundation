#!/usr/bin/env python3
"""Native PostgreSQL 16 proof for the Wave 4 closed slice and playback boundary."""

from __future__ import annotations

import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    ROOT / "test/cycle-plan-reconciliation-v2/mock_current_schema.sql",
    ROOT / "test/mastermind-wave2/mock-predecessor-extension.sql",
    ROOT / "supabase/migrations/20260822190000_cycle_plan_reconciliation_v2.sql",
    ROOT / "supabase/migrations/20260822200000_mastermind_capability_projection.sql",
    ROOT / "supabase/migrations/20260822210000_planner_learning_catalog_assignments.sql",
    ROOT / "supabase/migrations/20260822220000_success_path_execution_ledger.sql",
    ROOT / "supabase/migrations/20260822230000_offer_first_assigned_learning_slice.sql",
]
WAVE4 = FILES[-1]
USERS = {
    "monthly": "74111111-1111-4111-8111-111111111111",
    "annual": "74222222-2222-4222-8222-222222222222",
    "other": "74333333-3333-4333-8333-333333333333",
    "expired": "74444444-4444-4444-8444-444444444444",
    "unavailable": "74555555-5555-4555-8555-555555555555",
}
CATALOG = "74000000-1000-4000-8000-000000000001"
ITEM = "74000000-1100-4000-8000-000000000001"
MEDIA = "74000000-1200-4000-8000-000000000001"
RESOURCE = "74000000-1300-4000-8000-000000000001"
TRANSCRIPT = "74000000-1400-4000-8000-000000000001"
PLAYBACK = "74000000-1500-4000-8000-000000000001"


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


def call(psql: list[str], env: dict[str, str], role: str, expression: str, user_id: str | None = None) -> dict:
    claims = jwt(user_id) if user_id else ""
    lines = run([*psql, "-Atq", "-c", f"SET ROLE {role}; {claims} SELECT ({expression})::text;"], env).stdout.strip().splitlines()
    return json.loads(lines[-1])


def setup_path(psql: list[str], env: dict[str, str], label: str, ordinal: int) -> tuple[str, str, str]:
    user_id = USERS[label]
    cycle = f"74{ordinal}00000-2000-4000-8000-000000000001"
    plan = f"74{ordinal}00000-2100-4000-8000-000000000001"
    ledger = f"74{ordinal}00000-2200-4000-8000-000000000001"
    receipt = f"74{ordinal}00000-2300-4000-8000-000000000001"
    run([*psql, "-c", f"""
      INSERT INTO public.cycles_90_day(cycle_id,user_id,start_date,end_date,goal)
      VALUES('{cycle}','{user_id}',CURRENT_DATE,CURRENT_DATE+89,'Validate one synthetic offer');
      INSERT INTO public.cycle_plan_intents_v2(plan_id,user_id,logical_plan_key,quarter_start,cycle_id,current_version,last_planner_receipt_id)
      VALUES('{plan}','{user_id}','74{ordinal}00000-2400-4000-8000-000000000001',date_trunc('quarter',CURRENT_DATE)::date,
        '{cycle}',1,'{receipt}');
      INSERT INTO public.cycle_plan_reconciliation_requests_v2(ledger_id,request_id,user_id,plan_id,planner_receipt_id,
        payload_hash,content_hash,payload_version,resulting_version,cycle_id,status,receipt,completed_at)
      VALUES('{ledger}','74{ordinal}00000-2500-4000-8000-000000000001','{user_id}','{plan}','{receipt}',
        '{'a'*64}','{'b'*64}','cycle-plan-v2',1,'{cycle}','complete','{{}}',clock_timestamp());
    """], env)
    assignment = call(psql, env, "service_role", "public.create_curriculum_cycle_assignment("
        f"'{user_id}','{cycle}','{ledger}','{receipt}','{CATALOG}','success_path',"
        f"ARRAY['{ITEM}']::uuid[],NULL,NULL,'wave4-synthetic')")
    assignment_id = assignment["assignment_id"]
    assignment_item = run([*psql, "-Atq", "-c",
        f"SELECT assignment_item_id FROM public.curriculum_cycle_assignment_items WHERE assignment_id='{assignment_id}';"], env).stdout.strip()
    call(psql, env, "service_role", "public.create_success_path_recommendation("
        f"'{user_id}','{cycle}','{ledger}','{receipt}','{assignment_id}','{assignment_item}',"
        f"'74{ordinal}00000-2600-4000-8000-000000000001','offer','offer-foundation','Offer foundation',"
        f"'offer-test','Send one synthetic offer invitation',30,'Synthetic confirmed bottleneck','{'c'*64}','wave4-test')")
    call(psql, env, "authenticated", "public.confirm_my_success_path("
        f"'{cycle}','74{ordinal}00000-2700-4000-8000-000000000001',1,'offer','offer-foundation',"
        f"'Offer foundation','{assignment_item}','offer-test','Send one synthetic offer invitation',30,NULL)", user_id)
    return cycle, assignment_id, assignment_item


def assert_empty(label: str, value: dict) -> None:
    if set(value) != {"slice_state", "reason", "slice"} or value["slice"] is not None:
        raise RuntimeError(f"{label} leaked outside the closed empty envelope: {value}")
    forbidden = {
        "assignment_item_id", "title", "teacher", "attribution", "action_id", "task_id", "path_id",
        "planner_receipt_id", "catalog_version_id", "publication_sha256", "provider", "private_locator",
        "vault", "count", "search", "transcript", "saved",
    }
    if forbidden & set(json.dumps(value).lower().replace('"', '').split()):
        raise RuntimeError(f"{label} leaked private fields: {value}")


def main() -> None:
    initdb, pg_ctl, psql_bin = executable("initdb"), executable("pg_ctl"), executable("psql")
    version = run([psql_bin, "--version"], os.environ.copy()).stdout.strip()
    if " 16." not in version:
        raise SystemExit(f"BLOCKED PostgreSQL 16 required, found {version}")
    env = os.environ.copy()
    env.update({"LC_ALL": "C", "LANG": "C"})
    port = 55445
    with tempfile.TemporaryDirectory(prefix="mastermind-wave4-pg16-", dir="/tmp") as temp:
        base = Path(temp)
        socket_dir = base / "socket"
        socket_dir.mkdir()
        log = base / "postgres.log"
        started = False
        try:
            for memory in ("mmap", "sysv"):
                data = base / f"data-{memory}"
                attempt = subprocess.run([initdb, "-D", str(data), "-A", "trust", "-U", "postgres", "--no-instructions",
                    "-c", f"shared_memory_type={memory}", "-c", f"dynamic_shared_memory_type={memory}"],
                    env=env, text=True, capture_output=True)
                if attempt.returncode == 0:
                    break
                if not any(marker in attempt.stdout + attempt.stderr for marker in (
                    "Operation not permitted", "Cannot allocate memory", "could not create shared memory segment")):
                    raise RuntimeError(attempt.stdout + attempt.stderr)
            else:
                raise SystemExit("BLOCKED PostgreSQL 16 cannot allocate bootstrap shared memory; no Wave 4 database claim made.")
            run([pg_ctl, "-D", str(data), "-l", str(log), "-o",
                f"-F -k {socket_dir} -p {port} -c listen_addresses='' -c shared_memory_type={memory} -c dynamic_shared_memory_type={memory}",
                "-w", "start"], env)
            started = True
            psql = [psql_bin, "-X", "-h", str(socket_dir), "-p", str(port), "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"]
            for sql_file in FILES:
                run([*psql, "-f", str(sql_file)], env)
            run([*psql, "-f", str(WAVE4)], env)
            print("PASS Wave 4 applies twice after exact focused Wave 1/2/3 predecessors")

            values = ",".join(f"('{user_id}','{label}@example.test')" for label, user_id in USERS.items())
            run([*psql, "-c", f"""
              INSERT INTO auth.users(id,email) VALUES {values};
              INSERT INTO public.entitlements(email,tier,status,starts_at,ends_at) VALUES
                ('monthly@example.test','mastermind','active',CURRENT_DATE-2,NULL),
                ('annual@example.test','mastermind','active',CURRENT_DATE-2,NULL),
                ('other@example.test','mastermind','active',CURRENT_DATE-2,NULL),
                ('expired@example.test','mastermind','active','2020-01-01','2020-12-31'),
                ('unavailable@example.test','mastermind','active',CURRENT_DATE-2,NULL);
              INSERT INTO public.replay_vault_purchase_contributions(normalized_email,entitlement_tier,contribution_starts_at)
                VALUES('annual@example.test','annual',clock_timestamp()-interval '1 day');
              SELECT public.set_capability_verification_hold('{USERS['unavailable']}','mastermind.learning.assigned',
                'verification_unavailable','stale_evidence',clock_timestamp()-interval '1 day',clock_timestamp()+interval '1 day','wave4-test');
              INSERT INTO public.curriculum_media_assets_private(media_asset_id,asset_key,canonical_resource_id,provider,
                provider_asset_id,private_locator,source_content_sha256,transcript_version_id,playback_attempt_id,created_by)
              VALUES('{MEDIA}','wave4-synthetic','{RESOURCE}','dropbox','PRIVATE-PROVIDER-ID','/PRIVATE-WAVE4-LOCATOR.mp4',
                '{'d'*64}','{TRANSCRIPT}','{PLAYBACK}','wave4-test');
              INSERT INTO public.curriculum_catalog_versions(catalog_version_id,version_key,version_number,created_by)
              VALUES('{CATALOG}','wave4-synthetic-v1',1,'wave4-test');
              INSERT INTO public.curriculum_catalog_items(catalog_item_id,catalog_version_id,stable_item_key,item_state,
                stage,milestone_key,milestone_title,item_role,item_order,title,intended_output,action_prompt,evidence_prompt,
                teacher_display_name,attribution_text,source_system,source_native_id,source_provenance,provenance_sha256,
                media_asset_id,canonical_resource_id,transcript_version_id,playback_attempt_id,publication_sha256,
                transcript_qa_state,provenance_qa_state,rights_qa_state,privacy_qa_state,edit_qa_state,caption_qa_state,
                playback_qa_state,action_qa_state,evidence_qa_state,qa_receipt_sha256,qa_approved_at,qa_approved_by,created_by)
              VALUES('{ITEM}','{CATALOG}','offer-synthetic','ready','offer','offer-foundation','Offer foundation','primary',1,
                'Synthetic Offer Lesson','One tested offer invitation','Draft one offer','Record the buyer response','Synthetic Teacher',
                'Synthetic fixture only','synthetic','PRIVATE-SOURCE-ID','PRIVATE-PROVENANCE','{'e'*64}','{MEDIA}','{RESOURCE}',
                '{TRANSCRIPT}','{PLAYBACK}','{'f'*64}','approved','approved','approved','approved','approved','approved',
                'approved','approved','approved','{'1'*64}',clock_timestamp(),'synthetic-reviewer','wave4-test');
            """], env)
            call(psql, env, "service_role", f"public.publish_curriculum_catalog_version('{CATALOG}')")
            monthly = setup_path(psql, env, "monthly", 1)
            annual = setup_path(psql, env, "annual", 2)

            monthly_slice = call(psql, env, "authenticated", f"public.resolve_my_success_path_learning_slice('{monthly[0]}')", USERS["monthly"])
            annual_slice = call(psql, env, "authenticated", f"public.resolve_my_success_path_learning_slice('{annual[0]}')", USERS["annual"])
            if monthly_slice["slice_state"] != "ready" or annual_slice["slice_state"] != "ready":
                raise RuntimeError(f"monthly/annual assigned Learning failed: {monthly_slice} {annual_slice}")
            if set(monthly_slice) != {"slice_state", "reason", "slice"} or set(monthly_slice["slice"]) != {
                "cycle_id", "path_id", "path_version", "state_receipt_id", "result_text", "confirmed_stage",
                "milestone", "action", "learning", "support_state", "latest_evaluation_outcome",
            }:
                raise RuntimeError(f"success projection is not closed: {monthly_slice}")
            annual_learning = annual_slice["slice"]["learning"]
            monthly_learning = monthly_slice["slice"]["learning"]
            same_projection = (
                {key: value for key, value in annual_learning.items() if key != "assignment_item_id"}
                    == {key: value for key, value in monthly_learning.items() if key != "assignment_item_id"}
                and annual_learning["assignment_item_id"] != monthly_learning["assignment_item_id"]
                and annual_slice["slice"]["result_text"] == monthly_slice["slice"]["result_text"]
                and annual_slice["slice"]["confirmed_stage"] == monthly_slice["slice"]["confirmed_stage"]
                and annual_slice["slice"]["milestone"] == monthly_slice["slice"]["milestone"]
                and {key: annual_slice["slice"]["action"][key] for key in ("text", "estimated_minutes", "completion_state")}
                    == {key: monthly_slice["slice"]["action"][key] for key in ("text", "estimated_minutes", "completion_state")}
            )
            if not same_projection:
                raise RuntimeError("annual received a different or Vault-expanded assigned Learning projection")
            serialized = json.dumps(monthly_slice).lower()
            for sentinel in ("private-wave4", "private-source", "provider-id", "vault", "transcript", "publication_sha256"):
                if sentinel in serialized:
                    raise RuntimeError(f"success slice leaked {sentinel}: {serialized}")
            print("PASS monthly succeeds without Vault and annual receives the identical one-item closed projection")

            for label, uid, cycle in (
                ("expired", USERS["expired"], monthly[0]),
                ("verification unavailable", USERS["unavailable"], monthly[0]),
                ("cross-owner", USERS["other"], monthly[0]),
            ):
                assert_empty(label, call(psql, env, "authenticated", f"public.resolve_my_success_path_learning_slice('{cycle}')", uid))
            privacy_mutation = run([*psql, "-Atq", "-c", f"""
              BEGIN;
              CREATE OR REPLACE FUNCTION public.resolve_my_success_path_learning_slice(p_cycle_id uuid)
              RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
                SELECT jsonb_build_object('slice_state','denied','reason','executable_privacy_mutation_control',
                  'slice',NULL,'private_locator','PRIVATE-WAVE4-LOCATOR','unknownProducerField','PRIVATE')
              $$;
              SET LOCAL ROLE authenticated; {jwt(USERS['expired'])}
              SELECT public.resolve_my_success_path_learning_slice('{monthly[0]}')::text;
              ROLLBACK;
            """], env).stdout.strip().splitlines()
            mutated = json.loads(privacy_mutation[-1])
            try:
                assert_empty("executable privacy mutation", mutated)
            except RuntimeError:
                pass
            else:
                raise RuntimeError("real resolver private/unknown field mutation did not fail the closed-schema assertion")
            assert_empty("privacy rollback restoration", call(psql, env, "authenticated",
                f"public.resolve_my_success_path_learning_slice('{monthly[0]}')", USERS["expired"]))
            print("PASS expired, verification-unavailable, and cross-owner personas receive metadata-free envelopes")

            request_id = "74000000-3000-4000-8000-000000000001"
            expression = "public.resolve_assigned_learning_playback("
            args = f"'{USERS['monthly']}','{monthly[0]}','{monthly[2]}','{request_id}',clock_timestamp())"
            playback = call(psql, env, "service_role", expression + args)
            replay = call(psql, env, "service_role", expression + args)
            if playback.get("decision") != "allowed" or replay.get("replayed") is not True \
                    or playback.get("authorization_receipt_id") != replay.get("authorization_receipt_id"):
                raise RuntimeError(f"playback idempotency failed: {playback} {replay}")
            count = run([*psql, "-Atq", "-c", f"SELECT count(*) FROM public.planner_learning_playback_authorizations WHERE user_id='{USERS['monthly']}' AND request_id='{request_id}';"], env).stdout.strip()
            if count != "1":
                raise RuntimeError(f"same request produced {count} authorization receipts")
            conflict = run([*psql, "-c", f"SET ROLE service_role; SELECT {expression}'{USERS['monthly']}','{monthly[0]}','{annual[2]}','{request_id}',clock_timestamp());"], env, ok=False)
            if "request conflict" not in conflict.stderr:
                raise RuntimeError(f"changed playback payload did not conflict: {conflict.stderr}")
            wrong_item = call(psql, env, "service_role", expression + f"'{USERS['monthly']}','{monthly[0]}','{annual[2]}','74000000-3000-4000-8000-000000000002',clock_timestamp())")
            if wrong_item != {"decision": "denied", "reason": "inaccessible"}:
                raise RuntimeError(f"unrelated item was not hidden: {wrong_item}")
            print("PASS exact current item authorizes once; replay converges; changed payload conflicts; unrelated item fails")

            drift = run([*psql, "-Atq", "-c", f"""
              BEGIN; SET LOCAL session_replication_role=replica;
              UPDATE public.curriculum_catalog_items SET playback_qa_state='pending' WHERE catalog_item_id='{ITEM}';
              SET LOCAL ROLE service_role;
              SELECT public.resolve_assigned_learning_playback('{USERS['monthly']}','{monthly[0]}','{monthly[2]}',
                '74000000-3000-4000-8000-000000000003',clock_timestamp())::text;
              ROLLBACK;
            """], env).stdout.strip().splitlines()
            if json.loads(drift[-1]) != {"decision": "denied", "reason": "stale_authority"}:
                raise RuntimeError(f"QA drift did not fail immediately: {drift[-1]}")
            restored = call(psql, env, "authenticated", f"public.resolve_my_success_path_learning_slice('{monthly[0]}')", USERS["monthly"])
            if restored["slice_state"] != "ready":
                raise RuntimeError("rollback restoration failed")
            print("PASS QA/publication authority drift fails closed and rollback restoration passes")

            acl = run([*psql, "-Atq", "-c", """
              SELECT role_name||':'||table_name||':'||privilege||':'||has_table_privilege(role_name,format('public.%I',table_name),privilege)
              FROM unnest(ARRAY['anon','authenticated','service_role']) role_name
              CROSS JOIN unnest(ARRAY['curriculum_media_assets_private','curriculum_catalog_versions','curriculum_catalog_items',
                'curriculum_catalog_item_revocations','curriculum_catalog_version_revocations','curriculum_cycle_assignments',
                'curriculum_cycle_assignment_items','planner_learning_playback_authorizations']) table_name
              CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) privilege;
            """], env).stdout.splitlines()
            if any(not (line.endswith(":f") or line.endswith(":false")) for line in acl):
                raise RuntimeError(f"effective table privilege survived: {acl}")
            fn_acl = run([*psql, "-Atq", "-c", """
              SELECT has_function_privilege('anon','public.resolve_assigned_learning_playback(uuid,uuid,uuid,uuid,timestamptz)','EXECUTE')||':'||
                     has_function_privilege('authenticated','public.resolve_assigned_learning_playback(uuid,uuid,uuid,uuid,timestamptz)','EXECUTE')||':'||
                     has_function_privilege('service_role','public.resolve_assigned_learning_playback(uuid,uuid,uuid,uuid,timestamptz)','EXECUTE');
            """], env).stdout.strip()
            if fn_acl not in {"f:f:t", "false:false:true"}:
                raise RuntimeError(f"service-only playback RPC ACL failed: {fn_acl}")
            print("PASS all direct table/destructive privileges are denied and only service_role executes playback RPC")
        finally:
            if started:
                subprocess.run([pg_ctl, "-D", str(data), "-m", "immediate", "stop"], env=env, capture_output=True, text=True)


if __name__ == "__main__":
    main()
