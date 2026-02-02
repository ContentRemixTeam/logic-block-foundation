import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DollarSign, Target, CheckCircle2, ChevronDown, Zap, Sun, Coffee } from 'lucide-react';
import { useActiveSprint, useSprintMutations } from '@/hooks/useActiveSprint';
import { formatCurrency } from '@/types/moneyMomentum';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export function DailySprintSection() {
  const { data: sprintData, isLoading } = useActiveSprint();
  const { updateDailyProgress } = useSprintMutations();
  
  const [revenueInput, setRevenueInput] = useState('');
  const [completedActions, setCompletedActions] = useState<string[]>([]);
  const [showReflection, setShowReflection] = useState(false);
  const [targetStatus, setTargetStatus] = useState<'yes' | 'working' | 'no' | null>(null);
  const [whatWorked, setWhatWorked] = useState('');
  const [whatDidntWork, setWhatDidntWork] = useState('');

  if (isLoading || !sprintData) {
    return null;
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
  const revenueGoal = sprint.gap_to_close || 0;

  // If it's a rest day, show rest day message
  if (!isWorkingDay) {
    return (
      <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Coffee className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                🎯 REVENUE SPRINT - REST DAY
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Day {currentDay} of {totalDays}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            Rest days are important for momentum.
          </p>
          <div className="p-3 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Sprint progress</p>
            <p className="text-lg font-bold">
              {formatCurrency(totalRevenue)} / {formatCurrency(revenueGoal)}
            </p>
            <Progress value={percentComplete} className="h-2 mt-2" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Back at it: Next working day
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleRevenueChange = (value: string) => {
    setRevenueInput(value);
    const numValue = parseFloat(value) || 0;
    if (numValue >= dailyTarget) {
      setTargetStatus('yes');
    } else if (numValue > 0) {
      setTargetStatus('working');
    }
  };

  const handleActionToggle = (actionId: string, checked: boolean) => {
    const newCompleted = checked 
      ? [...completedActions, actionId]
      : completedActions.filter(a => a !== actionId);
    setCompletedActions(newCompleted);
    
    // Auto-save action completion
    updateDailyProgress.mutate({
      sprintId: sprint.id,
      date: format(new Date(), 'yyyy-MM-dd'),
      actionsCompleted: newCompleted,
    });
  };

  const handleSaveReflection = () => {
    updateDailyProgress.mutate({
      sprintId: sprint.id,
      date: format(new Date(), 'yyyy-MM-dd'),
      revenue: parseFloat(revenueInput) || 0,
      actionsCompleted: completedActions,
      whatWorked,
      whatDidntWork,
      hitTarget: targetStatus === 'yes',
    });
    setShowReflection(false);
  };

  const currentRevenue = parseFloat(revenueInput) || todayProgress?.actual_revenue || 0;
  const onTrack = currentRevenue >= dailyTarget;

  return (
    <Card className="border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                🎯 REVENUE SPRINT - DAY {currentDay}
              </CardTitle>
            </div>
          </div>
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">
            {daysRemaining} days left
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Today's Target */}
        <div className="p-4 bg-background rounded-lg border-2 border-emerald-500/30">
          <div className="text-center mb-3">
            <span className="text-sm text-muted-foreground">Today's target</span>
            <p className="text-3xl font-bold text-emerald-600">{formatCurrency(dailyTarget)}</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="revenue-today" className="text-sm">Revenue so far today</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="revenue-today"
                type="number"
                placeholder="0"
                value={revenueInput}
                onChange={(e) => handleRevenueChange(e.target.value)}
                className="pl-7 text-lg font-medium"
              />
            </div>
            
            {currentRevenue > 0 && (
              <p className={cn(
                "text-sm text-center font-medium",
                onTrack ? "text-emerald-600" : "text-amber-600"
              )}>
                {onTrack ? "✅ Hit target!" : "Keep going..."}
              </p>
            )}
          </div>
        </div>

        {/* Today's Actions */}
        {selectedActions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Today's sprint actions:</h4>
            <div className="space-y-2">
              {selectedActions.map((action: any, i: number) => (
                <Collapsible key={i}>
                  <div className={cn(
                    "flex items-start gap-3 p-3 border rounded-lg transition-colors",
                    completedActions.includes(action.id || String(i)) 
                      ? "bg-emerald-500/5 border-emerald-500/30" 
                      : "bg-background"
                  )}>
                    <Checkbox
                      id={`sprint-action-${i}`}
                      checked={completedActions.includes(action.id || String(i))}
                      onCheckedChange={(checked) => 
                        handleActionToggle(action.id || String(i), checked as boolean)
                      }
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <Label 
                        htmlFor={`sprint-action-${i}`}
                        className={cn(
                          "cursor-pointer font-medium",
                          completedActions.includes(action.id || String(i)) && "line-through text-muted-foreground"
                        )}
                      >
                        {action.action}
                      </Label>
                      <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mt-1">
                        <ChevronDown className="h-3 w-3" />
                        Details
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 text-sm text-muted-foreground">
                        <p>{action.details}</p>
                        <p className="text-xs mt-1">Time: {action.timePerDay}</p>
                      </CollapsibleContent>
                    </div>
                  </div>
                </Collapsible>
              ))}
            </div>
          </div>
        )}

        {/* Quick Reflection */}
        <Collapsible open={showReflection} onOpenChange={setShowReflection}>
          <CollapsibleTrigger className="w-full">
            <Button variant="outline" className="w-full gap-2">
              <Sun className="h-4 w-4" />
              Quick Reflection
              <ChevronDown className={cn("h-4 w-4 ml-auto transition-transform", showReflection && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3 p-3 border rounded-lg">
            <div>
              <Label className="text-sm mb-2 block">Did you hit your target?</Label>
              <RadioGroup
                value={targetStatus || ''}
                onValueChange={(v) => setTargetStatus(v as any)}
                className="flex gap-2"
              >
                <Label htmlFor="target-yes" className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="yes" id="target-yes" />
                  Yes!
                </Label>
                <Label htmlFor="target-working" className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="working" id="target-working" />
                  Still working
                </Label>
                <Label htmlFor="target-no" className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="no" id="target-no" />
                  No
                </Label>
              </RadioGroup>
            </div>
            
            <div>
              <Label htmlFor="what-worked" className="text-sm">What worked today?</Label>
              <Textarea
                id="what-worked"
                placeholder="Optional"
                value={whatWorked}
                onChange={(e) => setWhatWorked(e.target.value)}
                rows={2}
              />
            </div>
            
            <div>
              <Label htmlFor="what-didnt" className="text-sm">What didn't work?</Label>
              <Textarea
                id="what-didnt"
                placeholder="Optional"
                value={whatDidntWork}
                onChange={(e) => setWhatDidntWork(e.target.value)}
                rows={2}
              />
            </div>
            
            <Button 
              className="w-full" 
              onClick={handleSaveReflection}
              disabled={updateDailyProgress.isPending}
            >
              Save Reflection
            </Button>
          </CollapsibleContent>
        </Collapsible>

        {/* Sprint Progress Mini */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm">
          <div>
            <span className="text-muted-foreground">Sprint Progress: </span>
            <span className="font-medium">
              {formatCurrency(totalRevenue)}/{formatCurrency(revenueGoal)}
            </span>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/sprint-dashboard">View Full</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
