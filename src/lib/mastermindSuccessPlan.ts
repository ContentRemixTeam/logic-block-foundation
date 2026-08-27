export type SuccessPathStageId = 'offer' | 'find' | 'nurture' | 'sell' | 'deliver' | 'leverage';

export interface SuccessPathStage {
  id: SuccessPathStageId;
  label: string;
  shortLabel: string;
  promise: string;
  nextMoneyMove: string;
  messyActionSprint: string;
  askFaithPrompt: string;
}

export interface SuccessPlanCycleInput {
  goal?: string | null;
  focus_area?: string | null;
  biggest_bottleneck?: string | null;
  revenue_goal?: number | null;
}

export const SUCCESS_PATH_STAGES: Record<SuccessPathStageId, SuccessPathStage> = {
  offer: {
    id: 'offer',
    label: 'Clarify the offer',
    shortLabel: 'Offer',
    promise: 'Make the paid result, buyer, price, and simple delivery path obvious.',
    nextMoneyMove: 'Write the offer in one sentence, name the exact buyer, and send it to one real prospect for feedback or a sale.',
    messyActionSprint: 'Spend 45 minutes tightening the promise, proof, price, and next step. Then publish or DM the offer before polishing.',
    askFaithPrompt: 'Is my offer clear enough to sell this week, or am I hiding behind more planning?',
  },
  find: {
    id: 'find',
    label: 'Find the right people',
    shortLabel: 'Find',
    promise: 'Create consistent visibility with buyers who actually want the result.',
    nextMoneyMove: 'Pick one primary visibility channel and start ten qualified conversations before building more content.',
    messyActionSprint: 'List 25 right-fit people or places, send 10 useful reach-outs, and track replies in the planner.',
    askFaithPrompt: 'Where are my best buyers easiest to reach, and what should I say first?',
  },
  nurture: {
    id: 'nurture',
    label: 'Build trust',
    shortLabel: 'Nurture',
    promise: 'Turn attention into belief, demand, and readiness to buy.',
    nextMoneyMove: 'Create one proof-based nurture asset that handles the objection blocking the next sale.',
    messyActionSprint: 'Choose one objection, write three proof points, and send/publish the strongest version today.',
    askFaithPrompt: 'What belief does my audience need before the sale feels obvious?',
  },
  sell: {
    id: 'sell',
    label: 'Sell and follow up',
    shortLabel: 'Sell',
    promise: 'Make clear invitations, follow up, and convert demand into cash.',
    nextMoneyMove: 'Make a direct offer to the warmest people in your world and follow up with every open conversation.',
    messyActionSprint: 'Send 5 direct invitations, follow up with 5 warm leads, and book or close the next sales step.',
    askFaithPrompt: 'What is the most direct sales action I am avoiding right now?',
  },
  deliver: {
    id: 'deliver',
    label: 'Deliver repeatable results',
    shortLabel: 'Deliver',
    promise: 'Help clients get the promised result without reinventing delivery every time.',
    nextMoneyMove: 'Define the client win condition and fix the one delivery gap that creates the most friction.',
    messyActionSprint: 'Map the first client milestone, write the checklist, and improve one active client touchpoint.',
    askFaithPrompt: 'What part of my delivery is making results harder than they need to be?',
  },
  leverage: {
    id: 'leverage',
    label: 'Leverage the business',
    shortLabel: 'Leverage',
    promise: 'Simplify, systemize, automate, or delegate only what is already proven.',
    nextMoneyMove: 'Remove or systemize one repeatable task that is stealing time from sales and delivery.',
    messyActionSprint: 'Record the process once, turn it into a checklist, and automate or hand off the smallest repeatable piece.',
    askFaithPrompt: 'What should I simplify before I try to scale it?',
  },
};

const STAGE_KEYWORDS: Array<{ stage: SuccessPathStageId; terms: string[] }> = [
  { stage: 'leverage', terms: ['automate', 'automation', 'delegate', 'delegation', 'systems', 'scale', 'operations', 'team', 'capacity', 'time'] },
  { stage: 'deliver', terms: ['delivery', 'client', 'clients', 'fulfillment', 'retention', 'results', 'onboarding', 'experience'] },
  { stage: 'offer', terms: ['offer', 'positioning', 'pricing', 'package', 'niche', 'message', 'clarity', 'sell what'] },
  { stage: 'find', terms: ['discover', 'visibility', 'traffic', 'lead', 'leads', 'audience', 'find', 'reach', 'growth'] },
  { stage: 'nurture', terms: ['nurture', 'trust', 'content', 'email', 'belief', 'relationship', 'proof', 'warm'] },
  { stage: 'sell', terms: ['convert', 'conversion', 'sell', 'sales', 'close', 'closing', 'follow up', 'proposal', 'launch'] },
];

function scoreStage(text: string, stage: SuccessPathStageId) {
  const terms = STAGE_KEYWORDS.find((entry) => entry.stage === stage)?.terms || [];
  return terms.reduce((score, term) => (text.includes(term) ? score + 1 : score), 0);
}

export function inferSuccessPathStage(cycle: SuccessPlanCycleInput | null | undefined): SuccessPathStage {
  if (!cycle) return SUCCESS_PATH_STAGES.offer;

  const text = [cycle.focus_area, cycle.biggest_bottleneck, cycle.goal]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!text.trim()) return SUCCESS_PATH_STAGES.sell;

  const scored = (Object.keys(SUCCESS_PATH_STAGES) as SuccessPathStageId[])
    .map((stage) => ({ stage, score: scoreStage(text, stage) }))
    .sort((a, b) => b.score - a.score);

  if (scored[0]?.score > 0) return SUCCESS_PATH_STAGES[scored[0].stage];
  return SUCCESS_PATH_STAGES.sell;
}
