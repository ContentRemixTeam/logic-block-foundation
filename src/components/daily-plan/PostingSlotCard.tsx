import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, ExternalLink, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface CycleStrategy {
  lead_primary_platform: string | null;
  posting_days: unknown;
  posting_time: string | null;
  lead_content_type: string | null;
}

export function PostingSlotCard() {
  const { user } = useAuth();
  const [isPostingDay, setIsPostingDay] = useState(false);
  const [strategy, setStrategy] = useState<CycleStrategy | null>(null);
  const [contentTasksToday, setContentTasksToday] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const checkPostingDay = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Get current cycle
        const { data: cycleData } = await supabase.functions.invoke('get-current-cycle-or-create');
        const cycle = cycleData?.cycle || cycleData?.data?.cycle;
        
        if (!cycle) {
          setLoading(false);
          return;
        }

        // Get cycle strategy
        const { data: strategyData } = await supabase
          .from('cycle_strategy')
          .select('lead_primary_platform, posting_days, posting_time, lead_content_type')
          .eq('cycle_id', cycle.cycle_id)
          .single();

        if (strategyData) {
          setStrategy(strategyData);

          // Check if today is a posting day
          const today = format(new Date(), 'EEEE').toLowerCase();
          const postingDays = Array.isArray(strategyData.posting_days) 
            ? strategyData.posting_days.map((d: string) => d.toLowerCase())
            : [];
          
          setIsPostingDay(postingDays.includes(today));
        }

        // Count content tasks for today
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const { count } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
          .eq('category', 'content')
          .or(`scheduled_date.eq.${todayStr},planned_day.eq.${todayStr}`)
          .eq('is_completed', false);

        setContentTasksToday(count || 0);
      } catch (error) {
        console.error('Error checking posting day:', error);
      } finally {
        setLoading(false);
      }
    };

    checkPostingDay();
  }, [user]);

  if (loading || !isPostingDay || !strategy) {
    return null;
  }

  return (
    <Card className="border-blue-500/30 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">📣 Posting Day</span>
                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
                  {strategy.lead_primary_platform || 'Content'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {strategy.posting_time && `Scheduled: ${strategy.posting_time}`}
                {strategy.lead_content_type && ` • ${strategy.lead_content_type}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {contentTasksToday > 0 ? (
              <Badge variant="secondary" className="text-xs">
                {contentTasksToday} content task{contentTasksToday > 1 ? 's' : ''} today
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-green-600 border-green-500/20 bg-green-500/10">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                All done!
              </Badge>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link to="/tasks?category=content">
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                View
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
