import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp, Clock } from 'lucide-react';
import { format, startOfWeek, endOfWeek, isSameWeek, isLastDayOfMonth, subDays } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type ReminderType = 'weekly' | 'monthly' | null;

export function DebriefReminderPopup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [reminderType, setReminderType] = useState<ReminderType>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkDebriefReminders();
    }
  }, [user]);

  const checkDebriefReminders = async () => {
    if (!user) return;
    
    try {
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
      const isEndOfWeek = dayOfWeek === 0 || dayOfWeek === 6; // Weekend
      const isEndOfMonth = isLastDayOfMonth(today) || isLastDayOfMonth(subDays(today, 1)); // Last day or day before
      
      // Check session storage to avoid showing multiple times per session
      const shownThisSession = sessionStorage.getItem('debriefReminderShown');
      if (shownThisSession) {
        setLoading(false);
        return;
      }

      // Priority: Monthly > Weekly
      if (isEndOfMonth) {
        // Check if monthly review exists for this month
        const currentMonth = today.getMonth() + 1;
        const { data: monthlyReview } = await supabase
          .from('monthly_reviews')
          .select('review_id')
          .eq('user_id', user.id)
          .eq('month', currentMonth)
          .maybeSingle();
        
        if (!monthlyReview) {
          setReminderType('monthly');
          setIsOpen(true);
          sessionStorage.setItem('debriefReminderShown', 'true');
        }
      } else if (isEndOfWeek) {
        // Check if weekly review exists for this week
        const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        
        const { data: weeklyPlan } = await supabase
          .from('weekly_plans')
          .select('week_id')
          .eq('user_id', user.id)
          .eq('start_of_week', weekStart)
          .maybeSingle();
        
        if (weeklyPlan) {
          const { data: weeklyReview } = await supabase
            .from('weekly_reviews')
            .select('review_id')
            .eq('user_id', user.id)
            .eq('week_id', weeklyPlan.week_id)
            .maybeSingle();
          
          if (!weeklyReview) {
            setReminderType('weekly');
            setIsOpen(true);
            sessionStorage.setItem('debriefReminderShown', 'true');
          }
        }
      }
    } catch (error) {
      console.error('Error checking debrief reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToDebrief = () => {
    setIsOpen(false);
    if (reminderType === 'weekly') {
      navigate('/weekly-review');
    } else if (reminderType === 'monthly') {
      navigate('/monthly-review');
    }
  };

  const handleDismiss = () => {
    setIsOpen(false);
  };

  if (loading || !reminderType) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {reminderType === 'weekly' ? (
              <>
                <Calendar className="h-5 w-5 text-accent" />
                Time for Your Weekly Debrief! 📊
              </>
            ) : (
              <>
                <TrendingUp className="h-5 w-5 text-primary" />
                Monthly Review Time! 🎯
              </>
            )}
          </DialogTitle>
          <DialogDescription className="pt-2">
            {reminderType === 'weekly' ? (
              <>
                It's the weekend! Take 10 minutes to reflect on your week, celebrate your wins, and set yourself up for success next week.
              </>
            ) : (
              <>
                The month is wrapping up. Review your progress, identify patterns, and plan your next month for maximum impact.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Clock className="h-4 w-4" />
            <span>Takes about {reminderType === 'weekly' ? '5-10' : '10-15'} minutes</span>
          </div>
          
          <div className="space-y-2">
            <Button onClick={handleGoToDebrief} className="w-full">
              {reminderType === 'weekly' ? 'Do Weekly Review' : 'Do Monthly Review'}
            </Button>
            <Button variant="ghost" onClick={handleDismiss} className="w-full text-muted-foreground">
              Remind Me Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
