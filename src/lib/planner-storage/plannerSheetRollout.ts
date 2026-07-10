/**
 * Planner Sheets rollout gate.
 *
 * INTENTIONALLY DISABLED: Google Sheets as the primary planner storage backend
 * is not shipped yet. Until it is officially launched, both helpers return
 * false so `SheetsPrimaryTaskService` can never accidentally activate for any
 * user (new or existing). Do not re-enable without an explicit launch decision.
 */

export function shouldRequirePlannerSheet(_userCreatedAt?: string): boolean {
  return false;
}

export function shouldPromptLegacyPlannerSheet(_userCreatedAt?: string): boolean {
  return false;
}
