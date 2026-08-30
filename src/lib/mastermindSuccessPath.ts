export type MastermindStageId = 'offer' | 'find' | 'nurture' | 'sell' | 'deliver' | 'leverage';

export interface MastermindResourceRecommendation {
  resourceId: string;
  title: string;
  access: 'Core' | '30-day replays' | 'Vault' | 'Access review';
  useWhen: string;
  portalPath?: string;
  afterWatching?: string;
  milestoneIds?: string[];
}

export interface MastermindQuickWin {
  title: string;
  action: string;
  timeBox: string;
  evidence: string;
  lowEnergy: string;
}

export interface MastermindMilestone {
  id: string;
  label: string;
  output: string;
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
  quickWin: MastermindQuickWin;
  aiProjectId: string;
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
  updated_at: string | null;
}

export interface MastermindSuccessPathOutput {
  stageId: MastermindStageId;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  evidenceLabel: string;
}

interface KeywordRule {
  stageId: MastermindStageId;
  keywords: string[];
}

export const MASTERMIND_STAGE_MILESTONES: Record<MastermindStageId, MastermindMilestone[]> = {
  offer: [
    { id: 'offer-focus', label: "Pick the thing you're selling", output: 'Choose one offer or revenue stream so the rest of the plan has a job.' },
    { id: 'offer-buyer', label: 'Name the buyer and the real problem', output: 'Who is this for, what are they already trying to solve, and what proof do you have?' },
    { id: 'offer-mvp', label: 'Make it simple enough to offer', output: 'Promise, price, format, and boundaries. Clear enough to send to a real person.' },
    { id: 'offer-validate', label: 'Put it in front of people', output: 'Make the invitation, follow up, and write down what actually happened.' },
  ],
  find: [
    { id: 'find-path', label: 'Choose one discovery path', output: 'One channel or outreach route with a four-week test.' },
    { id: 'find-create', label: 'Create discovery content or outreach', output: 'Four focused pieces or outreach attempts with one next step.' },
    { id: 'find-bridge', label: 'Build the bridge to your email list', output: 'One live opt-in or invitation connected to the offer.' },
    { id: 'find-evaluate', label: 'Repeat and evaluate discovery', output: 'Enough reach and opt-in evidence to choose the next test.' },
  ],
  nurture: [
    { id: 'nurture-map', label: 'Map the nurture ecosystem', output: 'A simple path from discovery to email to invitation.' },
    { id: 'nurture-content', label: 'Create content with a job', output: 'Four nurture ideas tied to a belief, proof, conversation, or invitation.' },
    { id: 'nurture-email', label: 'Create a simple email system', output: 'A live welcome email or sequence and sustainable send rhythm.' },
    { id: 'nurture-evaluate', label: 'Learn from audience behavior', output: 'Replies, clicks, questions, and buying signals translated into one next test.' },
  ],
  sell: [
    { id: 'sell-math', label: 'Set the sales target and math', output: 'A revenue target, sales needed, and invitation target.' },
    { id: 'sell-process', label: 'Choose one sales process', output: 'One capacity-fit route for making and following up on offers.' },
    { id: 'sell-run', label: 'Run the complete sales cycle', output: 'The full invitation, follow-up, and close sequence completed.' },
    { id: 'sell-evaluate', label: 'Evaluate and repeat', output: 'A neutral debrief and one keep, change, or test-next decision.' },
  ],
  deliver: [
    { id: 'deliver-result', label: 'Map the customer result', output: 'A customer success path and definition of successful completion.' },
    { id: 'deliver-first-win', label: 'Onboard to the first win', output: 'A clear first-win action and one improved onboarding step.' },
    { id: 'deliver-follow-through', label: 'Support follow-through', output: 'A progress measure, check-in rhythm, and stuck-customer response.' },
    { id: 'deliver-proof', label: 'Turn delivery into proof and improvement', output: 'A feedback and testimonial loop with one chosen improvement.' },
  ],
  leverage: [
    { id: 'leverage-constraint', label: 'Find the real operational constraint', output: 'One named constraint and one workflow chosen for improvement.' },
    { id: 'leverage-simplify', label: 'Simplify and document what works', output: 'One reduced workflow with a minimum standard, owner, and review rhythm.' },
    { id: 'leverage-choice', label: 'Choose the right leverage', output: 'A remove, simplify, automate, AI, delegate, or hire decision with a reason.' },
    { id: 'leverage-evaluate', label: 'Lead through evidence and capacity', output: 'A small operating scorecard and proof of less founder dependence.' },
  ],
};

