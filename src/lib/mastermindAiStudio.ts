import type { MastermindPlanCycle, MastermindStageId } from '@/lib/mastermindSuccessPath';

export type AiProjectPackId =
  | 'ninety-day-ceo-workspace'
  | 'offer-lab'
  | 'discovery-engine'
  | 'nurture-desk'
  | 'sales-room'
  | 'customer-results-lab'
  | 'workflow-systems-lab';

export type AiPackAccess = 'planner_safe' | 'monthly_unlockable' | 'annual_library';
export type AiPackStatus = 'template_ready' | 'quality_gate_required' | 'planned';

export interface AiProjectPack {
  id: AiProjectPackId;
  title: string;
  stageId: MastermindStageId | 'foundation';
  job: string;
  recommendedWhen: string;
  interviewFocus: string[];
  setupQuestions: string[];
  installOutputs: string[];
  knowledgeDocs: string[];
  operatingRules: string[];
  outputChecks: string[];
  firstTest: string;
  access: AiPackAccess;
  status: AiPackStatus;
}

export interface AiStudioAccessSummary {
  tierLabel: string;
  canUsePlannerPack: boolean;
  canUnlockMonthlyPack: boolean;
  canSeeFullLibrary: boolean;
  monthlyUnlockCopy: string;
}

export type VisibleAiPackState = 'included' | 'recommended_unlock' | 'locked';

export interface VisibleAiProjectPack extends AiProjectPack {
  visibility: VisibleAiPackState;
}

