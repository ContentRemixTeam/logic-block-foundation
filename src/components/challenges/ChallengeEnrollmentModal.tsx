/**
 * Challenge Enrollment Modal
 * Fun, engaging modal for users to join the monthly challenge
 * Shows the seasonal theme they can unlock as a reward
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Target, Folder, Calendar, Loader2, Sparkles, Gift } from 'lucide-react';
import { useMonthlyChallenge, ChallengeType } from '@/hooks/useMonthlyChallenge';
import { useProjects } from '@/hooks/useProjects';
import { format } from 'date-fns';

// Import seasonal banner images
import marchRenewal from '@/assets/seasonal/march-renewal.png';
import aprilBlossom from '@/assets/seasonal/april-blossom.png';
import mayBloom from '@/assets/seasonal/may-bloom.png';
import juneSolstice from '@/assets/seasonal/june-solstice.png';
import julyRadiance from '@/assets/seasonal/july-radiance.png';
import augustGolden from '@/assets/seasonal/august-golden.png';
import septemberHarvest from '@/assets/seasonal/september-harvest.png';
import octoberMystery from '@/assets/seasonal/october-mystery.png';
import novemberGratitude from '@/assets/seasonal/november-gratitude.png';
import decemberFestive from '@/assets/seasonal/december-festive.png';
import januaryWinter from '@/assets/seasonal/january-winter.png';
import februaryLove from '@/assets/seasonal/february-love.png';

interface ChallengeEnrollmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SEASONAL_IMAGES: Record<string, string> = {
  'march-renewal': marchRenewal,
  'april-blossom': aprilBlossom,
  'may-bloom': mayBloom,
  'june-solstice': juneSolstice,
  'july-radiance': julyRadiance,
  'august-golden': augustGolden,
  'september-harvest': septemberHarvest,
  'october-mystery': octoberMystery,
  'november-gratitude': novemberGratitude,
  'december-festive': decemberFestive,
  'january-winter': januaryWinter,
  'february-love': februaryLove,
};

// Friendly names for themes
const THEME_DISPLAY_NAMES: Record<string, { name: string; emoji: string; tagline: string }> = {
  'march-renewal': { name: 'March Renewal', emoji: '🌱', tagline: 'Fresh spring greens & new beginnings' },
  'april-blossom': { name: 'April Blossom', emoji: '🌸', tagline: 'Soft pinks & cherry blossoms' },
  'may-bloom': { name: 'May Bloom', emoji: '🌷', tagline: 'Vibrant florals & garden hues' },
  'june-solstice': { name: 'June Solstice', emoji: '☀️', tagline: 'Golden sunshine & longest days' },
  'july-radiance': { name: 'July Radiance', emoji: '🌊', tagline: 'Ocean blues & summer vibes' },
  'august-golden': { name: 'August Golden', emoji: '🌻', tagline: 'Warm golds & sunflower fields' },
  'september-harvest': { name: 'September Harvest', emoji: '🍂', tagline: 'Warm amber & cozy tones' },
  'october-mystery': { name: 'October Mystery', emoji: '🎃', tagline: 'Deep purples & autumn magic' },
  'november-gratitude': { name: 'November Gratitude', emoji: '🍁', tagline: 'Rich burgundy & thankful hues' },
  'december-festive': { name: 'December Festive', emoji: '❄️', tagline: 'Snowy whites & holiday sparkle' },
  'january-winter': { name: 'January Winter', emoji: '🌨️', tagline: 'Cool grays & fresh start energy' },
  'february-love': { name: 'February Love', emoji: '💝', tagline: 'Rose reds & romantic vibes' },
};

const CHALLENGE_TYPES: { value: ChallengeType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'tasks_total',
    label: 'Task Momentum',
    description: 'Complete tasks across all your projects',
    icon: <Target className="h-5 w-5" />,
  },
  {
    value: 'tasks_in_project',
    label: 'Project Sprint',
    description: 'Focus on one specific project',
    icon: <Folder className="h-5 w-5" />,
  },
  {
    value: 'daily_checkins',
    label: 'Daily Consistency',
    description: 'Show up daily to plan your day',
    icon: <Calendar className="h-5 w-5" />,
  },
];

const TARGET_SUGGESTIONS: Record<ChallengeType, number[]> = {
  tasks_total: [30, 50, 75, 100],
  tasks_in_project: [15, 25, 40, 60],
  daily_checkins: [15, 20, 25, 30],
};

function getSeasonalImage(rewardThemeId: string | null): string | null {
  if (!rewardThemeId) return null;
  // Try exact match first, then try with common variations
  return SEASONAL_IMAGES[rewardThemeId] || SEASONAL_IMAGES[rewardThemeId.toLowerCase()] || null;
}

function getThemeInfo(rewardThemeId: string | null) {
  if (!rewardThemeId) return null;
  return THEME_DISPLAY_NAMES[rewardThemeId] || THEME_DISPLAY_NAMES[rewardThemeId.toLowerCase()] || null;
}

export function ChallengeEnrollmentModal({ open, onOpenChange }: ChallengeEnrollmentModalProps) {
  const { currentTemplate, enroll, isEnrolling } = useMonthlyChallenge();
  const projectsQuery = useProjects();
  const projects = projectsQuery.data;
  const projectsLoading = projectsQuery.isLoading;
  
  const [challengeType, setChallengeType] = useState<ChallengeType>('tasks_total');
  const [targetValue, setTargetValue] = useState<number>(50);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Get seasonal image and theme info
  const seasonalImage = getSeasonalImage(currentTemplate?.reward_theme_id ?? null);
  const themeInfo = getThemeInfo(currentTemplate?.reward_theme_id ?? null);
  
  // Get current month name for display
  const monthName = currentTemplate 
    ? format(new Date(currentTemplate.month_start), 'MMMM')
    : format(new Date(), 'MMMM');

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setChallengeType('tasks_total');
      setTargetValue(50);
      setSelectedProjectId('');
    }
  }, [open]);

  const handleEnroll = async () => {
    if (!currentTemplate) return;
    
    // Validate project selection for project sprint
    if (challengeType === 'tasks_in_project' && !selectedProjectId) {
      return;
    }

    try {
      await enroll({
        templateId: currentTemplate.id,
        challengeType,
        targetValue,
        projectId: challengeType === 'tasks_in_project' ? selectedProjectId : undefined,
      });
      onOpenChange(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const suggestions = TARGET_SUGGESTIONS[challengeType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg overflow-hidden p-0">
        {/* Seasonal Banner Preview */}
        {seasonalImage && (
          <div className="relative h-24 w-full overflow-hidden bg-gradient-to-r from-muted/50 to-muted">
            <div 
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${seasonalImage})`,
                backgroundRepeat: 'repeat-x',
                backgroundSize: 'auto 100%',
                backgroundPosition: 'center bottom',
                opacity: 0.9,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            
            {/* Reward badge overlay */}
            <div className="absolute bottom-2 right-3 flex items-center gap-1.5 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium shadow-sm">
              <Gift className="h-3.5 w-3.5 text-primary" />
              <span>Unlock this theme!</span>
            </div>
          </div>
        )}

        <div className="p-6 pt-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-primary" />
              {monthName} Challenge
            </DialogTitle>
            <DialogDescription className="text-base">
              {themeInfo ? (
                <>
                  Complete this month's challenge to unlock the{' '}
                  <span className="font-medium text-foreground">
                    {themeInfo.emoji} {themeInfo.name}
                  </span>{' '}
                  theme — {themeInfo.tagline}!
                </>
              ) : (
                currentTemplate?.description || 'Set your goal and unlock a special seasonal theme!'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Challenge Type Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Pick Your Path</Label>
              <RadioGroup value={challengeType} onValueChange={(v) => setChallengeType(v as ChallengeType)}>
                {CHALLENGE_TYPES.map((type) => (
                  <div
                    key={type.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      challengeType === type.value
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/50 hover:bg-muted/30'
                    }`}
                    onClick={() => setChallengeType(type.value)}
                  >
                    <RadioGroupItem value={type.value} id={type.value} className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={challengeType === type.value ? 'text-primary' : 'text-muted-foreground'}>
                          {type.icon}
                        </span>
                        <Label htmlFor={type.value} className="font-medium cursor-pointer">
                          {type.label}
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{type.description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Project Selection (for Project Sprint) */}
            {challengeType === 'tasks_in_project' && (
              <div className="space-y-2">
                <Label>Which Project?</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projectsLoading ? (
                      <div className="p-2 text-center text-muted-foreground">Loading...</div>
                    ) : (
                      projects?.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Target Value */}
            <div className="space-y-2">
              <Label>Set Your Target</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  value={targetValue}
                  onChange={(e) => setTargetValue(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24"
                />
                <div className="flex-1 flex gap-1.5 flex-wrap">
                  {suggestions.map((num) => (
                    <Button
                      key={num}
                      variant={targetValue === num ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => setTargetValue(num)}
                      className="min-w-[3rem]"
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {challengeType === 'daily_checkins'
                  ? `Show up ${targetValue} days this month to unlock the theme`
                  : `Complete ${targetValue} tasks this month to unlock the theme`}
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Maybe Later
            </Button>
            <Button
              onClick={handleEnroll}
              disabled={isEnrolling || (challengeType === 'tasks_in_project' && !selectedProjectId)}
              className="gap-2"
            >
              {isEnrolling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Let's Go!
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
