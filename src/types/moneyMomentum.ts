// Money Momentum Sprint Types

export interface Offer {
  name: string;
  price: number;
}

export interface BrainstormedIdea {
  type: 'all_access' | 'vip_tier' | 'intensive' | 'past_client_bonus' | 'flash_sale' | 'payment_plan' | 'custom';
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
  canCutExpenses: boolean | null; // true = will check, false = already lean, null = unanswered
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
  projectPriceMin: number | null; // for custom-project type
  projectPriceMax: number | null;
  projectCapacity: number | null; // how many projects this month
  quickOfferIdea: string; // for figuring-out type
  
  hasPastCustomers: boolean | null; // true = has relevant ones, false = new/pivoting
  pastCustomersCount: number;
  pastCustomersComfortable: number;
  pastCustomersOfferType: string;
  pastCustomersDetails: string;
  
  hasWarmLeads: boolean | null; // true = has some, false = none right now
  warmLeadsSources: string[];
  warmLeadsOther: string;
  warmLeadsCount: number;
  fastestSale: string;
  
  // Step 4: Revenue Actions
  hasRunFlashSale: boolean | null; // for conditional flash sale section
  brainstormedIdeas: BrainstormedIdea[];
  selectedActions: SelectedAction[];
  realityCheckDoable: 'doable' | 'stretch' | 'too-much' | null;
  
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
  workingDays: number[]; // 0-6 for Sun-Sat
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
  
  // Step 4
  hasRunFlashSale: null,
  brainstormedIdeas: [],
  selectedActions: [],
  realityCheckDoable: null,
  
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
  workingDays: [1, 2, 3, 4, 5], // Mon-Fri
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
  { number: 4, title: 'Revenue Actions' },
  { number: 5, title: "What's Stopping You" },
  { number: 6, title: 'Sprint Schedule' },
  { number: 7, title: 'Commit' },
];

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
