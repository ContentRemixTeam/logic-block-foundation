import { useState, useMemo } from 'react';
import { Transaction } from '@/hooks/useFinancialTracker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Plus, Search, Trash2, ArrowUp, ArrowDown, Calendar, Filter } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface TransactionListProps {
  transactions: Transaction[];
  type: 'income' | 'expense';
  onDelete: (id: string) => Promise<boolean>;
  onAdd: () => void;
}

export function TransactionList({ transactions, type, onDelete, onAdd }: TransactionListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const categories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category));
    return Array.from(cats).sort();
  }, [transactions]);

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const date = subMonths(now, i);
      return {
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy'),
      };
    });
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          tx.description?.toLowerCase().includes(query) ||
          tx.category.toLowerCase().includes(query) ||
          tx.notes?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && tx.category !== selectedCategory) {
        return false;
      }

      // Month filter
      if (selectedMonth !== 'all') {
        const txMonth = format(parseISO(tx.date), 'yyyy-MM');
        if (txMonth !== selectedMonth) return false;
      }

      return true;
    });
  }, [transactions, searchQuery, selectedCategory, selectedMonth]);

  const totalAmount = useMemo(() => {
    return filteredTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
  }, [filteredTransactions]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
  };

  const isIncome = type === 'income';

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                {months.map(month => (
                  <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className={`p-4 rounded-lg border ${isIncome ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isIncome ? (
              <ArrowUp className="h-5 w-5 text-emerald-600" />
            ) : (
              <ArrowDown className="h-5 w-5 text-rose-600" />
            )}
            <span className="text-sm text-muted-foreground">
              {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
            </span>
          </div>
          <p className={`text-xl font-bold ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatCurrency(totalAmount)}
          </p>
        </div>
      </div>

      {/* Transaction List */}
      {filteredTransactions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className={`h-12 w-12 mx-auto rounded-full flex items-center justify-center mb-4 ${
              isIncome ? 'bg-emerald-500/20' : 'bg-rose-500/20'
            }`}>
              {isIncome ? (
                <ArrowUp className="h-6 w-6 text-emerald-600" />
              ) : (
                <ArrowDown className="h-6 w-6 text-rose-600" />
              )}
            </div>
            <h3 className="font-semibold mb-2">No {type} transactions</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery || selectedCategory !== 'all' || selectedMonth !== 'all' 
                ? 'Try adjusting your filters'
                : `Start tracking your ${type} by adding your first transaction`
              }
            </p>
            <Button onClick={onAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              Add {type === 'income' ? 'Income' : 'Expense'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredTransactions.map(tx => (
            <Card key={tx.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center ${
                      isIncome ? 'bg-emerald-500/20' : 'bg-rose-500/20'
                    }`}>
                      {isIncome ? (
                        <ArrowUp className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <ArrowDown className="h-5 w-5 text-rose-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {tx.description || tx.category}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{format(parseISO(tx.date), 'MMM d, yyyy')}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5">
                          {tx.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className={`font-bold text-lg ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatCurrency(Number(tx.amount))}
                    </p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this {type}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(tx.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                {tx.notes && (
                  <p className="text-sm text-muted-foreground mt-2 pl-[52px]">{tx.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
