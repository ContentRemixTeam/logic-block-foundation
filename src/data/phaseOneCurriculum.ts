/**
 * Phase One curriculum contract for the hidden/admin pilot.
 *
 * This is presentation-safe metadata, not a publication record. A lesson may be
 * shown in the pilot while its playback remains unavailable. Never infer
 * protected playback readiness from catalog presence.
 */

export type PhaseOneLessonRequirement = 'required' | 'conditional' | 'optional';
export type PhaseOneLessonState = 'pending_import' | 'ready';
export type PhaseOneTranscriptState =
  | 'candidate_ready_pairing_required'
  | 'candidate_needs_cleanup'
  | 'source_confirmation_required';

export interface PhaseOneLesson {
  resourceId: string;
  title: string;
  requirement: PhaseOneLessonRequirement;
  order: number;
  durationLabel: string | null;
  lessonState: PhaseOneLessonState;
  transcriptState: PhaseOneTranscriptState;
  whyRecommended: string;
  showWhen: string;
  afterWatchingAction: string;
  doneEnoughLine: string;
  evidenceTarget: string;
}

export const PHASE_ONE_EXIT_STANDARD =
  'I know the business engine I am building, my 90-day result, my current focus, how I want to work, what I am doing this week, and what evidence I need next.';

export const PHASE_ONE_LESSONS: readonly PhaseOneLesson[] = [
  {
    resourceId: 'ninety-day-goal-setting-introduction',
    title: '90 Day Goal Setting Introduction',
    requirement: 'required',
    order: 1,
    durationLabel: '11:03',
    lessonState: 'ready',
    transcriptState: 'candidate_ready_pairing_required',
    whyRecommended: 'Start here when the quarter feels too big or scattered.',
    showWhen: 'Always show before the member builds or refreshes her 90-day plan.',
    afterWatchingAction: 'Save one 90-day result, baseline, current constraint, and first weekly move.',
    doneEnoughLine: 'One result and the first move are clear.',
    evidenceTarget: 'Saved plan plus one dated action attempt within 48 hours.',
  },
  {
    resourceId: 'ninety-day-goal-setting-workshop',
    title: '90 Day Goal Setting Workshop and Planner',
    requirement: 'required',
    order: 2,
    durationLabel: '1:15:13',
    lessonState: 'ready',
    transcriptState: 'candidate_needs_cleanup',
    whyRecommended: 'Use this to turn a vague quarter into a clear plan with one focus and one next move.',
    showWhen: 'Always show when the plan is incomplete, too broad, or needs a reset.',
    afterWatchingAction: 'Finish the missing plan fields and schedule the first action.',
    doneEnoughLine: 'The plan has one result, one focus, one weekly move, and one evidence target.',
    evidenceTarget: 'Completed saved plan and first dated action.',
  },
  {
    resourceId: 'money-move-day-one',
    title: 'Money Moves Sprint Day One: Find Your Next Money Move',
    requirement: 'required',
    order: 3,
    durationLabel: '1:11:11',
    lessonState: 'ready',
    transcriptState: 'candidate_ready_pairing_required',
    whyRecommended: 'Use this when the member needs to stop spinning and choose the work most likely to create revenue.',
    showWhen: 'Always show after the 90-day plan is drafted.',
    afterWatchingAction: 'Choose one money move for the next 7 days.',
    doneEnoughLine: 'One money move is chosen and small enough to execute this week.',
    evidenceTarget: 'A named money move plus the first visible action attempt.',
  },
  {
    resourceId: 'money-move-day-two',
    title: 'Money Moves Sprint Day Two: Package Your Money Move',
    requirement: 'required',
    order: 4,
    durationLabel: '1:04:15',
    lessonState: 'ready',
    transcriptState: 'candidate_ready_pairing_required',
    whyRecommended: 'Use this to make the chosen money move clear enough to sell, deliver, or test.',
    showWhen: 'Show when the member has a money move but the offer, promise, or next step is still fuzzy.',
    afterWatchingAction: 'Turn the money move into one clear offer, invitation, or experiment.',
    doneEnoughLine: 'The member knows what she is inviting people into and what counts as a response.',
    evidenceTarget: 'One packaged money move with a clear promise, next step, and response target.',
  },
  {
    resourceId: 'money-move-day-three',
    title: 'Money Moves Sprint Day Three: Create Your Sales Plan',
    requirement: 'required',
    order: 5,
    durationLabel: '2:03:10',
    lessonState: 'ready',
    transcriptState: 'candidate_ready_pairing_required',
    whyRecommended: 'Use this when the member needs a simple sales plan instead of more consuming, learning, or tweaking.',
    showWhen: 'Show when the money move is chosen and needs a real outreach, launch, or follow-up plan.',
    afterWatchingAction: 'Create the simplest sales plan for the chosen money move.',
    doneEnoughLine: 'The member knows who she is inviting, what she is saying, and when she will follow up.',
    evidenceTarget: 'Invitations, follow-ups, replies, objections, yeses, sales, or no-response evidence.',
  },
] as const;

export const PHASE_ONE_REQUIRED_LESSONS = PHASE_ONE_LESSONS.filter(
  (lesson) => lesson.requirement === 'required',
);

export const PHASE_ONE_SUPPORT_LESSONS = PHASE_ONE_LESSONS.filter(
  (lesson) => lesson.requirement !== 'required',
);
