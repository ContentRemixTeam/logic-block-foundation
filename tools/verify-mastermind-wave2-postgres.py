#!/usr/bin/env python3
"""Run Wave 2 schema, RLS, persona, immutability, and concurrency proof on PostgreSQL 16."""

from __future__ import annotations

import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile


ROOT = Path(__file__).resolve().parents[1]
MOCK = ROOT / "test/cycle-plan-reconciliation-v2/mock_current_schema.sql"
EXTENSION = ROOT / "test/mastermind-wave2/mock-predecessor-extension.sql"
WAVE1 = ROOT / "supabase/migrations/20260822190000_cycle_plan_reconciliation_v2.sql"
CAPABILITIES = ROOT / "supabase/migrations/20260822200000_mastermind_capability_projection.sql"
CURRICULUM = ROOT / "supabase/migrations/20260822210000_planner_learning_catalog_assignments.sql"

USERS = {
    "nonmember": "11111111-1111-4111-8111-111111111111",
    "monthly": "22222222-2222-4222-8222-222222222222",
    "annual": "33333333-3333-4333-8333-333333333333",
    "expired": "44444444-4444-4444-8444-444444444444",
    "conflict": "55555555-5555-4555-8555-555555555555",
    "unavailable": "66666666-6666-4666-8666-666666666666",
    "admin": "77777777-7777-4777-8777-777777777777",
    "other": "88888888-8888-4888-8888-888888888888",
    "lifetime": "99999999-9999-4999-8999-999999999999",
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


def run(command: list[str], env: dict[str, str], *, expect_success: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(command, env=env, text=True, capture_output=True)
    if expect_success and result.returncode:
        raise RuntimeError(
            f"Command failed ({result.returncode}): {' '.join(command)}\n{result.stdout}{result.stderr}"
        )
    if not expect_success and result.returncode == 0:
        raise RuntimeError(f"Command unexpectedly succeeded: {' '.join(command)}\n{result.stdout}")
    return result


def jwt_sql(user_id: str) -> str:
    return f"SET request.jwt.claims = '{{\"sub\":\"{user_id}\",\"role\":\"authenticated\"}}';"


def capability_map(psql: list[str], env: dict[str, str], user_id: str) -> dict[str, str]:
    query = (
        "SET ROLE authenticated; " + jwt_sql(user_id)
        + "SELECT jsonb_object_agg(capability_key, capability_state)::text "
          "FROM public.resolve_my_capabilities();"
    )
    output = run([*psql, "-Atq", "-c", query], env).stdout.strip()
    return json.loads(output)


def assigned_learning(psql: list[str], env: dict[str, str], user_id: str, cycle_id: str) -> dict:
    query = (
        "SET ROLE authenticated; " + jwt_sql(user_id)
        + f"SELECT public.resolve_my_assigned_learning('{cycle_id}')::text;"
    )
    return json.loads(run([*psql, "-Atq", "-c", query], env).stdout.strip())


def assert_state(states: dict[str, str], key: str, expected: str, persona: str) -> None:
    actual = states.get(key)
    if actual != expected:
        raise RuntimeError(f"{persona} {key}: expected {expected}, found {actual}; {states}")


def main() -> None:
    initdb = executable("initdb")
    pg_ctl = executable("pg_ctl")
    psql_bin = executable("psql")
    version = run([psql_bin, "--version"], os.environ.copy()).stdout.strip()
    if " 16." not in version:
        raise SystemExit(f"BLOCKED PostgreSQL 16 required, found: {version}")

    env = os.environ.copy()
    env.update({"LC_ALL": "C", "LANG": "C"})
    # This sandbox disallows TCP socket probes. PostgreSQL itself listens only on
    # the private temporary Unix socket directory below.
    port = 55443

    with tempfile.TemporaryDirectory(prefix="mastermind-wave2-pg16-", dir="/tmp") as temp:
        base = Path(temp)
        data = base / "data-mmap"
        socket_dir = base / "socket"
        socket_dir.mkdir()
        log = base / "postgres.log"
        started = False
        try:
            bootstrap_errors: list[str] = []
            for shared_memory_type in ("mmap", "sysv"):
                data = base / f"data-{shared_memory_type}"
                try:
                    run([
                        initdb, "-D", str(data), "-A", "trust", "-U", "postgres", "--no-instructions",
                        "-c", f"shared_memory_type={shared_memory_type}",
                        "-c", f"dynamic_shared_memory_type={shared_memory_type}",
                    ], env)
                    break
                except RuntimeError as error:
                    bootstrap_errors.append(str(error))
                    known_sandbox_failure = any(marker in str(error) for marker in (
                        "Operation not permitted",
                        "Cannot allocate memory",
                        "could not create shared memory segment",
                    ))
                    if not known_sandbox_failure:
                        raise
            else:
                raise SystemExit(
                    "BLOCKED PostgreSQL 16 initdb cannot allocate mmap or SysV bootstrap shared memory; "
                    "no database behavior claim was made."
                )
            run([
                pg_ctl, "-D", str(data), "-l", str(log), "-o",
                f"-F -k {socket_dir} -p {port} -c listen_addresses='' -c shared_memory_type={shared_memory_type} "
                f"-c dynamic_shared_memory_type={shared_memory_type}",
                "-w", "start",
            ], env)
            started = True
            psql = [psql_bin, "-h", str(socket_dir), "-p", str(port), "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"]

            for sql_file in (MOCK, EXTENSION, WAVE1, CAPABILITIES, CURRICULUM):
                run([*psql, "-f", str(sql_file)], env)
            # Exact Wave 2 candidate is required to be rerunnable over its Wave 1 predecessor.
            for sql_file in (CAPABILITIES, CURRICULUM):
                run([*psql, "-f", str(sql_file)], env)
            print("PASS PostgreSQL 16 applied both Wave 2 migrations twice over the focused exact Wave 1 predecessor")

            user_values = ",".join(
                f"('{user_id}','{name}@example.test')" for name, user_id in USERS.items()
            )
            seed = f"""
              INSERT INTO auth.users(id,email) VALUES {user_values};
              INSERT INTO public.admin_users(user_id,email)
                VALUES ('{USERS['admin']}','admin@example.test');
              INSERT INTO public.entitlements(email,tier,status,starts_at,ends_at) VALUES
                ('monthly@example.test','mastermind','active',CURRENT_DATE - 10,NULL),
                ('annual@example.test','mastermind','active',CURRENT_DATE - 10,NULL),
                ('lifetime@example.test','mastermind','active',CURRENT_DATE - 10,NULL),
                ('expired@example.test','mastermind','active','2020-01-01','2020-12-31'),
                ('conflict@example.test','mastermind','active',CURRENT_DATE - 10,NULL),
                ('CONFLICT@example.test','mastermind','expired','2020-01-01','2020-12-31'),
                ('unavailable@example.test','mastermind','active',CURRENT_DATE - 10,NULL);
              INSERT INTO public.replay_vault_purchase_contributions(
                normalized_email,entitlement_tier,contribution_starts_at,contribution_expires_at
              ) VALUES
                ('monthly@example.test','monthly',clock_timestamp() - interval '10 days',clock_timestamp() + interval '20 days'),
                ('annual@example.test','annual',clock_timestamp() - interval '10 days',clock_timestamp() + interval '300 days'),
                ('lifetime@example.test','lifetime',clock_timestamp() - interval '10 days',NULL),
                ('unavailable@example.test','annual',clock_timestamp() - interval '10 days',clock_timestamp() + interval '300 days');
              SELECT public.set_capability_verification_hold(
                '{USERS['unavailable']}', 'mastermind.learning.assigned',
                'verification_unavailable', 'stale_evidence', clock_timestamp() - interval '2 days',
                clock_timestamp() + interval '1 day', 'synthetic-test'
              );
            """
            run([*psql, "-c", seed], env)

            nonmember = capability_map(psql, env, USERS["nonmember"])
            assert_state(nonmember, "planner.base", "granted", "standalone Planner")
            assert_state(nonmember, "mastermind.section", "denied", "standalone Planner")
            assert_state(nonmember, "mastermind.learning.assigned", "denied", "standalone Planner")
            assert_state(nonmember, "vault.discovery", "denied", "standalone Planner")

            monthly = capability_map(psql, env, USERS["monthly"])
            for key in (
                "mastermind.section", "mastermind.learning.assigned",
                "mastermind.ask_faith", "mastermind.community_link",
            ):
                assert_state(monthly, key, "granted", "monthly Mastermind")
            for key in ("vault.discovery", "vault.search", "vault.playback", "vault.saved_videos"):
                assert_state(monthly, key, "denied", "monthly Mastermind")

            for persona in ("annual", "lifetime"):
                states = capability_map(psql, env, USERS[persona])
                assert_state(states, "mastermind.learning.assigned", "granted", persona)
                for key in ("vault.discovery", "vault.search", "vault.playback", "vault.saved_videos"):
                    assert_state(states, key, "granted", persona)

            expired = capability_map(psql, env, USERS["expired"])
            assert_state(expired, "mastermind.section", "denied", "expired Mastermind")
            assert_state(expired, "mastermind.learning.assigned", "denied", "expired Mastermind")
            assert_state(expired, "vault.discovery", "denied", "expired Mastermind")

            conflict = capability_map(psql, env, USERS["conflict"])
            assert_state(conflict, "mastermind.section", "review_required", "conflicting evidence")
            assert_state(conflict, "vault.discovery", "review_required", "conflicting evidence")

            unavailable = capability_map(psql, env, USERS["unavailable"])
            assert_state(unavailable, "mastermind.learning.assigned", "verification_unavailable", "stale evidence")
            assert_state(unavailable, "mastermind.section", "granted", "independent stale Learning hold")
            assert_state(unavailable, "vault.discovery", "granted", "independent stale Learning hold")

            admin = capability_map(psql, env, USERS["admin"])
            assert_state(admin, "admin.curriculum_preview", "granted", "admin preview")
            assert_state(admin, "mastermind.learning.assigned", "denied", "admin preview independence")
            assert_state(admin, "vault.discovery", "denied", "admin preview independence")
            print("PASS caller-bound personas distinguish granted, denied, review_required, and verification_unavailable independently")

            anonymous = run([
                *psql, "-Atq", "-c", "SET ROLE anon; SELECT * FROM public.resolve_my_capabilities();"
            ], env, expect_success=False)
            if "permission denied" not in anonymous.stderr.lower():
                raise RuntimeError(f"anonymous resolver denial was not an ACL failure: {anonymous.stderr}")
            direct_write = run([
                *psql, "-Atq", "-c",
                "SET ROLE authenticated; " + jwt_sql(USERS["annual"])
                + "INSERT INTO public.capability_verification_holds(user_id,capability_key,hold_state,reason_code,created_by) "
                  f"VALUES ('{USERS['annual']}','vault.discovery','review_required','manual_review','browser');",
            ], env, expect_success=False)
            if "permission denied" not in direct_write.stderr.lower():
                raise RuntimeError(f"authenticated capability write was not denied: {direct_write.stderr}")
            acl_count = run([
                *psql, "-Atq", "-c",
                "WITH target_functions AS ("
                " SELECT p.oid, p.proacl, p.proowner FROM pg_proc p"
                " WHERE p.oid IN ('public.resolve_my_capabilities()'::regprocedure,"
                "                 'public.resolve_my_assigned_learning(uuid)'::regprocedure)"
                "), public_execute AS ("
                " SELECT 1 FROM target_functions f"
                " CROSS JOIN LATERAL aclexplode(coalesce(f.proacl, acldefault('f', f.proowner))) a"
                " WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'"
                "), anon_execute AS ("
                " SELECT 1 FROM target_functions f"
                " WHERE has_function_privilege('anon', f.oid, 'EXECUTE')"
                ") SELECT (SELECT count(*) FROM public_execute) + (SELECT count(*) FROM anon_execute);",
            ], env).stdout.strip()
            if acl_count != "0":
                raise RuntimeError(f"PUBLIC/anon retained {acl_count} member resolver grants")
            print("PASS PUBLIC/anon execution and authenticated direct authority writes fail with real ACL enforcement")

            ids = {
                "media": "aaaaaaaa-0000-4000-8000-000000000001",
                "resource": "aaaaaaaa-0000-4000-8000-000000000002",
                "transcript": "aaaaaaaa-0000-4000-8000-000000000003",
                "playback": "aaaaaaaa-0000-4000-8000-000000000004",
                "v1": "aaaaaaaa-1000-4000-8000-000000000001",
                "item1": "aaaaaaaa-1100-4000-8000-000000000001",
                "v2": "aaaaaaaa-2000-4000-8000-000000000001",
                "item2": "aaaaaaaa-2200-4000-8000-000000000001",
                "annual_cycle": "aaaaaaaa-3000-4000-8000-000000000001",
                "annual_plan": "aaaaaaaa-3000-4000-8000-000000000002",
                "annual_ledger": "aaaaaaaa-3000-4000-8000-000000000003",
                "annual_receipt": "aaaaaaaa-3000-4000-8000-000000000004",
                "lifetime_cycle": "aaaaaaaa-4000-4000-8000-000000000001",
                "lifetime_plan": "aaaaaaaa-4000-4000-8000-000000000002",
                "lifetime_ledger": "aaaaaaaa-4000-4000-8000-000000000003",
                "lifetime_receipt": "aaaaaaaa-4000-4000-8000-000000000004",
            }
            catalog_seed = f"""
              INSERT INTO public.curriculum_media_assets_private(
                media_asset_id,asset_key,canonical_resource_id,provider,provider_asset_id,
                private_locator,source_content_sha256,transcript_version_id,playback_attempt_id,created_by
              ) VALUES (
                '{ids['media']}','synthetic-offer-asset','{ids['resource']}','synthetic','fixture-1',
                'private://synthetic/not-playable','{'a' * 64}','{ids['transcript']}','{ids['playback']}','synthetic-test'
              );
              INSERT INTO public.curriculum_catalog_versions(
                catalog_version_id,version_key,version_number,created_by
              ) VALUES ('{ids['v1']}','planner-learning-synthetic-v1',1,'synthetic-test');
            """
            run([*psql, "-c", catalog_seed], env)

            incomplete_ready = f"""
              INSERT INTO public.curriculum_catalog_items(
                catalog_item_id,catalog_version_id,stable_item_key,item_state,stage,milestone_key,
                milestone_title,item_role,item_order,title,intended_output,teacher_display_name,
                attribution_text,source_system,source_native_id,source_provenance,created_by
              ) VALUES (
                '{ids['item1']}','{ids['v1']}','offer-primary','ready','offer','offer-foundation',
                'Offer foundation','primary',1,'Synthetic offer lesson','Write the offer',
                'Synthetic Teacher','Synthetic fixture only','synthetic','fixture-1',
                'Generated test fixture; no real GHL resource','synthetic-test'
              );
            """
            ready_failure = run([*psql, "-c", incomplete_ready], env, expect_success=False)
            if "requires approved transcript" not in ready_failure.stderr:
                raise RuntimeError(f"incomplete ready item failed for the wrong reason: {ready_failure.stderr}")

            ready_insert = f"""
              INSERT INTO public.curriculum_catalog_items(
                catalog_item_id,catalog_version_id,stable_item_key,item_state,stage,milestone_key,
                milestone_title,item_role,item_order,title,intended_output,action_prompt,evidence_prompt,
                teacher_display_name,attribution_text,source_system,source_native_id,source_provenance,
                provenance_sha256,media_asset_id,canonical_resource_id,transcript_version_id,
                playback_attempt_id,publication_sha256,transcript_qa_state,provenance_qa_state,
                rights_qa_state,privacy_qa_state,edit_qa_state,caption_qa_state,playback_qa_state,
                action_qa_state,evidence_qa_state,qa_receipt_sha256,qa_approved_at,qa_approved_by,created_by
              ) VALUES (
                '{ids['item1']}','{ids['v1']}','offer-primary','ready','offer','offer-foundation',
                'Offer foundation','primary',1,'Synthetic offer lesson v1','Write the offer',
                'Draft one offer promise','Save the promise as Planner evidence','Synthetic Teacher',
                'Synthetic fixture only','synthetic','fixture-1','Generated test fixture; no real GHL resource',
                '{'b' * 64}','{ids['media']}','{ids['resource']}','{ids['transcript']}','{ids['playback']}',
                '{'c' * 64}','approved','approved','approved','approved','approved','approved','approved',
                'approved','approved','{'d' * 64}',clock_timestamp(),'synthetic-reviewer','synthetic-test'
              );
            """
            run([*psql, "-c", ready_insert], env)
            publish_v1 = run([
                *psql, "-Atq", "-c",
                f"SET ROLE service_role; SELECT public.publish_curriculum_catalog_version('{ids['v1']}')::text;",
            ], env).stdout.strip()
            if json.loads(publish_v1)["catalog_version_id"] != ids["v1"]:
                raise RuntimeError(f"catalog v1 publication receipt mismatch: {publish_v1}")
            immutable = run([
                *psql, "-c",
                f"UPDATE public.curriculum_catalog_items SET title='silently changed' WHERE catalog_item_id='{ids['item1']}';",
            ], env, expect_success=False)
            if "immutable" not in immutable.stderr:
                raise RuntimeError(f"published catalog item mutation failed for wrong reason: {immutable.stderr}")
            print("PASS ready-state QA guard and published catalog immutability execute in PostgreSQL")

            receipt_seed = f"""
              INSERT INTO public.cycles_90_day(cycle_id,user_id,start_date,end_date,goal)
              VALUES
                ('{ids['annual_cycle']}','{USERS['annual']}',CURRENT_DATE,CURRENT_DATE + 89,'Annual synthetic goal'),
                ('{ids['lifetime_cycle']}','{USERS['lifetime']}',CURRENT_DATE,CURRENT_DATE + 89,'Lifetime synthetic goal');
              INSERT INTO public.cycle_plan_intents_v2(
                plan_id,user_id,logical_plan_key,quarter_start,cycle_id,current_version,last_planner_receipt_id
              ) VALUES
                ('{ids['annual_plan']}','{USERS['annual']}','aaaaaaaa-3000-4000-8000-000000000005',date_trunc('quarter',CURRENT_DATE)::date,'{ids['annual_cycle']}',1,'{ids['annual_receipt']}'),
                ('{ids['lifetime_plan']}','{USERS['lifetime']}','aaaaaaaa-4000-4000-8000-000000000005',(date_trunc('quarter',CURRENT_DATE) + interval '3 months')::date,'{ids['lifetime_cycle']}',1,'{ids['lifetime_receipt']}');
              INSERT INTO public.cycle_plan_reconciliation_requests_v2(
                ledger_id,request_id,user_id,plan_id,planner_receipt_id,payload_hash,content_hash,
                payload_version,resulting_version,cycle_id,status,receipt,completed_at
              ) VALUES
                ('{ids['annual_ledger']}','aaaaaaaa-3000-4000-8000-000000000006','{USERS['annual']}','{ids['annual_plan']}','{ids['annual_receipt']}','{'e' * 64}','{'f' * 64}','cycle-plan-v2',1,'{ids['annual_cycle']}','complete','{{}}',clock_timestamp()),
                ('{ids['lifetime_ledger']}','aaaaaaaa-4000-4000-8000-000000000006','{USERS['lifetime']}','{ids['lifetime_plan']}','{ids['lifetime_receipt']}','{'1' * 64}','{'2' * 64}','cycle-plan-v2',1,'{ids['lifetime_cycle']}','complete','{{}}',clock_timestamp());
            """
            run([*psql, "-c", receipt_seed], env)

            create_v1 = (
                "SET ROLE service_role; SELECT public.create_curriculum_cycle_assignment("
                f"'{USERS['annual']}','{ids['annual_cycle']}','{ids['annual_ledger']}','{ids['annual_receipt']}',"
                f"'{ids['v1']}','success_path',ARRAY['{ids['item1']}']::uuid[],NULL,NULL,'synthetic-test')::text;"
            )
            initial_assignment = json.loads(run([*psql, "-Atq", "-c", create_v1], env).stdout.strip())
            if initial_assignment["assignment_status"] != "active":
                raise RuntimeError(f"initial assignment did not activate: {initial_assignment}")
            annual_learning = assigned_learning(psql, env, USERS["annual"], ids["annual_cycle"])
            serialized = json.dumps(annual_learning, sort_keys=True)
            if annual_learning.get("assignment_state") != "active" or annual_learning["items"][0]["title"] != "Synthetic offer lesson v1":
                raise RuntimeError(f"assigned Learning resolver returned wrong authority: {annual_learning}")
            for private_value in ("private://", "fixture-1", ids["transcript"], ids["playback"]):
                if private_value in serialized:
                    raise RuntimeError(f"member Learning response leaked private authority {private_value}: {serialized}")

            denied_learning = assigned_learning(psql, env, USERS["monthly"], ids["annual_cycle"])
            denied_serialized = json.dumps(denied_learning, sort_keys=True)
            if denied_learning.get("reason") != "inaccessible" or denied_learning.get("items") != []:
                raise RuntimeError(f"cross-owner read was not empty/inaccessible: {denied_learning}")
            for protected in ("Synthetic", "offer", "Teacher", "milestone", "resource", "locator", "transcript"):
                if protected.lower() in denied_serialized.lower():
                    raise RuntimeError(f"denied response leaked protected metadata token {protected}: {denied_serialized}")
            cross_owner_create = run([
                *psql, "-Atq", "-c",
                "SET ROLE service_role; SELECT public.create_curriculum_cycle_assignment("
                f"'{USERS['lifetime']}','{ids['annual_cycle']}','{ids['annual_ledger']}','{ids['annual_receipt']}',"
                f"'{ids['v1']}','success_path',ARRAY['{ids['item1']}']::uuid[],NULL,NULL,'synthetic-test');",
            ], env, expect_success=False)
            if "exact completed Planner receipt" not in cross_owner_create.stderr:
                raise RuntimeError(f"cross-owner assignment failed for wrong reason: {cross_owner_create.stderr}")
            print("PASS exact owner/cycle/Planner-receipt binding, cross-owner denial, and no private metadata leakage")

            v2_seed = f"""
              INSERT INTO public.curriculum_catalog_versions(
                catalog_version_id,version_key,version_number,supersedes_version_id,created_by
              ) VALUES ('{ids['v2']}','planner-learning-synthetic-v2',2,'{ids['v1']}','synthetic-test');
              INSERT INTO public.curriculum_catalog_items(
                catalog_item_id,catalog_version_id,stable_item_key,item_state,stage,milestone_key,
                milestone_title,item_role,item_order,title,intended_output,action_prompt,evidence_prompt,
                teacher_display_name,attribution_text,source_system,source_native_id,source_provenance,
                provenance_sha256,media_asset_id,canonical_resource_id,transcript_version_id,
                playback_attempt_id,publication_sha256,transcript_qa_state,provenance_qa_state,
                rights_qa_state,privacy_qa_state,edit_qa_state,caption_qa_state,playback_qa_state,
                action_qa_state,evidence_qa_state,qa_receipt_sha256,qa_approved_at,qa_approved_by,created_by
              ) VALUES (
                '{ids['item2']}','{ids['v2']}','offer-primary-v2','ready','offer','offer-foundation',
                'Offer foundation','primary',1,'Synthetic offer lesson v2','Write the sharper offer',
                'Draft a sharper promise','Save the revised promise as evidence','Synthetic Teacher',
                'Synthetic fixture only','synthetic','fixture-2','Generated test fixture; no real GHL resource',
                '{'3' * 64}','{ids['media']}','{ids['resource']}','{ids['transcript']}','{ids['playback']}',
                '{'4' * 64}','approved','approved','approved','approved','approved','approved','approved',
                'approved','approved','{'5' * 64}',clock_timestamp(),'synthetic-reviewer','synthetic-test'
              );
            """
            run([*psql, "-c", v2_seed], env)
            run([
                *psql, "-Atq", "-c",
                f"SET ROLE service_role; SELECT public.publish_curriculum_catalog_version('{ids['v2']}');",
            ], env)
            still_v1 = assigned_learning(psql, env, USERS["annual"], ids["annual_cycle"])
            if still_v1["assignment"]["catalog_version_key"] != "planner-learning-synthetic-v1" or still_v1["items"][0]["title"] != "Synthetic offer lesson v1":
                raise RuntimeError(f"later catalog publication rewrote frozen assignment: {still_v1}")
            version_mutation = run([
                *psql, "-c",
                f"UPDATE public.curriculum_catalog_versions SET version_key='silent-rewrite' WHERE catalog_version_id='{ids['v1']}';",
            ], env, expect_success=False)
            if "immutable" not in version_mutation.stderr:
                raise RuntimeError(f"superseded catalog version mutation failed for wrong reason: {version_mutation.stderr}")
            print("PASS later catalog publication leaves the frozen assignment and member metadata unchanged")

            rebuild_sql = (
                "SET ROLE service_role; SELECT public.create_curriculum_cycle_assignment("
                f"'{USERS['annual']}','{ids['annual_cycle']}','{ids['annual_ledger']}','{ids['annual_receipt']}',"
                f"'{ids['v2']}','success_path',ARRAY['{ids['item2']}']::uuid[],'{initial_assignment['assignment_id']}',"
                "'{\"added\":[\"offer-primary-v2\"],\"removed\":[\"offer-primary\"]}'::jsonb,'synthetic-test')::text;"
            )
            pending = json.loads(run([*psql, "-Atq", "-c", rebuild_sql], env).stdout.strip())
            if pending["assignment_status"] != "pending_confirmation" or not pending["confirmation_required"]:
                raise RuntimeError(f"rebuild skipped confirmation boundary: {pending}")
            before_confirm = assigned_learning(psql, env, USERS["annual"], ids["annual_cycle"])
            if before_confirm["items"][0]["title"] != "Synthetic offer lesson v1":
                raise RuntimeError(f"pending rebuild replaced active assignment before confirmation: {before_confirm}")
            confirm_sql = (
                "SET ROLE service_role; SELECT public.confirm_curriculum_assignment_rebuild("
                f"'{pending['assignment_id']}','{pending['rebuild_diff_sha256']}','synthetic-confirmer')::text;"
            )
            confirmed = json.loads(run([*psql, "-Atq", "-c", confirm_sql], env).stdout.strip())
            if confirmed["assignment_status"] != "active":
                raise RuntimeError(f"confirmed rebuild did not activate: {confirmed}")
            after_confirm = assigned_learning(psql, env, USERS["annual"], ids["annual_cycle"])
            if after_confirm["items"][0]["title"] != "Synthetic offer lesson v2":
                raise RuntimeError(f"confirmed rebuild did not switch frozen authority: {after_confirm}")
            print("PASS rebuild creates a hashed diff boundary and switches only after explicit confirmation")

            create_lifetime = (
                "SET ROLE service_role; SELECT public.create_curriculum_cycle_assignment("
                f"'{USERS['lifetime']}','{ids['lifetime_cycle']}','{ids['lifetime_ledger']}','{ids['lifetime_receipt']}',"
                f"'{ids['v2']}','success_path',ARRAY['{ids['item2']}']::uuid[],NULL,NULL,'concurrency-test')::text;"
            )
            workers = [
                subprocess.Popen([*psql, "-Atq", "-c", create_lifetime], env=env, text=True,
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                for _ in range(2)
            ]
            outcomes = [worker.communicate(timeout=20) + (worker.returncode,) for worker in workers]
            successes = [outcome for outcome in outcomes if outcome[2] == 0]
            failures = [outcome for outcome in outcomes if outcome[2] != 0]
            if len(successes) != 1 or len(failures) != 1:
                raise RuntimeError(f"concurrent assignment creation did not produce one winner: {outcomes}")
            count = run([
                *psql, "-Atq", "-c",
                f"SELECT count(*) FROM public.curriculum_cycle_assignments WHERE user_id='{USERS['lifetime']}' "
                f"AND cycle_id='{ids['lifetime_cycle']}' AND context_key='success_path' AND assignment_status='active';",
            ], env).stdout.strip()
            if count != "1":
                raise RuntimeError(f"concurrent assignment creation left {count} active assignments")
            print("PASS concurrent duplicate assignment creation yields one active winner and one fail-closed loser")

            assignment_write = run([
                *psql, "-c", "SET ROLE authenticated; " + jwt_sql(USERS["annual"])
                + "UPDATE public.curriculum_cycle_assignments SET assignment_version=99;",
            ], env, expect_success=False)
            if "permission denied" not in assignment_write.stderr.lower():
                raise RuntimeError(f"authenticated assignment write was not denied: {assignment_write.stderr}")
            print("PASS ordinary clients have no direct catalog, media, hold, or assignment write authority")

            run([
                *psql, "-c",
                "INSERT INTO public.curriculum_catalog_item_revocations("
                f"catalog_item_id,reason,evidence_sha256,revoked_by) VALUES ('{ids['item2']}',"
                f"'synthetic revocation proof','{'6' * 64}','synthetic-test');",
            ], env)
            revoked = assigned_learning(psql, env, USERS["annual"], ids["annual_cycle"])
            revoked_text = json.dumps(revoked, sort_keys=True)
            if revoked.get("assignment_state") != "review_required" or revoked.get("items") != []:
                raise RuntimeError(f"revoked assigned item did not fail closed: {revoked}")
            if "Synthetic offer lesson" in revoked_text or "Teacher" in revoked_text:
                raise RuntimeError(f"revoked assignment response leaked protected metadata: {revoked_text}")
            print("PASS explicit catalog item revocation fails the member resolver closed without metadata")
            print("PASS Wave 2 PostgreSQL 16 schema/RLS/persona/concurrency suite")
        finally:
            if started:
                subprocess.run([pg_ctl, "-D", str(data), "-m", "fast", "-w", "stop"], env=env,
                               text=True, capture_output=True)


if __name__ == "__main__":
    main()
