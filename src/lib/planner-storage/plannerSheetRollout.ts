const DEFAULT_REQUIRED_AFTER = '2026-06-19T00:00:00.000Z';

function getRequiredAfterTimestamp(): number | null {
  const requiredAfter = import.meta.env.VITE_PLANNER_SHEETS_REQUIRED_AFTER || DEFAULT_REQUIRED_AFTER;
  const cutoff = Date.parse(requiredAfter);
  return Number.isNaN(cutoff) ? null : cutoff;
}

function getUserCreatedTimestamp(userCreatedAt?: string): number | null {
  if (!userCreatedAt) return null;

  const createdAt = Date.parse(userCreatedAt);
  return Number.isNaN(createdAt) ? null : createdAt;
}

export function shouldRequirePlannerSheet(userCreatedAt?: string): boolean {
  if (import.meta.env.VITE_REQUIRE_PLANNER_SHEETS_FOR_NEW_USERS === 'false') {
    return false;
  }

  const cutoff = getRequiredAfterTimestamp();
  const createdAt = getUserCreatedTimestamp(userCreatedAt);

  if (cutoff === null || createdAt === null) return false;
  return createdAt >= cutoff;
}

export function shouldPromptLegacyPlannerSheet(userCreatedAt?: string): boolean {
  if (import.meta.env.VITE_SHOW_LEGACY_PLANNER_SHEET_PROMPT === 'false') {
    return false;
  }

  const cutoff = getRequiredAfterTimestamp();
  const createdAt = getUserCreatedTimestamp(userCreatedAt);

  if (cutoff === null || createdAt === null) return false;
  return createdAt < cutoff;
}
