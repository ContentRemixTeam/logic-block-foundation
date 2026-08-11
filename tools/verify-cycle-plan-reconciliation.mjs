import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const migration = read('supabase/migrations/20260809160000_cycle_plan_reconciliation.sql');
const client = read('src/lib/cyclePlanReconciliation.ts');
const app = read('src/App.tsx');
const cycleSetup = read('src/pages/CycleSetup.tsx');
const successPathHook = read('src/hooks/useMastermindSuccessPath.ts');
const successPathCard = read('src/components/mastermind/SuccessPathPlanCard.tsx');
const saveStatusBanner = read('src/components/cycle/SaveStatusBanner.tsx');
const cycleDraftHook = read('src/hooks/useCycleSetupDraft.ts');
const currentCycle = read('supabase/functions/get-current-cycle-or-create/index.ts');

const checks = [];
const check = (name, condition) => checks.push({ name, pass: Boolean(condition) });
const hasAll = (source, values) => values.every((value) => source.includes(value));

check('request ledger stores server-computed payload hash and durable receipt', hasAll(migration, [
  'cycle_plan_reconciliation_requests',
  "digest(convert_to(p_payload::text, 'UTF8'), 'sha256')",
  "status IN ('in_progress', 'complete')",
  'receipt jsonb',
]));
check('same request with changed payload returns a non-mutating conflict receipt', hasAll(migration, [
  'v_existing.payload_hash <> v_payload_hash',
  "'status', 'conflict'",
  "'conflict', true",
  "'conflict_kind', 'request_changed'",
]));
check('different request IDs for one planner serialize on a stable plan identity', hasAll(migration, [
  'plan_key text NOT NULL',
  'pg_advisory_xact_lock',
  'deduplicated_plan',
]) && hasAll(client, [
  'getOrCreateCyclePlanKey',
  'PLAN_STORAGE_PREFIX',
]));

check('same request replay returns the completed receipt', hasAll(migration, [
  "v_existing.status = 'complete'",
  "jsonb_build_object('replayed', true)",
]));
check('RPC authenticates and scopes cycle edits to the caller', hasAll(migration, [
  'v_user_id uuid := auth.uid()',
  'WHERE cycle_id = v_cycle_id AND user_id = v_user_id',
  'belongs to another member',
]));
check('generated projects and tasks have owner-scoped stable identities', hasAll(migration, [
  'projects_user_generation_key_unique',
  'tasks_user_generation_key_unique',
  'ON public.projects(user_id, generation_key)',
  'ON public.tasks(user_id, generation_key)',
]));
check('unfinished member task edits are baseline-preserved', hasAll(migration, [
  'generation_baseline jsonb',
  'generation_baseline IS NULL',
  'IS DISTINCT FROM public.tasks.generation_baseline',
]));

check('completed tasks survive reconciliation edits', hasAll(migration, [
  'COALESCE(public.tasks.is_completed, false)',
  'THEN public.tasks.task_text ELSE EXCLUDED.task_text END',
  'THEN public.tasks.scheduled_date ELSE EXCLUDED.scheduled_date END',
]));
check('removed generated work is retired rather than deleted', hasAll(migration, [
  'SET generation_active = false',
  "system_source = 'cycle_reconciliation_v1_retired'",
]) && !migration.includes('DELETE FROM public.tasks'));
check('Success Path recommendation is receipt-bound but not silently confirmed', hasAll(migration, [
  'planner_receipt_id',
  'recommended_stage',
  'confirmed_stage,',
  'NULL,',
  "success_path_url",
]));
check('RPC execution is authenticated-only', hasAll(migration, [
  'REVOKE ALL ON FUNCTION public.reconcile_cycle_plan(uuid, jsonb) FROM PUBLIC',
  'REVOKE ALL ON FUNCTION public.reconcile_cycle_plan(uuid, jsonb) FROM anon',
  'GRANT EXECUTE ON FUNCTION public.reconcile_cycle_plan(uuid, jsonb) TO authenticated',
]));
check('ambiguous retries stay tab-scoped and changed payload conflicts never auto-resubmit', hasAll(client, [
  'cycle_plan_reconciliation_request_v1',
  'window.sessionStorage.getItem(storageKey)',
  'window.sessionStorage.setItem(storageKey, requestId)',
  'window.sessionStorage.removeItem(storageKey)',
  'getOrCreateCyclePlanRequestId',
  'clearCyclePlanRequestId',
  "data.request_id !== requestId",
  "screen's draft was not cleared",
  'if (isConflictReceipt(data))',
  "This plan was saved from another tab or session. Refresh",
  'These answers changed after an earlier save attempt. Refresh',
])
  && !client.includes('allowConflictRecovery')
  && !client.includes('{ ...payload, cycle_id: data.cycle_id }'));

