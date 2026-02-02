import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { DollarSign, Calendar, Target, Pause, Square, ExternalLink, CheckCircle2, Loader2 } from 'lucide-react';
import { useActiveSprint, useSprintMutations } from '@/hooks/useActiveSprint';
import { formatCurrency } from '@/types/moneyMomentum';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function ActiveSprintWidget() {
  const { data: sprintData, isLoading } = useActiveSprint();
  const { updateDailyProgress, pauseSprint, endSprintEarly } = useSprintMutations();
  
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [revenue, setRevenue] = useState('');
  const [whatWorked, setWhatWorked] = useState('');
  const [whatDidntWork, setWhatDidntWork] = useState('');
  const [pauseReason, setPauseReason] = useState('');
  const [resumeDate, setResumeDate] = useState('');
  const [completedActions, setCompletedActions] = useState<string[]>([]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!sprintData) {
    return null; // No active sprint
  }

  const { 
    sprint, 
    currentDay, 
    totalDays, 
    daysRemaining, 
    totalRevenue, 
    dailyTarget, 
    percentComplete,
    isWorkingDay,
    todayProgress,
  } = sprintData;

  const selectedActions = (sprint.selected_actions as any[]) || [];

  const handleCheckIn = async () => {
    await updateDailyProgress.mutateAsync({
      sprintId: sprint.id,
      date: format(new Date(), 'yyyy-MM-dd'),
      revenue: parseFloat(revenue) || 0,
      actionsCompleted: completedActions,
      whatWorked,
      whatDidntWork,
      hitTarget: parseFloat(revenue) >= dailyTarget,
    });
    
    toast.success('Daily check-in saved!');
    setCheckInOpen(false);
    setRevenue('');
    setWhatWorked('');
    setWhatDidntWork('');
    setCompletedActions([]);
  };

  const handlePause = async () => {
    await pauseSprint.mutateAsync({
      sprintId: sprint.id,
      reason: pauseReason,
      resumeDate: resumeDate || undefined,
    });
    setPauseOpen(false);
  };

  const handleEnd = async () => {
    await endSprintEarly.mutateAsync(sprint.id);
  };

  const handleActionToggle = (actionId: string, checked: boolean) => {
    if (checked) {
      setCompletedActions([...completedActions, actionId]);
    } else {
      setCompletedActions(completedActions.filter(a => a !== actionId));
    }
  };

  const revenueGoal = sprint.gap_to_close || 0;
  const hitTargetToday = todayProgress?.hit_target || false;

  return (
    <Card className="border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-lg">ACTIVE REVENUE SPRINT</CardTitle>
              <p className="text-sm text-muted-foreground">
                Day {currentDay} of {totalDays}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">
            {daysRemaining} days left
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {formatCurrency(totalRevenue)} / {formatCurrency(revenueGoal)}
            </span>
          </div>
          <Progress value={percentComplete} className="h-3" />
          <p className="text-xs text-muted-foreground text-center">
            {percentComplete}% of goal
          </p>
        </div>

        {/* Today's Target */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Today's target:</span>
            <span className="text-lg font-bold text-primary">{formatCurrency(dailyTarget)}</span>
          </div>
          
          {isWorkingDay ? (
            <div className="mt-3">
              <Dialog open={checkInOpen} onOpenChange={setCheckInOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="w-full gap-2" 
                    variant={hitTargetToday ? "outline" : "default"}
                  >
                    {hitTargetToday ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Update check-in
                      </>
                    ) : (
                      <>
                        <Target className="h-4 w-4" />
                        Did you hit today's target?
                      </>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Daily Check-in</DialogTitle>
                    <DialogDescription>
                      Track your progress for {format(new Date(), 'MMMM d')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="revenue">Revenue today</Label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          id="revenue"
                          type="number"
                          placeholder="0"
                          value={revenue}
                          onChange={(e) => setRevenue(e.target.value)}
                          className="pl-7"
                        />
                      </div>
                    </div>

                    {selectedActions.length > 0 && (
                      <div>
                        <Label className="block mb-2">Actions completed</Label>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {selectedActions.map((action: any, i: number) => (
                            <Label
                              key={i}
                              htmlFor={`action-${i}`}
                              className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-accent/50"
                            >
                              <Checkbox
                                id={`action-${i}`}
                                checked={completedActions.includes(action.id || String(i))}
                                onCheckedChange={(checked) => 
                                  handleActionToggle(action.id || String(i), checked as boolean)
                                }
                              />
                              <span className="text-sm truncate">{action.action}</span>
                            </Label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="worked">What worked?</Label>
                      <Textarea
                        id="worked"
                        placeholder="Optional"
                        value={whatWorked}
                        onChange={(e) => setWhatWorked(e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label htmlFor="didnt-work">What didn't work?</Label>
                      <Textarea
                        id="didnt-work"
                        placeholder="Optional"
                        value={whatDidntWork}
                        onChange={(e) => setWhatDidntWork(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      onClick={handleCheckIn} 
                      disabled={updateDailyProgress.isPending}
                      className="w-full"
                    >
                      {updateDailyProgress.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Save Check-in
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-2 text-center">
              🌴 Rest day - recharge for tomorrow!
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1" asChild>
            <Link to="/sprint-dashboard">
              <ExternalLink className="h-3 w-3" />
              View Full Sprint
            </Link>
          </Button>
          
          <Dialog open={pauseOpen} onOpenChange={setPauseOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <Pause className="h-3 w-3" />
                Pause
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>⏸ Pause Sprint</DialogTitle>
                <DialogDescription>
                  Warning: Pausing reduces momentum. Only pause if truly necessary.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="pause-reason">Reason (optional)</Label>
                  <Textarea
                    id="pause-reason"
                    placeholder="Why are you pausing?"
                    value={pauseReason}
                    onChange={(e) => setPauseReason(e.target.value)}
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="resume-date">Resume on</Label>
                  <Input
                    id="resume-date"
                    type="date"
                    value={resumeDate}
                    onChange={(e) => setResumeDate(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setPauseOpen(false)}>
                  Keep Going
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handlePause}
                  disabled={pauseSprint.isPending}
                >
                  Pause Sprint
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                <Square className="h-3 w-3" />
                End
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>End Sprint Early?</AlertDialogTitle>
                <AlertDialogDescription>
                  You've raised {formatCurrency(totalRevenue)} so far ({percentComplete}% of goal).
                  Are you sure you want to end this sprint early?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep Going</AlertDialogCancel>
                <AlertDialogAction onClick={handleEnd}>
                  End Sprint
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
