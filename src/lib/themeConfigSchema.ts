/**
 * Theme Config JSON Schema + Validation
 * Validates theme configurations from app_themes.config_json
 */

import { z } from 'zod';

// Confetti style presets
export const CONFETTI_STYLES = [
  'classic',
  'snow',
  'petals',
  'leaves',
  'pumpkins',
  'sparkles',
  'stars',
  'hearts',
] as const;

export type ConfettiStyle = typeof CONFETTI_STYLES[number];

// Sound key registry - these map to actual audio files
export const SOUND_KEYS = [
  'winter_chime',
  'halloween_pop',
  'level_up',
  'spring_bell',
  'summer_wave',
  'autumn_rustle',
  'celebration',
  'unlock',
] as const;

export type SoundKey = typeof SOUND_KEYS[number];

// Delight intensity levels
export const DELIGHT_INTENSITIES = ['none', 'subtle', 'fun'] as const;
export type DelightIntensity = typeof DELIGHT_INTENSITIES[number];

// Zod schema for theme config validation
export const themeConfigSchema = z.object({
  tokens: z.record(z.string()).default({}),
  art: z.object({
    headerImageUrl: z.string().url().optional(),
    backgroundPatternUrl: z.string().url().optional(),
  }).default({}),
  fx: z.object({
    confetti: z.object({
      enabled: z.boolean().default(false),
      style: z.enum(CONFETTI_STYLES).default('classic'),
      intensity: z.enum(['low', 'medium', 'high']).default('medium'),
    }).default({ enabled: false, style: 'classic', intensity: 'medium' }),
    sound: z.object({
      enabled: z.boolean().default(false),
      unlockSoundKey: z.enum(SOUND_KEYS).optional(),
      completeSoundKey: z.enum(SOUND_KEYS).optional(),
    }).default({ enabled: false }),
  }).default({
    confetti: { enabled: false, style: 'classic', intensity: 'medium' },
    sound: { enabled: false },
  }),
}).default({
  tokens: {},
  art: {},
  fx: {
    confetti: { enabled: false, style: 'classic', intensity: 'medium' },
    sound: { enabled: false },
  },
});

export type ThemeConfig = z.infer<typeof themeConfigSchema>;

/**
 * Safely parse and validate a theme config JSON
 * Returns default config if validation fails (never throws)
 */
export function parseThemeConfig(configJson: unknown): ThemeConfig {
  try {
    const result = themeConfigSchema.safeParse(configJson);
    if (result.success) {
      return result.data;
    }
    console.warn('Invalid theme config, using defaults:', result.error.errors);
    return themeConfigSchema.parse({});
  } catch (error) {
    console.warn('Theme config parse error, using defaults:', error);
    return themeConfigSchema.parse({});
  }
}

/**
 * Default theme config for fallback
 */
export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  tokens: {},
  art: {},
  fx: {
    confetti: { enabled: false, style: 'classic', intensity: 'medium' },
    sound: { enabled: false },
  },
};
