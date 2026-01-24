import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export interface Transaction {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string | null;
  date: string;
  payment_method: string | null;
  is_recurring: boolean;
  recurring_frequency: string | null;
  tags: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialCategory {
  id: string;
  user_id: string;
  name: string;
  type: 'income' | 'expense';
  color: string | null;
  icon: string | null;
  is_default: boolean;
  created_at: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  incomeByCategory: Record<string, number>;
  expensesByCategory: Record<string, number>;
  monthlyTrend: { month: string; income: number; expenses: number; profit: number }[];
}

const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Sales', color: 'hsl(var(--chart-1))', icon: 'shopping-cart' },
  { name: 'Services', color: 'hsl(var(--chart-2))', icon: 'briefcase' },
  { name: 'Courses', color: 'hsl(var(--chart-3))', icon: 'graduation-cap' },
  { name: 'Coaching', color: 'hsl(var(--chart-4))', icon: 'users' },
  { name: 'Affiliate', color: 'hsl(var(--chart-5))', icon: 'link' },
  { name: 'Other Income', color: 'hsl(var(--muted))', icon: 'plus' },
];

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Software & Tools', color: 'hsl(var(--chart-1))', icon: 'laptop' },
  { name: 'Marketing', color: 'hsl(var(--chart-2))', icon: 'megaphone' },
  { name: 'Contractors', color: 'hsl(var(--chart-3))', icon: 'users' },
  { name: 'Education', color: 'hsl(var(--chart-4))', icon: 'book' },
  { name: 'Office & Equipment', color: 'hsl(var(--chart-5))', icon: 'home' },
  { name: 'Taxes', color: 'hsl(var(--destructive))', icon: 'receipt' },
  { name: 'Other Expense', color: 'hsl(var(--muted))', icon: 'minus' },
];

export function useFinancialTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);

  // Load transactions and categories
  const loadData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Load transactions (last 12 months)
      const startDate = format(subMonths(new Date(), 12), 'yyyy-MM-dd');
      const { data: txData, error: txError } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .order('date', { ascending: false });

      if (txError) throw txError;
      setTransactions((txData as Transaction[]) || []);

      // Load categories
      const { data: catData, error: catError } = await supabase
        .from('financial_categories')
        .select('*')
        .eq('user_id', user.id);

      if (catError) throw catError;
      
      // If no categories, create defaults
      if (!catData || catData.length === 0) {
        await initializeDefaultCategories();
      } else {
        setCategories(catData as FinancialCategory[]);
      }

      // Calculate summary
      calculateSummary((txData as Transaction[]) || []);
    } catch (error: any) {
      console.error('Error loading financial data:', error);
      toast({
        title: 'Error loading financial data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  const initializeDefaultCategories = async () => {
    if (!user) return;

    const allCategories = [
      ...DEFAULT_INCOME_CATEGORIES.map(c => ({
        user_id: user.id,
        name: c.name,
        type: 'income' as const,
        color: c.color,
        icon: c.icon,
        is_default: true,
      })),
      ...DEFAULT_EXPENSE_CATEGORIES.map(c => ({
        user_id: user.id,
        name: c.name,
        type: 'expense' as const,
        color: c.color,
        icon: c.icon,
        is_default: true,
      })),
    ];

    const { data, error } = await supabase
      .from('financial_categories')
      .insert(allCategories)
      .select();

    if (!error && data) {
      setCategories(data as FinancialCategory[]);
    }
  };

  const calculateSummary = (txs: Transaction[]) => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);

    // Filter to current month for main stats
    const currentMonthTxs = txs.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= thisMonthStart && txDate <= thisMonthEnd;
    });

    const totalIncome = currentMonthTxs
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const totalExpenses = currentMonthTxs
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    // Income by category
    const incomeByCategory: Record<string, number> = {};
    currentMonthTxs
      .filter(tx => tx.type === 'income')
      .forEach(tx => {
        incomeByCategory[tx.category] = (incomeByCategory[tx.category] || 0) + Number(tx.amount);
      });

    // Expenses by category
    const expensesByCategory: Record<string, number> = {};
    currentMonthTxs
      .filter(tx => tx.type === 'expense')
      .forEach(tx => {
        expensesByCategory[tx.category] = (expensesByCategory[tx.category] || 0) + Number(tx.amount);
      });

    // Monthly trend (last 6 months)
    const monthlyTrend: { month: string; income: number; expenses: number; profit: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const monthTxs = txs.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= monthStart && txDate <= monthEnd;
      });

      const income = monthTxs
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + Number(tx.amount), 0);

      const expenses = monthTxs
        .filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + Number(tx.amount), 0);

      monthlyTrend.push({
        month: format(monthDate, 'MMM'),
        income,
        expenses,
        profit: income - expenses,
      });
    }

    setSummary({
      totalIncome,
      totalExpenses,
      netProfit,
      profitMargin,
      incomeByCategory,
      expensesByCategory,
      monthlyTrend,
    });
  };

  // Add transaction
  const addTransaction = async (tx: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .insert({
          ...tx,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      const newTx = data as Transaction;
      const updated = [newTx, ...transactions];
      setTransactions(updated);
      calculateSummary(updated);
      
      toast({
        title: tx.type === 'income' ? '💰 Income added!' : '📝 Expense recorded!',
      });

      return newTx;
    } catch (error: any) {
      toast({
        title: 'Error adding transaction',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  // Update transaction
  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('financial_transactions')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      const updated = transactions.map(tx => 
        tx.id === id ? { ...tx, ...updates } : tx
      );
      setTransactions(updated);
      calculateSummary(updated);
      
      toast({ title: 'Transaction updated!' });
      return true;
    } catch (error: any) {
      toast({
        title: 'Error updating transaction',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  // Delete transaction
  const deleteTransaction = async (id: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      const updated = transactions.filter(tx => tx.id !== id);
      setTransactions(updated);
      calculateSummary(updated);
      
      toast({ title: 'Transaction deleted' });
      return true;
    } catch (error: any) {
      toast({
        title: 'Error deleting transaction',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    transactions,
    categories,
    summary,
    isLoading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    refresh: loadData,
    incomeCategories: categories.filter(c => c.type === 'income'),
    expenseCategories: categories.filter(c => c.type === 'expense'),
  };
}
