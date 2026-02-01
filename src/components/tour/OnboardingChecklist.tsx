import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTour } from '@/hooks/useTour';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, X, Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  href: string;
  completed: boolean;
}

export function OnboardingChecklist() {
  const { showChecklist, dismissChecklist } = useTour();
  const { user } = useAuth();
  const [items, setItems] = useState<ChecklistItem[]>([
    {
      id: 'cycle',
      label: 'Complete Cycle Setup',
      description: 'Define your 90-day goal and metrics',
      href: '/cycle-setup',
      completed: false,
    },
    {
      id: 'weekly',
      label: 'Create first Weekly Plan',
      description: 'Set your top 3 priorities for the week',
      href: '/weekly-plan',
      completed: false,
    },
    {
      id: 'daily',
      label: 'Complete first Daily Plan',
      description: 'Plan your most important tasks',
      href: '/daily-plan',
      completed: false,
    },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !showChecklist) return;

    const checkProgress = async () => {
      try {
        const [cycleRes, weeklyRes, dailyRes] = await Promise.all([
          supabase.functions.invoke('get-current-cycle-or-create'),
          supabase.functions.invoke('get-weekly-plan'),
          supabase.functions.invoke('get-daily-plan'),
        ]);

        setItems(prev => prev.map(item => {
          switch (item.id) {
            case 'cycle':
              return { ...item, completed: Boolean(cycleRes.data?.cycle?.goal) };
            case 'weekly':
              const priorities = weeklyRes.data?.weekly_plan?.top_3_priorities;
              return { ...item, completed: Array.isArray(priorities) && priorities.some((p: string) => p?.trim()) };
            case 'daily':
              const top3 = dailyRes.data?.daily_plan?.top_3_today;
              return { ...item, completed: Array.isArray(top3) && top3.some((t: string) => t?.trim()) };
            default:
              return item;
          }
        }));
      } catch (error) {
        console.error('Error checking onboarding progress:', error);
      } finally {
        setLoading(false);
      }
    };

    checkProgress();
  }, [user, showChecklist]);

  const completedCount = items.filter(i => i.completed).length;
  const allComplete = completedCount === items.length;

  // Hide completely when all planning is done or still loading
  if (!showChecklist || loading || allComplete) return null;

  const progress = (completedCount / items.length) * 100;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Getting Started</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={dismissChecklist}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{completedCount} of {items.length} complete</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.id}
            to={item.href}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg transition-colors group",
              item.completed
                ? "bg-muted/50"
                : "hover:bg-muted cursor-pointer"
            )}
          >
            {item.completed ? (
              <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium",
                item.completed && "line-through text-muted-foreground"
              )}>
                {item.label}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {item.description}
              </p>
            </div>
            {!item.completed && (
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
