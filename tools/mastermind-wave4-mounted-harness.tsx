import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MastermindSuccessPath from '@/pages/MastermindSuccessPath';
import { __wave4Mock } from '@/integrations/supabase/client';

const cycle = '11111111-1111-4111-8111-111111111111';
const path = '22222222-2222-4222-8222-222222222222';
const stateReceipt = '33333333-3333-4333-8333-333333333333';
const action = '44444444-4444-4444-8444-444444444444';
const task = '55555555-5555-4555-8555-555555555555';
const item = '66666666-6666-4666-8666-666666666666';
const evidence = '77777777-7777-4777-8777-777777777777';
const checkin = '88888888-8888-4888-8888-888888888888';

const ready = (outcome: string | null = null) => ({
  slice_state: 'ready', reason: 'assigned_learning_available', slice: {
    cycle_id: cycle, path_id: path, path_version: 2, state_receipt_id: stateReceipt,
    result_text: 'Validate one calm synthetic offer with three real buyer conversations', confirmed_stage: 'offer',
    milestone: { key: 'offer-foundation', title: 'Offer foundation' },
    action: { action_id: action, task_id: task, text: 'Send one clear offer invitation', estimated_minutes: 30, completion_state: 'open' },
    learning: { assignment_item_id: item, title: 'Synthetic Offer Lesson', intended_output: 'One tested offer invitation',
      action_prompt: 'Draft the invitation before polishing it.', evidence_prompt: 'Record the buyer response.',
      teacher: 'Synthetic Teacher', attribution: 'Synthetic fixture only' },
    support_state: outcome === 'support' ? 'open' : null, latest_evaluation_outcome: outcome,
  },
});

const tick = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
const waitFor = async (condition: () => boolean, label: string) => {
  for (let attempt = 0; attempt < 40; attempt += 1) { if (condition()) return; await tick(); }
  throw new Error(`Timed out waiting for ${label}`);
};
const click = async (label: string) => {
  const button = [...document.querySelectorAll<HTMLButtonElement>('button')].find((node) => node.textContent?.includes(label));
  if (!button) throw new Error(`Missing button ${label}`);
  await act(async () => button.click());
  await tick();
};
const input = async (id: string, value: string) => {
  const node = document.querySelector<HTMLInputElement>(`#${id}`);
  if (!node) throw new Error(`Missing input ${id}`);
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  await act(async () => { setter?.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); });
  await tick();
};

async function run() {
  __wave4Mock.reset();
  __wave4Mock.enqueue('resolve_my_success_path_learning_slice', { data: ready(), error: null });
  const root = createRoot(document.getElementById('root')!);
  await act(async () => root.render(<MemoryRouter initialEntries={[`/mastermind/success-path/${cycle}`]}><Routes><Route path="/mastermind/success-path/:cycleId" element={<MastermindSuccessPath />} /><Route path="/support" element={<div>Support route</div>} /><Route path="/cycle-setup" element={<div>Cycle setup</div>} /></Routes></MemoryRouter>));
  await waitFor(() => Boolean(document.querySelector('video') === null && document.body.textContent?.includes('Synthetic Offer Lesson')), 'ready slice');
  // Scope privacy assertions to the mounted member surface. The generated
  // harness bundle is embedded in document.body and contains verifier source
  // strings that are not rendered DOM.
  const monthlyText = document.getElementById('root')?.textContent?.toLowerCase() ?? '';
  for (const forbidden of ['replay vault', 'saved videos', 'transcript', 'library count', 'upgrade', 'locked']) {
    if (monthlyText.includes(forbidden)) throw new Error(`Monthly DOM leaked ${forbidden}`);
  }
  __wave4Mock.enqueue('get-assigned-learning-playback', { data: {
    assignmentItemId: item, title: 'Synthetic Offer Lesson', provider: 'private_media',
    playbackUrl: 'https://dl.dropboxusercontent.com/wave4-network-blocked-fixture', expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
  }, error: null });
  await click('Watch this lesson');
  await waitFor(() => Boolean(document.querySelector('video')), 'protected player');
  await click('Back to my action');
  const actionFocused = document.activeElement?.textContent?.includes('Send one clear offer invitation') ?? false;

  __wave4Mock.enqueue('submit_my_success_path_evidence', { data: { status: 'saved', evidence_receipt_id: evidence }, error: null });
  __wave4Mock.enqueue('submit_my_success_path_evidence', { data: { status: 'saved', evidence_receipt_id: evidence, replayed: true }, error: null });
  await input('success-path-evidence', 'One buyer replied yes');
  await click('Save evidence');
  await waitFor(() => document.body.textContent?.includes('Evidence saved and confirmed') ?? false, 'evidence readback');

  __wave4Mock.enqueue('evaluate_my_success_path_week', { data: { status: 'saved', checkin_id: checkin, outcome: 'continue' }, error: null });
  __wave4Mock.enqueue('evaluate_my_success_path_week', { data: { status: 'saved', checkin_id: checkin, outcome: 'continue', replayed: true }, error: null });
  __wave4Mock.enqueue('resolve_my_success_path_learning_slice', { data: ready('continue'), error: null });
  await click('continue');
  await waitFor(() => document.body.textContent?.includes('Evaluation saved and confirmed') ?? false, 'evaluation readback');

  const evidenceBodies = __wave4Mock.bodies('submit_my_success_path_evidence');
  const evaluationBodies = __wave4Mock.bodies('evaluate_my_success_path_week');
  const primaryControls = [...document.querySelectorAll<HTMLElement>('button,input,a')].filter((node) => {
    const style = getComputedStyle(node); const rect = node.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  });
  const result = {
    mounted: true,
    width: innerWidth,
    bodyWidth: document.body.scrollWidth,
    documentWidth: document.documentElement.scrollWidth,
    clipped: primaryControls.filter((node) => { const rect = node.getBoundingClientRect(); return rect.left < -1 || rect.right > innerWidth + 1; }).length,
    shortPrimaryControls: primaryControls.filter((node) => node.getBoundingClientRect().height < 44).map((node) => node.textContent?.trim() || node.getAttribute('aria-label')),
    actionFocused,
    activeElementDebug: document.activeElement?.outerHTML ?? 'none',
    lessonCount: [...document.querySelectorAll('*')].filter((node) => node.textContent?.trim() === 'Synthetic Offer Lesson').length,
    actionCount: [...document.querySelectorAll('*')].filter((node) => node.textContent?.trim() === 'Send one clear offer invitation').length,
    supportRoutes: document.querySelectorAll('a[href="/support"]').length,
    videoControls: document.querySelector('video')?.getAttribute('controlslist'),
    videoInline: document.querySelector('video')?.hasAttribute('playsinline'),
    liveRegions: document.querySelectorAll('[aria-live]').length,
    evidenceRequestStable: evidenceBodies.length === 2 && evidenceBodies[0].p_request_id === evidenceBodies[1].p_request_id,
    evaluationRequestStable: evaluationBodies.length === 2 && evaluationBodies[0].p_request_id === evaluationBodies[1].p_request_id,
    forbiddenMutationCalls: __wave4Mock.calls.filter((call) => /complete|milestone|task|vault|search|transcript|saved/i.test(call.name)).map((call) => call.name),
  };
  (window as unknown as { __wave4Result: typeof result }).__wave4Result = result;
  document.body.dataset.wave4Mounted = 'complete';
}

run().catch((error) => {
  (window as unknown as { __wave4Error: string }).__wave4Error = error instanceof Error ? error.stack ?? error.message : String(error);
  document.body.dataset.wave4Mounted = 'failed';
});
