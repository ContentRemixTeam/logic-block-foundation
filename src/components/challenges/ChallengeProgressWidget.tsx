/**
 * Challenge Progress Widget
 * Shows current challenge progress with pace indicator
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, TrendingDown, Trophy, Loader2, Sparkles } from 'lucide-react';
import { useMonthlyChallenge } from '@/hooks/useMonthlyChallenge';
import { useDelightSettings } from '@/hooks/useDelightSettings';
import { useUnlockedThemes } from '@/hooks/useUnlockedThemes';
import { triggerThemeUnlockCelebration } from '@/lib/celebrationService';
import { ChallengeEnrollmentModal } from './ChallengeEnrollmentModal';
import { toast } from 'sonner';

export function ChallengeProgressWidget() {
  const {
    featureEnabled,
    featureLoading,
    currentTemplate,
    userChallenge,
    progress,
    pace,
    isLoading,
    hasActiveChallenge,
    canClaim,
    claimReward,
    isClaiming,
  } = useMonthlyChallenge();
  
  const { settings } = useDelightSettings();
  const { themes } = useUnlockedThemes();
  
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);

  // Don't render if feature is disabled or still loading
  if (featureLoading || !featureEnabled) return null;
  if (isLoading) return null;

  // No template for this month
  if (!currentTemplate) return null;

  // Show enrollment prompt if not enrolled
  if (!hasActiveChallenge && userChallenge?.status !== 'completed') {
    return (
      <>
        <Card className="border-dashed border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{currentTemplate.title}</h3>
                <p className="text-sm text-muted-foreground">
                  Take on this month's challenge and unlock a special theme!
                </p>
              </div>
              <Button onClick={() => setEnrollModalOpen(true)}>
                Join Challenge
              </Button>
            </div>
          </CardContent>
        </Card>
        <ChallengeEnrollmentModal open={enrollModalOpen} onOpenChange={setEnrollModalOpen} />
      </>
    );
  }

  // Challenge completed
  if (userChallenge?.status === 'completed') {
    return (
      <Card className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/50">
              <Trophy className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-700 dark:text-green-300">
                Challenge Complete! 🎉
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400">
                You crushed {currentTemplate.title}. Check your Themes for your reward!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Active challenge with progress
  const handleClaimReward = async () => {
    if (!userChallenge) return;
    
    try {
      const result = await claimReward(userChallenge.id);
      
      if (result.completed && result.unlocked_theme_id) {
        const unlockedTheme = themes.find((t) => t.id === result.unlocked_theme_id);
        
        if (unlockedTheme) {
          // Trigger celebration
          triggerThemeUnlockCelebration(unlockedTheme.config, {
            soundEnabled: settings.sound_enabled,
            celebrationsEnabled: settings.celebrations_enabled,
            delightIntensity: settings.delight_intensity,
          });
        }
        
        toast.success('🎉 Challenge complete! You unlocked a new theme!');
      }
    } catch (error) {
      // Error handled in hook
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {currentTemplate.title}
          </CardTitle>
          {pace && (
            <Badge
              variant={pace.status === 'on_track' ? 'default' : 'secondary'}
              className={
                pace.status === 'on_track'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              }
            >
              {pace.status === 'on_track' ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {pace.status === 'on_track' ? 'On Track' : 'Behind Pace'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {progress && (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">
                  {progress.current_count} / {progress.target_value}
                </span>
              </div>
              <Progress value={progress.percent} className="h-3" />
            </div>

            {pace && pace.status !== 'complete' && (
              <p className="text-sm text-muted-foreground">
                💡 {pace.perDay} per day needed • {pace.daysRemaining} days left
              </p>
            )}

            {canClaim && (
              <Button onClick={handleClaimReward} disabled={isClaiming} className="w-full">
                {isClaiming ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Claim Your Reward! 🎁
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
