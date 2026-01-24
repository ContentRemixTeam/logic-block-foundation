import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLaunchDebrief, LaunchDebrief as LaunchDebriefType } from '@/hooks/useLaunchDebrief';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Rocket, TrendingUp, Target, Lightbulb, Sparkles, CheckCircle2 } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

export default function LaunchDebrief() {
  const { launchId } = useParams<{ launchId: string }>();
  const navigate = useNavigate();
  const { launch, debrief, isLoading, saveDebrief } = useLaunchDebrief(launchId);
  
  const [formData, setFormData] = useState<Partial<LaunchDebriefType>>({
    actual_revenue: null,
    actual_sales: null,
    what_worked: '',
    what_to_improve: '',
    biggest_win: '',
    would_do_differently: '',
    energy_rating: 3,
    will_launch_again: true,
    notes: '',
  });
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (debrief) {
      setFormData({
        actual_revenue: debrief.actual_revenue,
        actual_sales: debrief.actual_sales,
        what_worked: debrief.what_worked || '',
        what_to_improve: debrief.what_to_improve || '',
        biggest_win: debrief.biggest_win || '',
        would_do_differently: debrief.would_do_differently || '',
        energy_rating: debrief.energy_rating || 3,
        will_launch_again: debrief.will_launch_again ?? true,
        notes: debrief.notes || '',
      });
    }
  }, [debrief]);

  const handleSave = async () => {
    setIsSaving(true);
    
    // Calculate conversion rate if we have sales data
    let conversionRate = null;
    if (formData.actual_sales && launch?.sales_needed && launch.sales_needed > 0) {
      conversionRate = (formData.actual_sales / launch.sales_needed) * 100;
    }

    const success = await saveDebrief({
      ...formData,
      conversion_rate: conversionRate,
    });
    
    setIsSaving(false);
    
    if (success) {
      navigate('/dashboard');
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-3xl py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (!launch) {
    return (
      <div className="container max-w-3xl py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Launch not found</p>
            <Button variant="outline" onClick={() => navigate('/dashboard')} className="mt-4">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const launchDuration = launch.cart_opens && launch.cart_closes 
    ? differenceInDays(parseISO(launch.cart_closes), parseISO(launch.cart_opens)) + 1
    : null;

  const revenueAchieved = formData.actual_revenue && launch.revenue_goal
    ? Math.round((formData.actual_revenue / launch.revenue_goal) * 100)
    : null;

  const salesAchieved = formData.actual_sales && launch.sales_needed
    ? Math.round((formData.actual_sales / launch.sales_needed) * 100)
    : null;

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="h-6 w-6 text-accent" />
            Launch Debrief
          </h1>
          <p className="text-muted-foreground">
            Reflect on {launch.name} and capture your learnings
          </p>
        </div>
      </div>

      {/* Launch Summary */}
      <Card className="border-accent/30 bg-accent/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{launch.name}</CardTitle>
          <CardDescription>
            {launch.cart_opens && (
              <>
                {format(parseISO(launch.cart_opens), 'MMM d')} - {format(parseISO(launch.cart_closes), 'MMM d, yyyy')}
                {launchDuration && ` (${launchDuration} days)`}
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            {launch.revenue_goal && (
              <div>
                <span className="text-muted-foreground">Revenue Goal</span>
                <p className="font-semibold">${launch.revenue_goal.toLocaleString()}</p>
              </div>
            )}
            {launch.sales_needed && (
              <div>
                <span className="text-muted-foreground">Sales Goal</span>
                <p className="font-semibold">{launch.sales_needed} sales</p>
              </div>
            )}
            {launch.offer_goal && (
              <div>
                <span className="text-muted-foreground">Offer</span>
                <p className="font-semibold">{launch.offer_goal}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Actual Results
          </CardTitle>
          <CardDescription>
            How did your launch perform?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="actual_revenue">Actual Revenue ($)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="actual_revenue"
                  type="number"
                  placeholder="0"
                  className="pl-7"
                  value={formData.actual_revenue ?? ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    actual_revenue: e.target.value ? parseFloat(e.target.value) : null 
                  }))}
                />
              </div>
              {revenueAchieved !== null && (
                <p className={cn(
                  "text-sm font-medium",
                  revenueAchieved >= 100 ? "text-green-600" : revenueAchieved >= 75 ? "text-yellow-600" : "text-muted-foreground"
                )}>
                  {revenueAchieved}% of goal achieved
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="actual_sales">Actual Sales (# of sales)</Label>
              <Input
                id="actual_sales"
                type="number"
                placeholder="0"
                value={formData.actual_sales ?? ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  actual_sales: e.target.value ? parseInt(e.target.value) : null 
                }))}
              />
              {salesAchieved !== null && (
                <p className={cn(
                  "text-sm font-medium",
                  salesAchieved >= 100 ? "text-green-600" : salesAchieved >= 75 ? "text-yellow-600" : "text-muted-foreground"
                )}>
                  {salesAchieved}% of goal achieved
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reflection Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Reflections
          </CardTitle>
          <CardDescription>
            What did you learn from this launch?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="biggest_win">🏆 Biggest Win</Label>
            <Textarea
              id="biggest_win"
              placeholder="What was your proudest moment or biggest success?"
              value={formData.biggest_win}
              onChange={(e) => setFormData(prev => ({ ...prev, biggest_win: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="what_worked">✅ What Worked Well</Label>
            <Textarea
              id="what_worked"
              placeholder="What strategies, tactics, or approaches delivered results?"
              value={formData.what_worked}
              onChange={(e) => setFormData(prev => ({ ...prev, what_worked: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="what_to_improve">🔧 What Could Be Improved</Label>
            <Textarea
              id="what_to_improve"
              placeholder="What didn't go as planned or could be optimized?"
              value={formData.what_to_improve}
              onChange={(e) => setFormData(prev => ({ ...prev, what_to_improve: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="would_do_differently">💡 What Would You Do Differently</Label>
            <Textarea
              id="would_do_differently"
              placeholder="If you could do this launch again, what would you change?"
              value={formData.would_do_differently}
              onChange={(e) => setFormData(prev => ({ ...prev, would_do_differently: e.target.value }))}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Energy & Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-accent" />
            Energy & Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>How did this launch feel? (Energy Rating)</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, energy_rating: rating }))}
                  className={cn(
                    "w-12 h-12 rounded-full text-lg font-medium transition-all",
                    formData.energy_rating === rating
                      ? "bg-primary text-primary-foreground scale-110"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {rating === 1 ? '😫' : rating === 2 ? '😕' : rating === 3 ? '😐' : rating === 4 ? '😊' : '🤩'}
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {formData.energy_rating === 1 && "Exhausting - I need to recover"}
              {formData.energy_rating === 2 && "Draining - It took a lot out of me"}
              {formData.energy_rating === 3 && "Neutral - It was manageable"}
              {formData.energy_rating === 4 && "Energizing - I enjoyed the process"}
              {formData.energy_rating === 5 && "Thrilling - I can't wait to do it again!"}
            </p>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <Label htmlFor="will_launch_again" className="font-medium">Would you launch this again?</Label>
              <p className="text-sm text-muted-foreground">Based on your experience, is this worth repeating?</p>
            </div>
            <Switch
              id="will_launch_again"
              checked={formData.will_launch_again ?? true}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, will_launch_again: checked }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any other thoughts, ideas, or things to remember..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? (
            <>Saving...</>
          ) : debrief ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Update Debrief
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Complete Debrief
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
