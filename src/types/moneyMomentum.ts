// Money Momentum Sprint Types

export interface Offer {
  name: string;
  price: number;
}

// Fast Cash Picker types
export type BuyerType = 'past-clients' | 'past-students' | 'email-list' | 'cold-audience';
export type CashSpeed = '24-48-hours' | 'within-7-days' | 'within-30-days';
export type ReadyAsset = 'recordings' | 'templates' | 'expertise-only' | 'active-clients' | 'nothing-built';
export type WeeklyCapacity = '2-hours' | '5-hours' | '10-plus-hours';
export type SellingComfort = 'very-comfortable' | 'somewhat-comfortable' | 'not-comfortable';
export type RecommendedLane = 'service_cash' | 'audience_cash' | 'community_cash' | 'mixed';

// Expanded brainstorm types to include new ideas
export type BrainstormIdeaType = 
  | 'all_access' | 'vip_tier' | 'intensive' | 'past_client_bonus' 
  | 'flash_sale' | 'payment_plan' | 'custom' | 'direct_outreach'
  // New types
  | 'productized_service' | 'implementation_pod' | 'offer_clinic_live'
  | 'back_pocket_offer' | 're_activation_drive' | 'founding_member_drive';

export interface BrainstormedIdea {
  type: BrainstormIdeaType;
  data: Record<string, unknown>;
}

export interface SelectedAction {
  id: string;
  action: string;
  details: string;
  why: string;
  timePerDay: '15min' | '30min' | '1hour' | '2hours';
  expectedRevenue?: number;
  fromBrainstorm?: boolean;
  brainstormType?: string;
}

// Offer scoring types
export interface OfferScore {
  ideaId: string;
  ideaType: BrainstormIdeaType;
  ideaName: string;
  speedToLaunch: number; // 1-5
  timeToFulfill: number; // 1-5
  audienceFit: number; // 1-5
  cashPotential: number; // 1-5
  confidence: number; // 1-5
  totalScore: number; // calculated
}

// Script types
export interface GeneratedScript {
  type: 'social' | 'dm' | 'email' | 'sales_page' | 'followup';
  content: string;
  variables: Record<string, string>;
}

export interface MoneyMomentumData {
  // Step 1: The Numbers
  currentRevenue: number | null;
  revenueGoal: number | null;
  targetMonth: 'current' | 'next';
  daysInSprint: number;
  gapToClose: number;
  dailyTarget: number;
  realityCheckAnswer: 'yes' | 'no-going-for-it' | 'maybe-adjust' | null;
  adjustedGoal: number | null;
  
  // Step 2: Reality Check
  canCutExpenses: boolean | null;
  expenseCuts: {
    unusedSoftware: boolean;
    marketingTools: boolean;
    diyServices: boolean;
    memberships: boolean;
    other: boolean;
  };
  estimatedSavings: number;
  survivalMode: boolean | null;
  
  // Step 3: What You Already Have
  offerType: 'defined' | 'custom-project' | 'figuring-out' | null;
  currentOffers: Offer[];
  projectPriceMin: number | null;
  projectPriceMax: number | null;
  projectCapacity: number | null;
  quickOfferIdea: string;
  
  hasPastCustomers: boolean | null;
  pastCustomersCount: number;
  pastCustomersComfortable: number;
  pastCustomersOfferType: string;
  pastCustomersDetails: string;
  
  hasWarmLeads: boolean | null;
  warmLeadsSources: string[];
  warmLeadsOther: string;
  warmLeadsCount: number;
  fastestSale: string;
  
  // Step 4A: Fast Cash Picker (NEW)
  hasExistingBuyers: BuyerType | null;
  cashSpeed: CashSpeed | null;
  readyAssets: ReadyAsset[];
  weeklyCapacity: WeeklyCapacity | null;
  sellingComfort: SellingComfort | null;
  recommendedLane: RecommendedLane | null;
  showAllIdeas: boolean; // true if user clicked "Show All Ideas"
  
