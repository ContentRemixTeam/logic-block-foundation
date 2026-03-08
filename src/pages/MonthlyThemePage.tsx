/**
 * Monthly Theme Page
 * /monthly-theme - dedicated page with theme preview, challenge setup, and progress
 */
import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { useMonthlyTheme } from '@/hooks/useMonthlyTheme';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import {
  Sparkles, Gift, Trophy, CheckCircle2, Calendar,
  ClipboardList, BookOpen, Loader2, PartyPopper,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const PATH_OPTIONS = [
  {
    id: 'daily_debriefs',
    label: 'Daily Debriefs',
    description: 'Complete daily reflections to track your mindset and progress',
    icon: BookOpen,
    unit: 'debriefs',
  },
  {
    id: 'weekly_debriefs',
    label: 'Weekly Reviews',
    description: 'Complete weekly review sessions to stay on track',
    icon: Calendar,
    unit: 'reviews',
  },
  {
    id: 'task_checklist',
    label: 'Task Checklist',
    description: 'Complete tasks from any project — you decide which ones count',
    icon: ClipboardList,
    unit: 'tasks',
  },
];

const CAPACITY_LABELS: Record<string, { label: string; emoji: string; description: string }> = {
  light: { label: 'Light', emoji: '🌱', description: 'Busy season — small consistent effort' },
  medium: { label: 'Medium', emoji: '🔥', description: 'Normal pace — steady and sustainable' },
  stretch: { label: 'Stretch', emoji: '🚀', description: 'All in — maximize this month' },
};

export default function MonthlyThemePage() {
  const { data, isLoading, enroll, isEnrolling, checkCompletion, isChecking } = useMonthlyTheme();
  const [selectedPath, setSelectedPath] = useState<string>('daily_debriefs');
  const [selectedCapacity, setSelectedCapacity] = useState<string>('medium');
  const [customTarget, setCustomTarget] = useState<number | null>(null);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!data?.active || !data.template) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-12 text-center">
          <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">No Active Monthly Theme</h1>
          <p className="text-muted-foreground">
            Check back on the 1st of the month for a new theme to unlock!
          </p>
        </div>
      </Layout>
    );
  }

  const { template, challenge, progress, theme_unlocked } = data;
  const emoji = template.reward_theme?.preview_emoji || '🎨';
  const targets = template.suggested_targets || { light: 5, medium: 10, stretch: 20 };
  const targetValue = customTarget ?? targets[selectedCapacity as keyof typeof targets] ?? 10;

  const handleEnroll = async () => {
    try {
      await enroll({
        challengeType: selectedPath,
        targetValue,
      });
      toast.success('Challenge started! 🎯');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to start challenge');
    }
  };

  const handleCheckCompletion = async () => {
    try {
      const result = await checkCompletion();
      if (result?.completed) {
        toast.success('🎉 Theme unlocked! Check your theme settings.');
      } else {
        toast.info('Keep going! You\'re not quite there yet.');
      }
    } catch {
      toast.error('Failed to check progress');
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Hero */}
        <div className="text-center space-y-3 py-4">
          <div className="inline-flex h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 items-center justify-center text-4xl mx-auto">
            {emoji}
          </div>
          <h1 className="text-3xl font-bold">{template.title}</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            {template.description}
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {format(parseISO(template.month_start), 'MMM d')} – {format(parseISO(template.month_end), 'MMM d, yyyy')}
          </div>
        </div>

        {/* Unlocked State */}
        {theme_unlocked && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="flex items-center gap-4 py-6">
              <PartyPopper className="h-10 w-10 text-green-500" />
              <div>
                <h2 className="text-lg font-semibold text-green-700 dark:text-green-400">
                  Theme Unlocked! 🎉
                </h2>
                <p className="text-sm text-muted-foreground">
                  You've earned this month's theme. Apply it from your theme settings.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Challenge Progress */}
        {challenge && !theme_unlocked && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Your Challenge
                </CardTitle>
                <Badge variant="secondary">
                  {PATH_OPTIONS.find(p => p.id === challenge.challenge_type)?.label || challenge.challenge_type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {progress && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{progress.current_count} / {progress.target_value}</span>
                    </div>
                    <Progress value={progress.percent} className="h-3" />
                    <p className="text-xs text-muted-foreground text-center">
                      {progress.percent}% complete
                    </p>
                  </div>

                  {progress.percent >= 100 && (
                    <Button onClick={handleCheckCompletion} disabled={isChecking} className="w-full gap-2">
                      {isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Claim Your Theme!
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Challenge Setup (not enrolled yet) */}
        {!challenge && !theme_unlocked && (
          <>
            {/* Step 1: Choose Your Path */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Choose Your Path
                </CardTitle>
                <CardDescription>
                  Pick the challenge type that fits your workflow
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={selectedPath} onValueChange={setSelectedPath} className="space-y-3">
                  {PATH_OPTIONS.filter(p => 
                    (template.unlock_paths || []).includes(p.id)
                  ).map((path) => {
                    const Icon = path.icon;
                    return (
                      <label
                        key={path.id}
                        className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedPath === path.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <RadioGroupItem value={path.id} className="mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 font-medium">
                            <Icon className="h-4 w-4 text-primary" />
                            {path.label}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{path.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Step 2: Set Your Capacity */}
            <Card>
              <CardHeader>
                <CardTitle>Set Your Capacity</CardTitle>
                <CardDescription>
                  Be honest about your bandwidth this month. You can always level up next time.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(CAPACITY_LABELS).map(([key, cap]) => (
                    <button
                      key={key}
                      onClick={() => { setSelectedCapacity(key); setCustomTarget(null); }}
                      className={`p-3 rounded-lg border text-center transition-colors ${
                        selectedCapacity === key && customTarget === null
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <span className="text-2xl">{cap.emoji}</span>
                      <p className="font-medium text-sm mt-1">{cap.label}</p>
                      <p className="text-xs text-muted-foreground">{targets[key as keyof typeof targets]} {PATH_OPTIONS.find(p => p.id === selectedPath)?.unit}</p>
                    </button>
                  ))}
                </div>

                <div className="space-y-2 pt-2">
                  <Label className="text-sm text-muted-foreground">
                    Or set a custom target: <span className="font-semibold text-foreground">{targetValue}</span>
                  </Label>
                  <Slider
                    value={[targetValue]}
                    onValueChange={([v]) => setCustomTarget(v)}
                    min={1}
                    max={31}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground italic">
                    {CAPACITY_LABELS[selectedCapacity]?.description}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Start Challenge */}
            <Button
              onClick={handleEnroll}
              disabled={isEnrolling}
              size="lg"
              className="w-full gap-2"
            >
              {isEnrolling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trophy className="h-4 w-4" />
              )}
              Start Challenge — {targetValue} {PATH_OPTIONS.find(p => p.id === selectedPath)?.unit}
            </Button>
          </>
        )}
      </div>
    </Layout>
  );
}
