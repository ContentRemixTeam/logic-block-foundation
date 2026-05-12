/**
 * Lightweight route prefetcher.
 * Maps a pathname to its lazy-import factory so hovering a sidebar link
 * starts downloading the chunk before the user clicks.
 *
 * Safe-by-design: silently no-ops on unknown paths or import failures.
 */

type Importer = () => Promise<unknown>;

const ROUTE_LOADERS: Record<string, Importer> = {
  "/dashboard": () => import("@/pages/Dashboard"),
  "/daily-plan": () => import("@/pages/DailyPlan"),
  "/weekly-plan": () => import("@/pages/WeeklyPlan"),
  "/focus": () => import("@/pages/Focus"),
  "/tasks": () => import("@/pages/Tasks"),
  "/all-tasks": () => import("@/pages/AllTasks"),
  "/projects": () => import("@/pages/Projects"),
  "/offers": () => import("@/pages/OfferHub"),
  "/editorial-calendar": () => import("@/pages/EditorialCalendar"),
  "/wizards": () => import("@/pages/Wizards"),
  "/brain-dump": () => import("@/pages/BrainDump"),
  "/open-loops": () => import("@/pages/OpenLoops"),
  "/notes": () => import("@/pages/Notes"),
  "/ideas": () => import("@/pages/Ideas"),
  "/wins": () => import("@/pages/Wins"),
  "/progress": () => import("@/pages/Progress"),
  "/courses": () => import("@/pages/Courses"),
  "/mindset": () => import("@/pages/Mindset"),
  "/planning": () => import("@/pages/Planning"),
  "/content-vault": () => import("@/pages/ContentVault"),
  "/sops": () => import("@/pages/SOPs"),
  "/habits": () => import("@/pages/Habits"),
  "/finances": () => import("@/pages/FinancialTracker"),
  "/settings": () => import("@/pages/Settings"),
  "/support": () => import("@/pages/Support"),
};

const prefetched = new Set<string>();

export function prefetchRoute(path: string) {
  if (prefetched.has(path)) return;
  const loader = ROUTE_LOADERS[path];
  if (!loader) return;
  prefetched.add(path);
  // Defer to idle time so it never competes with active navigation
  const run = () => {
    loader().catch(() => prefetched.delete(path));
  };
  if ("requestIdleCallback" in window) {
    (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(run);
  } else {
    setTimeout(run, 100);
  }
}