const receiptStart = cycleSetup.indexOf('const reconciliationReceipt = await submitCyclePlanReconciliation');
const receiptEnd = cycleSetup.indexOf('await clearDraft();', receiptStart);
const postReceiptWindow = receiptStart >= 0 && receiptEnd > receiptStart
  ? cycleSetup.slice(receiptStart, receiptEnd)
  : '';
const cloudDraftDeleteIndex = cycleDraftHook.indexOf("await supabase.functions.invoke('delete-cycle-draft')");
const localDraftDeleteIndex = cycleDraftHook.indexOf('removeStorageItem(DRAFT_STORAGE_KEY)', cloudDraftDeleteIndex);
check('verified success cannot be followed by a stale or undeleted draft', hasAll(cycleDraftHook, [
  'syncInFlightRef',
  'clearTimeout(syncTimeoutRef.current)',
  'await syncInFlightRef.current.catch',
  "const { error } = await supabase.functions.invoke('delete-cycle-draft')",
  "throw new Error('Your plan was saved, but the draft could not be cleared yet.",
]) && cloudDraftDeleteIndex >= 0 && localDraftDeleteIndex > cloudDraftDeleteIndex);

check('verified receipt is not followed by unreceipted planner writes',
  postReceiptWindow.length > 0 && !postReceiptWindow.includes(".from('") && !postReceiptWindow.includes('.insert(') && !postReceiptWindow.includes('.upsert('));

const verifiedReceiptIndex = cycleSetup.indexOf('const reconciliationReceipt = await submitCyclePlanReconciliation');
const clearDraftAfterReceiptIndex = cycleSetup.indexOf('await clearDraft()', verifiedReceiptIndex);
const successToastIndex = cycleSetup.indexOf("title: isEditMode ? '✅ Plan Updated'", verifiedReceiptIndex);
const successNavigateIndex = cycleSetup.indexOf('navigate(reconciliationReceipt.success_path_url', verifiedReceiptIndex);
check('draft cleanup is part of completion and actionable failures stay member-visible',
  verifiedReceiptIndex >= 0
  && clearDraftAfterReceiptIndex > verifiedReceiptIndex
  && successToastIndex > clearDraftAfterReceiptIndex
  && successNavigateIndex > successToastIndex
  && cycleSetup.includes("error.message.startsWith('Your plan was saved, but the draft could not be cleared yet.')")
  && cycleSetup.includes("error.message.startsWith('This plan was saved from another tab or session.')")
  && cycleSetup.includes("error.message.startsWith('These answers changed after an earlier save attempt.')")
  && cycleSetup.includes("Keep this screen open while we finish. We won't clear your draft unless every required step succeeds."));

check('canonical planner submits the verified RPC before clearing its draft', hasAll(cycleSetup, [
  'submitCyclePlanReconciliation(reconciliationPayload, requestId)',
  'const cycleId = reconciliationReceipt.cycle_id',
  'details: {',
  'clearCyclePlanRequestId(user.id, reconciliationReceipt.request_id)',
  'clearCyclePlanKey(user.id, planKey)',
  'reconciliationReceipt.success_path_url',
]));
check('atomic planner payload fully rehydrates edit mode with legacy-only fallback', hasAll(cycleSetup, [
  'planner_payload?: { details?: Partial<CycleSetupDraft> }',
  'applyPlannerDetails(plannerDetails)',
  'Legacy fallback for cycles saved before the atomic planner payload.',
  "setWish(draft.wish || '')",
  "setOutcome(draft.outcome || '')",
  "setObstacle(draft.obstacle || '')",
  "setIfThenPlan(draft.ifThenPlan || '')",
  "setMetric1Goal(draft.metric1Goal ?? '')",
  "setMetric2Goal(draft.metric2Goal ?? '')",
  "setMetric3Goal(draft.metric3Goal ?? '')",
  "setMetric4Name(draft.metric4Name || '')",
  "setMetric4Start(draft.metric4Start ?? '')",
  "setMetric4Goal(draft.metric4Goal ?? '')",
  "setMetric5Name(draft.metric5Name || '')",
  "setMetric5Start(draft.metric5Start ?? '')",
  "setMetric5Goal(draft.metric5Goal ?? '')",
  'setNurturePlatforms(draft.nurturePlatforms || [])',
  "setPlanningLevel(draft.planningLevel || 'simple')",
]));
check('draft copy never claims unverified persistence',
  !cycleSetup.includes('Your draft is saved')
  && !cycleSetup.includes('Your draft is safe')
  && !cycleSetup.includes('Draft saved to cloud')
  && !client.includes('Your draft is still safe')
  && !saveStatusBanner.includes('All changes saved')
  && !saveStatusBanner.includes('Backed up to cloud'));
