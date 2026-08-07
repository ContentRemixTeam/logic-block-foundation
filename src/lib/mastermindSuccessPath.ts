export type MastermindStageId = 'offer' | 'find' | 'nurture' | 'sell' | 'deliver' | 'leverage';

export interface MastermindResourceRecommendation {
  title: string;
  access: 'Core' | '30-day replays' | 'Vault';
  useWhen: string;
}

export interface MastermindRoadmapStage {
  id: MastermindStageId;
  label: string;
  memberQuestion: string;
  useWhen: string;
  milestone: string;
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

export const MASTERMIND_SUCCESS_STAGES: MastermindRoadmapStage[] = [
  {
    id: 'offer',
    label: 'Offer',
    memberQuestion: 'What are you selling?',
    useWhen: 'Use this when the offer, buyer, price, promise, or demand evidence is still fuzzy.',
    milestone: 'Choose one money focus and create a minimum viable offer test.',
    definitionOfDone: [
      'Offer statement is clear enough to say out loud',
      'Buyer, problem, price, and delivery model are decided',
      'Real people have been invited to validate or buy',
    ],
    resources: [
      { title: 'Create Results Foundation', access: 'Core', useWhen: 'Clarify the buyer, problem, promise, and result before adding more tactics.' },
      { title: 'Offer Stage Intro', access: 'Core', useWhen: 'Use this when the plan still feels abstract because the offer is not concrete enough.' },
      { title: 'Minimum Viable Offer Test', access: 'Core', useWhen: 'Use this to get market evidence before rebuilding the whole business.' },
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
    useWhen: 'Use this when the offer is clear but too few qualified people are discovering you.',
    milestone: 'Pick one discovery path and repeat it long enough to create evidence.',
    definitionOfDone: [
      'One discovery channel is chosen',
      'There is a simple bridge into email or another owned audience',
      'Four weeks of discovery evidence have been reviewed',
    ],
    resources: [
      { title: 'Find Stage Intro', access: 'Core', useWhen: 'Use this to choose one discovery lane instead of spreading attention everywhere.' },
      { title: 'Simple Discovery Plan', access: 'Core', useWhen: 'Use this when you need a repeatable visibility action for the quarter.' },
      { title: 'Email Bridge Lesson', access: 'Core', useWhen: 'Use this when people are seeing you but not entering an owned follow-up path.' },
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
    useWhen: 'Use this when people find you, but they are not joining, engaging, understanding the offer, or getting ready to buy.',
    milestone: 'Create a simple welcome and email rhythm that builds readiness.',
    definitionOfDone: [
      'Discovery connects to a clear next step',
      'A welcome or nurture path exists',
      'Audience behavior is being watched for replies, clicks, questions, or sales signals',
    ],
    resources: [
      { title: 'Nurture Stage Intro', access: 'Core', useWhen: 'Use this when people know you exist but are not yet ready to buy.' },
      { title: 'Simple Email System', access: 'Core', useWhen: 'Use this to build a repeatable warm-up rhythm without overcomplicating it.' },
      { title: 'Content With a Job', access: 'Core', useWhen: 'Use this to make nurture content move belief, trust, or readiness.' },
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
    useWhen: 'Use this when the offer and warm audience exist, but invitations, follow-up, or conversion are weak.',
    milestone: 'Run one complete sales cycle with follow-up and a real debrief.',
    definitionOfDone: [
      'Sales goal and simple sales math are visible',
      'Offer invitations and follow-up are scheduled',
      'The campaign has been evaluated before changing direction',
    ],
    resources: [
      { title: 'Sell Stage Intro', access: 'Core', useWhen: 'Use this when you need to make the sales process visible and complete.' },
      { title: 'Make More Offers', access: 'Core', useWhen: 'Use this when the problem is too few clear invitations.' },
      { title: 'Sales Debrief', access: 'Core', useWhen: 'Use this after a sales push so the next move is based on evidence.' },
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
    useWhen: 'Use this when sales are happening but onboarding, follow-through, proof, retention, or referrals need support.',
    milestone: 'Map the customer success path and improve the first meaningful win.',
    definitionOfDone: [
      'Customer first win is defined',
      'Onboarding and check-ins support that first win',
      'Proof, feedback, or retention evidence is being collected',
    ],
    resources: [
      { title: 'Customer Results Course', access: 'Core', useWhen: 'Use this when the customer path needs to create clearer wins.' },
      { title: 'First-Win Onboarding', access: 'Core', useWhen: 'Use this to improve the first important moment after someone buys.' },
      { title: 'Proof and Retention', access: 'Core', useWhen: 'Use this when you need feedback, proof, referrals, or renewal signals.' },
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
    useWhen: 'Use this when the revenue engine works but capacity, complexity, consistency, or owner-dependence blocks growth.',
    milestone: 'Simplify and document one proven workflow before automating or delegating it.',
    definitionOfDone: [
      'One operating constraint is named',
      'A working process has been simplified and documented',
      'Automation, AI, delegation, or removal was chosen for the right reason',
    ],
    resources: [
      { title: 'Leverage Stage Intro', access: 'Core', useWhen: 'Use this when the business works but feels too heavy to keep running.' },
      { title: 'Simplify What Works', access: 'Core', useWhen: 'Use this before automating or delegating a messy process.' },
      { title: 'AI or Delegation Decision', access: 'Core', useWhen: 'Use this to decide whether a task needs AI, a person, a system, or removal.' },
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
    keywords: ['leverage', 'system', 'automate', 'automation', 'delegate', 'simplify', 'capacity', 'burnout', 'overwhelm', 'time', 'manual', 'operations', 'workflow', 'ai'],
  },
];

export function getMastermindStage(stageId: MastermindStageId) {
  return MASTERMIND_SUCCESS_STAGES.find((stage) => stage.id === stageId) ?? MASTERMIND_SUCCESS_STAGES[0];
}

export function inferMastermindSuccessPath(cycle: MastermindPlanCycle | null): MastermindSuccessPathOutput | null {
  if (!cycle) return null;

  const directText = `${cycle.biggest_bottleneck ?? ''} ${cycle.focus_area ?? ''}`.trim().toLowerCase();
  const fullText = [
    cycle.goal,
    cycle.why,
    cycle.biggest_bottleneck,
    cycle.focus_area,
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
    stageId: 'sell',
    confidence: 'low',
    reason: 'There is not enough bottleneck detail yet, so start with the sales path because making the offer creates the fastest evidence.',
    evidenceLabel: 'Default money-path check',
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
