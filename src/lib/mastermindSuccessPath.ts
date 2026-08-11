export type MastermindStageId = 'offer' | 'find' | 'nurture' | 'sell' | 'deliver' | 'leverage';
export type CurriculumStatus = 'Ready' | 'Refresh' | 'Gap';

export interface MastermindResourceRecommendation {
  resourceId: string;
  title: string;
  access: 'Core' | '30-day replays' | 'Vault' | 'Access review';
  useWhen: string;
  portalPath?: string;
}

export interface MastermindRoadmapStage {
  id: MastermindStageId;
  label: string;
  memberQuestion: string;
  doThis: string;
  useWhen: string;
  milestone: string;
  milestones: MastermindMilestone[];
  definitionOfDone: string[];
  resources: MastermindResourceRecommendation[];
  supportPrompt: string;
  nextMoneyMove: string;
  messyActionSprint: string[];
}

export interface MastermindPlanCycle {
  cycle_id: string;
  goal: string;
  start_date: string;
  end_date: string;
  focus_area: string | null;
  biggest_bottleneck: string | null;
  discover_score: number | null;
  nurture_score: number | null;
  convert_score: number | null;
  audience_target: string | null;
  audience_frustration: string | null;
  signature_message: string | null;
  why: string | null;
  low_energy_version: string | null;
  medium_energy_version: string | null;
  high_energy_version: string | null;
  planner_payload?: { details?: Record<string, unknown> } | null;
  updated_at: string | null;
}

export interface MastermindMilestone {
  id: string;
  label: string;
  output: string;
}

export interface CurriculumSlot extends MastermindMilestone {
  stageId: MastermindStageId;
  sourceTitle: string;
  sourceOwner: 'Faith Mariah';
  status: CurriculumStatus;
  provenanceNote: string;
  resourceId: string | null;
}

export interface MastermindSuccessPathOutput {
  stageId: MastermindStageId;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  evidenceLabel: string;
}

const slots = (stageId: MastermindStageId, items: Array<[string, string, string, string]>): CurriculumSlot[] =>
  items.map(([id, label, output, sourceTitle]) => ({
    id, label, output, stageId, sourceTitle, sourceOwner: 'Faith Mariah', status: 'Gap', resourceId: null,
    provenanceNote: 'Curriculum audit names this teaching area, but no milestone-level resource has passed source, entitlement, and playback verification.',
  }));

