import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/20260830153000_ai_planner_task_proposals.sql", import.meta.url),
  "utf8",
);
const server = readFileSync(
  new URL("../supabase/functions/mcp-server/index.ts", import.meta.url),
  "utf8",
);
const phaseOne = readFileSync(
  new URL("../supabase/migrations/20260830154500_phase_one_private_test_contracts.sql", import.meta.url),
  "utf8",
);
const aiStudioUnlocks = readFileSync(
  new URL("../supabase/migrations/20260901123000_mastermind_ai_asset_unlocks.sql", import.meta.url),
  "utf8",
);

const requiredMigrationContracts = [
  "UNIQUE (user_id, idempotency_key)",
  "UNIQUE (proposal_id)",
  "FOR UPDATE",
  "IF v_proposal.status = p_decision THEN",
  "IF v_proposal.status <> 'pending' THEN",
  "INSERT INTO public.tasks",
  "INSERT INTO public.ai_planner_task_proposal_receipts",
  "v_user_id UUID := auth.uid()",
  "REVOKE ALL ON FUNCTION public.review_ai_planner_task_proposal",
  "GRANT EXECUTE ON FUNCTION public.review_ai_planner_task_proposal(UUID, TEXT) TO authenticated",
];
for (const contract of requiredMigrationContracts) {
  assert.ok(migration.includes(contract), `missing migration contract: ${contract}`);
}

assert.equal(
  /CREATE POLICY[\s\S]{0,100}ai_planner_task_proposals FOR UPDATE/.test(migration),
  false,
  "proposal rows must not allow direct member updates",
);
assert.equal(
  /CREATE POLICY[\s\S]{0,100}ai_planner_task_proposal_receipts FOR (INSERT|UPDATE|DELETE)/.test(migration),
  false,
  "decision receipts must remain RPC-written and immutable",
);

const requiredServerContracts = [
  '"get_current_90_day_plan"',
  '"propose_planner_task"',
  '"mcp:write"',
  '"mcp:read"',
  "assertToolAllowed(toolName, ctx)",
  "Use propose_planner_task; the member approves it in Planner",
  '.eq("user_id", userId)',
];
for (const contract of requiredServerContracts) {
  assert.ok(server.includes(contract), `missing MCP contract: ${contract}`);
}

const aiToolSet = server.match(/const AI_KEY_TOOLS = new Set\(\[([\s\S]*?)\]\);/)?.[1] || "";
for (const forbidden of ["create_task", "update_task", "complete_task", "update_daily_plan", "log_habit"]) {
  assert.equal(aiToolSet.includes(`"${forbidden}"`), false, `${forbidden} must not be exposed to external AI keys`);
}

const requiredPhaseOneContracts = [
  "mastermind_phase_one_state",
  "mastermind_phase_one_resource_progress",
  "save_my_mastermind_phase_one_state",
  "save_my_mastermind_phase_one_video_progress",
  "search_my_mastermind_phase_one_resources",
  "get_my_mastermind_phase_one_coaching_context",
  "auth.uid()",
  "approved_access_scope = 'core_curriculum'",
  "mastermind_media_access_decision",
  "'playback', 'curriculum'",
  "GRANT EXECUTE ON FUNCTION public.search_my_mastermind_phase_one_resources",
];
for (const contract of requiredPhaseOneContracts) {
  assert.ok(phaseOne.includes(contract), `missing Phase One contract: ${contract}`);
}
for (const forbidden of ["dropbox_file_id", "dropbox_path", "provider_id", "replay_vault"]) {
  assert.equal(phaseOne.includes(forbidden), false, `Phase One member contract must not expose ${forbidden}`);
}
assert.equal(
  /CREATE POLICY[\s\S]{0,120}mastermind_phase_one_(state|resource_progress) FOR (INSERT|UPDATE|DELETE)/.test(phaseOne),
  false,
  "Phase One writes must remain validated RPC-only",
);

const requiredAiStudioUnlockContracts = [
  "mastermind_ai_asset_unlocks",
  "confirm_my_mastermind_ai_asset_unlock",
  "UNIQUE (user_id, unlock_month)",
  "auth.uid() = user_id",
  "ON CONFLICT (user_id, unlock_month) DO NOTHING",
  "v_row.pack_id <> v_pack_id",
  "replay_vault_admin_preview_enabled(v_user_id, true)",
  "GRANT EXECUTE ON FUNCTION public.confirm_my_mastermind_ai_asset_unlock",
];
for (const contract of requiredAiStudioUnlockContracts) {
  assert.ok(aiStudioUnlocks.includes(contract), `missing AI Studio unlock contract: ${contract}`);
}
assert.equal(
  /CREATE POLICY[\s\S]{0,160}mastermind_ai_asset_unlocks FOR (INSERT|UPDATE|DELETE)/.test(aiStudioUnlocks),
  false,
  "AI Studio monthly unlocks must be confirmed through RPC, not direct member writes",
);

console.log("Phase One Planner connector contracts verified.");
