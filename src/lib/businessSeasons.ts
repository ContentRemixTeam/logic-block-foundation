export type BusinessSeason =
  | 'audience_growth'
  | 'selling'
  | 'launch'
  | 'client_delivery'
  | 'content_creation'
  | 'systems_backend'
  | 'recovery';

export interface BusinessSeasonMeta {
  id: BusinessSeason;
  label: string;
  emoji: string;
  description: string;
  todayPrompt: string;
}

export const BUSINESS_SEASONS: BusinessSeasonMeta[] = [
  {
    id: 'audience_growth',
    label: 'Audience Growth',
    emoji: '🌱',
    description: 'Reaching new people',
    todayPrompt: 'What grows your audience today?',
  },
  {
    id: 'selling',
    label: 'Selling / Promotion',
    emoji: '💰',
    description: 'Inviting people to buy',
    todayPrompt: 'What offer or sales action matters today?',
  },
  {
    id: 'launch',
    label: 'Launch',
    emoji: '🚀',
    description: 'Launching an offer',
    todayPrompt: 'What launch asset or decision moves this forward?',
  },
  {
    id: 'client_delivery',
    label: 'Client Delivery',
    emoji: '🤝',
    description: 'Serving paying clients',
    todayPrompt: 'What helps your clients win today?',
  },
  {
    id: 'content_creation',
    label: 'Content Creation',
    emoji: '✍️',
    description: 'Building your library',
    todayPrompt: 'What piece of content moves the needle today?',
  },
  {
    id: 'systems_backend',
    label: 'Systems / Backend',
    emoji: '⚙️',
    description: 'Building the engine',
    todayPrompt: 'What system makes future-you faster?',
  },
  {
    id: 'recovery',
    label: 'Recovery / Low Capacity',
    emoji: '🌙',
    description: 'Protecting your energy',
    todayPrompt: 'What is the smallest useful action?',
  },
];

export function getSeasonMeta(id: string | null | undefined): BusinessSeasonMeta | null {
  if (!id) return null;
  return BUSINESS_SEASONS.find(s => s.id === id) ?? null;
}
