#!/usr/bin/env node
// Regression guard for the 2026-08-31 blocked-private overreach.
//
// The blanket registry backfill hid every DRAFT / editorially-unreviewed resource from the
// Replay Vault projections, which removed previously proven coaching calls such as
// "Profitable Pricing with Whitney Morrison" (membershipio:6Dbd59bgqz) and could remove the
// five playable Phase One resources. DRAFT state, category, or title must never be treated as
// evidence of third-party provenance; only a trustworthy per-row editorial decision may block.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(root, "supabase/migrations");
const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

const RESTORE = "20260831190852_9d86fefe-fc70-447d-bcd1-b510cf66570b.sql";
if (!files.includes(RESTORE)) throw new Error(`restore migration missing: ${RESTORE}`);

const restoreSql = readFileSync(path.join(migrationsDir, RESTORE), "utf8");
for (const required of [
  "DELETE FROM public.replay_vault_blocked_private_sources",
  "CREATE OR REPLACE VIEW public.replay_published_resource_projection",
  "CREATE OR REPLACE VIEW public.replay_authorized_resource_projection",
  "CREATE OR REPLACE VIEW public.replay_admin_preview_resource_projection",
]) {
  if (!restoreSql.includes(required)) throw new Error(`restore migration is missing: ${required}`);
}
for (const forbidden of [
  /editorial_approved_at\s+IS\s+NULL/i,
  /ingestion_status\s+NOT\s+IN/i,
  /EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+public\.replay_vault_blocked_private_sources/i,
]) {
  if (forbidden.test(restoreSql)) throw new Error(`restore migration still filters on: ${forbidden}`);
}


// No later migration may re-introduce the blanket predicate on the projections.
const later = files.filter((f) => f > RESTORE);
for (const file of later) {
  const sql = readFileSync(path.join(migrationsDir, file), "utf8");
  if (!/replay_(published|authorized|admin_preview)_resource_projection/.test(sql)) continue;
  if (/editorial_approved_at\s+IS\s+NULL/i.test(sql) || /replay_vault_blocked_private_sources/i.test(sql)) {
    throw new Error(`migration ${file} re-introduces a blanket DRAFT/unapproved block on the Vault projections`);
  }
}

// The five playable Phase One resources plus Profitable Pricing must stay in the hidden catalog.
const curriculum = readFileSync(path.join(root, "src/data/phaseOneCurriculum.ts"), "utf8");
for (const id of [
  "ninety-day-goal-setting-introduction",
  "ninety-day-goal-setting-workshop",
  "money-move-day-one",
  "money-move-day-two",
  "money-move-day-three",
]) {
  if (!curriculum.includes(id)) throw new Error(`Phase One playable resource missing from catalog: ${id}`);
}

console.log("PASS replay_vault_no_blanket_draft_block (registry emptied, projections restored, Phase One IDs intact)");
