export type MastermindStageId = 'offer' | 'find' | 'nurture' | 'sell' | 'deliver' | 'leverage';

export interface MastermindResourceRecommendation {
  resourceId: string;
  title: string;
  access: 'Core' | '30-day replays' | 'Vault' | 'Access review';
  useWhen: string;
  portalPath?: string;
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
    { id: 'offer-focus', label: 'Choose the money-making focus', output: 'One active revenue stream for this quarter.' },
    { id: 'offer-buyer', label: 'Choose the buyer and problem', output: 'One buyer doorway, paid problem, and piece of demand evidence.' },
    { id: 'offer-mvp', label: 'Build the minimum viable offer', output: 'A clear promise, scope, delivery format, price, and boundary.' },
    { id: 'offer-validate', label: 'Validate by making offers', output: 'A dated validation test with invitations and real response evidence.' },
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
