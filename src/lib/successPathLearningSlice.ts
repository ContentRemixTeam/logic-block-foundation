export type SuccessPathLearningEmptyState =
  | 'denied'
  | 'verification_unavailable'
  | 'no_plan'
  | 'unconfirmed'
  | 'review_required'
  | 'resource_not_ready';

export interface SuccessPathLearningSlice {
  cycle_id: string;
  path_id: string;
  path_version: number;
  state_receipt_id: string;
  result_text: string;
  confirmed_stage: string;
  milestone: { key: string; title: string };
  action: {
    action_id: string;
    task_id: string;
    text: string;
    estimated_minutes: number;
    completion_state: 'open' | 'completed';
  };
  learning: {
    assignment_item_id: string;
    title: string;
    intended_output: string;
    action_prompt: string | null;
    evidence_prompt: string | null;
    teacher: string;
    attribution: string;
  };
  support_state: 'open' | 'acknowledged' | null;
  latest_evaluation_outcome: 'continue' | 'improve' | 'reduce' | 'support' | null;
}

export type SuccessPathLearningResponse =
  | { slice_state: 'ready'; reason: 'assigned_learning_available'; slice: SuccessPathLearningSlice }
  | { slice_state: SuccessPathLearningEmptyState; reason: string; slice: null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMPTY_STATES = new Set<SuccessPathLearningEmptyState>([
  'denied', 'verification_unavailable', 'no_plan', 'unconfirmed', 'review_required', 'resource_not_ready',
]);
const TOP_KEYS = ['reason', 'slice', 'slice_state'];
const SLICE_KEYS = [
  'action', 'confirmed_stage', 'cycle_id', 'latest_evaluation_outcome', 'learning',
  'milestone', 'path_id', 'path_version', 'result_text', 'state_receipt_id', 'support_state',
];
const ACTION_KEYS = ['action_id', 'completion_state', 'estimated_minutes', 'task_id', 'text'];
const LEARNING_KEYS = [
  'action_prompt', 'assignment_item_id', 'attribution', 'evidence_prompt',
  'intended_output', 'teacher', 'title',
];

function hasExactKeys(value: Record<string, unknown>, keys: string[]) {
  return Object.keys(value).sort().join('|') === [...keys].sort().join('|');
}

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function bounded(value: unknown, maximum: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maximum &&
    ![...value].some((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127;
    });
}

export function parseSuccessPathLearningResponse(value: unknown): SuccessPathLearningResponse {
  const root = object(value);
  if (!root || !hasExactKeys(root, TOP_KEYS) || typeof root.slice_state !== 'string' || typeof root.reason !== 'string') {
    throw new Error('The Success Path response could not be verified.');
  }
  if (root.slice === null) {
    if (!EMPTY_STATES.has(root.slice_state as SuccessPathLearningEmptyState)) throw new Error('Unknown Success Path state.');
    return root as SuccessPathLearningResponse;
  }
  if (root.slice_state !== 'ready' || root.reason !== 'assigned_learning_available') throw new Error('Invalid Success Path success state.');
  const slice = object(root.slice);
  const action = object(slice?.action);
  const milestone = object(slice?.milestone);
  const learning = object(slice?.learning);
  if (!slice || !action || !milestone || !learning || !hasExactKeys(slice, SLICE_KEYS) ||
      !hasExactKeys(action, ACTION_KEYS) || !hasExactKeys(milestone, ['key', 'title']) ||
      !hasExactKeys(learning, LEARNING_KEYS)) throw new Error('The Success Path response included unexpected fields.');
  if (![slice.cycle_id, slice.path_id, slice.state_receipt_id, action.action_id, action.task_id, learning.assignment_item_id]
      .every((item) => typeof item === 'string' && UUID.test(item))) throw new Error('Invalid Success Path identifiers.');
  if (!Number.isSafeInteger(slice.path_version) || (slice.path_version as number) < 1 ||
      !Number.isSafeInteger(action.estimated_minutes) || (action.estimated_minutes as number) < 5 ||
      !bounded(slice.result_text, 300) || !bounded(slice.confirmed_stage, 80) ||
      !bounded(milestone.key, 120) || !bounded(milestone.title, 180) ||
      !bounded(action.text, 300) || !bounded(learning.title, 160) ||
      !bounded(learning.intended_output, 400) || !bounded(learning.teacher, 120) ||
      !bounded(learning.attribution, 200)) throw new Error('Invalid Success Path presentation.');
  if (![learning.action_prompt, learning.evidence_prompt].every((item) => item === null || bounded(item, 500)) ||
      !['open', 'completed'].includes(action.completion_state as string) ||
      ![null, 'open', 'acknowledged'].includes(slice.support_state as null | string) ||
      ![null, 'continue', 'improve', 'reduce', 'support'].includes(slice.latest_evaluation_outcome as null | string)) {
    throw new Error('Invalid Success Path state values.');
  }
  return root as unknown as SuccessPathLearningResponse;
}

export function newStableRequestId() {
  return crypto.randomUUID();
}