export const MASTERMIND_CURRICULUM_MANIFEST: readonly CurriculumSlot[] = [
  ...slots('offer', [
    ['offer-focus', 'Choose the money-making focus', 'One active revenue stream for this quarter.', 'Mastermind Success Plan'],
    ['offer-buyer', 'Choose the buyer and problem', 'One buyer doorway, paid problem, and piece of demand evidence.', 'Products & Offers'],
    ['offer-mvp', 'Build the minimum viable offer', 'A clear promise, scope, delivery format, price, and boundary.', 'Products & Offers'],
    ['offer-validate', 'Validate by making offers', 'A dated validation test with invitations and real response evidence.', 'Messy Action Sprints'],
  ]),
  ...slots('find', [
    ['find-path', 'Choose one discovery path', 'One channel or outreach route with a four-week test.', 'Content Creation'],
    ['find-create', 'Create discovery content or outreach', 'Four focused pieces or outreach attempts with one next step.', 'Content Creation'],
    ['find-bridge', 'Build the bridge to your email list', 'One live opt-in or invitation connected to the offer.', 'Grow Your Email List'],
    ['find-evaluate', 'Repeat and evaluate discovery', 'Enough reach and opt-in evidence to choose the next test.', 'Mastermind Coaching'],
  ]),
  ...slots('nurture', [
    ['nurture-map', 'Map the nurture ecosystem', 'A simple path from discovery to email to invitation.', 'Grow Your Email List'],
    ['nurture-content', 'Create content with a job', 'Four nurture ideas tied to a belief, proof, conversation, or invitation.', 'Content Creation'],
    ['nurture-email', 'Create a simple email system', 'A live welcome email or sequence and sustainable send rhythm.', 'Grow Your Email List'],
    ['nurture-evaluate', 'Learn from audience behavior', 'Replies, clicks, questions, and buying signals translated into one next test.', 'Mastermind Coaching'],
  ]),
  ...slots('sell', [
    ['sell-math', 'Set the sales target and math', 'A revenue target, sales needed, and invitation target.', 'Sales & Marketing'],
    ['sell-process', 'Choose one sales process', 'One capacity-fit route for making and following up on offers.', 'Sales & Marketing'],
    ['sell-run', 'Run the complete sales cycle', 'The full invitation, follow-up, and close sequence completed.', 'Messy Action Sprints'],
    ['sell-evaluate', 'Evaluate and repeat', 'A neutral debrief and one keep, change, or test-next decision.', 'Mastermind Coaching'],
  ]),
  ...slots('deliver', [
    ['deliver-result', 'Map the customer result', 'A customer success path and definition of successful completion.', 'Mastermind Coaching'],
    ['deliver-first-win', 'Onboard to the first win', 'A clear first-win action and one improved onboarding step.', 'Organization & Systems'],
    ['deliver-follow-through', 'Support follow-through', 'A progress measure, check-in rhythm, and stuck-customer response.', 'Organization & Systems'],
    ['deliver-proof', 'Turn delivery into proof and improvement', 'A feedback and testimonial loop with one chosen improvement.', 'Mastermind Coaching'],
  ]),
  ...slots('leverage', [
    ['leverage-constraint', 'Find the real operational constraint', 'One named constraint and one workflow chosen for improvement.', 'Organization & Systems'],
    ['leverage-simplify', 'Simplify and document what works', 'One reduced workflow with a minimum standard, owner, and review rhythm.', 'Organization & Systems'],
    ['leverage-choice', 'Choose the right leverage', 'A remove, simplify, automate, AI, delegate, or hire decision with a reason.', 'Faith AI'],
    ['leverage-evaluate', 'Lead through evidence and capacity', 'A small operating scorecard and proof of less founder dependence.', '90-Day Planning'],
  ]),
] as const;

export const MASTERMIND_STAGE_ORDER: readonly MastermindStageId[] = ['offer', 'find', 'nurture', 'sell', 'deliver', 'leverage'];
export const MASTERMIND_STAGE_LABELS: Record<MastermindStageId, string> = {
  offer: 'Offer', find: 'Find', nurture: 'Nurture', sell: 'Sell', deliver: 'Deliver', leverage: 'Leverage',
};
export const MASTERMIND_STAGE_MILESTONES = Object.fromEntries(
  MASTERMIND_STAGE_ORDER.map((stageId) => [stageId, MASTERMIND_CURRICULUM_MANIFEST.filter((slot) => slot.stageId === stageId)]),
) as Record<MastermindStageId, CurriculumSlot[]>;

