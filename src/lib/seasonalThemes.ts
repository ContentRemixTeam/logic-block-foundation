/**
 * Seasonal Theme Definitions
 * 12 monthly themes with HSL color palettes and line art graphics
 */

// Import line art graphics
import januaryArt from '@/assets/seasonal/january-winter.png';
import februaryArt from '@/assets/seasonal/february-love.png';
import marchArt from '@/assets/seasonal/march-renewal.png';
import aprilArt from '@/assets/seasonal/april-blossom.png';
import mayArt from '@/assets/seasonal/may-bloom.png';
import juneArt from '@/assets/seasonal/june-solstice.png';
import julyArt from '@/assets/seasonal/july-radiance.png';
import augustArt from '@/assets/seasonal/august-golden.png';
import septemberArt from '@/assets/seasonal/september-harvest.png';
import octoberArt from '@/assets/seasonal/october-mystery.png';
import novemberArt from '@/assets/seasonal/november-gratitude.png';
import decemberArt from '@/assets/seasonal/december-festive.png';

export interface SeasonalColorPalette {
  /** Primary accent HSL */
  primary: string;
  /** Secondary/complement HSL */
  secondary: string;
  /** Soft background tint HSL */
  backgroundTint: string;
  /** Muted foreground for subtle text HSL */
  mutedAccent: string;
  /** Gradient start HSL */
  gradientFrom: string;
  /** Gradient end HSL */
  gradientTo: string;
}

export interface SeasonalTheme {
  month: number;
  slug: string;
  name: string;
  tagline: string;
  emoji: string;
  art: string;
  palette: SeasonalColorPalette;
  badgeEmoji: string;
  badgeLabel: string;
}

