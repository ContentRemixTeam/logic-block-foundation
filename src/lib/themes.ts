/**
 * CENTRALIZED THEME CONFIGURATION
 * 
 * To add a new theme:
 * 1. Add the theme name to ThemeId type
 * 2. Add theme config to THEMES object
 * 3. Add CSS variables in index.css under [data-theme="your-theme"]
 * 
 * That's it! No other files need to be modified.
 */

export type ThemeId = 'minimal' | 'vibrant' | 'quest' | 'bw';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  /** Whether this theme uses fantasy/quest mode features like XP, streaks, levels */
  isQuestTheme: boolean;
  /** Primary color for preview (HSL values) */
  previewColor: string;
  /** Icon to display in theme selector */
  icon: 'sparkles' | 'crown' | 'palette' | 'circle';
}

/**
 * All available themes - add new themes here
 * The order determines display order in settings
 */
export const THEMES: Record<ThemeId, ThemeConfig> = {
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean, focused design with premium pink accents',
    isQuestTheme: false,
    previewColor: '330 81% 54%',
    icon: 'sparkles',
  },
  vibrant: {
    id: 'vibrant',
    name: 'Vibrant',
    description: 'Bold coral-orange theme with warm, energetic styling',
    isQuestTheme: false,
    previewColor: '16 90% 55%',
    icon: 'palette',
  },
  quest: {
    id: 'quest',
    name: 'Quest Mode',
    description: 'Fantasy adventure theme with XP, levels & streaks',
    isQuestTheme: true,
    previewColor: '45 93% 47%',
    icon: 'crown',
  },
  bw: {
    id: 'bw',
    name: 'Monochrome',
    description: 'Classic black and white for minimal distractions',
    isQuestTheme: false,
    previewColor: '0 0% 9%',
    icon: 'circle',
  },
};

/**
 * Get all theme IDs as an array (for iteration)
 */
export const THEME_IDS = Object.keys(THEMES) as ThemeId[];

/**
 * Get the default theme
 */
export const DEFAULT_THEME: ThemeId = 'minimal';

/**
 * Check if a theme ID is valid
 */
export function isValidTheme(id: string): id is ThemeId {
  return id in THEMES;
}

/**
 * Get theme config with fallback to default
 */
export function getThemeConfig(id: string): ThemeConfig {
  return isValidTheme(id) ? THEMES[id] : THEMES[DEFAULT_THEME];
}

/**
 * Check if a theme uses quest features
 */
export function isQuestTheme(id: string): boolean {
  return getThemeConfig(id).isQuestTheme;
}