export const MASTERMIND_SUCCESS_STAGES: MastermindRoadmapStage[] = [
  {
    id: 'offer',
    label: 'Offer',
    memberQuestion: 'What are you selling?',
    doThis: 'Write your offer in one sentence and invite 5 real people to react.',
    useWhen: 'Use this when the offer, buyer, price, promise, or demand evidence is still fuzzy.',
    milestone: 'Choose one money focus and create a minimum viable offer test.',
    milestones: MASTERMIND_STAGE_MILESTONES.offer,
    definitionOfDone: [
      'Offer statement is clear enough to say out loud',
      'Buyer, problem, price, and delivery model are decided',
      'Real people have been invited to validate or buy',
    ],
    resources: [
      { resourceId: 'success-plan', title: 'Mastermind Success Plan Module One', access: 'Core', useWhen: 'Clarify the one result and how the program is meant to support it.', portalPath: 'Start Here -> Mastermind Success Plan' },
      { resourceId: 'products-offers', title: 'Products & Offers', access: 'Core', useWhen: 'Clarify the buyer, problem, promise, price, and product shape before adding more tactics.', portalPath: 'Learning -> BUSINESS STRATEGY: PRODUCTS & OFFERS' },
      { resourceId: 'messy-action-sprints', title: 'Messy Action Sprints', access: 'Core', useWhen: 'Use this when the offer needs to become a real invitation instead of more private thinking.', portalPath: 'Learning -> Messy Action Sprints' },
    ],
    supportPrompt: 'What part of this offer is still private theory instead of market evidence?',
    nextMoneyMove: 'Turn the offer into one clear invitation and put it in front of real people before you polish another backend piece.',
    messyActionSprint: [
      'Write the offer in one sentence: who it helps, what changes, and how they get it.',
      'Name 5 real people or audience segments who could validate it this week.',
      'Make one simple invitation or validation ask and record what happens.',
    ],
  },
  {
    id: 'find',
    label: 'Find',
    memberQuestion: 'How will the right people find you?',
    doThis: 'Pick ONE channel and publish one piece to the right people this week.',
    useWhen: 'Use this when the offer is clear but too few qualified people are discovering you.',
    milestone: 'Pick one discovery path and repeat it long enough to create evidence.',
    milestones: MASTERMIND_STAGE_MILESTONES.find,
    definitionOfDone: [
      'One discovery channel is chosen',
      'There is a simple bridge into email or another owned audience',
      'Four weeks of discovery evidence have been reviewed',
    ],
    resources: [
      { resourceId: 'grow-email-list', title: 'Grow Your Email List', access: 'Core', useWhen: 'Use this when people need a clear bridge from visibility into an owned audience.', portalPath: 'Learning -> BUSINESS STRATEGY: GROW YOUR EMAIL LIST' },
      { resourceId: 'content-creation', title: 'Content Creation', access: 'Core', useWhen: 'Use this to choose a repeatable discovery lane instead of spreading attention everywhere.', portalPath: 'Learning -> BUSINESS STRATEGY: CONTENT CREATION' },
      { resourceId: 'current-replays', title: 'Current Call Replays', access: '30-day replays', useWhen: 'Use a recent coaching example when the member needs to see what simple discovery action looks like now.', portalPath: 'Learning -> CALL REPLAYS -> current 30-day window' },
    ],
    supportPrompt: 'Where are qualified people already close enough to notice your work this quarter?',
    nextMoneyMove: 'Choose one discovery channel and publish or pitch one specific piece that helps the right person recognize themselves.',
    messyActionSprint: [
      'Pick one discovery channel for this week.',
      'Create one piece around the exact problem your offer solves.',
      'Add one clear bridge into email, a call, a reply, or the next step.',
    ],
  },
  {
    id: 'nurture',
    label: 'Nurture',
    memberQuestion: 'How will you warm them up?',
    doThis: 'Send one warm email that moves your audience closer to the offer.',
    useWhen: 'Use this when people find you, but they are not joining, engaging, understanding the offer, or getting ready to buy.',
    milestone: 'Create a simple welcome and email rhythm that builds readiness.',
    milestones: MASTERMIND_STAGE_MILESTONES.nurture,
    definitionOfDone: [
      'Discovery connects to a clear next step',
      'A welcome or nurture path exists',
      'Audience behavior is being watched for replies, clicks, questions, or sales signals',
    ],
    resources: [
      { resourceId: 'grow-email-list', title: 'Grow Your Email List', access: 'Core', useWhen: 'Use this to connect discovery to a warmer owned-audience path.', portalPath: 'Learning -> BUSINESS STRATEGY: GROW YOUR EMAIL LIST' },
      { resourceId: 'content-creation', title: 'Content Creation', access: 'Core', useWhen: 'Use this to make nurture content move belief, trust, or readiness.', portalPath: 'Learning -> BUSINESS STRATEGY: CONTENT CREATION' },
      { resourceId: 'ask-faith', title: 'Ask Faith', access: 'Core', useWhen: 'Use this when the missing belief or readiness gap is unclear and needs coaching.', portalPath: 'Learning -> Ask Faith' },
    ],
    supportPrompt: 'What does your audience need to believe, understand, or trust before the offer makes sense?',
    nextMoneyMove: 'Send one nurture asset that moves people closer to the offer instead of creating more general content.',
    messyActionSprint: [
      'Pick one belief your buyer needs before the offer makes sense.',
      'Write one email, post, or story that teaches that belief with a real example.',
      'Invite replies, clicks, or a tiny next step so you can see who is warming up.',
    ],
  },
  {
    id: 'sell',
    label: 'Sell',
    memberQuestion: 'How will you make the offer?',
    doThis: 'Send the offer to your 10 warmest people and schedule follow-up.',
    useWhen: 'Use this when the offer and warm audience exist, but invitations, follow-up, or conversion are weak.',
    milestone: 'Run one complete sales cycle with follow-up and a real debrief.',
    milestones: MASTERMIND_STAGE_MILESTONES.sell,
    definitionOfDone: [
      'Sales goal and simple sales math are visible',
      'Offer invitations and follow-up are scheduled',
      'The campaign has been evaluated before changing direction',
    ],
    resources: [
      { resourceId: 'sales-marketing', title: 'Sales & Marketing', access: 'Core', useWhen: 'Use this when the sales process needs clearer invitations, assets, follow-up, or conversion support.', portalPath: 'Learning -> BUSINESS STRATEGY: SALES & MARKETING' },
      { resourceId: 'messy-action-sprints', title: 'Messy Action Sprints', access: 'Core', useWhen: 'Use this when the fastest path is sending the offer and collecting evidence this week.', portalPath: 'Learning -> Messy Action Sprints' },
      { resourceId: 'current-replays', title: 'Current Call Replays', access: '30-day replays', useWhen: 'Use recent sales coaching before changing the offer or rewriting every asset.', portalPath: 'Learning -> CALL REPLAYS -> current 30-day window' },
    ],
    supportPrompt: 'Where is the sales process incomplete: invitation, follow-up, volume, belief, or conversion?',
    nextMoneyMove: 'Make the offer to the warmest people and schedule the follow-up before deciding the offer is broken.',
    messyActionSprint: [
      'Name the warmest 10 people, segments, or audience signals available right now.',
      'Send one direct invitation or sales email tied to your current offer.',
      'Schedule one follow-up and one debrief point before changing the strategy.',
    ],
  },
  {
    id: 'deliver',
    label: 'Deliver',
    memberQuestion: 'How will customers get results?',
    doThis: 'Map the customer first win and improve one onboarding step.',
    useWhen: 'Use this when sales are happening but onboarding, follow-through, proof, retention, or referrals need support.',
    milestone: 'Map the customer success path and improve the first meaningful win.',
    milestones: MASTERMIND_STAGE_MILESTONES.deliver,
    definitionOfDone: [
      'Customer first win is defined',
      'Onboarding and check-ins support that first win',
      'Proof, feedback, or retention evidence is being collected',
    ],
    resources: [
      { resourceId: 'organization-systems', title: 'Organization & Systems', access: 'Core', useWhen: 'Use this when delivery needs a clearer process, check-in, or first-win workflow.', portalPath: 'Learning -> BUSINESS STRATEGY: ORGANIZATION & SYSTEMS' },
      { resourceId: 'ask-faith', title: 'Ask Faith', access: 'Core', useWhen: 'Use this when customer results, retention, or delivery quality needs coaching.', portalPath: 'Learning -> Ask Faith' },
      { resourceId: 'current-replays', title: 'Current Call Replays', access: '30-day replays', useWhen: 'Use recent coaching examples for onboarding, delivery, or proof problems.', portalPath: 'Learning -> CALL REPLAYS -> current 30-day window' },
    ],
    supportPrompt: 'Where does a customer most need support between buying and getting the promised result?',
    nextMoneyMove: 'Improve the first customer win so delivery creates proof, retention, referrals, and cleaner future sales.',
    messyActionSprint: [
      'Define the first meaningful customer win in one sentence.',
      'Find the moment where customers currently slow down, disappear, or need extra help.',
      'Improve one onboarding, check-in, or proof-collection step this week.',
    ],
  },
  {
    id: 'leverage',
    label: 'Leverage',
    memberQuestion: 'How will this get easier to run?',
    doThis: 'Simplify one repeated task so the business runs without you.',
    useWhen: 'Use this when the revenue engine works but capacity, complexity, consistency, or owner-dependence blocks growth.',
    milestone: 'Simplify and document one proven workflow before automating or delegating it.',
    milestones: MASTERMIND_STAGE_MILESTONES.leverage,
    definitionOfDone: [
      'One operating constraint is named',
      'A working process has been simplified and documented',
      'Automation, AI, delegation, or removal was chosen for the right reason',
    ],
    resources: [
      { resourceId: 'faith-ai', title: 'Faith AI', access: 'Core', useWhen: 'Use this when the member needs optional BYO-key support for sorting, planning, or breaking down action.', portalPath: 'Planner -> AI Settings + Learning -> Faith AI' },
      { resourceId: 'organization-systems', title: 'Organization & Systems', access: 'Core', useWhen: 'Use this before automating or delegating a messy process.', portalPath: 'Learning -> BUSINESS STRATEGY: ORGANIZATION & SYSTEMS' },
      { resourceId: 'ninety-day-planning', title: '90-Day Planning', access: 'Core', useWhen: 'Use this to reduce the quarter back to one result, one constraint, and one next move.', portalPath: 'Planner -> Build 90-Day Plan' },
    ],
    supportPrompt: 'What is already proven enough to simplify, automate, delegate, or remove?',
    nextMoneyMove: 'Simplify one proven money workflow so the business stops depending on your best-energy version to keep moving.',
    messyActionSprint: [
      'Choose one repeated task connected to sales, delivery, or retention.',
      'Write the current steps as they actually happen.',
      'Remove, simplify, automate, or delegate one step before adding a new system.',
    ],
  },
];

