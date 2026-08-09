#!/usr/bin/env node
// Supplemental structural guard only. Primary proof is verify-replay-vault-access-pg.mjs + Deno tests.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const sql=read("supabase/migrations/20260809140000_replay_vault_access_hardening.sql");
const search=read("supabase/functions/search-mastermind-resources/index.ts");
const playback=read("supabase/functions/get-mastermind-playback-link/index.ts");
const producer=read("supabase/functions/_shared/replayVaultProducer.mjs");
const webhook=read("supabase/functions/ghl-webhook-grant-planner/index.ts");
let checks=0;
function check(name,fn){fn();checks++;console.log(`PASS ${name}`);} function has(s,v){assert.ok(s.includes(v),`missing ${v}`);} function lacks(s,v){assert.ok(!s.includes(v),`forbidden ${v}`);}
check("canonical ingestion publication model is the only model",()=>{
  for(const v of ["publication_state","privacy_state","pairing_state","transcript_state","media_state","approved_access_scope"]) has(sql,v);
  for(const v of ["publication_status","transcript_pairing_status","playback_status","withdrawn_at"]) lacks(sql.replace(/^--.*$/gm,""),v);
});
check("search returns durable bounded moments without access counts",()=>{
  has(sql,"moment_id uuid");has(sql,"PARTITION BY m.portal_resource_id");has(sql,"b.replay_rank <= 3");has(search,"mapSearchRow");has(producer,"momentId: String(row.moment_id");has(producer,"endSeconds: finiteSeconds(row.ends_at_seconds)");
  lacks(search,"resultCount");lacks(search,"accessScopeCounts");
});
check("playback binds exactly one server ID and returns authoritative bounds",()=>{
  has(playback,"Boolean(questionId) === Boolean(momentId)");has(sql,"(p_question_id IS NULL) = (p_moment_id IS NULL)");
  has(sql,"FROM public.replay_published_resource_projection r");has(sql,"s.id=p_moment_id AND s.transcript_version_id=v_transcript_version_id");has(sql,"a.id=p_question_id AND a.resource_id=v_resource_id");has(playback,"mapPlaybackResponse");has(producer,"startSeconds: finiteSeconds(row.authoritative_start_seconds)");has(producer,"endSeconds: finiteSeconds(row.authoritative_end_seconds)");
});
check("only Dropbox temporary links leave the edge",()=>{
  has(playback,"get_temporary_link");lacks(playback,"dropboxPath:");lacks(playback,"sourceUrl:");
});
check("signature rejection precedes immutable RPC and duplicates bind payload hash",()=>{
  assert.ok(webhook.indexOf("if (!payloadHash)")<webhook.indexOf("apply_replay_vault_webhook_event"));
  has(sql,"v_event.payload_sha256 <> p_payload_sha256");has(sql,"event_id_payload_conflict");
});
check("all requested transition types and fail-closed empty mapping exist",()=>{
  for(const v of ["grant","renewal","cancel_at_period_end","expiration","refund","chargeback","immediate_revocation"]) {has(sql,v);has(webhook,v);}
  lacks(sql,"INSERT INTO public.replay_vault_provider_product_mappings(");
});
check("direct access is revoked and each function loses PUBLIC execute",()=>{
  has(sql,"FROM PUBLIC, anon, authenticated, service_role");
  const creates=[...sql.matchAll(/CREATE OR REPLACE FUNCTION\s+public\.([a-z0-9_]+)\s*\(([^)]*)\)/gi)].map(m=>m[1]);
  for(const name of new Set(creates)) has(sql,`REVOKE ALL ON FUNCTION public.${name}`);
});
console.log(`Replay Vault supplemental source verifier passed: ${checks} checks`);
