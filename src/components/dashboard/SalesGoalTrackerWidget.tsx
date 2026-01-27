import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DollarSign, Plus, CalendarIcon, Pencil, TrendingUp, TrendingDown, Sparkles, ChevronRight } from 'lucide-react';

interface SalesGoalTrackerWidgetProps {
  cycleId?: string;
  cycleStartDate?: string;
  cycleEndDate?: string;
}

export function SalesGoalTrackerWidget({ cycleId, cycleStartDate, cycleEndDate }: SalesGoalTrackerWidgetProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saleDate, setSaleDate] = useState<Date | undefined>(new Date());
  const [saleAmount, setSaleAmount] = useState('');
  const [clientName, setClientName] = useState('');
  const [offerName, setOfferName] = useState('');
  const [notes, setNotes] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Fetch revenue goal from cycle_revenue_plan
  const { data: revenueGoal, isLoading: goalLoading } = useQuery({
    queryKey: ['revenue-goal', cycleId],
    queryFn: async () => {
      if (!cycleId) return null;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const { data } = await supabase
        .from('cycle_revenue_plan')
        .select('revenue_goal')
        .eq('cycle_id', cycleId)
        .eq('user_id', session.user.id)
        .maybeSingle();

      return data?.revenue_goal ?? null;
    },
    enabled: !!cycleId,
    staleTime: 60 * 1000,
  });

  // Fetch sales for current cycle
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['sales-log', cycleId],
    queryFn: async () => {
      if (!cycleId) return { totalRevenue: 0, salesCount: 0 };
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { totalRevenue: 0, salesCount: 0 };

      const { data } = await supabase
        .from('sales_log')
        .select('amount')
        .eq('user_id', session.user.id)
        .eq('cycle_id', cycleId);

      if (!data) return { totalRevenue: 0, salesCount: 0 };

      const totalRevenue = data.reduce((sum, sale) => sum + Number(sale.amount), 0);
      return { totalRevenue, salesCount: data.length };
    },
    enabled: !!cycleId,
    staleTime: 30 * 1000,
  });

  // Add sale mutation
  const addSale = useMutation({
    mutationFn: async () => {
      if (!saleDate || !saleAmount) throw new Error('Date and amount required');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('sales_log')
        .insert({
          user_id: session.user.id,
          cycle_id: cycleId || null,
          date: format(saleDate, 'yyyy-MM-dd'),
          amount: parseFloat(saleAmount),
          client_name: clientName || null,
          offer_name: offerName || null,
          notes: notes || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-log'] });
      toast.success('🎉 Sale logged!');
      setDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error('Failed to log sale');
    },
  });

  const resetForm = () => {
    setSaleDate(new Date());
    setSaleAmount('');
    setClientName('');
    setOfferName('');
    setNotes('');
  };

  // Calculate pace and status
  const paceData = useMemo(() => {
    if (!cycleStartDate || !revenueGoal || revenueGoal <= 0) return null;

    const start = parseISO(cycleStartDate);
    const today = new Date();
    const daysElapsed = Math.max(1, differenceInDays(today, start) + 1);
    const totalDays = 90;
    const daysRemaining = Math.max(1, totalDays - daysElapsed + 1);

    const totalRevenue = salesData?.totalRevenue ?? 0;
    const currentPace = (totalRevenue / daysElapsed) * totalDays;
    const paceNeeded = daysRemaining > 0 ? (revenueGoal - totalRevenue) / daysRemaining * totalDays : 0;
    const weeklyPaceNeeded = daysRemaining > 0 ? ((revenueGoal - totalRevenue) / daysRemaining) * 7 : 0;

    let status: 'ahead' | 'on-track' | 'behind' = 'behind';
    if (currentPace >= paceNeeded * 0.9) status = 'ahead';
    else if (currentPace >= paceNeeded * 0.7) status = 'on-track';

    const progress = revenueGoal > 0 ? Math.min(100, (totalRevenue / revenueGoal) * 100) : 0;

    return {
      daysElapsed,
      daysRemaining,
      currentPace,
      paceNeeded,
      weeklyPaceNeeded,
      status,
      progress,
      totalRevenue,
      revenueGoal,
    };
  }, [cycleStartDate, revenueGoal, salesData]);

  const isLoading = goalLoading || salesLoading;

  // No cycle state
  if (!cycleId) {
    return (
      <Card className="overflow-hidden border-border/40 hover:shadow-lg transition-all duration-300 hover:border-primary/20">
        <CardHeader className="bg-gradient-to-r from-emerald-500/5 to-transparent pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg">Sales Goal</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-center py-4">
            <div className="h-12 w-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm mb-2">No active cycle</p>
            <Link to="/cycle-setup" className="text-primary text-sm hover:underline">
              Start your 90-day cycle →
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-border/40 hover:shadow-lg transition-all duration-300 hover:border-primary/20">
      <CardHeader className="bg-gradient-to-r from-emerald-500/5 to-transparent pb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-lg">Sales Goal</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        )}

        {!isLoading && !revenueGoal && (
          <div className="text-center py-6">
            <div className="relative mb-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 mx-auto flex items-center justify-center">
                <DollarSign className="h-8 w-8 text-emerald-500/60" />
              </div>
              <div className="absolute -top-1 -right-1 h-6 w-6 bg-yellow-400 rounded-full flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-yellow-900" />
              </div>
            </div>
            <h3 className="font-semibold text-base mb-2">Set your revenue goal</h3>
            <p className="text-muted-foreground text-sm mb-4">Track your sales progress this quarter</p>
            <Button size="sm" className="gap-2" asChild>
              <Link to="/cycle-setup">
                <Pencil className="h-4 w-4" />
                Set Goal
              </Link>
            </Button>
          </div>
        )}

        {!isLoading && revenueGoal && paceData && (
          <div className="space-y-4">
            {/* Revenue Progress */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">
                  ${paceData.totalRevenue.toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground">
                  of ${paceData.revenueGoal.toLocaleString()}
                </span>
              </div>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-600 transition-all duration-500"
                  style={{ width: `${paceData.progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.round(paceData.progress)}% complete
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-muted/50 rounded-lg p-2 text-center border border-border/50">
                <div className="text-lg font-bold">${paceData.totalRevenue.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2 text-center border border-border/50">
                <div className="text-lg font-bold">{salesData?.salesCount ?? 0}</div>
                <div className="text-xs text-muted-foreground">Sales</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2 text-center border border-border/50">
                <div className="text-lg font-bold">
                  ${salesData && salesData.salesCount > 0 
                    ? Math.round(paceData.totalRevenue / salesData.salesCount).toLocaleString() 
                    : '0'}
                </div>
                <div className="text-xs text-muted-foreground">Avg</div>
              </div>
            </div>

            {/* Pace Indicator */}
            <div className={cn(
              "flex items-center gap-2 text-sm p-3 rounded-lg border-l-4",
              paceData.status === 'ahead' && "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500",
              paceData.status === 'on-track' && "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500",
              paceData.status === 'behind' && "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500",
            )}>
              {paceData.status === 'ahead' ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>
                {paceData.status === 'ahead' 
                  ? `On track for $${Math.round(paceData.currentPace).toLocaleString()}`
                  : `Need $${Math.round(paceData.weeklyPaceNeeded).toLocaleString()}/week`
                }
              </span>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2 shadow-lg shadow-primary/20">
                    <Plus className="h-4 w-4" />
                    Add Sale
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Log a Sale</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Date *</Label>
                      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !saleDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {saleDate ? format(saleDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={saleDate}
                            onSelect={(d) => {
                              setSaleDate(d);
                              setDatePickerOpen(false);
                            }}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Amount *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={saleAmount}
                        onChange={(e) => setSaleAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client Name (optional)</Label>
                      <Input
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="e.g., John Doe"
                        maxLength={100}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Offer Name (optional)</Label>
                      <Input
                        value={offerName}
                        onChange={(e) => setOfferName(e.target.value)}
                        placeholder="e.g., Coaching Program"
                        maxLength={100}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes (optional)</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any additional details..."
                        maxLength={500}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button 
                      onClick={() => addSale.mutate()}
                      disabled={addSale.isPending || !saleAmount || !saleDate}
                    >
                      {addSale.isPending ? 'Saving...' : 'Log Sale'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" className="gap-2 group" asChild>
                <Link to="/cycle-setup">
                  <Pencil className="h-4 w-4" />
                  Edit
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
