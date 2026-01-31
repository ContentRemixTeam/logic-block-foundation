import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckSquare, 
  Lightbulb, 
  TrendingDown, 
  TrendingUp,
  Plus,
  ExternalLink,
  Loader2,
  Zap,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ManifestSwitcher } from '@/components/pwa/ManifestSwitcher';

type CaptureType = 'task' | 'idea' | 'expense' | 'income';

interface TypeOption {
  id: CaptureType;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  color: string;
}

const typeOptions: TypeOption[] = [
  { 
    id: 'task', 
    label: 'Task', 
    icon: <CheckSquare className="h-4 w-4" />, 
    placeholder: 'What needs to be done?',
    color: 'bg-primary text-primary-foreground'
  },
  { 
    id: 'idea', 
    label: 'Idea', 
    icon: <Lightbulb className="h-4 w-4" />, 
    placeholder: 'Capture your idea...',
    color: 'bg-yellow-500 text-white'
  },
  { 
    id: 'expense', 
    label: 'Expense', 
    icon: <TrendingDown className="h-4 w-4" />, 
    placeholder: 'What did you spend on?',
    color: 'bg-destructive text-destructive-foreground'
  },
  { 
    id: 'income', 
    label: 'Income', 
    icon: <TrendingUp className="h-4 w-4" />, 
    placeholder: 'What did you earn?',
    color: 'bg-green-500 text-white'
  },
];

export default function QuickAddApp() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<CaptureType>('task');
  const [inputValue, setInputValue] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);

  const currentType = typeOptions.find(t => t.id === selectedType)!;
  const isFinancial = selectedType === 'expense' || selectedType === 'income';

  const handleSave = useCallback(async () => {
    if (!inputValue.trim()) return;
    if (isFinancial && !amount) {
      toast({ title: 'Please enter an amount', variant: 'destructive' });
      return;
    }
    if (!user) {
      toast({ title: 'Please log in to save', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      if (selectedType === 'task') {
        const { error } = await supabase.from('tasks').insert({
          user_id: user.id,
          task_text: inputValue.trim(),
          status: 'not_started',
          source: 'quick_add',
        });
        if (error) throw error;
      } else if (selectedType === 'idea') {
        const { error } = await supabase.from('ideas').insert({
          user_id: user.id,
          content: inputValue.trim(),
          source_note_title: 'Quick Add',
        });
        if (error) throw error;
      } else if (selectedType === 'expense' || selectedType === 'income') {
        const { error } = await supabase.from('financial_transactions').insert({
          user_id: user.id,
          description: inputValue.trim(),
          amount: parseFloat(amount),
          type: selectedType,
          category: selectedType === 'expense' ? 'Uncategorized' : 'Sales',
          date: new Date().toISOString().split('T')[0],
        });
        if (error) throw error;
      }

      setSessionCount(prev => prev + 1);
      setInputValue('');
      setAmount('');
      
      // Haptic feedback on mobile
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      toast({ 
        title: `${currentType.label} saved!`,
        description: `Session total: ${sessionCount + 1}`,
      });
    } catch (error: any) {
      console.error('Save error:', error);
      toast({ 
        title: 'Failed to save', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  }, [inputValue, amount, selectedType, user, sessionCount, isFinancial, currentType, toast]);

  // Auto-focus input on mount and type change
  useEffect(() => {
    const input = document.getElementById('quick-add-input');
    if (input) input.focus();
  }, [selectedType]);

  // Show auth message if not logged in
  if (!authLoading && !user) {
    return (
      <>
        <ManifestSwitcher />
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-sm w-full">
            <CardContent className="pt-6 text-center space-y-4">
              <Zap className="h-12 w-12 mx-auto text-primary" />
              <h1 className="text-xl font-bold">Quick Add</h1>
              <p className="text-muted-foreground">
                Please log in to start capturing tasks, ideas, and finances.
              </p>
              <Button asChild className="w-full">
                <Link to="/auth">Log In</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (authLoading) {
    return (
      <>
        <ManifestSwitcher />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <ManifestSwitcher />
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="border-b bg-card px-4 py-3 safe-area-inset-top">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <h1 className="font-semibold">Quick Add</h1>
            </div>
            {sessionCount > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Plus className="h-3 w-3" />
                {sessionCount} saved
              </Badge>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 flex flex-col">
          {/* Type Selector */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {typeOptions.map((type) => (
              <button
                key={type.id}
                onClick={() => {
                  setSelectedType(type.id);
                  setInputValue('');
                  setAmount('');
                }}
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all',
                  selectedType === type.id
                    ? `${type.color} border-transparent shadow-md`
                    : 'bg-card border-border hover:border-primary/50'
                )}
              >
                {type.icon}
                <span className="text-xs font-medium">{type.label}</span>
              </button>
            ))}
          </div>

          {/* Input Section */}
          <Card className="flex-1 flex flex-col">
            <CardContent className="pt-6 flex-1 flex flex-col gap-4">
              {/* Main Input */}
              <div className="space-y-2">
                <Label htmlFor="quick-add-input" className="sr-only">
                  {currentType.placeholder}
                </Label>
                <Input
                  id="quick-add-input"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={currentType.placeholder}
                  className="h-14 text-lg"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSave();
                    }
                  }}
                  autoComplete="off"
                />
              </div>

              {/* Amount Input for Financial Types */}
              {isFinancial && (
                <div className="space-y-2">
                  <Label htmlFor="amount-input" className="text-sm text-muted-foreground">
                    Amount
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="amount-input"
                      type="number"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="h-14 text-lg pl-10"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSave();
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Save Button */}
              <Button
                onClick={handleSave}
                disabled={saving || !inputValue.trim() || (isFinancial && !amount)}
                size="lg"
                className={cn('h-14 text-lg w-full', currentType.color)}
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-5 w-5 mr-2" />
                    Add {currentType.label}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Footer Link */}
          <div className="mt-4 text-center">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Open Full App
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