export const AI_PROJECT_PACKS: AiProjectPack[] = [
  {
    id: 'ninety-day-ceo-workspace',
    title: '90-Day CEO Workspace',
    stageId: 'foundation',
    job: 'Turns the plan, capacity, constraints, and weekly review answers into better prompts and cleaner decisions.',
    recommendedWhen: 'Use this first when the business strategy and weekly execution loop need to be easier to follow.',
    interviewFocus: ['90-day goal', 'capacity and constraints', 'offer and audience', 'decision rules'],
    setupQuestions: [
      'What is the one 90-day result this workspace should protect?',
      'What are the current low, medium, and high capacity versions of the plan?',
      'What should this AI treat as already decided unless new evidence proves otherwise?',
      'What evidence should it ask for before recommending a pivot?',
    ],
    installOutputs: ['Custom GPT/Claude project instructions', 'business profile', 'weekly check-in prompt', 'decision rules'],
    knowledgeDocs: ['90-day plan summary', 'business profile', 'weekly evidence log'],
    operatingRules: [
      'Tie every suggestion to the active 90-day goal before suggesting more tactics.',
      'Give one main move, one lower-capacity version, and one evidence target.',
      'Separate observed evidence from interpretation before recommending a pivot.',
    ],
    outputChecks: ['The next step is small enough for this week', 'The recommendation uses buyer/customer evidence', 'The output does not rebuild the whole business by default'],
    firstTest: "Ask it to turn this week's check-in into one next move and one evidence target.",
    access: 'planner_safe',
    status: 'template_ready',
  },
  {
    id: 'offer-lab',
    title: 'Offer Lab',
    stageId: 'offer',
    job: 'Helps refine the buyer, problem, promise, offer boundaries, validation questions, and offer evidence.',
    recommendedWhen: 'Use this when the current bottleneck is what to sell, who it is for, what to promise, or whether people want it.',
    interviewFocus: ['buyer and problem', 'current offer', 'proof and objections', 'validation evidence'],
    setupQuestions: [
      'What has someone paid for, asked for, clicked, replied to, or said they want?',
      'Who is the most specific buyer this offer is for right now?',
      'What promise, price, format, and boundary are you willing to test this week?',
      'What objection or uncertainty keeps you from making the offer directly?',
    ],
    installOutputs: ['offer critique instructions', 'validation interview guide', 'offer one-liner worksheet', 'proof tracker prompt'],
    knowledgeDocs: ['buyer/problem evidence', 'current offer draft', 'validation and objection log'],
    operatingRules: [
      'Improve the offer around real buyer language instead of generic positioning ideas.',
      'Prefer a small validation ask before recommending a full funnel or course rebuild.',
      'Keep price, promise, scope, and boundary visible in every critique.',
    ],
    outputChecks: ['The offer can be sent to a real person', 'The validation ask creates evidence', 'The suggestion protects the simplest sellable version'],
    firstTest: 'Give it the current offer and ask for the smallest validation ask to send this week.',
    access: 'monthly_unlockable',
    status: 'quality_gate_required',
  },
  {
    id: 'discovery-engine',
    title: 'Discovery Engine',
    stageId: 'find',
    job: 'Helps choose one visibility lane and create content or outreach that attracts qualified buyers.',
    recommendedWhen: 'Use this when the offer is clear but too few of the right people are finding it.',
    interviewFocus: ['best buyer habitat', 'current audience channels', 'visible proof', 'weekly publishing capacity'],
    setupQuestions: [
      'Where are the right buyers already paying attention or asking for help?',
      'Which channel can you repeat for four weeks without needing a high-energy version of yourself?',
      'What buyer problem should every discovery asset make obvious?',
      'What counts as qualified signal: replies, DMs, opt-ins, clicks, calls, or saves?',
    ],
    installOutputs: ['discovery lane selector', 'content prompt library', 'outreach prompt', 'qualified signal tracker'],
    knowledgeDocs: ['buyer habitat map', 'current content proof', 'weekly publishing capacity'],
    operatingRules: [
      'Choose one discovery lane before generating content across multiple platforms.',
      'Create assets for qualified buyer signal, not broad attention.',
      'End every output with the signal to track after publishing.',
    ],
    outputChecks: ['The asset names the buyer problem', 'The channel matches current capacity', 'The next step can be measured by replies, clicks, saves, or conversations'],
    firstTest: 'Ask it to create one discovery asset for the exact buyer problem in the current plan.',
    access: 'monthly_unlockable',
    status: 'planned',
  },
  {
    id: 'nurture-desk',
    title: 'Nurture Desk',
    stageId: 'nurture',
    job: 'Helps move audience beliefs forward through emails, stories, proof, and buyer-readiness content.',
    recommendedWhen: 'Use this when people are aware but not yet engaged, warmed up, or ready to buy.',
    interviewFocus: ['belief gaps', 'audience questions', 'proof stories', 'email rhythm'],
    setupQuestions: [
      'What does your buyer need to believe before the offer makes sense?',
      'What proof, story, or example can move that belief without overexplaining?',
      'What questions or objections keep showing up in replies, calls, or DMs?',
      'What weekly email or nurture rhythm can you sustain while still doing the selling work?',
    ],
    installOutputs: ['belief map', 'email draft prompt', 'story prompt', 'reply analysis prompt'],
    knowledgeDocs: ['buyer belief map', 'proof and story bank', 'email rhythm and reply log'],
    operatingRules: [
      'Move one belief or objection at a time instead of writing general nurture content.',
      'Use proof, specificity, and plain language before adding persuasion devices.',
      'Ask for replies or buying signals when the member needs evidence.',
    ],
    outputChecks: ['The piece has one clear belief job', 'The copy sounds like the business owner', 'The output creates a reply, click, or buying-signal opportunity'],
    firstTest: "Ask it to write one belief-shifting email using the member's actual offer and audience language.",
    access: 'monthly_unlockable',
    status: 'quality_gate_required',
  },
  {
    id: 'sales-room',
    title: 'Sales Room',
    stageId: 'sell',
    job: 'Helps plan invitations, sales pages, follow-up, objection handling, and campaign debriefs.',
    recommendedWhen: 'Use this when the current plan needs direct selling, follow-up, or conversion support.',
    interviewFocus: ['sales goal', 'warmest audience', 'offer assets', 'objections and follow-up'],
    setupQuestions: [
      'What is the revenue target, offer price, and number of sales needed this cycle?',
      'Who is the warmest audience or segment to invite first?',
      'What part of the sales cycle is incomplete: invitation, page, follow-up, close, or debrief?',
      'What objections, no-responses, or buyer questions should this AI help track neutrally?',
    ],
    installOutputs: ['sales invitation prompt', 'sales page critique', 'follow-up sequence prompt', 'sales debrief template'],
    knowledgeDocs: ['sales goal and math', 'offer and sales assets', 'objection/follow-up log'],
    operatingRules: [
      'Prioritize completing the sales cycle before changing the strategy.',
      'Use warmest available audience and current offer constraints.',
      'Debrief invitations, follow-up, objections, and sales evidence neutrally.',
    ],
    outputChecks: ['The invitation is clear and direct', 'Follow-up is scheduled', 'The debrief separates facts from interpretation'],
    firstTest: 'Ask it to write the next invitation and follow-up based on the current 90-day revenue goal.',
    access: 'monthly_unlockable',
    status: 'quality_gate_required',
  },
  {
    id: 'customer-results-lab',
    title: 'Customer Results Lab',
    stageId: 'deliver',
    job: 'Helps clarify the customer first win, onboarding, check-ins, proof collection, and retention points.',
    recommendedWhen: 'Use this when sales are happening but delivery needs to create clearer wins and proof.',
    interviewFocus: ['customer promise', 'first win', 'stuck points', 'proof and feedback'],
    setupQuestions: [
      'What result did the customer buy, and what first win proves they are moving?',
      'Where do customers currently slow down, disappear, or need extra support?',
      'What onboarding or check-in step would make the next action more obvious?',
      'What proof, feedback, or completion signal should be collected without making the customer do extra work?',
    ],
    installOutputs: ['first-win map', 'onboarding prompt', 'check-in prompt', 'proof capture script'],
    knowledgeDocs: ['customer promise', 'first-win map', 'stuck-point and proof log'],
    operatingRules: [
      'Improve the customer result path before adding more curriculum.',
      'Make the first win obvious, doable, and measurable.',
      'Use feedback and proof to choose the next delivery improvement.',
    ],
    outputChecks: ['The customer first win is specific', 'The onboarding step reduces friction', 'The proof request is timely and natural'],
    firstTest: 'Ask it to improve one onboarding or check-in step for the current customer path.',
    access: 'monthly_unlockable',
    status: 'planned',
  },
  {
    id: 'workflow-systems-lab',
    title: 'Workflow Systems Lab',
    stageId: 'leverage',
    job: 'Helps document, simplify, and package one proven workflow before automating or delegating it.',
    recommendedWhen: 'Use this when the business works but owner-dependence, manual work, or complexity is blocking growth.',
    interviewFocus: ['repeated workflow', 'decision owner', 'handoff points', 'automation risk'],
    setupQuestions: [
      'Which repeated workflow is connected to revenue, delivery, retention, or owner capacity?',
      'What steps are actually happening now, even if they are messy?',
      'Which decisions still need the owner, and which parts can be drafted, checked, automated, or delegated?',
      'What could go wrong if this workflow were automated too early?',
    ],
    installOutputs: ['SOP interview', 'workflow simplifier', 'AI assistant instructions', 'Zapier/n8n readiness checklist'],
    knowledgeDocs: ['workflow map', 'handoff rules', 'automation risk checklist'],
    operatingRules: [
      'Simplify and document the workflow before recommending automation.',
      'Keep owner decisions, handoff points, and rollback rules explicit.',
      'Use AI or automation only where the process is stable enough to supervise.',
    ],
    outputChecks: ['The SOP matches how the work really happens', 'The automation risk is named', 'The member can test one supervised rep before scaling'],
    firstTest: 'Ask it to turn one messy repeated workflow into a first-draft SOP with a review checklist.',
    access: 'monthly_unlockable',
    status: 'planned',
  },
];

