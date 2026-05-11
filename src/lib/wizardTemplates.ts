// Canonical wizard template names + alias map.
// All wizards should import these constants so completions, drafts, and the
// Wizard Hub history all line up under one identity per wizard.

export const WIZARD_TEMPLATES = {
  CYCLE_90_DAY: 'cycle-90-day-wizard',
  CYCLE_SETUP_QUICK: 'cycle-90-day', // legacy / quick-cycle template
  LAUNCH_PLANNER: 'launch-planner',
  LAUNCH_PLANNER_V2: 'launch-planner-v2',
  HABIT_PLANNER: 'habit-planner',
  CONTENT_PLANNER: 'content-planner',
  CONTENT_CHALLENGE: 'content-challenge-30-days',
  SUMMIT_PLANNER: 'summit-planner',
  MONEY_MOMENTUM: 'money_momentum',
  PROJECT_DESIGNER: 'project-designer',
  LEAD_MAGNET: 'lead-magnet-wizard',
  FLASH_SALE: 'flash-sale-wizard',
  WEBINAR: 'webinar-wizard',
  ENGINE_BUILDER: 'business-engine-builder',
} as const;

// Aliases: completions saved under either name should be treated as the
// same wizard for hub history + last-completion lookups.
export const TEMPLATE_ALIASES: Record<string, string> = {
  [WIZARD_TEMPLATES.LAUNCH_PLANNER_V2]: WIZARD_TEMPLATES.LAUNCH_PLANNER,
  [WIZARD_TEMPLATES.CYCLE_SETUP_QUICK]: WIZARD_TEMPLATES.CYCLE_90_DAY,
};

export function canonicalTemplateName(name: string): string {
  return TEMPLATE_ALIASES[name] ?? name;
}

// Route a created wizard record to the right detail page.
export function viewLastRouteFor(completion: {
  template_name: string;
  created_cycle_id?: string | null;
  created_project_id?: string | null;
  created_launch_id?: string | null;
  created_summit_id?: string | null;
}): string | null {
  const t = canonicalTemplateName(completion.template_name);
  if (completion.created_cycle_id) return `/cycle-view/${completion.created_cycle_id}`;
  if (completion.created_launch_id) return `/launches/${completion.created_launch_id}`;
  if (completion.created_summit_id) return `/summits/${completion.created_summit_id}`;
  if (completion.created_project_id) return `/projects?board=${completion.created_project_id}`;
  // Fallbacks per wizard
  if (t === WIZARD_TEMPLATES.HABIT_PLANNER) return '/habits';
  if (t === WIZARD_TEMPLATES.CONTENT_PLANNER || t === WIZARD_TEMPLATES.CONTENT_CHALLENGE)
    return '/editorial-calendar';
  if (t === WIZARD_TEMPLATES.MONEY_MOMENTUM) return '/financial-tracker';
  if (t === WIZARD_TEMPLATES.PROJECT_DESIGNER) return '/projects';
  return null;
}
