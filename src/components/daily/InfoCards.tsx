import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays, differenceInHours, startOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import { Rocket, Target, TrendingUp, Zap, ChevronRight, Loader2, ListTodo, StickyNote } from 'lucide-react';

export function InfoCards() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [quickInput, setQuickInput] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [addingNote, setAddingNote] = useState(false);

  // Query for upcoming launch
  const { data: upcomingLaunch } = useQuery({
    queryKey: ['upcoming-launch', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data } = await supabase
        .from('projects')
        .select('id, name, launch_start_date, launch_end_date')
        .eq('user_id', user.id)
        .eq('is_launch', true)
        .gte('launch_end_date', today)
        .order('launch_start_date', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      return data;
    },
    enabled: !!user?.id,
  });

  // Query for current week's priorities
  const { data: weeklyPriorities } = useQuery({
    queryKey: ['weekly-priorities-info', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      
      const { data } = await supabase
        .from('weekly_plans')
        .select('top_3_priorities')
        .eq('user_id', user.id)
        .eq('start_of_week', weekStartStr)
        .maybeSingle();
      
      if (!data?.top_3_priorities) return [];
      
      return Array.isArray(data.top_3_priorities) 
        ? data.top_3_priorities.map(String).filter(Boolean).slice(0, 3)
        : [];
    },
    enabled: !!user?.id,
  });

  // Query for today's stats (tasks completed, streak)
  const { data: todayStats } = useQuery({
    queryKey: ['today-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return { tasksCompleted: 0, streak: 0, hoursLogged: 0 };
      
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Get tasks completed today
      const { count: tasksCompleted } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .gte('completed_at', `${today}T00:00:00`)
        .lte('completed_at', `${today}T23:59:59`);
      
      // Get arcade wallet for coins (as "points")
      const { data: wallet } = await supabase
        .from('arcade_wallet')
        .select('coins_balance')
        .eq('user_id', user.id)
        .maybeSingle();
      
      // Get daily checkin streak
      const { data: checkins } = await supabase
        .from('daily_checkins')
        .select('checkin_date')
        .eq('user_id', user.id)
        .order('checkin_date', { ascending: false })
        .limit(30);
      
      let streak = 0;
      if (checkins && checkins.length > 0) {
        const dates = checkins.map(c => c.checkin_date);
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        
        for (let i = 0; i < dates.length; i++) {
          const checkDate = new Date(dates[i]);
          checkDate.setHours(0, 0, 0, 0);
          const expectedDate = new Date(todayDate);
          expectedDate.setDate(todayDate.getDate() - i);
          
          if (checkDate.getTime() === expectedDate.getTime()) {
            streak++;
          } else {
            break;
          }
        }
      }
      
      return {
        tasksCompleted: tasksCompleted || 0,
        streak,
        points: wallet?.coins_balance || 0,
      };
    },
    enabled: !!user?.id,
  });

  // Calculate launch progress
  const launchProgress = upcomingLaunch ? (() => {
    const start = new Date(upcomingLaunch.launch_start_date);
    const end = new Date(upcomingLaunch.launch_end_date);
    const today = new Date();
    
    if (today < start) return 0;
    if (today > end) return 100;
    
    const total = differenceInDays(end, start);
    const elapsed = differenceInDays(today, start);
    return Math.round((elapsed / total) * 100);
  })() : 0;

  const daysUntilLaunch = upcomingLaunch 
    ? differenceInDays(new Date(upcomingLaunch.launch_start_date), new Date())
    : 0;

  const handleAddTask = async () => {
    if (!quickInput.trim() || !user?.id) return;
    
    setAddingTask(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          task_text: quickInput.trim(),
          scheduled_date: today,
          status: 'scheduled',
        });
      
      if (error) throw error;
      
      setQuickInput('');
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      toast({ title: '✅ Task added!' });
    } catch (error: any) {
      toast({ 
        title: 'Error adding task', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setAddingTask(false);
    }
  };

  const handleAddNote = async () => {
    if (!quickInput.trim() || !user?.id) return;
    
    setAddingNote(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Get or create today's daily plan and append to brain_dump
      const { data: existingPlan } = await supabase
        .from('daily_plans')
        .select('day_id, brain_dump')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();
      
      if (existingPlan) {
        const currentDump = existingPlan.brain_dump || '';
        const newDump = currentDump 
          ? `${currentDump}\n${quickInput.trim()}`
          : quickInput.trim();
        
        await supabase
          .from('daily_plans')
          .update({ brain_dump: newDump })
          .eq('day_id', existingPlan.day_id);
      }
      
      setQuickInput('');
      queryClient.invalidateQueries({ queryKey: ['daily-plan'] });
      toast({ title: '📝 Note added to Brain Dump!' });
    } catch (error: any) {
      toast({ 
        title: 'Error adding note', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setAddingNote(false);
    }
  };

  // Launch phase calculation
  const launchPhase = upcomingLaunch ? (() => {
    const start = new Date(upcomingLaunch.launch_start_date);
    const end = new Date(upcomingLaunch.launch_end_date);
    const today = new Date();
    
    if (today < start) return 'pre_launch';
    if (today > end) return 'closed';
    
    const hoursUntilClose = differenceInHours(end, today);
    if (hoursUntilClose <= 48) return 'last_48h';
    return 'live';
  })() : 'none';

  const hoursUntilClose = upcomingLaunch 
    ? differenceInHours(new Date(upcomingLaunch.launch_end_date), new Date())
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      {/* Launch Countdown Card */}
      <Card className={cn(
        "hover:shadow-md transition-shadow cursor-pointer",
        launchPhase === 'last_48h' && "border-red-500/50 animate-pulse",
        launchPhase === 'live' && "border-green-500/50"
      )} onClick={() => upcomingLaunch && navigate(`/projects/${upcomingLaunch.id}`)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Rocket className={cn(
              "h-4 w-4",
              launchPhase === 'last_48h' ? "text-red-500" :
              launchPhase === 'live' ? "text-green-500" : "text-orange-500"
            )} />
            {launchPhase === 'live' || launchPhase === 'last_48h' ? 'Launch Active' : 'Launch Countdown'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingLaunch ? (
            <div className="space-y-2">
              <p className="font-semibold text-sm truncate">{upcomingLaunch.name}</p>
              <div className="flex items-center justify-between text-xs">
                {launchPhase === 'last_48h' ? (
                  <span className="text-red-500 font-bold">Cart closes in {hoursUntilClose}h!</span>
                ) : launchPhase === 'live' ? (
                  <span className="text-green-500 font-medium">LIVE NOW</span>
                ) : (
                  <span className="text-muted-foreground">{daysUntilLaunch > 0 ? `${daysUntilLaunch} days until launch` : 'Launching now!'}</span>
                )}
              </div>
              <Progress 
                value={launchProgress} 
                className={cn(
                  "h-2",
                  launchPhase === 'last_48h' && "[&>div]:bg-red-500",
                  launchPhase === 'live' && "[&>div]:bg-green-500"
                )} 
              />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              <p>No upcoming launches</p>
              <Button 
                variant="link" 
                size="sm" 
                className="p-0 h-auto text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/wizards/launch');
                }}
              >
                Plan a launch →
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Priorities Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-500" />
            Week's Priorities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {weeklyPriorities && weeklyPriorities.length > 0 ? (
            <div className="space-y-2">
              {weeklyPriorities.map((priority, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Checkbox disabled className="mt-0.5" />
                  <span className="text-xs line-clamp-1">{priority}</span>
                </div>
              ))}
              <Button 
                variant="link" 
                size="sm" 
                className="p-0 h-auto text-xs"
                onClick={() => navigate('/weekly-plan')}
              >
                See Full Plan <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              <p>No priorities set</p>
              <Button 
                variant="link" 
                size="sm" 
                className="p-0 h-auto text-xs"
                onClick={() => navigate('/weekly-plan')}
              >
                Set weekly priorities →
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            Today's Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-2xl font-bold">{todayStats?.tasksCompleted || 0}</p>
              <p className="text-[10px] text-muted-foreground">Tasks Done</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {todayStats?.streak || 0}
                {(todayStats?.streak || 0) > 0 && <span className="text-orange-500">🔥</span>}
              </p>
              <p className="text-[10px] text-muted-foreground">Day Streak</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{todayStats?.points || 0}</p>
              <p className="text-[10px] text-muted-foreground">Coins</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Capture Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Quick Capture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Input
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="Quick thought or task..."
              className="h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddTask();
                }
              }}
            />
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1 h-7 text-xs"
                onClick={handleAddTask}
                disabled={!quickInput.trim() || addingTask}
              >
                {addingTask ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <ListTodo className="h-3 w-3 mr-1" />
                    Task
                  </>
                )}
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1 h-7 text-xs"
                onClick={handleAddNote}
                disabled={!quickInput.trim() || addingNote}
              >
                {addingNote ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <StickyNote className="h-3 w-3 mr-1" />
                    Note
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
