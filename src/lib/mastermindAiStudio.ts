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
  installOutputs: string[];
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
    installOutputs: ['Custom GPT/Claude project instructions', 'business profile', 'weekly check-in prompt', 'decision rules'],
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
    installOutputs: ['offer critique instructions', 'validation interview guide', 'offer one-liner worksheet', 'proof tracker prompt'],
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
    installOutputs: ['discovery lane selector', 'content prompt library', 'outreach prompt', 'qualified signal tracker'],
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
    installOutputs: ['belief map', 'email draft prompt', 'story prompt', 'reply analysis prompt'],
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
    installOutputs: ['sales invitation prompt', 'sales page critique', 'follow-up sequence prompt', 'sales debrief template'],
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
    installOutputs: ['first-win map', 'onboarding prompt', 'check-in prompt', 'proof capture script'],
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
    installOutputs: ['SOP interview', 'workflow simplifier', 'AI assistant instructions', 'Zapier/n8n readiness checklist'],
    firstTest: 'Ask it to turn one messy repeated workflow into a first-draft SOP with a review checklist.',
    access: 'monthly_unlockable',
    status: 'planned',
  },
];

export function getAiStudioAccessSummary(memberTier: string | null | undefined, isMastermind: boolean): AiStudioAccessSummary {
  const normalizedTier = memberTier?.toLowerCase() ?? '';
  const canSeeFullLibrary = ['annual', 'lifetime', 'mastermind_annual', 'mastermind_lifetime', 'admin'].some((tier) =>
    normalizedTier.includes(tier)
  );

  if (canSeeFullLibrary) {
    return {
      tierLabel: 'Annual / lifetime',
      canUsePlannerPack: true,
      canUnlockMonthlyPack: true,
      canSeeFullLibrary: true,
      monthlyUnlockCopy: 'Full approved AI workspace library available when the access record identifies annual or lifetime membership.',
    };
  }

  if (isMastermind) {
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
