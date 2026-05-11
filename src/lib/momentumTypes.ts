/**
 * Momentum Type — the spine that connects every task back to a 90-day goal.
 * Becoming Boss Mastermind taxonomy.
 */
export type MomentumType =
  | 'revenue'
  | 'audience'
  | 'delivery'
  | 'operations'
  | 'mindset';

export interface MomentumTypeMeta {
  value: MomentumType;
  label: string;
  short: string;
  emoji: string;
  description: string;
  /** Tailwind classes using semantic tokens */
  badgeClass: string;
  dotClass: string;
}

export const MOMENTUM_TYPES: MomentumTypeMeta[] = [
  {
    value: 'revenue',
    label: 'Revenue',
    short: '$',
    emoji: '💰',
    description: 'Selling, offers, sales conversations, launches.',
    badgeClass: 'bg-success/10 text-success border-success/20',
    dotClass: 'bg-success',
  },
  {
    value: 'audience',
    label: 'Audience',
    short: 'A',
    emoji: '📣',
    description: 'Content, visibility, list growth, relationships.',
    badgeClass: 'bg-primary/10 text-primary border-primary/20',
    dotClass: 'bg-primary',
  },
  {
    value: 'delivery',
    label: 'Delivery',
    short: 'D',
    emoji: '🎯',
    description: 'Serving clients, fulfilling, member experience.',
    badgeClass: 'bg-accent/15 text-accent-foreground border-accent/30',
    dotClass: 'bg-accent',
  },
  {
    value: 'operations',
    label: 'Operations',
    short: 'O',
    emoji: '⚙️',
    description: 'Admin, systems, finance, behind-the-scenes.',
    badgeClass: 'bg-muted text-muted-foreground border-border',
    dotClass: 'bg-muted-foreground',
  },
  {
    value: 'mindset',
    label: 'Mindset',
    short: 'M',
    emoji: '🧠',
    description: 'Belief work, identity, coaching, regulation.',
    badgeClass: 'bg-warning/10 text-warning border-warning/20',
    dotClass: 'bg-warning',
  },
];

export const MOMENTUM_BY_VALUE: Record<MomentumType, MomentumTypeMeta> =
  MOMENTUM_TYPES.reduce((acc, m) => {
    acc[m.value] = m;
    return acc;
  }, {} as Record<MomentumType, MomentumTypeMeta>);

export function getMomentumMeta(value: string | null | undefined): MomentumTypeMeta | null {
  if (!value) return null;
  return MOMENTUM_BY_VALUE[value as MomentumType] ?? null;
}

/** Tasks that move the business forward this quarter. */
export const MOMENTUM_FORWARD: MomentumType[] = ['revenue', 'audience'];
