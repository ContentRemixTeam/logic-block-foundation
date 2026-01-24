import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isWithinInterval, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { Transaction } from '@/hooks/useFinancialTracker';

interface CycleMonthlyBreakdownProps {
  cycleStartDate: Date | null;
  cycleEndDate: Date | null;
  cycleRevenueGoal: number | null;
  transactions: Transaction[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function CycleMonthlyBreakdown({ 
  cycleStartDate, 
  cycleEndDate, 
  cycleRevenueGoal,
  transactions 
}: CycleMonthlyBreakdownProps) {
  if (!cycleStartDate || !cycleEndDate || !cycleRevenueGoal) {
    return null;
  }

  // Calculate monthly breakdown for 3 months of cycle
  const months = [];
  const monthlyGoal = cycleRevenueGoal / 3;
  
  for (let i = 0; i < 3; i++) {
    const monthStart = startOfMonth(addMonths(cycleStartDate, i));
    const monthEnd = endOfMonth(monthStart);
    
    // Calculate revenue for this month
    const monthRevenue = transactions
      .filter(tx => {
        if (tx.type !== 'income') return false;
        const txDate = new Date(tx.date);
        return isWithinInterval(txDate, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const isCurrentMonth = isWithinInterval(new Date(), { start: monthStart, end: monthEnd });
    const isPastMonth = new Date() > monthEnd;
    const progress = (monthRevenue / monthlyGoal) * 100;

    months.push({
      monthNumber: i + 1,
      monthName: format(monthStart, 'MMMM'),
      goal: monthlyGoal,
      actual: monthRevenue,
      progress: Math.min(100, progress),
      isCurrentMonth,
      isPastMonth,
      metGoal: monthRevenue >= monthlyGoal,
    });
  }

  const totalActual = months.reduce((sum, m) => sum + m.actual, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          90-Day Cycle Monthly Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {months.map((month) => (
            <div 
              key={month.monthNumber} 
              className={cn(
                'p-3 rounded-lg border',
                month.isCurrentMonth && 'bg-primary/5 border-primary/20',
                !month.isCurrentMonth && 'bg-muted/30'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Month {month.monthNumber}</span>
                  <span className="text-muted-foreground">({month.monthName})</span>
                  {month.isCurrentMonth && (
                    <Badge variant="secondary" className="text-xs">Current</Badge>
                  )}
                  {month.metGoal && month.isPastMonth && (
                    <Badge className="bg-emerald-500/20 text-emerald-600 text-xs">
                      Goal Met ✓
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <span className={cn(
                    'font-semibold',
                    month.progress >= 100 && 'text-emerald-600',
                    month.progress >= 75 && month.progress < 100 && 'text-blue-600',
                    month.progress >= 50 && month.progress < 75 && 'text-amber-600',
                    month.progress < 50 && 'text-rose-600'
                  )}>
                    {formatCurrency(month.actual)}
                  </span>
                  <span className="text-muted-foreground"> / {formatCurrency(month.goal)}</span>
                </div>
              </div>
              
              <Progress 
                value={month.progress} 
                className={cn(
                  'h-2',
                  month.progress >= 100 && '[&>div]:bg-emerald-500',
                  month.progress >= 75 && month.progress < 100 && '[&>div]:bg-blue-500',
                  month.progress >= 50 && month.progress < 75 && '[&>div]:bg-amber-500',
                  month.progress < 50 && '[&>div]:bg-rose-500'
                )}
              />
              
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{month.progress.toFixed(0)}% of monthly goal</span>
                {!month.isPastMonth && month.actual < month.goal && (
                  <span>{formatCurrency(month.goal - month.actual)} remaining</span>
                )}
              </div>
            </div>
          ))}

          {/* Cycle Total */}
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="font-medium">Cycle Total</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold">{formatCurrency(totalActual)}</span>
                <span className="text-muted-foreground"> / {formatCurrency(cycleRevenueGoal)}</span>
                <span className="text-sm text-muted-foreground ml-2">
                  ({((totalActual / cycleRevenueGoal) * 100).toFixed(0)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