  // Step 4B: Revenue Actions (Brainstorming)
  hasRunFlashSale: boolean | null;
  brainstormedIdeas: BrainstormedIdea[];
  selectedActions: SelectedAction[];
  realityCheckDoable: 'doable' | 'stretch' | 'too-much' | null;
  
  // Step 4C: Offer Scoring (NEW)
  offerScores: OfferScore[];
  primaryOfferId: string | null;
  backupOfferId: string | null;
  offerSelectionMode: 'primary-only' | 'primary-backup' | 'different' | null;
  
  // Step 4D: Script Generation (NEW)
  generatedScripts: GeneratedScript[];
  scriptsGenerated: boolean;
  
  // Step 5: What's Stopping You (CTFAR-inspired)
  blockingThought: string;
  blockingFeeling: string;
  blockingAction: string;
  blockingResult: string;
  newThought: string;
  counterEvidence: string;
  
  // Step 6: Sprint Schedule
  sprintStartDate: string;
  sprintEndDate: string;
  workingDays: number[];
  dailyTime: string;
  dailyDuration: string;
  
  // Step 7: Commitment
  accountabilityPartner: string;
  accountabilityMethod: string;
  commitmentOptions: string[];
  consequences: string;
  
  // Index signature for useWizard compatibility
  [key: string]: unknown;
}

export const DEFAULT_MONEY_MOMENTUM_DATA: MoneyMomentumData = {
  // Step 1
  currentRevenue: null,
  revenueGoal: null,
  targetMonth: 'current',
  daysInSprint: 14,
  gapToClose: 0,
  dailyTarget: 0,
  realityCheckAnswer: null,
  adjustedGoal: null,
  
  // Step 2
  canCutExpenses: null,
  expenseCuts: {
    unusedSoftware: false,
    marketingTools: false,
    diyServices: false,
    memberships: false,
    other: false,
  },
  estimatedSavings: 0,
  survivalMode: null,
  
  // Step 3
  offerType: null,
  currentOffers: [],
  projectPriceMin: null,
  projectPriceMax: null,
  projectCapacity: null,
  quickOfferIdea: '',
  
  hasPastCustomers: null,
  pastCustomersCount: 0,
  pastCustomersComfortable: 0,
  pastCustomersOfferType: '',
  pastCustomersDetails: '',
  
  hasWarmLeads: null,
  warmLeadsSources: [],
  warmLeadsOther: '',
  warmLeadsCount: 0,
  fastestSale: '',
  
  // Step 4A: Fast Cash Picker
  hasExistingBuyers: null,
  cashSpeed: null,
  readyAssets: [],
  weeklyCapacity: null,
  sellingComfort: null,
  recommendedLane: null,
  showAllIdeas: false,
  
  // Step 4B: Revenue Actions
  hasRunFlashSale: null,
  brainstormedIdeas: [],
  selectedActions: [],
  realityCheckDoable: null,
  
  // Step 4C: Offer Scoring
  offerScores: [],
  primaryOfferId: null,
  backupOfferId: null,
  offerSelectionMode: null,
  
  // Step 4D: Script Generation
  generatedScripts: [],
  scriptsGenerated: false,
  
  // Step 5
  blockingThought: '',
  blockingFeeling: '',
  blockingAction: '',
  blockingResult: '',
  newThought: '',
  counterEvidence: '',
  
  // Step 6
  sprintStartDate: '',
  sprintEndDate: '',
  workingDays: [1, 2, 3, 4, 5],
  dailyTime: '09:00',
  dailyDuration: '2 hours',
  
  // Step 7
  accountabilityPartner: '',
  accountabilityMethod: '',
  commitmentOptions: [],
  consequences: '',
};

export const MONEY_MOMENTUM_STEPS = [
  { number: 1, title: 'The Numbers' },
  { number: 2, title: 'Reality Check' },
  { number: 3, title: 'What You Already Have' },
  { number: 4, title: 'Fast Cash Picker' },
  { number: 5, title: 'Revenue Ideas' },
  { number: 6, title: 'Score Your Offers' },
  { number: 7, title: 'Your Scripts' },
  { number: 8, title: "What's Stopping You" },
  { number: 9, title: 'Sprint Schedule' },
  { number: 10, title: 'Commit' },
];