export function getAiStudioAccessSummary(
  memberTier: string | null | undefined,
  isMastermind: boolean,
  memberScopes: string[] = [],
  previewCapabilities: string[] = []
): AiStudioAccessSummary {
  const normalizedTier = memberTier?.toLowerCase() ?? '';
  const normalizedScopes = memberScopes.map((scope) => scope.toLowerCase());
  const normalizedPreviewCapabilities = previewCapabilities.map((capability) => capability.toLowerCase());
  const canSeeFullLibrary =
    ['annual', 'lifetime', 'mastermind_annual', 'mastermind_lifetime', 'admin'].some((tier) =>
      normalizedTier.includes(tier)
    )
    || normalizedScopes.some((scope) => ['replay_vault', 'vault', 'ai_asset_full_library_access'].includes(scope))
    || normalizedPreviewCapabilities.includes('preview_unpublished');

  if (canSeeFullLibrary) {
    return {
      tierLabel: 'Annual / lifetime',
      canUsePlannerPack: true,
      canUnlockMonthlyPack: true,
      canSeeFullLibrary: true,
      monthlyUnlockCopy: 'Full approved AI workspace library available when the access record identifies annual or lifetime membership.',
    };
  }

  const hasMastermindScope = normalizedScopes.some((scope) => ['core_curriculum', 'current_replay_30_day', 'ai_asset_monthly_unlock_access'].includes(scope));

  if (isMastermind || hasMastermindScope) {
    return {
      tierLabel: 'Monthly Mastermind',
      canUsePlannerPack: true,
      canUnlockMonthlyPack: true,
      canSeeFullLibrary: false,
      monthlyUnlockCopy: 'Monthly members get the planner-safe workspace plus one recommended project pack unlock per active month.',
    };
  }

  return {
    tierLabel: 'Planner',
    canUsePlannerPack: true,
    canUnlockMonthlyPack: false,
    canSeeFullLibrary: false,
    monthlyUnlockCopy: 'Planner-only members can use the 90-Day CEO Workspace. Mastermind packs stay gated.',
  };
}

export function getRecommendedAiProjectPack(stageId: MastermindStageId, cycle?: MastermindPlanCycle | null) {
  const hasRealGoal = Boolean(cycle?.goal?.trim()) && !['my 90-day goal', 'my 90 day goal', 'n'].includes(cycle?.goal?.trim().toLowerCase() ?? '');
  if (!hasRealGoal) return AI_PROJECT_PACKS[0];

  return AI_PROJECT_PACKS.find((pack) => pack.stageId === stageId) ?? AI_PROJECT_PACKS[0];
}

export function getVisibleAiProjectPacks(access: AiStudioAccessSummary, recommendedPackId: AiProjectPackId): VisibleAiProjectPack[] {
  return AI_PROJECT_PACKS.map((pack) => {
    let visibility: VisibleAiPackState = 'locked';

    if (access.canSeeFullLibrary || pack.access === 'planner_safe') {
      visibility = 'included';
    } else if (access.canUnlockMonthlyPack && pack.id === recommendedPackId) {
      visibility = 'recommended_unlock';
    }

    return { ...pack, visibility };
  });
}