check('draft status distinguishes local save, pending cloud, and confirmed cloud', hasAll(cycleDraftHook, [
  'setLastServerSync(null)',
  'setSyncError(null)',
  'throw e',
  'setLastServerSync(confirmedAt)',
  'beginDraftVersion(draftVersionRef)',
  'ownsDraftVersion(draftVersionRef, version)',
  'setStorageItemWithReceipt',
  'if (!storageReceipt.persistent)',
]) && hasAll(saveStatusBanner, [
  'Saved in this browser',
  'Cloud backup pending',
  'Cloud backup not confirmed',
  'Cloud backup confirmed',
  'lastServerSync ?',
]) && hasAll(cycleSetup, [
  'lastServerSync={lastServerSync}',
  'syncError={syncError}',
  'Saved in this browser; cloud backup not confirmed',
  'Saved in this browser; cloud backup pending',
]));
check('Success Path snapshots require a completed owner-cycle receipt', hasAll(migration, [
  'Members can create receipt-bound cycle success path',
  'Members can update receipt-bound cycle success path',
  'planner_receipt_id IS NOT NULL',
  "receipt.status = 'complete'",
  'receipt.cycle_id = cycle_success_path_snapshots.cycle_id',
]) && hasAll(successPathHook, [
  'planner_receipt_id',
  "from('cycle_plan_reconciliation_requests')",
  ".eq('status', 'complete')",
  'receiptIsComplete',
  'data.snapshot?.planner_receipt_id',
  'planner_receipt_id: data.snapshot.planner_receipt_id',
]));

const firstMoveMapIndex = cycleSetup.indexOf('.map((task, slotIndex)');
const firstMoveFilterIndex = cycleSetup.indexOf('.filter((task) => task.task_text)', firstMoveMapIndex);
check('first-move identities are stable day/slot keys assigned before blank filtering',
  firstMoveMapIndex >= 0
  && firstMoveFilterIndex > firstMoveMapIndex
  && cycleSetup.includes('generation_key: `day-${day}:slot-${slotIndex + 1}`'));
check('Wave 1 does not promise unreceipted Autopilot automations',
  !cycleSetup.includes('AutopilotSetupModal')
  && cycleSetup.includes('Save and Open My Success Path'));

check('canonical planner no longer inserts a competing cycle or duplicate first-move tasks',
  !cycleSetup.includes(".from('cycles_90_day')\n          .insert")
  && !cycleSetup.includes('const first3DaysTasks'));
check('Success Path renders receipt-bound first moves and the member low-battery version',
  hasAll(successPathHook, [
    ".eq('system_source', 'cycle_reconciliation_v1')",
    'firstMoves,',
  ]) && hasAll(successPathCard, [
    'Your verified first moves',
    'Low-battery version',
    'cycle.low_energy_version',
  ]));

check('Success Path accepts a recommendation row without treating it as member confirmation', hasAll(successPathHook, [
  'confirmed_stage: MastermindStageId | null',
  'rawSnapshot.confirmed_stage === null',
  'Boolean(snapshot?.confirmed_stage && snapshot.confirmed_at)',
]));
check('/cycle-wizard redirects to the canonical planner and cannot load its writer',
  app.includes('<Navigate to="/cycle-setup" replace />')
  && !app.includes("import('./pages/CycleWizard')")
  && !app.includes('<CycleWizard />'));
check('missing cycle returns setup-required without fabricating a goal', hasAll(currentCycle, [
  'cycle: null',
  'requires_setup: true',
  "setup_path: '/cycle-setup'",
]) && !currentCycle.includes("goal: 'My 90-Day Goal'") && !currentCycle.includes('auto-creating one'));

const failed = checks.filter((item) => !item.pass);
for (const item of checks) console.log(`${item.pass ? 'PASS' : 'FAIL'} ${item.name}`);
if (failed.length) {
  console.error(`\n${failed.length} cycle reconciliation contract check(s) failed.`);
  process.exit(1);
}
console.log(`\nCycle plan reconciliation contract verified (${checks.length} checks).`);
