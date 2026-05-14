export const MONEY_MOVES_COMMUNITY_URL =
  'https://portal.faithmariah.com/communities/groups/money-moves/home';

export const MONEY_MOVES_SCHEDULE = [
  { day: 'Day 1 — Find Your Money Move', date: 'Mon, May 25, 2026 · 5:00 PM ET' },
  { day: 'Day 2 — Make The Move Easier', date: 'Wed, May 27, 2026 · 5:00 PM ET' },
  { day: 'Day 3 — Turn It Into A Revenue Cycle', date: 'Fri, May 29, 2026 · 5:00 PM ET' },
];

export const MONEY_MOVES_YOUTUBE = 'https://www.youtube.com/@FaithMariah';
export const MONEY_MOVES_YOUTUBE_SUB =
  'https://www.youtube.com/@FaithMariah?sub_confirmation=1';
export const MONEY_MOVES_PORTAL = 'https://portal.faithmariah.com';
export const MASTERMIND_URL = 'https://mastermind.faithmariah.com/mastermind';

export const MONEY_MOVES_PRIZES_COPY =
  "During the sprint, we'll be celebrating action in the community. Post your tracker, share your actions, and report your wins for a chance at prizes like shop gift cards, special support opportunities, and other surprises.";

export type MoneyTrack = 'offer_foundation' | 'lead_gen' | 'nurture' | 'sell';

export const TRACK_LABELS: Record<MoneyTrack, string> = {
  offer_foundation: 'Offer Foundation',
  lead_gen: 'Lead Gen',
  nurture: 'Nurture',
  sell: 'Sell',
};