export function getMastermindStage(stageId: MastermindStageId) {
  return MASTERMIND_SUCCESS_STAGES.find((stage) => stage.id === stageId) ?? MASTERMIND_SUCCESS_STAGES[0];
}

const text = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
const list = (value: unknown) => Array.isArray(value) && value.some((item) => text(item) || (item && typeof item === 'object'));

/** First unproven link in the money path. Scores and keywords are intentionally ignored. */
export function inferMastermindSuccessPath(cycle: MastermindPlanCycle | null): MastermindSuccessPathOutput | null {
  if (!cycle || !text(cycle.goal) || ['my 90-day goal', 'my 90 day goal', 'n'].includes(cycle.goal.trim().toLowerCase())) return null;
  const d = cycle.planner_payload?.details ?? {};
  const evidence: Array<[MastermindStageId, boolean, string]> = [
    ['offer', list(d.offers) && text(cycle.audience_target) && text(cycle.audience_frustration), 'a named offer plus buyer and paid problem evidence'],
    ['find', text(d.leadPlatform) && text(d.leadFrequency) && Boolean(d.leadCommitted), 'a committed discovery channel and cadence'],
    ['nurture', (list(d.nurturePlatforms) || text(d.nurtureMethod)) && text(d.freeTransformation), 'a nurture path and free transformation'],
    ['sell', text(d.revenueGoal) && (list(d.promotions) || list(d.limitedOffers) || text(d.launchSchedule)), 'sales math and a dated invitation plan'],
    ['deliver', list(d.proofMethods) && (text(d.metric1Name) || text(d.metric2Name) || text(d.metric3Name)), 'delivery proof and a result measure'],
    ['leverage', list(d.recurringTasks) && (list(d.projects) || list(d.habits)), 'a repeatable operating workflow with an owner or rhythm'],
  ];
  const broken = evidence.find(([, proven]) => !proven) ?? evidence[evidence.length - 1];
  const prior = evidence.slice(0, evidence.indexOf(broken)).filter(([, proven]) => proven).length;
  return {
    stageId: broken[0],
    confidence: prior === 0 ? 'low' : 'medium',
    reason: `This is the first link in Offer → Find → Nurture → Sell → Deliver → Leverage that your saved plan does not yet prove. We need ${broken[2]} before moving downstream.`,
    evidenceLabel: `Saved planner evidence: ${prior} earlier link${prior === 1 ? '' : 's'} proven`,
  };
}

export function getCurriculumSlot(milestoneId: string) {
  return MASTERMIND_CURRICULUM_MANIFEST.find((slot) => slot.id === milestoneId) ?? null;
}

export function getRenderableCurriculumResourceId(slot: CurriculumSlot) {
  return slot.status === 'Ready' && slot.resourceId?.trim() ? slot.resourceId : null;
}