// Lane definitions for Fast Cash Picker routing
export const LANE_DEFINITIONS = {
  service_cash: {
    name: 'SERVICE OFFERS',
    description: 'You have past clients and need cash fast.',
    focus: 'VIP Days, Audits, Productized Services, Session Add-ons',
    ideas: ['intensive', 'productized_service', 'past_client_bonus', 'back_pocket_offer'],
  },
  audience_cash: {
    name: 'AUDIENCE OFFERS',
    description: 'You have an audience and content ready.',
    focus: 'Content bundles, relaunches, flash sales, upsells',
    ideas: ['all_access', 'flash_sale', 'vip_tier', 're_activation_drive', 'back_pocket_offer'],
  },
  community_cash: {
    name: 'COMMUNITY/GROUP OFFERS',
    description: 'You love live selling and have the time.',
    focus: 'Group programs, office hours, implementation, founding members',
    ideas: ['implementation_pod', 'offer_clinic_live', 'founding_member_drive', 'back_pocket_offer'],
  },
  mixed: {
    name: 'MIXED APPROACH',
    description: 'A combination of strategies based on your situation.',
    focus: 'Flexible options across multiple lanes',
    ideas: [] as string[], // Will be calculated dynamically
  },
};

// Score badge helpers
export function getScoreBadge(score: number): { label: string; color: string; emoji: string } {
  if (score >= 20) return { label: 'HIGH FIT', color: 'bg-green-500', emoji: '🟢' };
  if (score >= 15) return { label: 'MEDIUM FIT', color: 'bg-yellow-500', emoji: '🟡' };
  if (score >= 10) return { label: 'LOW FIT', color: 'bg-orange-500', emoji: '🟠' };
  return { label: 'SKIP THIS', color: 'bg-red-500', emoji: '🔴' };
}

// Helper to calculate recommended lane based on Fast Cash Picker answers
export function calculateRecommendedLane(data: MoneyMomentumData): RecommendedLane {
  const { hasExistingBuyers, cashSpeed, readyAssets, weeklyCapacity, sellingComfort } = data;
  
  // Lane A: Service Cash - Past clients + fast cash need
  if (hasExistingBuyers === 'past-clients' && cashSpeed === '24-48-hours') {
    return 'service_cash';
  }
  
  // Lane B: Audience Cash - Past students/email list + recordings ready
  if (
    (hasExistingBuyers === 'past-students' || hasExistingBuyers === 'email-list') &&
    readyAssets.includes('recordings')
  ) {
    return 'audience_cash';
  }
  
  // Lane C: Community Cash - Very comfortable selling + lots of time
  if (sellingComfort === 'very-comfortable' && weeklyCapacity === '10-plus-hours') {
    return 'community_cash';
  }
  
  return 'mixed';
}

// Helper to calculate days remaining in current month
export function getDaysRemainingInMonth(): number {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return Math.max(1, Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

// Helper to format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Helper to calculate percentage increase
export function calculatePercentageIncrease(current: number, goal: number): number {
  if (current <= 0) return goal > 0 ? 100 : 0;
  return Math.round(((goal - current) / current) * 100);
}

// Idea display names for scoring/scripts
export const IDEA_DISPLAY_NAMES: Record<BrainstormIdeaType, string> = {
  all_access: 'All-Access Bundle',
  vip_tier: 'VIP Tier Upgrade',
  intensive: 'Quick Intensive',
  past_client_bonus: 'Past Client Bonus',
  flash_sale: 'Flash Sale Replay',
  payment_plan: 'Payment Plan Option',
  custom: 'Custom Idea',
  direct_outreach: 'Direct Outreach',
  productized_service: 'Productized Service',
  implementation_pod: 'Implementation Pod',
  offer_clinic_live: 'Offer Clinic Live',
  back_pocket_offer: 'Back Pocket Offer',
  re_activation_drive: 'Re-Activation Drive',
  founding_member_drive: 'Founding Member Drive',
};
