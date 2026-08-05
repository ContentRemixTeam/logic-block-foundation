export const LOW_BATTERY_TEMPLATE_NAME = 'low-battery-business-plan';
export const LOW_BATTERY_STORAGE_KEY = 'low-battery-business-plan-v1';
export const LOW_BATTERY_TOTAL_STEPS = 7;

export interface LowBatteryPlanData {
  step1: {
    breaksFirst: string[];
    breaksFirstOther: string;
    dependsOn: string;
  };
  step2: {
    offer: string;
    buyer: string;
    outcome: string;
    salesMethod: string;
    salesMethodOther: string;
  };
  step3: {
    channel: string;
    channelOther: string;
    smallestAction: string;
  };
  step4: {
    nurture: string;
    nurtureOther: string;
    shortestVersion: string;
    reachesDecision: '' | 'yes' | 'not_yet';
    missingConnection: string;
  };
  step5: {
    avoidance: string[];
    avoidanceOther: string;
    notResponsibleFor: string;
    favoriteAvoidance: string;
    parkIdeasIn: string;
    reviewParkingLotOn: string;
  };
  step6: {
    findRegular: string;
    findLow: string;
    nurtureRegular: string;
    nurtureLow: string;
    sellRegular: string;
    sellLow: string;
    recoveryRule: string;
  };
  step7: {
    avoidedAction: string;
    thought: string;
    feeling: string;
    insteadI: string;
    usefulBelief: string;
    commitmentDate: string;
    moneyMove: string;
    lowBatteryMoneyMove: string;
  };
}

export const emptyLowBatteryPlan: LowBatteryPlanData = {
  step1: { breaksFirst: [], breaksFirstOther: '', dependsOn: '' },
  step2: { offer: '', buyer: '', outcome: '', salesMethod: '', salesMethodOther: '' },
  step3: { channel: '', channelOther: '', smallestAction: '' },
  step4: { nurture: '', nurtureOther: '', shortestVersion: '', reachesDecision: '', missingConnection: '' },
  step5: {
    avoidance: [],
    avoidanceOther: '',
    notResponsibleFor: '',
    favoriteAvoidance: '',
    parkIdeasIn: '',
    reviewParkingLotOn: '',
  },
  step6: {
    findRegular: '',
    findLow: '',
    nurtureRegular: '',
    nurtureLow: '',
    sellRegular: '',
    sellLow: '',
    recoveryRule: '',
  },
  step7: {
    avoidedAction: '',
    thought: '',
    feeling: '',
    insteadI: '',
    usefulBelief: '',
    commitmentDate: '',
    moneyMove: '',
    lowBatteryMoneyMove: '',
  },
};

export const STEP_TITLES: string[] = [
  'The Full-Battery Dependency',
  'ONE Offer + ONE Way to Sell It',
  'ONE Way People Find You',
  'ONE Nurture Rhythm',
  'What Comes Off the Plan',
  'Build the Battery Floor',
  'The Thought + Next Money Move',
];

export const BREAKS_FIRST_OPTIONS = [
  'Content',
  'Email/nurture',
  'Selling',
  'Client delivery',
  'Planning',
  'All of it',
  'Other',
];

export const SALES_METHOD_OPTIONS = [
  'Live workshop/webinar',
  'Short email promotion',
  'Weekly direct invitations',
  'Sales/consult calls',
  'Evergreen sequence',
  'Personal follow-up',
  'Other',
];

export const CHANNEL_OPTIONS = [
  'Searchable long-form content',
  'Short-form video',
  'Collaborations, bundles, or referrals',
  'Speaking and live workshops',
  'Paid ads',
  'Direct outreach',
  'Other',
];

export const NURTURE_OPTIONS = [
  'One useful weekly email',
  'One podcast/video that becomes the email',
  'A short email plus reused existing content',
  'A recurring live touchpoint',
  'Other',
];

export const AVOIDANCE_OPTIONS = [
  'Rebuilding the website',
  'Designing a new freebie',
  'Starting a new platform',
  'Creating another offer',
  'Tweaking the branding',
  'Consuming more training',
  'Planning content that points nowhere',
  'Automating an unproven process',
  'Other',
];

export const THOUGHT_SUGGESTIONS = [
  'The right buyer cannot decide about an offer I keep hiding.',
  'This does not need to become a whole dramatic project.',
  'The offer does not need to be impressive. It needs to be clear.',
  'Facts are our friends.',
  'I can be disappointed and still be the business owner.',
  'I do not need to feel confident to complete one clear sales action.',
  'My brain can chatter after I send it.',
];

export const DEFAULT_RECOVERY_RULE =
  'Return to the offer and complete one buyer-facing money move.';

/** Resolve a "single choice plus custom" pair into one display value. */
export function resolveChoice(choice: string, other: string): string {
  if (!choice) return '';
  return choice === 'Other' ? other.trim() : choice;
}

/** A low-battery action should still touch a buyer, lead, or the offer. */
const BUYER_FACING_HINTS = [
  'buyer',
  'lead',
  'offer',
  'client',
  'customer',
  'sale',
  'sell',
  'sold',
  'email',
  'invite',
  'invitation',
  'dm',
  'message',
  'follow up',
  'follow-up',
  'pitch',
  'call',
  'reply',
  'post',
  'clip',
  'reach out',
  'outreach',
  'people',
  'audience',
  'list',
  'subscriber',
];

export function looksBuyerFacing(text: string): boolean {
  const value = text.trim().toLowerCase();
  if (!value) return true; // empty is not a warning, it's just unfinished
  return BUYER_FACING_HINTS.some((hint) => value.includes(hint));
}

export function buildThreeOnes(data: LowBatteryPlanData) {
  return {
    visibility: resolveChoice(data.step3.channel, data.step3.channelOther),
    nurture: resolveChoice(data.step4.nurture, data.step4.nurtureOther),
    offer: data.step2.offer.trim(),
    buyer: data.step2.buyer.trim(),
    outcome: data.step2.outcome.trim(),
    salesMethod: resolveChoice(data.step2.salesMethod, data.step2.salesMethodOther),
  };
}