export const SEASONAL_THEMES: SeasonalTheme[] = [
  {
    month: 1,
    slug: 'january-winter',
    name: 'Winter Stillness',
    tagline: 'Start the year with clarity',
    emoji: '❄️',
    art: januaryArt,
    palette: {
      primary: '210 40% 60%',
      secondary: '220 30% 75%',
      backgroundTint: '210 20% 97%',
      mutedAccent: '210 15% 70%',
      gradientFrom: '210 40% 60%',
      gradientTo: '220 30% 80%',
    },
    badgeEmoji: '🏔️',
    badgeLabel: 'Winter Explorer',
  },
  {
    month: 2,
    slug: 'february-love',
    name: 'Heart & Hustle',
    tagline: 'Pour love into your work',
    emoji: '💕',
    art: februaryArt,
    palette: {
      primary: '340 45% 65%',
      secondary: '350 35% 75%',
      backgroundTint: '340 25% 97%',
      mutedAccent: '340 20% 72%',
      gradientFrom: '340 45% 65%',
      gradientTo: '350 40% 80%',
    },
    badgeEmoji: '💝',
    badgeLabel: 'Heart Champion',
  },
  {
    month: 3,
    slug: 'march-renewal',
    name: 'Fresh Start',
    tagline: 'Plant seeds for what\'s next',
    emoji: '🌱',
    art: marchArt,
    palette: {
      primary: '145 40% 50%',
      secondary: '155 35% 65%',
      backgroundTint: '145 20% 97%',
      mutedAccent: '145 18% 68%',
      gradientFrom: '145 40% 50%',
      gradientTo: '160 35% 70%',
    },
    badgeEmoji: '🌿',
    badgeLabel: 'Growth Starter',
  },
  {
    month: 4,
    slug: 'april-blossom',
    name: 'In Full Bloom',
    tagline: 'Let your ideas blossom',
    emoji: '🌸',
    art: aprilArt,
    palette: {
      primary: '330 50% 72%',
      secondary: '340 40% 80%',
      backgroundTint: '330 25% 97%',
      mutedAccent: '330 20% 75%',
      gradientFrom: '330 50% 72%',
      gradientTo: '345 45% 85%',
    },
    badgeEmoji: '🌺',
    badgeLabel: 'Blossom Creator',
  },
  {
    month: 5,
    slug: 'may-bloom',
    name: 'Wildflower Season',
    tagline: 'Grow in every direction',
    emoji: '🦋',
    art: mayArt,
    palette: {
      primary: '120 35% 55%',
      secondary: '80 40% 65%',
      backgroundTint: '100 18% 97%',
      mutedAccent: '100 15% 68%',
      gradientFrom: '120 35% 55%',
      gradientTo: '80 40% 72%',
    },
    badgeEmoji: '🌻',
    badgeLabel: 'Wildflower Spirit',
  },
  {
    month: 6,
    slug: 'june-solstice',
    name: 'Longest Day',
    tagline: 'Make every hour count',
    emoji: '☀️',
    art: juneArt,
    palette: {
      primary: '35 70% 55%',
      secondary: '45 60% 65%',
      backgroundTint: '40 25% 97%',
      mutedAccent: '38 20% 70%',
      gradientFrom: '35 70% 55%',
      gradientTo: '50 60% 72%',
    },
    badgeEmoji: '🌅',
    badgeLabel: 'Solstice Achiever',
  },
  {
    month: 7,
    slug: 'july-radiance',
    name: 'Radiance',
    tagline: 'Shine bright this month',
    emoji: '✨',
    art: julyArt,
    palette: {
      primary: '45 80% 55%',
      secondary: '30 65% 65%',
      backgroundTint: '45 25% 97%',
      mutedAccent: '42 20% 70%',
      gradientFrom: '45 80% 55%',
      gradientTo: '25 65% 72%',
    },
    badgeEmoji: '🎆',
    badgeLabel: 'Radiance Master',
  },
  {
    month: 8,
    slug: 'august-golden',
    name: 'Golden Hour',
    tagline: 'Harvest your momentum',
    emoji: '🌾',
    art: augustArt,
    palette: {
      primary: '38 55% 52%',
      secondary: '28 45% 62%',
      backgroundTint: '35 20% 97%',
      mutedAccent: '35 18% 68%',
      gradientFrom: '38 55% 52%',
      gradientTo: '25 45% 70%',
    },
    badgeEmoji: '🥇',
    badgeLabel: 'Golden Harvester',
  },
  {
    month: 9,
    slug: 'september-harvest',
    name: 'Harvest Moon',
    tagline: 'Gather what you\'ve built',
    emoji: '🍂',
    art: septemberArt,
    palette: {
      primary: '25 50% 50%',
      secondary: '15 40% 60%',
      backgroundTint: '25 18% 97%',
      mutedAccent: '25 15% 65%',
      gradientFrom: '25 50% 50%',
      gradientTo: '15 40% 68%',
    },
    badgeEmoji: '🎑',
    badgeLabel: 'Harvest Leader',
  },
  {
    month: 10,
    slug: 'october-mystery',
    name: 'Mystery & Magic',
    tagline: 'Embrace the unknown',
    emoji: '🎃',
    art: octoberArt,
    palette: {
      primary: '270 35% 55%',
      secondary: '285 30% 65%',
      backgroundTint: '270 15% 97%',
      mutedAccent: '270 12% 68%',
      gradientFrom: '270 35% 55%',
      gradientTo: '290 30% 72%',
    },
    badgeEmoji: '🔮',
    badgeLabel: 'Mystery Maven',
  },
  {
    month: 11,
    slug: 'november-gratitude',
    name: 'Gratitude Season',
    tagline: 'Celebrate how far you\'ve come',
    emoji: '🍁',
    art: novemberArt,
    palette: {
      primary: '15 55% 48%',
      secondary: '25 45% 58%',
      backgroundTint: '18 18% 97%',
      mutedAccent: '18 15% 65%',
      gradientFrom: '15 55% 48%',
      gradientTo: '28 45% 65%',
    },
    badgeEmoji: '🏅',
    badgeLabel: 'Gratitude Champion',
  },
  {
    month: 12,
    slug: 'december-festive',
    name: 'Year in Review',
    tagline: 'Reflect, celebrate, plan ahead',
    emoji: '🎄',
    art: decemberArt,
    palette: {
      primary: '150 40% 40%',
      secondary: '0 50% 55%',
      backgroundTint: '150 15% 97%',
      mutedAccent: '150 12% 65%',
      gradientFrom: '150 40% 40%',
      gradientTo: '0 50% 62%',
    },
    badgeEmoji: '⭐',
    badgeLabel: 'Year-End Star',
  },
];

/**
 * Get the current month's seasonal theme
 */
export function getCurrentSeasonalTheme(): SeasonalTheme {
  const month = new Date().getMonth() + 1; // 1-12
  return SEASONAL_THEMES[month - 1];
}

/**
 * Get a seasonal theme by month number (1-12)
 */
export function getSeasonalTheme(month: number): SeasonalTheme {
  const idx = Math.max(0, Math.min(11, month - 1));
  return SEASONAL_THEMES[idx];
}
