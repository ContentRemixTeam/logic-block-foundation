type Result = { data: unknown; error: unknown };
const cycle = '11111111-1111-4111-8111-111111111111';
const path = '22222222-2222-4222-8222-222222222222';
const stateReceipt = '33333333-3333-4333-8333-333333333333';
const action = '44444444-4444-4444-8444-444444444444';
const task = '55555555-5555-4555-8555-555555555555';
const item = '66666666-6666-4666-8666-666666666666';
const evidenceReceipts = new Map<string, string>();
const checkins = new Map<string, { id: string; outcome: string }>();
const recoveries = new Map<string, string>();
let latestOutcome: string | null = null;
let currentAction = action;
let currentActionText = 'Send one clear offer invitation';
let currentMinutes = 30;
let pathVersion = 2;
let pendingPreview: Record<string, unknown> | null = null;

function ready() {
  return { slice_state: 'ready', reason: 'assigned_learning_available', slice: {
    cycle_id: cycle, path_id: path, path_version: pathVersion, state_receipt_id: stateReceipt,
    result_text: 'Validate one simple offer with three real buyer conversations', confirmed_stage: 'offer',
    milestone: { key: 'offer-foundation', title: 'Create an offer people understand and want' },
    action: { action_id: currentAction, task_id: task, text: currentActionText, estimated_minutes: currentMinutes, completion_state: 'open' },
    learning: { assignment_item_id: item, title: 'SAMPLE: Turn your idea into one clear offer invitation',
      intended_output: 'A simple invitation you can send to one potential buyer.',
      action_prompt: 'Listen for the difference between explaining everything and making one clear invitation.',
      evidence_prompt: 'Record what the person replied, asked, or did next.', teacher: 'Faith Mariah',
      attribution: 'Clearly labeled fake lesson for this private preview only' },
    support_state: latestOutcome === 'support' ? 'open' : null,
    latest_evaluation_outcome: latestOutcome,
  } };
}

function saved(map: Map<string, string>, request: string, prefix: string) {
  const previous = map.get(request);
  if (previous) return { status: 'saved', [`${prefix}_id`]: previous, replayed: true };
  const id = crypto.randomUUID(); map.set(request, id);
  return { status: 'saved', [`${prefix}_id`]: id };
}

export const supabase = {
  async rpc(name: string, body: Record<string, unknown>): Promise<Result> {
    if (name === 'resolve_my_success_path_learning_slice') return { data: ready(), error: null };
    if (name === 'resolve_my_success_path_edit_context') return { data: { state: 'ready', reason: 'current_reviewed_authority', context: {
      cycle_id: cycle, path_version: pathVersion, assignment_id: '77777777-7777-4777-8777-777777777777', assignment_item_id: item,
      stage: 'offer', milestone_key: 'offer-foundation', milestone_title: 'Create an offer people understand and want', move_key: 'send-invitation', action_id: currentAction,
    } }, error: null };
    if (name === 'preview_my_success_path_transition') {
      pendingPreview = { status: 'pending', replayed: false, proposal_id: '88888888-8888-4888-8888-888888888888',
        impact_diff: { action: { old: { text: currentActionText, estimated_minutes: currentMinutes }, new: { text: body.p_proposed_action_text, estimated_minutes: body.p_proposed_action_minutes } }, history: { evidence_preserved: true, actions_preserved: true, checkins_preserved: true } }, impact_diff_sha256: 'a'.repeat(64) };
      return { data: pendingPreview, error: null };
    }
    if (name === 'confirm_my_success_path_transition' && pendingPreview) {
      const old = currentAction; currentAction = '99999999-9999-4999-8999-999999999999'; pathVersion += 1;
      const impact = pendingPreview.impact_diff as { action: { new: { text: string; estimated_minutes: number } } };
      currentActionText = impact.action.new.text; currentMinutes = impact.action.new.estimated_minutes;
      return { data: { status: 'saved', replayed: false, transition_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', proposal_id: pendingPreview.proposal_id,
        path_version: pathVersion, state_receipt_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', action_id: currentAction, prior_action_id: old }, error: null };
    }
    if (name === 'record_my_assigned_learning_engagement') return { data: { status: 'accepted', reason: 'recorded', event_id: crypto.randomUUID(), replayed: false, progress_basis_points: null }, error: null };
    const request = String(body.p_request_id ?? '');
    if (name === 'submit_my_success_path_evidence') return { data: saved(evidenceReceipts, request, 'evidence_receipt'), error: null };
    if (name === 'evaluate_my_success_path_week') {
      const previous = checkins.get(request); const outcome = String(body.p_outcome ?? 'continue');
      if (previous) return { data: { status: 'saved', checkin_id: previous.id, outcome: previous.outcome, replayed: true }, error: null };
      const id = crypto.randomUUID(); checkins.set(request, { id, outcome }); latestOutcome = outcome;
      return { data: { status: 'saved', checkin_id: id, outcome }, error: null };
    }
    if (name === 'recover_my_success_path_after_absence') return { data: saved(recoveries, request, 'recovery'), error: null };
    return { data: null, error: { message: 'This action is not available in the private sample.' } };
  },
  functions: {
    async invoke(name: string): Promise<Result> {
      if (name !== 'get-assigned-learning-playback') return { data: null, error: { message: 'Unavailable' } };
      return { data: null, error: { message: 'Sample playback is intentionally disabled in this offline private preview.' } };
    },
  },
};
