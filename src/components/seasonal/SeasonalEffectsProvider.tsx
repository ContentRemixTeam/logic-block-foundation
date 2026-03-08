/**
 * Seasonal Effects Provider
 * Wraps the app to provide ambient animations and celebration triggers
 * Only renders effects when user has an active unlocked theme with effects enabled
 */
import { createContext, useContext, useState, useCallback, memo } from 'react';
import { useActiveThemeEffects } from '@/hooks/useActiveThemeEffects';
import { SeasonalAmbient } from './SeasonalAmbient';
import { CelebrationScreen } from './CelebrationScreen';

interface SeasonalEffectsContextType {
  triggerCelebration: () => void;
}

const SeasonalEffectsContext = createContext<SeasonalEffectsContextType>({
  triggerCelebration: () => {},
});

export function useSeasonalEffects() {
  return useContext(SeasonalEffectsContext);
}

function SeasonalEffectsProviderInner({ children }: { children: React.ReactNode }) {
  const { ambient, celebration } = useActiveThemeEffects();
  const [celebrationTrigger, setCelebrationTrigger] = useState(0);

  const triggerCelebration = useCallback(() => {
    if (celebration.enabled) {
      setCelebrationTrigger(prev => prev + 1);
    }
  }, [celebration.enabled]);

  return (
    <SeasonalEffectsContext.Provider value={{ triggerCelebration }}>
      {children}
      
      {/* Ambient background particles */}
      {ambient.enabled && ambient.style !== 'none' && (
        <SeasonalAmbient style={ambient.style} opacity={ambient.opacity} />
      )}

      {/* Celebration screen overlay */}
      {celebration.enabled && celebration.style !== 'none' && (
        <CelebrationScreen
          style={celebration.style}
          duration={celebration.duration}
          trigger={celebrationTrigger}
        />
      )}
    </SeasonalEffectsContext.Provider>
  );
}

export const SeasonalEffectsProvider = memo(SeasonalEffectsProviderInner);
