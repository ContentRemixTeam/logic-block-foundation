// Wizard Integration Registry
// Central configuration defining what each wizard creates and where it integrates

export interface WizardIntegrationConfig {
  templateName: string;
  displayName: string;
  creates: {
    table: string;
    type: 'record' | 'project' | 'tasks' | 'content_items';
  }[];
  integratesWith: {
    dashboard?: boolean;
    dailyPlan?: boolean;
    weeklyPlan?: boolean;
    monthlyReview?: boolean;
    editorialCalendar?: boolean;
    taskList?: boolean;
  };
  activeHook?: string; // Name of the React Query hook
  phaseTracking?: boolean;
  phases?: string[]; // Phase names for tracking
}

export const WIZARD_INTEGRATIONS: WizardIntegrationConfig[] = [
  {
    templateName: 'cycle-90-day-wizard',
    displayName: '90-Day Cycle',
    creates: [{ table: 'cycles_90_day', type: 'record' }],
    integratesWith: {
      dashboard: true,
      dailyPlan: true,
      weeklyPlan: true,
      monthlyReview: true,
    },
    activeHook: 'useActiveCycle',
    phaseTracking: true,
    phases: ['Week 1-4', 'Week 5-8', 'Week 9-13'],
  },
  {
    templateName: 'launch-planner-v2',
    displayName: 'Launch Planner',
    creates: [
      { table: 'projects', type: 'project' },
      { table: 'launches', type: 'record' },
      { table: 'tasks', type: 'tasks' },
      { table: 'content_items', type: 'content_items' },
    ],
    integratesWith: {
      dashboard: true,
      dailyPlan: true,
      weeklyPlan: true,
      monthlyReview: true,
      editorialCalendar: true,
      taskList: true,
    },
    activeHook: 'useActiveLaunches',
    phaseTracking: true,
    phases: ['Runway', 'Pre-Launch', 'Cart Open', 'Post-Launch'],
  },
  {
    templateName: 'summit-planner',
    displayName: 'Summit Planner',
    creates: [
      { table: 'projects', type: 'project' },
      { table: 'summits', type: 'record' },
      { table: 'tasks', type: 'tasks' },
      { table: 'content_items', type: 'content_items' },
    ],
    integratesWith: {
      dashboard: true,
      dailyPlan: true,
      weeklyPlan: true,
      monthlyReview: true,
      editorialCalendar: true,
      taskList: true,
    },
    activeHook: 'useActiveSummits',
    phaseTracking: true,
    phases: ['Speaker Recruitment', 'Content Creation', 'Promotion', 'Live', 'Post-Summit'],
  },
  {
    templateName: 'money_momentum',
    displayName: 'Money Momentum Sprint',
    creates: [
      { table: 'revenue_sprints', type: 'record' },
      { table: 'tasks', type: 'tasks' },
    ],
    integratesWith: {
      dashboard: true,
      dailyPlan: true,
      weeklyPlan: true,
      monthlyReview: true,
    },
    activeHook: 'useActiveSprint',
    phaseTracking: false,
  },
  {
    templateName: 'content-planner',
    displayName: 'Content Planner',
    creates: [
      { table: 'content_items', type: 'content_items' },
      { table: 'content_plan_items', type: 'content_items' },
      { table: 'tasks', type: 'tasks' },
    ],
    integratesWith: {
      editorialCalendar: true,
      taskList: true,
    },
    phaseTracking: false,
  },
];

/**
 * Get wizard configuration by template name
 */
export function getWizardConfig(templateName: string): WizardIntegrationConfig | undefined {
  return WIZARD_INTEGRATIONS.find(w => w.templateName === templateName);
}

/**
 * Get all wizards that integrate with a specific feature
 */
export function getWizardsIntegratingWith(
  feature: keyof WizardIntegrationConfig['integratesWith']
): WizardIntegrationConfig[] {
  return WIZARD_INTEGRATIONS.filter(w => w.integratesWith[feature]);
}

/**
 * Check if a wizard creates content items (for Editorial Calendar)
 */
export function wizardCreatesContent(templateName: string): boolean {
  const config = getWizardConfig(templateName);
  return config?.creates.some(c => c.type === 'content_items') ?? false;
}

/**
 * Check if a wizard has phase tracking
 */
export function wizardHasPhaseTracking(templateName: string): boolean {
  return getWizardConfig(templateName)?.phaseTracking ?? false;
}