export const MASTERMIND_SUCCESS_STAGES: MastermindRoadmapStage[] = [
  {
    id: 'offer',
    label: 'Offer',
    memberQuestion: 'What are you selling?',
    doThis: 'Write your offer in one sentence and invite 5 real people to react.',
    useWhen: 'Use this when the offer, buyer, price, promise, or demand evidence is still fuzzy.',
    milestone: "Pick the thing you're going to sell this quarter.",
    milestones: MASTERMIND_STAGE_MILESTONES.offer,
    definitionOfDone: [
      'Offer statement is clear enough to say out loud',
      'Buyer, problem, price, and delivery model are decided',
      'Real people have been invited to validate or buy',
    ],
    resources: [
      { resourceId: 'money-move-day-one', title: 'Find Your Next Money Move', access: 'Core', useWhen: "Use this when you need to stop spinning and choose the thing you're actually going to sell.", portalPath: 'Core curriculum -> Find Your Next Money Move', afterWatching: 'Write the one offer or revenue stream you are choosing for this quarter.', milestoneIds: ['offer-focus'] },
      { resourceId: 'wibn-offer-clarity', title: 'Offer Clarity', access: 'Core', useWhen: 'Use this when the idea exists, but the buyer, problem, or paid result is still fuzzy.', portalPath: 'Core curriculum -> Offer Clarity', afterWatching: 'Write the buyer/problem sentence in words a real buyer would recognize.', milestoneIds: ['offer-buyer'] },
      { resourceId: 'money-move-day-two', title: 'Package Your Money Move', access: 'Core', useWhen: 'Use this when the offer needs to become clear enough to send before the backend is perfect.', portalPath: 'Core curriculum -> Package Your Money Move', afterWatching: 'Write the promise, price, format, and boundary for the version you can test this week.', milestoneIds: ['offer-mvp'] },
      { resourceId: 'money-move-day-three', title: 'Create Your Sales Plan', access: 'Core', useWhen: 'Use this when the offer is clear enough and the next problem is making the invitation.', portalPath: 'Core curriculum -> Create Your Sales Plan', afterWatching: 'Make the invitation, schedule the follow-up, and record the response.', milestoneIds: ['offer-validate'] },
    ],
    supportPrompt: 'What part of this offer is still private theory instead of market evidence?',
    nextMoneyMove: 'Turn the offer into one clear invitation and put it in front of real people before you polish another backend piece.',
    messyActionSprint: [
      'Write the offer in one sentence: who it helps, what changes, and how they get it.',
      'Name 5 real people or audience segments who could validate it this week.',
      'Make one simple invitation or validation ask and record what happens.',
    ],
    quickWin: {
      title: 'Put the offer in front of real people',
      action: 'Write the offer in one sentence, choose 5 real people or audience segments, and make one direct validation ask.',
      timeBox: '45-60 minutes',
      evidence: 'Record who saw it, what they asked, what they objected to, and whether anyone took the next step.',
      lowEnergy: 'Send one simple validation question to one qualified person.',
    },
    aiProjectId: 'offer-lab',
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
      { resourceId: 'grow-email-list', title: 'Grow Your Email List', access: 'Core', useWhen: 'Use this when people need a clear bridge from visibility into an owned audience.', portalPath: 'Learning -> BUSINESS STRATEGY: GROW YOUR EMAIL LIST', afterWatching: 'Choose the one bridge you will test before adding another lead magnet.' },
      { resourceId: 'content-creation', title: 'Content Creation', access: 'Core', useWhen: 'Use this to choose a repeatable discovery lane instead of spreading attention everywhere.', portalPath: 'Learning -> BUSINESS STRATEGY: CONTENT CREATION', afterWatching: 'Publish or pitch one piece tied to the offer problem.' },
      { resourceId: 'current-replays', title: 'Current Call Replays', access: '30-day replays', useWhen: 'Use a recent coaching example when the member needs to see what simple discovery action looks like now.', portalPath: 'Learning -> CALL REPLAYS -> current 30-day window', afterWatching: 'Copy the smallest useful action from the example and test it this week.' },
    ],
    supportPrompt: 'Where are qualified people already close enough to notice your work this quarter?',
    nextMoneyMove: 'Choose one discovery channel and publish or pitch one specific piece that helps the right person recognize themselves.',
    messyActionSprint: [
      'Pick one discovery channel for this week.',
      'Create one piece around the exact problem your offer solves.',
      'Add one clear bridge into email, a call, a reply, or the next step.',
    ],
    quickWin: {
      title: 'Create one qualified discovery signal',
      action: 'Choose one discovery lane and publish or pitch one piece that names the exact problem your offer solves.',
      timeBox: '30-45 minutes',
      evidence: 'Track qualified reach, replies, opt-ins, DMs, saves, clicks, or conversations.',
      lowEnergy: 'Send one useful post, pitch, or reply in the place your buyer already is.',
    },
    aiProjectId: 'discovery-engine',
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
      { resourceId: 'grow-email-list', title: 'Grow Your Email List', access: 'Core', useWhen: 'Use this to connect discovery to a warmer owned-audience path.', portalPath: 'Learning -> BUSINESS STRATEGY: GROW YOUR EMAIL LIST', afterWatching: 'Choose the first email or invitation your new person should receive.' },
      { resourceId: 'content-creation', title: 'Content Creation', access: 'Core', useWhen: 'Use this to make nurture content move belief, trust, or readiness.', portalPath: 'Learning -> BUSINESS STRATEGY: CONTENT CREATION', afterWatching: 'Draft one belief-shifting email, post, or story.' },
      { resourceId: 'ask-faith', title: 'Ask Faith', access: 'Core', useWhen: 'Use this when the missing belief or readiness gap is unclear and needs coaching.', portalPath: 'Learning -> Ask Faith', afterWatching: 'Bring the unclear belief gap and one audience response to Faith.' },
    ],
    supportPrompt: 'What does your audience need to believe, understand, or trust before the offer makes sense?',
    nextMoneyMove: 'Send one nurture asset that moves people closer to the offer instead of creating more general content.',
    messyActionSprint: [
      'Pick one belief your buyer needs before the offer makes sense.',
      'Write one email, post, or story that teaches that belief with a real example.',
      'Invite replies, clicks, or a tiny next step so you can see who is warming up.',
    ],
    quickWin: {
      title: 'Move one buyer belief forward',
      action: 'Write one email, post, or story that helps the right person understand why the offer matters now.',
      timeBox: '30-60 minutes',
      evidence: 'Track replies, clicks, questions, buying signals, or what people still seem confused about.',
      lowEnergy: 'Send one short email or post that answers one buyer objection.',
    },
    aiProjectId: 'nurture-desk',
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
      { resourceId: 'sales-marketing', title: 'Sales & Marketing', access: 'Core', useWhen: 'Use this when the sales process needs clearer invitations, assets, follow-up, or conversion support.', portalPath: 'Learning -> BUSINESS STRATEGY: SALES & MARKETING', afterWatching: 'Send or schedule the next direct invitation.' },
      { resourceId: 'current-replays', title: 'Current Call Replays', access: '30-day replays', useWhen: 'Use recent sales coaching before changing the offer or rewriting every asset.', portalPath: 'Learning -> CALL REPLAYS -> current 30-day window', afterWatching: 'Choose one follow-up, sales asset, or invitation change to test.' },
      { resourceId: 'ask-faith', title: 'Ask Faith', access: 'Core', useWhen: 'Use this when sales evidence is confusing and the next decision needs coaching.', portalPath: 'Learning -> Ask Faith', afterWatching: 'Bring the invitation, response pattern, and one sales question to Faith.' },
    ],
    supportPrompt: 'Where is the sales process incomplete: invitation, follow-up, volume, belief, or conversion?',
    nextMoneyMove: 'Make the offer to the warmest people and schedule the follow-up before deciding the offer is broken.',
    messyActionSprint: [
      'Name the warmest 10 people, segments, or audience signals available right now.',
      'Send one direct invitation or sales email tied to your current offer.',
      'Schedule one follow-up and one debrief point before changing the strategy.',
    ],
    quickWin: {
      title: 'Complete the next sales action',
      action: 'Name the warmest people or segment, send one clear invitation, and schedule the follow-up before changing the offer.',
      timeBox: '45-75 minutes',
      evidence: 'Track invitations, follow-ups, replies, objections, conversations, yeses, sales, deposits, and no-responses.',
      lowEnergy: 'Send one direct invitation or one follow-up to the warmest qualified person.',
    },
    aiProjectId: 'sales-room',
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
      { resourceId: 'organization-systems', title: 'Organization & Systems', access: 'Core', useWhen: 'Use this when delivery needs a clearer process, check-in, or first-win workflow.', portalPath: 'Learning -> BUSINESS STRATEGY: ORGANIZATION & SYSTEMS', afterWatching: 'Improve one step that helps customers reach the first win faster.' },
      { resourceId: 'ask-faith', title: 'Ask Faith', access: 'Core', useWhen: 'Use this when customer results, retention, or delivery quality needs coaching.', portalPath: 'Learning -> Ask Faith', afterWatching: 'Bring the exact point where customers slow down or need support.' },
      { resourceId: 'current-replays', title: 'Current Call Replays', access: '30-day replays', useWhen: 'Use recent coaching examples for onboarding, delivery, or proof problems.', portalPath: 'Learning -> CALL REPLAYS -> current 30-day window', afterWatching: 'Apply one delivery improvement to a current or next customer.' },
    ],
    supportPrompt: 'Where does a customer most need support between buying and getting the promised result?',
    nextMoneyMove: 'Improve the first customer win so delivery creates proof, retention, referrals, and cleaner future sales.',
    messyActionSprint: [
      'Define the first meaningful customer win in one sentence.',
      'Find the moment where customers currently slow down, disappear, or need extra help.',
      'Improve one onboarding, check-in, or proof-collection step this week.',
    ],
    quickWin: {
      title: 'Strengthen the first customer win',
      action: 'Map the first meaningful win and improve one onboarding, check-in, or proof-collection step.',
      timeBox: '45-60 minutes',
      evidence: 'Track customer response, progress, feedback, completion signal, proof language, or one delivery fix.',
      lowEnergy: 'Rewrite one onboarding or check-in question so customers know the next step.',
    },
    aiProjectId: 'customer-results-lab',
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
      { resourceId: 'faith-ai', title: 'Faith AI', access: 'Core', useWhen: 'Use this when the member needs optional BYO-key support for sorting, planning, or breaking down action.', portalPath: 'Planner -> AI Settings + Learning -> Faith AI', afterWatching: 'Choose one workflow that is ready to document before automating.' },
      { resourceId: 'organization-systems', title: 'Organization & Systems', access: 'Core', useWhen: 'Use this before automating or delegating a messy process.', portalPath: 'Learning -> BUSINESS STRATEGY: ORGANIZATION & SYSTEMS', afterWatching: 'Write the simplest current version of the workflow.' },
      { resourceId: 'ninety-day-planning', title: '90-Day Planning', access: 'Core', useWhen: 'Use this to reduce the quarter back to one result, one constraint, and one next move.', portalPath: 'Planner -> Build 90-Day Plan', afterWatching: 'Cut the plan back to one result, one constraint, and one next move.' },
    ],
    supportPrompt: 'What is already proven enough to simplify, automate, delegate, or remove?',
    nextMoneyMove: 'Simplify one proven money workflow so the business stops depending on your best-energy version to keep moving.',
    messyActionSprint: [
      'Choose one repeated task connected to sales, delivery, or retention.',
      'Write the current steps as they actually happen.',
      'Remove, simplify, automate, or delegate one step before adding a new system.',
    ],
    quickWin: {
      title: 'Simplify one proven workflow',
      action: 'Choose one repeated task connected to sales, delivery, or retention and document the simplest working version.',
      timeBox: '45-90 minutes',
      evidence: 'Track reduced steps, reduced owner minutes, fewer errors, clearer handoff, or one tested SOP update.',
      lowEnergy: 'Write the current messy steps for one repeated task without fixing them yet.',
    },
    aiProjectId: 'workflow-systems-lab',
  },
];

