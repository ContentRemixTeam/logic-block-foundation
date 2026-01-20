import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Circle, Target, BarChart3, Calendar, CalendarDays, Sparkles, ArrowRight, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  checkComplete: () => Promise<boolean>;
}

export function QuickStartGuide() {
  const { user } = useAuth();
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [skipped, setSkipped] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: 1,
      title: 'Set up your first cycle',
      description: 'Define your 90-day goal and the identity you want to embody.',
      icon: Target,
      href: '/cycle-setup',
      checkComplete: async () => {
        if (!user) return false;
        const { data } = await supabase.functions.invoke('get-current-cycle-or-create', {
          body: { user_id: user.id }
        });
        return !!data?.cycle;
      }
    },
    {
      id: 2,
      title: 'Define your 3 key metrics',
      description: 'Choose the numbers that matter most for tracking your progress.',
      icon: BarChart3,
      href: '/cycle-setup',
      checkComplete: async () => {
        if (!user) return false;
        const { data } = await supabase.functions.invoke('get-current-cycle-or-create', {
          body: { user_id: user.id }
        });
        return !!(data?.cycle?.metric_1_name || data?.cycle?.metric_2_name || data?.cycle?.metric_3_name);
      }
    },
    {
      id: 3,
      title: 'Create your first weekly plan',
      description: 'Set your top 3 priorities for the week ahead.',
      icon: Calendar,
      href: '/weekly-plan',
      checkComplete: async () => {
        if (!user) return false;
        const { data } = await supabase.functions.invoke('get-weekly-plan', {
          body: { user_id: user.id }
        });
        return !!data?.week?.top_3_priorities?.length;
      }
    },
    {
      id: 4,
      title: 'Complete your first daily plan',
      description: 'Decide what matters most for today.',
      icon: CalendarDays,
      href: '/daily-plan',
      checkComplete: async () => {
        if (!user) return false;
        const { data } = await supabase.functions.invoke('get-daily-plan', {
          body: { user_id: user.id }
        });
        return !!data?.day?.top_3_today?.length;
      }
    },
    {
      id: 5,
      title: 'Do your first daily review',
      description: 'Reflect on what worked and what you learned.',
      icon: Sparkles,
      href: '/daily-review',
      checkComplete: async () => {
        if (!user) return false;
        const { data } = await supabase.functions.invoke('get-daily-review', {
          body: { user_id: user.id }
        });
        return !!(data?.review?.wins || data?.review?.what_worked);
      }
    },
    {
      id: 6,
      title: 'Hatch your first pet 🐣',
      description: 'Complete 3 daily tasks in Pet Mode to grow and hatch your first virtual pet!',
      icon: Sparkles,
      href: '/arcade',
      checkComplete: async () => {
        if (!user) return false;
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
          .from('arcade_daily_pet')
          .select('stage, pets_hatched_today')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle();
        return data?.stage === 'adult' || (data?.pets_hatched_today && data.pets_hatched_today > 0);
      }
    }
  ];

  useEffect(() => {
    const checkProgress = async () => {
      if (!user) return;
      
      const completed: number[] = [];
      for (const step of steps) {
        try {
          const isComplete = await step.checkComplete();
          if (isComplete) {
            completed.push(step.id);
          }
        } catch (error) {
          console.error(`Error checking step ${step.id}:`, error);
        }
      }
      setCompletedSteps(completed);
      setLoading(false);
    };

    checkProgress();
  }, [user]);

  const progressPercentage = (completedSteps.length / steps.length) * 100;

  if (skipped) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground mb-4">
            Tour skipped. You can always come back here anytime you need guidance!
          </p>
          <Button variant="outline" onClick={() => setSkipped(false)}>
            Show Quick Start Guide
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl mb-2">Welcome to Your 90-Day Journey! 🎯</CardTitle>
              <CardDescription className="text-base">
                The 90-day planning philosophy is simple: long enough to achieve meaningful change, 
                short enough to stay focused and motivated. You'll plan at three levels—cycle, weekly, 
                and daily—and review regularly to stay on track.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSkipped(true)} className="text-muted-foreground">
              <X className="h-4 w-4 mr-1" />
              Skip tour
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Progress Indicator */}
      <Card className="border-border bg-card">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Your Progress</span>
            <Badge variant={completedSteps.length === steps.length ? 'default' : 'secondary'}>
              {completedSteps.length} of {steps.length} complete
            </Badge>
          </div>
          <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const isComplete = completedSteps.includes(step.id);
          const isNext = !isComplete && completedSteps.length === index;
          const Icon = step.icon;

          return (
            <Card 
              key={step.id} 
              className={`border-border transition-all ${
                isNext ? 'ring-2 ring-primary/50 border-primary/50' : ''
              } ${isComplete ? 'bg-primary/5' : 'bg-card'}`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    isComplete 
                      ? 'bg-primary text-primary-foreground' 
                      : isNext 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-secondary text-muted-foreground'
                  }`}>
                    {isComplete ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span className="font-semibold">{step.id}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4 text-primary" />
                      <h3 className={`font-semibold ${isComplete ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                        {step.title}
                      </h3>
                      {isComplete && (
                        <Badge variant="outline" className="text-primary border-primary/30">
                          Done!
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                    <Button asChild variant={isNext ? 'default' : 'outline'} size="sm">
                      <Link to={step.href}>
                        {isComplete ? 'Review' : isNext ? 'Start Now' : 'Go to step'}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Completion Message */}
      {completedSteps.length === steps.length && (
        <Card className="border-primary bg-primary/10">
          <CardContent className="pt-6 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">You're all set!</h3>
            <p className="text-muted-foreground">
              You've completed the quick start guide. Now it's time to build your momentum—one day at a time.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
