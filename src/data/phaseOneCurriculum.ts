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
    resourceId: 'wibn-three-part-business-growth-engine',
    title: 'The 3-Part Business Growth Engine',
    requirement: 'required',
    order: 2,
    durationLabel: '10:13',
    lessonState: 'pending_import',
    transcriptState: 'candidate_ready_pairing_required',
    whyRecommended: 'See the whole business before choosing one area to strengthen.',
    showWhen: 'Always show after the goal-setting introduction.',
    afterWatchingAction: 'Map the current Offer, Find, Nurture, and Sell path in one sentence each.',
    doneEnoughLine: 'The member can see the full engine and name the area that needs attention now.',
    evidenceTarget: 'Saved Business Engine Map plus one selected 90-day focus.',
  },
  {
    resourceId: 'wibn-ceo-embodiment',
    title: 'CEO Embodiment',
    requirement: 'conditional',
    order: 3,
    durationLabel: '18:13',
    lessonState: 'pending_import',
    transcriptState: 'candidate_ready_pairing_required',
    whyRecommended: 'Use this when confidence, identity, fear, or follow-through is blocking a clear plan.',
    showWhen: 'Quiz indicates the plan is clear but the member does not trust herself to follow it.',
    afterWatchingAction: 'Choose one CEO behavior to practice during the first week.',
    doneEnoughLine: 'One observable behavior replaces a vague identity goal.',
    evidenceTarget: 'The behavior is scheduled and checked once during the first week.',
  },
  {
    resourceId: 'wibn-business-vision',
    title: 'Business Vision',
    requirement: 'conditional',
    order: 4,
    durationLabel: '28:31',
    lessonState: 'pending_import',
    transcriptState: 'source_confirmation_required',
    whyRecommended: 'Use this when the member cannot describe the business her 90-day plan is helping build.',
    showWhen: 'Quiz indicates the long-term direction or desired business model is unclear.',
    afterWatchingAction: 'Write a short business vision and one boundary the next 90 days must respect.',
    doneEnoughLine: 'The 90-day result points toward a business the member actually wants.',
    evidenceTarget: 'Saved vision statement and capacity boundary.',
  },
  {
    resourceId: 'ninety-day-goal-setting-workshop',
    title: '90 Day Goal Setting Workshop and Planner (BONUS)',
    requirement: 'conditional',
    order: 5,
    durationLabel: '1:15:13',
    lessonState: 'ready',
    transcriptState: 'candidate_needs_cleanup',
    whyRecommended: 'Use this only when the saved plan is still vague or incomplete.',
    showWhen: 'The plan-completeness check fails after the required introduction.',
    afterWatchingAction: 'Finish the missing plan fields and schedule the first action.',
    doneEnoughLine: 'The plan has one result, one focus, one weekly move, and one evidence target.',
    evidenceTarget: 'Completed saved plan and first dated action.',
  },
  {
    resourceId: 'mastermind-success-plan-module-one',
    title: 'Mastermind Success Plan Module One',
    requirement: 'conditional',
    order: 6,
    durationLabel: '27:23',
    lessonState: 'pending_import',
    transcriptState: 'candidate_ready_pairing_required',
    whyRecommended: 'Use this when the offer exists but the right people are not finding it.',
    showWhen: 'The member selects Find as the current constraint.',
    afterWatchingAction: 'Choose one discovery path for four weeks and make the first attempt.',
    doneEnoughLine: 'One discovery route and one bridge to the next step exist.',
    evidenceTarget: 'First attempt plus qualified replies, conversations, opt-ins, or no-response evidence.',
  },
  {
    resourceId: 'mastermind-success-plan-module-two',
    title: 'Mastermind Success Plan Module Two',
    requirement: 'conditional',
    order: 7,
    durationLabel: '24:55',
    lessonState: 'pending_import',
    transcriptState: 'candidate_ready_pairing_required',
    whyRecommended: 'Use this when people can find the business but are not moving closer to the offer.',
    showWhen: 'The member selects Nurture as the current constraint.',
    afterWatchingAction: 'Send one nurture asset that addresses a buyer belief or trust gap.',
    doneEnoughLine: 'One useful nurture step has a clear job.',
    evidenceTarget: 'Sent asset plus replies, clicks, questions, or other buying signals.',
  },
  {
    resourceId: 'mastermind-success-plan-module-three',
    title: 'Mastermind Success Plan Module Three',
    requirement: 'conditional',
    order: 8,
    durationLabel: '26:01',
    lessonState: 'pending_import',
    transcriptState: 'candidate_ready_pairing_required',
    whyRecommended: 'Use this when the next problem is selling, not more planning.',
    showWhen: 'The member selects Sell as the current constraint.',
    afterWatchingAction: 'Send one clear invitation and schedule the follow-up.',
    doneEnoughLine: 'The offer was made with a real response path.',
    evidenceTarget: 'Invitations, follow-ups, replies, objections, yeses, sales, or no-response evidence.',
  },
  {
    resourceId: 'wibn-week-one-qa',
    title: 'Week One Q&A',
    requirement: 'optional',
    order: 9,
    durationLabel: '1:26:16',
    lessonState: 'pending_import',
    transcriptState: 'source_confirmation_required',
    whyRecommended: 'Offer a relevant coaching excerpt when a real example will help more than another core lesson.',
    showWhen: 'A reviewed timestamp directly matches the member’s stated problem; never assign the full replay by default.',
    afterWatchingAction: 'Write the decision or question the excerpt helped clarify.',
    doneEnoughLine: 'The member has a next decision, not another long replay in her queue.',
    evidenceTarget: 'Saved decision, coaching question, or smallest next action.',
  },
  {
    resourceId: 'money-move-day-one',
    title: 'Money Moves Sprint: Choose Your Money Move',
    requirement: 'optional',
    order: 10,
    durationLabel: '1:11:11',
    lessonState: 'ready',
    transcriptState: 'candidate_ready_pairing_required',
    whyRecommended: 'Choose the one money move that fits this quarter.',
    showWhen: 'Offer and sell support: open this once your 90-day plan is saved and you need your next money move.',
    afterWatchingAction: 'Choose one money move for the next 7 days.',
    doneEnoughLine: 'One money move is selected and scheduled.',
    evidenceTarget: 'Saved money move and first 7-day attempt.',
  },
  {
    resourceId: 'money-move-day-two',
    title: 'Money Moves Sprint: Package Your Money Move',
    requirement: 'optional',
    order: 11,
    durationLabel: '1:04:15',
    lessonState: 'ready',
    transcriptState: 'candidate_ready_pairing_required',
    whyRecommended: 'Turn the chosen money move into something you can offer.',
    showWhen: 'Offer and sell support: open this after choosing the money move, when it needs to become an offer.',
    afterWatchingAction:
      'Turn the money move into one clear offer, invitation, or experiment.',
    doneEnoughLine: 'The offer or experiment is described in one sentence.',
    evidenceTarget: 'Saved offer plus one person invited or tested.',
  },
  {
    resourceId: 'money-move-day-three',
    title: 'Money Moves Sprint: Create Your Sales Plan',
    requirement: 'optional',
    order: 12,
    durationLabel: '2:03:10',
    lessonState: 'ready',
    transcriptState: 'candidate_ready_pairing_required',
    whyRecommended: 'Create the simplest plan to follow through on the money move.',
    showWhen: 'Offer and sell support: open this after packaging the money move, when you need the simplest way to sell it.',
    afterWatchingAction:
      'Create the simplest sales plan for the chosen money move.',
    doneEnoughLine: 'The sales plan has one channel, one message, and one follow-up step.',
    evidenceTarget: 'Saved sales plan and first outreach attempt.',
  },
] as const;

export const PHASE_ONE_REQUIRED_LESSONS = PHASE_ONE_LESSONS.filter(
  (lesson) => lesson.requirement === 'required',
);

export const PHASE_ONE_SUPPORT_LESSONS = PHASE_ONE_LESSONS.filter(
  (lesson) => lesson.requirement !== 'required',
);
