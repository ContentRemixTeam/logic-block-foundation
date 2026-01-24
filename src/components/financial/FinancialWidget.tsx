import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle } from '@/components/ui/premium-card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DollarSign, TrendingUp, TrendingDown, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfMonth, endOfMonth, format } from 'date-fns';

interface FinancialWidgetProps {
  revenueGoal?: number;
}

export function FinancialWidget({ revenueGoal }: FinancialWidgetProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState({
    income: 0,
    expenses: 0,
    profit: 0,
  });

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const now = new Date();
        const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

        const { data: transactions } = await supabase
          .from('financial_transactions')
          .select('type, amount')
          .eq('user_id', user.id)
          .gte('date', monthStart)
          .lte('date', monthEnd);

        if (transactions) {
          const income = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + Number(t.amount), 0);
          
          const expenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + Number(t.amount), 0);

          setData({
            income,
            expenses,
            profit: income - expenses,
          });
        }
      } catch (error) {
        console.error('Error loading financial widget data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const progressPercent = revenueGoal && revenueGoal > 0 
    ? Math.min((data.income / revenueGoal) * 100, 100) 
    : 0;

  if (isLoading) {
    return (
      <PremiumCard category="do">
        <PremiumCardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </PremiumCardContent>
      </PremiumCard>
    );
  }

  return (
    <PremiumCard category="do">
      <PremiumCardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            <PremiumCardTitle className="text-base">This Month</PremiumCardTitle>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-xs">
            <Link to="/finances" className="gap-1">
              Details <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </PremiumCardHeader>
      <PremiumCardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-600 mb-1">
              <TrendingUp className="h-3 w-3" />
              <span className="text-[10px] uppercase font-medium">Revenue</span>
            </div>
            <p className="text-lg font-bold text-emerald-600">{formatCurrency(data.income)}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-rose-600 mb-1">
              <TrendingDown className="h-3 w-3" />
              <span className="text-[10px] uppercase font-medium">Expenses</span>
            </div>
            <p className="text-lg font-bold text-rose-600">{formatCurrency(data.expenses)}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-primary mb-1">
              <DollarSign className="h-3 w-3" />
              <span className="text-[10px] uppercase font-medium">Profit</span>
            </div>
            <p className={`text-lg font-bold ${data.profit >= 0 ? 'text-primary' : 'text-orange-600'}`}>
              {formatCurrency(data.profit)}
            </p>
          </div>
        </div>

        {/* Revenue Goal Progress */}
        {revenueGoal && revenueGoal > 0 && (
          <div className="pt-2 border-t">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-muted-foreground">90-Day Revenue Goal</span>
              <span className="font-medium">{formatCurrency(data.income)} / {formatCurrency(revenueGoal)}</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">
              {progressPercent.toFixed(0)}% of goal
            </p>
          </div>
        )}
      </PremiumCardContent>
    </PremiumCard>
  );
}
