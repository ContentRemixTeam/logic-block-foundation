import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, DollarSign, TrendingUp, TrendingDown, PieChart, Upload, Target } from 'lucide-react';
import { useFinancialTracker } from '@/hooks/useFinancialTracker';
import { useFinancialGoals } from '@/hooks/useFinancialGoals';
import { LoadingState } from '@/components/system/LoadingState';
import { FinancialDashboard } from '@/components/financial/FinancialDashboard';
import { TransactionList } from '@/components/financial/TransactionList';
import { TransactionFormDrawer } from '@/components/financial/TransactionFormDrawer';
import { TransactionImportModal } from '@/components/financial/TransactionImportModal';
import { MonthlyGoalModal } from '@/components/financial/MonthlyGoalModal';
import { GoalProgressCard } from '@/components/financial/GoalProgressCard';
import { PeriodSelector, PeriodType, getDateRangeForPeriod } from '@/components/financial/PeriodSelector';
import { PageHeader } from '@/components/ui/page-header';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export default function FinancialTracker() {
  const navigate = useNavigate();
  const { transactions, categories, summary, isLoading, addTransaction, deleteTransaction, refresh, incomeCategories, expenseCategories } = useFinancialTracker();
  const { monthlyGoal, cycleGoal, setMonthlyRevenueGoal, calculateMonthlyProgress, calculateCycleProgress, isLoading: goalsLoading } = useFinancialGoals();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('month');
  const [dateRange, setDateRange] = useState(() => getDateRangeForPeriod('month'));

  const handlePeriodChange = (period: PeriodType, start: Date, end: Date) => {
    setSelectedPeriod(period);
    setDateRange({ start, end });
  };

  // Filter transactions by selected period
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return isWithinInterval(txDate, { start: dateRange.start, end: dateRange.end });
    });
  }, [transactions, dateRange]);

  // Calculate period-specific summary
  const periodSummary = useMemo(() => {
    if (filteredTransactions.length === 0) return null;

    const totalIncome = filteredTransactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const totalExpenses = filteredTransactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    // Income by category
    const incomeByCategory: Record<string, number> = {};
    filteredTransactions
      .filter(tx => tx.type === 'income')
      .forEach(tx => {
        incomeByCategory[tx.category] = (incomeByCategory[tx.category] || 0) + Number(tx.amount);
      });

    // Expenses by category
    const expensesByCategory: Record<string, number> = {};
    filteredTransactions
      .filter(tx => tx.type === 'expense')
      .forEach(tx => {
        expensesByCategory[tx.category] = (expensesByCategory[tx.category] || 0) + Number(tx.amount);
      });

    return {
      totalIncome,
      totalExpenses,
      netProfit,
      profitMargin,
      incomeByCategory,
      expensesByCategory,
      // Keep trend from main summary for charts
      monthlyTrend: summary?.monthlyTrend || [],
    };
  }, [filteredTransactions, summary]);

  // Calculate current month revenue for goals
  const currentMonthRevenue = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    return transactions
      .filter(tx => {
        const txDate = new Date(tx.date);
        return tx.type === 'income' && isWithinInterval(txDate, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
  }, [transactions]);

  // Calculate cycle revenue (all income in the cycle period)
  const cycleRevenue = useMemo(() => {
    // For now, use total income from all loaded transactions as approximation
    return transactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
  }, [transactions]);

  const monthlyProgress = calculateMonthlyProgress(currentMonthRevenue);
  const cycleProgress = calculateCycleProgress(cycleRevenue);

  const handleAddIncome = () => {
    setTransactionType('income');
    setDrawerOpen(true);
  };

  const handleAddExpense = () => {
    setTransactionType('expense');
    setDrawerOpen(true);
  };

  const handleStartRecoveryWizard = () => {
    navigate('/wizards/finance-recovery');
  };

  const suggestedMonthlyGoal = cycleGoal ? Math.round(cycleGoal / 3) : null;

  const categoryNames = {
    income: incomeCategories.map(c => c.name),
    expense: expenseCategories.map(c => c.name),
  };

  if (isLoading || goalsLoading) {
    return (
      <Layout>
        <LoadingState message="Loading financial data..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-6xl mx-auto p-4 md:p-6 pb-24 md:pb-6">
        <PageHeader
          title="Financial Tracker"
          description="Track your business income and expenses"
          icon={<DollarSign className="h-6 w-6" />}
        />

        {/* Goal Progress Section */}
        <div className="mb-6">
          <GoalProgressCard
            monthlyProgress={monthlyProgress}
            cycleProgress={cycleProgress}
            onSetMonthlyGoal={() => setGoalModalOpen(true)}
            onStartRecoveryWizard={handleStartRecoveryWizard}
          />
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button 
            onClick={handleAddIncome}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            <TrendingUp className="h-4 w-4" />
            Add Income
          </Button>
          <Button 
            onClick={handleAddExpense}
            variant="outline"
            className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
          >
            <TrendingDown className="h-4 w-4" />
            Add Expense
          </Button>
          <Button
            onClick={() => setImportModalOpen(true)}
            variant="outline"
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Button
            onClick={() => setGoalModalOpen(true)}
            variant="outline"
            className="gap-2"
          >
            <Target className="h-4 w-4" />
            Set Goal
          </Button>
        </div>

        {/* Period Selector */}
        <div className="mb-4">
          <PeriodSelector
            selectedPeriod={selectedPeriod}
            onPeriodChange={handlePeriodChange}
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard" className="gap-2">
              <PieChart className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="income" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Income
            </TabsTrigger>
            <TabsTrigger value="expenses" className="gap-2">
              <TrendingDown className="h-4 w-4" />
              Expenses
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-0">
            <FinancialDashboard 
              summary={periodSummary} 
              transactions={filteredTransactions}
              periodLabel={selectedPeriod === 'month' ? undefined : selectedPeriod}
            />
          </TabsContent>

          <TabsContent value="income" className="mt-0">
            <TransactionList 
              transactions={filteredTransactions.filter(t => t.type === 'income')}
              type="income"
              onDelete={deleteTransaction}
              onAdd={handleAddIncome}
            />
          </TabsContent>

          <TabsContent value="expenses" className="mt-0">
            <TransactionList 
              transactions={filteredTransactions.filter(t => t.type === 'expense')}
              type="expense"
              onDelete={deleteTransaction}
              onAdd={handleAddExpense}
            />
          </TabsContent>
        </Tabs>

        <TransactionFormDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          type={transactionType}
          categories={transactionType === 'income' ? incomeCategories : expenseCategories}
          onSubmit={async (data) => {
            await addTransaction(data);
            setDrawerOpen(false);
          }}
        />

        <TransactionImportModal
          open={importModalOpen}
          onOpenChange={setImportModalOpen}
          onImportComplete={() => {
            refresh();
          }}
          categories={categoryNames}
        />

        <MonthlyGoalModal
          open={goalModalOpen}
          onOpenChange={setGoalModalOpen}
          currentGoal={monthlyGoal?.revenue_goal}
          suggestedGoal={suggestedMonthlyGoal}
          onSave={setMonthlyRevenueGoal}
        />
      </div>
    </Layout>
  );
}
