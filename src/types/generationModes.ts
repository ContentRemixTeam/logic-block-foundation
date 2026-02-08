// Generation Mode Types
export type GenerationMode = 'efficient' | 'premium';

export interface GenerationModeConfig {
  mode: GenerationMode;
  label: string;
  estimatedCost: string;
  estimatedTime: string;
  description: string;
  passes: number;
  icon: string;
  recommended?: boolean;
}

export const GENERATION_MODE_CONFIGS: Record<GenerationMode, GenerationModeConfig> = {
  efficient: {
    mode: 'efficient',
    label: 'Efficient Mode',
    estimatedCost: '$0.03-$0.04',
    estimatedTime: '20-30 seconds',
    description: 'Faster generation with strategic critique. Best for weekly content and iteration.',
    passes: 4,
    icon: '⚡',
  },
  premium: {
    mode: 'premium',
    label: 'Premium Quality',
    estimatedCost: '$0.06-$0.09',
    estimatedTime: '40-60 seconds',
    description: 'Multi-pass refinement with deep voice matching and psychology audit. Best for launches and high-stakes emails.',
    passes: 7,
    icon: '✨',
    recommended: true,
  },
};

export const DEFAULT_GENERATION_MODE: GenerationMode = 'premium';
