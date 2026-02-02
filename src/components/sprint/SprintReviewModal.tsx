import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Trophy, 
  Target, 
  CheckCircle2, 
  Flame, 
  Zap, 
  Snowflake,
  Loader2,
  PartyPopper,
  Save,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/types/moneyMomentum';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type RevenueSprint = Database['public']['Tables']['revenue_sprints']['Row'];
type SprintDailyProgress = Database['public']['Tables']['sprint_daily_progress']['Row'];
type SprintActionMetrics = Database['public']['Tables']['sprint_action_metrics']['Row'];

interface SprintReviewModalProps {
  sprint: RevenueSprint;
  dailyProgress: SprintDailyProgress[];
  actionMetrics: SprintActionMetrics[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function SprintReviewModal({
  sprint,
  dailyProgress,
  actionMetrics,
  open,
  onOpenChange,
  onComplete,
}: SprintReviewModalProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Form state
  const [whatWorked, setWhatWorked] = useState('');
  const [whatDidntWork, setWhatDidntWork] = useState('');
  const [biggestWin, setBiggestWin] = useState('');
  const [wouldChange, setWouldChange] = useState('');
  const [nextStep, setNextStep] = useState<'another' | 'break' | 'done'>('another');
  const [nextSprintGoal, setNextSprintGoal] = useState('');
  const [nextSprintDate, setNextSprintDate] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [updatedMetrics, setUpdatedMetrics] = useState<Record<string, {
    attempts: number;
    responses: number;
    conversions: number;
    revenue: number;
  }>>({});

  // Calculate totals
  const totalRevenue = dailyProgress.reduce((sum, p) => sum + (p.actual_revenue || 0), 0);
  const revenueGoal = sprint.gap_to_close || 0;
  const percentOfGoal = revenueGoal > 0 ? Math.round((totalRevenue / revenueGoal) * 100) : 0;
  const selectedActions = (sprint.selected_actions as any[]) || [];

  // Initialize metrics state
  useEffect(() => {
    const initial: Record<string, any> = {};
    selectedActions.forEach(action => {
      const existing = actionMetrics.find(m => m.action_name === action.action);
      initial[action.action] = {
        attempts: existing?.attempts || 0,
        responses: existing?.responses || 0,
        conversions: existing?.conversions || 0,
        revenue: existing?.revenue_generated || 0,
      };
    });
    setUpdatedMetrics(initial);
  }, [selectedActions, actionMetrics]);

  const updateMetric = (actionName: string, field: string, value: number) => {
    setUpdatedMetrics(prev => ({
      ...prev,
      [actionName]: { ...prev[actionName], [field]: value },
    }));
  };

  // Get ROI rating based on conversion rate
  const getRoiRating = (attempts: number, conversions: number): string => {
    if (attempts === 0) return 'cold';
    const rate = (conversions / attempts) * 100;
    if (rate >= 30) return 'hot';
    if (rate >= 10) return 'warm';
    return 'cold';
  };

  const saveReview = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Update action metrics with ROI ratings
      for (const action of selectedActions) {
        const metrics = updatedMetrics[action.action];
        if (metrics) {
          const roiRating = getRoiRating(metrics.attempts, metrics.conversions);
          
          // Upsert action metrics
          const { data: existing } = await supabase
            .from('sprint_action_metrics')
            .select('id')
            .eq('sprint_id', sprint.id)
            .eq('action_name', action.action)
            .maybeSingle();

          if (existing) {
            await supabase
              .from('sprint_action_metrics')
              .update({
                attempts: metrics.attempts,
                responses: metrics.responses,
                conversions: metrics.conversions,
                revenue_generated: metrics.revenue,
                roi_rating: roiRating,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id);
          } else {
            await supabase
              .from('sprint_action_metrics')
              .insert({
                sprint_id: sprint.id,
                user_id: session.user.id,
                action_name: action.action,
                action_type: action.brainstormType || 'custom',
                attempts: metrics.attempts,
                responses: metrics.responses,
                conversions: metrics.conversions,
                revenue_generated: metrics.revenue,
                roi_rating: roiRating,
              });
          }
        }
      }

      // Save sprint review
      await supabase
        .from('sprint_reviews')
        .insert({
          sprint_id: sprint.id,
          user_id: session.user.id,
          goal_amount: revenueGoal,
          actual_amount: totalRevenue,
          percent_of_goal: percentOfGoal,
          what_worked: whatWorked,
          what_didnt_work: whatDidntWork,
          biggest_win: biggestWin,
          would_change: wouldChange,
          next_sprint_goal: nextStep === 'another' ? parseFloat(nextSprintGoal) || null : null,
          next_sprint_start_date: nextStep === 'another' ? nextSprintDate || null : null,
          save_as_template: saveAsTemplate,
          template_name: saveAsTemplate ? templateName : null,
        });

      // Save as template if requested
      if (saveAsTemplate && templateName) {
        await supabase
          .from('sprint_templates')
          .insert({
            user_id: session.user.id,
            template_name: templateName,
            source_sprint_id: sprint.id,
            selected_actions: sprint.selected_actions,
            working_days: sprint.working_days,
            daily_time: sprint.daily_time,
            daily_duration: sprint.daily_duration,
            original_goal: revenueGoal,
            original_actual: totalRevenue,
            success_rate: percentOfGoal,
          });
      }

      // Update sprint status
      await supabase
        .from('revenue_sprints')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          total_revenue_generated: totalRevenue,
        })
        .eq('id', sprint.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-sprint'] });
      queryClient.invalidateQueries({ queryKey: ['sprint-templates'] });
      toast.success('Sprint review saved!');
      onComplete();
    },
    onError: () => {
      toast.error('Failed to save review');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            SPRINT REVIEW
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {format(parseISO(sprint.sprint_start_date!), 'MMM d')} - {format(parseISO(sprint.sprint_end_date!), 'MMM d')}
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* The Numbers */}
          <Card className={percentOfGoal >= 80 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-muted"}>
            <CardContent className="pt-4 space-y-3">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Goal</p>
                  <p className="text-xl font-bold">{formatCurrency(revenueGoal)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Actual</p>
                  <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalRevenue)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">% of Goal</p>
                  <p className="text-xl font-bold">{percentOfGoal}%</p>
                </div>
              </div>
              <Progress value={percentOfGoal} className="h-3" />
              
              {percentOfGoal >= 80 ? (
                <Alert className="bg-emerald-500/20 border-emerald-500/50">
                  <PartyPopper className="h-4 w-4" />
                  <AlertDescription>
                    🎉 You hit {percentOfGoal}% of your goal! That's incredible momentum.
                  </AlertDescription>
                </Alert>
              ) : (
                <p className="text-sm text-muted-foreground text-center">
                  You raised {formatCurrency(totalRevenue)}. Let's learn from this sprint.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Reflection */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Target className="h-4 w-4" />
              Reflection
            </h3>
            
            <div>
              <Label htmlFor="worked">What worked?</Label>
              <Textarea
                id="worked"
                placeholder="Which actions generated revenue? What would you do again?"
                value={whatWorked}
                onChange={(e) => setWhatWorked(e.target.value)}
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="didnt-work">What didn't work?</Label>
              <Textarea
                id="didnt-work"
                placeholder="What was a waste of time? What would you skip next time?"
                value={whatDidntWork}
                onChange={(e) => setWhatDidntWork(e.target.value)}
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="biggest-win">Biggest win</Label>
              <Textarea
                id="biggest-win"
                placeholder="What are you most proud of from this sprint?"
                value={biggestWin}
                onChange={(e) => setBiggestWin(e.target.value)}
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="would-change">If you ran this again, what would you change?</Label>
              <Textarea
                id="would-change"
                placeholder="What would you do differently?"
                value={wouldChange}
                onChange={(e) => setWouldChange(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* Action Performance */}
          <div className="space-y-4">
            <h3 className="font-semibold">Action Performance</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {selectedActions.map((action: any, i: number) => {
                const metrics = updatedMetrics[action.action] || { attempts: 0, responses: 0, conversions: 0, revenue: 0 };
                const roi = getRoiRating(metrics.attempts || 0, metrics.conversions || 0);
                
                return (
                  <div key={i} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      {roi === 'hot' && <Flame className="h-4 w-4 text-orange-500" />}
                      {roi === 'warm' && <Zap className="h-4 w-4 text-yellow-500" />}
                      {roi === 'cold' && <Snowflake className="h-4 w-4 text-blue-500" />}
                      <span className="font-medium text-sm">{action.action}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <Label className="text-xs">Attempts</Label>
                        <Input
                          type="number"
                          value={metrics.attempts || ''}
                          onChange={(e) => updateMetric(action.action, 'attempts', parseInt(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Responses</Label>
                        <Input
                          type="number"
                          value={metrics.responses || ''}
                          onChange={(e) => updateMetric(action.action, 'responses', parseInt(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Conversions</Label>
                        <Input
                          type="number"
                          value={metrics.conversions || ''}
                          onChange={(e) => updateMetric(action.action, 'conversions', parseInt(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Revenue</Label>
                        <Input
                          type="number"
                          value={metrics.revenue || ''}
                          onChange={(e) => updateMetric(action.action, 'revenue', parseFloat(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Next Steps */}
          <div className="space-y-4">
            <h3 className="font-semibold">What's next?</h3>
            <RadioGroup value={nextStep} onValueChange={(v) => setNextStep(v as any)} className="space-y-2">
              <Label htmlFor="next-another" className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer">
                <RadioGroupItem value="another" id="next-another" />
                Run another sprint immediately
              </Label>
              <Label htmlFor="next-break" className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer">
                <RadioGroupItem value="break" id="next-break" />
                Take a break first
              </Label>
              <Label htmlFor="next-done" className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer">
                <RadioGroupItem value="done" id="next-done" />
                I'm done with sprints for now
              </Label>
            </RadioGroup>

            {nextStep === 'another' && (
              <div className="grid grid-cols-2 gap-4 pl-6">
                <div>
                  <Label>Next sprint goal</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={nextSprintGoal}
                      onChange={(e) => setNextSprintGoal(e.target.value)}
                      className="pl-7"
                    />
                  </div>
                </div>
                <div>
                  <Label>Start date</Label>
                  <Input
                    type="date"
                    value={nextSprintDate}
                    onChange={(e) => setNextSprintDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Save as Template */}
          <div className="space-y-3">
            <Label htmlFor="save-template" className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                id="save-template"
                checked={saveAsTemplate}
                onCheckedChange={(checked) => setSaveAsTemplate(checked as boolean)}
              />
              Save as template to reuse
            </Label>
            
            {saveAsTemplate && (
              <Input
                placeholder="Template name (e.g., 'My Q1 Revenue Sprint')"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            )}
          </div>

          {/* Save Button */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Save Draft
            </Button>
            <Button 
              className="flex-1 gap-2"
              onClick={() => saveReview.mutate()}
              disabled={saveReview.isPending}
            >
              {saveReview.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Review
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
