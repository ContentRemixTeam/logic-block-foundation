import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { PremiumCard, PremiumCardHeader, PremiumCardTitle, PremiumCardContent } from '@/components/ui/premium-card';
import { Calendar, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface WeeklyRoutineReminderProps {
  weeklyPlanningDay?: string | null;
  weeklyDebriefDay?: string | null;
}

export function WeeklyRoutineReminder({ weeklyPlanningDay, weeklyDebriefDay }: WeeklyRoutineReminderProps) {
  if (!weeklyPlanningDay && !weeklyDebriefDay) return null;
  
  const today = format(new Date(), 'EEEE'); // "Monday", "Tuesday", etc.
  const isPlanningDay = weeklyPlanningDay && today.toLowerCase() === weeklyPlanningDay.toLowerCase();
  const isDebriefDay = weeklyDebriefDay && today.toLowerCase() === weeklyDebriefDay.toLowerCase();
  
  // Don't show if today is neither planning nor debrief day
  if (!isPlanningDay && !isDebriefDay) return null;

  return (
    <PremiumCard category="plan">
      <PremiumCardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-foreground-muted" />
          <PremiumCardTitle className="text-base">Weekly Routine</PremiumCardTitle>
        </div>
      </PremiumCardHeader>
      <PremiumCardContent className="space-y-3">
        {isPlanningDay && (
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="font-medium text-primary">Planning Day!</span>
            </div>
            <p className="text-sm text-foreground-muted mb-2">
              Today is your weekly planning day. Set your priorities for the week.
            </p>
            <Link to="/weekly-plan">
              <Button size="sm" variant="default">
                Plan Your Week
              </Button>
            </Link>
          </div>
        )}
        
        {isDebriefDay && (
          <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/20">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-secondary" />
              <span className="font-medium">Debrief Day!</span>
            </div>
            <p className="text-sm text-foreground-muted mb-2">
              Today is your weekly debrief day. Reflect on your progress.
            </p>
            <Link to="/weekly-review">
              <Button size="sm" variant="outline">
                Complete Review
              </Button>
            </Link>
          </div>
        )}
        
        {!isPlanningDay && !isDebriefDay && (
          <div className="space-y-2 text-sm">
            {weeklyPlanningDay && (
              <div className="flex items-center justify-between">
                <span className="text-foreground-muted">Planning Day</span>
                <Badge variant="outline">{weeklyPlanningDay}</Badge>
              </div>
            )}
            {weeklyDebriefDay && (
              <div className="flex items-center justify-between">
                <span className="text-foreground-muted">Debrief Day</span>
                <Badge variant="outline">{weeklyDebriefDay}</Badge>
              </div>
            )}
          </div>
        )}
      </PremiumCardContent>
    </PremiumCard>
  );
}