export function getMastermindWeeklyGuidance(stageId: MastermindStageId, cycle?: MastermindPlanCycle | null, milestoneId?: string | null) {
  const stage = getMastermindStage(stageId);
  const primaryResource = (milestoneId
    ? stage.resources.find((resource) => resource.milestoneIds?.includes(milestoneId))
    : null) ?? stage.resources[0];

  return {
    stage,
    quickWin: {
      ...stage.quickWin,
      lowEnergy: cycle?.low_energy_version?.trim() || stage.quickWin.lowEnergy,
    },
    primaryResource,
    afterWatching: primaryResource?.afterWatching,
    aiProjectId: stage.aiProjectId,
  };
}

const KEYWORD_RULES: KeywordRule[] = [
  {
    stageId: 'offer',
    keywords: ['offer', 'pricing', 'price', 'package', 'promise', 'niche', 'buyer', 'what to sell', 'product', 'program'],
  },
  {
    stageId: 'find',
    keywords: ['discover', 'visibility', 'traffic', 'reach', 'followers', 'views', 'subscribers', 'email list', 'leads', 'lead gen', 'platform'],
  },
  {
    stageId: 'nurture',
    keywords: ['nurture', 'warm', 'email', 'newsletter', 'trust', 'relationship', 'engagement', 'click', 'reply', 'bridge'],
  },
  {
    stageId: 'sell',
    keywords: ['sell', 'sales', 'convert', 'conversion', 'launch', 'webinar', 'pitch', 'checkout', 'sales page', 'follow up', 'follow-up', 'invitation', 'close'],
  },
  {
    stageId: 'deliver',
    keywords: ['deliver', 'delivery', 'client results', 'customer results', 'onboarding', 'retention', 'renewal', 'testimonial', 'proof', 'referral', 'refund', 'fulfillment'],
  },
  {
    stageId: 'leverage',
    keywords: ['leverage', 'system', 'automate', 'automation', 'delegate', 'simplify', 'capacity', 'burnout', 'overwhelm', 'manual', 'operations', 'workflow'],
  },
];

