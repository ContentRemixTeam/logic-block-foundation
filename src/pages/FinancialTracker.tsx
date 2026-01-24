import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, DollarSign, TrendingUp, TrendingDown, PieChart } from 'lucide-react';
import { useFinancialTracker } from '@/hooks/useFinancialTracker';
import { LoadingState } from '@/components/system/LoadingState';
import { FinancialDashboard } from '@/components/financial/FinancialDashboard';
import { TransactionList } from '@/components/financial/TransactionList';
import { TransactionFormDrawer } from '@/components/financial/TransactionFormDrawer';
import { PageHeader } from '@/components/ui/page-header';

export default function FinancialTracker() {
  const { transactions, categories, summary, isLoading, addTransaction, deleteTransaction, refresh, incomeCategories, expenseCategories } = useFinancialTracker();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income');

  const handleAddIncome = () => {
    setTransactionType('income');
    setDrawerOpen(true);
  };

  const handleAddExpense = () => {
    setTransactionType('expense');
    setDrawerOpen(true);
  };

  if (isLoading) {
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
            <FinancialDashboard summary={summary} transactions={transactions} />
          </TabsContent>

          <TabsContent value="income" className="mt-0">
            <TransactionList 
              transactions={transactions.filter(t => t.type === 'income')}
              type="income"
              onDelete={deleteTransaction}
              onAdd={handleAddIncome}
            />
          </TabsContent>

          <TabsContent value="expenses" className="mt-0">
            <TransactionList 
              transactions={transactions.filter(t => t.type === 'expense')}
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
      </div>
    </Layout>
  );
}
