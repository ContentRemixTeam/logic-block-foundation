/**
 * Groups the flat category list returned by the library endpoint into a few
 * member-friendly sections so the browse control is a short set of quick picks
 * plus one grouped dropdown instead of a wall of chips.
 *
 * Pure and dependency-free so it can be unit-tested and reused by the search UI.
 */

export const CATEGORY_GROUP_ORDER = [
  'Coaching calls by year',
  'Ask Faith & lives',
  'Workshops & bonuses',
  'Programs & sprints',
  'Topics',
];

const YEAR = /^coaching calls (\d{4})$/i;
const ASK_FAITH = /^(ask faith|facebook lives)$/i;
const WORKSHOPS = /^(guest workshops & co-coaching|bonus workshops from faith|behind the scenes bonuses|mental health resources)$/i;
const PROGRAMS = /^(program upgrade|reignite|big dream incubator|total biz makeover|launch aligned|get visible again|sell without spiraling|make money this week|fix my offer|build your 90-day plan)$/i;

export function categoryGroup(name) {
  const value = String(name ?? '').trim();
  if (YEAR.test(value)) return 'Coaching calls by year';
  if (ASK_FAITH.test(value)) return 'Ask Faith & lives';
  if (WORKSHOPS.test(value)) return 'Workshops & bonuses';
  if (PROGRAMS.test(value)) return 'Programs & sprints';
  return 'Topics';
}

/**
 * @param {{category:string,resourceCount:number}[]} categories
 * @returns {{group:string,items:{category:string,resourceCount:number}[]}[]}
 */
export function groupCategories(categories) {
  const buckets = new Map(CATEGORY_GROUP_ORDER.map((g) => [g, []]));
  for (const c of categories ?? []) {
    if (!c || typeof c.category !== 'string' || !c.category.trim()) continue;
    buckets.get(categoryGroup(c.category)).push(c);
  }
  for (const [group, items] of buckets) {
    if (group === 'Coaching calls by year') {
      items.sort((a, b) => Number(b.category.match(YEAR)?.[1] ?? 0) - Number(a.category.match(YEAR)?.[1] ?? 0));
    } else {
      items.sort((a, b) => b.resourceCount - a.resourceCount || a.category.localeCompare(b.category));
    }
  }
  return CATEGORY_GROUP_ORDER.map((group) => ({ group, items: buckets.get(group) })).filter((g) => g.items.length > 0);
}

/**
 * The handful of categories worth a one-tap button. Anything else lives in the dropdown.
 * Returns categories in display order, only those that exist in the supplied list.
 */
export function quickPickCategories(categories) {
  const byName = new Map((categories ?? []).map((c) => [c.category.toLowerCase(), c]));
  const newestYear = (categories ?? [])
    .filter((c) => YEAR.test(c.category))
    .sort((a, b) => Number(b.category.match(YEAR)[1]) - Number(a.category.match(YEAR)[1]))[0];
  const picks = [];
  if (newestYear) picks.push(newestYear);
  for (const name of ['ask faith', 'guest workshops & co-coaching', 'bonus workshops from faith']) {
    const hit = byName.get(name);
    if (hit) picks.push(hit);
  }
  return picks;
}