export function getMastermindStage(stageId: MastermindStageId) {
  return MASTERMIND_SUCCESS_STAGES.find((stage) => stage.id === stageId) ?? MASTERMIND_SUCCESS_STAGES[0];
}

export function inferMastermindSuccessPath(cycle: MastermindPlanCycle | null): MastermindSuccessPathOutput | null {
  if (!cycle) return null;

  const normalizedGoal = cycle.goal?.trim().toLowerCase();
  const isPlaceholderCycle = ['my 90-day goal', 'my 90 day goal', 'n'].includes(normalizedGoal)
    && !cycle.biggest_bottleneck
    && !cycle.audience_target
    && !cycle.signature_message;
  if (isPlaceholderCycle) return null;

  const directText = (cycle.biggest_bottleneck ?? '').trim().toLowerCase();
  const fullText = [
    cycle.goal,
    cycle.why,
    cycle.biggest_bottleneck,
    cycle.audience_target,
    cycle.audience_frustration,
    cycle.signature_message,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const keywordMatch = findKeywordMatch(directText || fullText);
  if (keywordMatch) {
    return {
      stageId: keywordMatch.stageId,
      confidence: directText ? 'high' : 'medium',
      reason: `Your plan language points to "${keywordMatch.keyword}" as the first place to investigate.`,
      evidenceLabel: cycle.biggest_bottleneck || cycle.focus_area || 'Plan language',
    };
  }

  if (!cycle.audience_target && !cycle.signature_message) {
    return {
      stageId: 'offer',
      confidence: 'medium',
      reason: 'Your plan is missing buyer or message detail, so the offer needs to get concrete before downstream tactics can work.',
      evidenceLabel: 'Buyer/message fields are still blank',
    };
  }

  const diagnostic = getLowestDiagnostic(cycle);
  if (diagnostic) {
    return diagnostic;
  }

  return {
    stageId: 'offer',
    confidence: 'low',
    reason: 'There is not enough evidence to recommend a path yet. Start by checking whether the offer is clear before adding downstream tactics.',
    evidenceLabel: 'Needs a quick path check',
  };
}

function findKeywordMatch(text: string) {
  if (!text.trim()) return null;

  for (const rule of KEYWORD_RULES) {
    const keyword = rule.keywords.find((term) => text.includes(term));
    if (keyword) {
      return { stageId: rule.stageId, keyword };
    }
  }

  return null;
}

function getLowestDiagnostic(cycle: MastermindPlanCycle): MastermindSuccessPathOutput | null {
  const scores = [
    { stageId: 'find' as const, label: 'Discover', score: cycle.discover_score },
    { stageId: 'nurture' as const, label: 'Nurture', score: cycle.nurture_score },
    { stageId: 'sell' as const, label: 'Convert', score: cycle.convert_score },
  ].filter((item): item is { stageId: 'find' | 'nurture' | 'sell'; label: string; score: number } =>
    typeof item.score === 'number'
  );

  if (scores.length === 0) return null;

  const sortedScores = [...scores].sort((a, b) => a.score - b.score);
  const lowest = sortedScores[0];
  const highest = sortedScores[sortedScores.length - 1];

  if (lowest.score === 5 && highest.score === 5) return null;

  return {
    stageId: lowest.stageId,
    confidence: lowest.score <= 6 ? 'medium' : 'low',
    reason: `${lowest.label} is your lowest diagnostic score, so this is the first part of the money path to test.`,
    evidenceLabel: `${lowest.label}: ${lowest.score}/10`,
  };
}
