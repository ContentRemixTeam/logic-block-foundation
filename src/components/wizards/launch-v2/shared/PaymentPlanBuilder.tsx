// Payment Plan Builder Component
// Allows adding multiple payment plan options

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, X, CreditCard } from 'lucide-react';
import { PaymentPlanOption } from '@/types/launchV2';

interface PaymentPlanBuilderProps {
  plans: PaymentPlanOption[];
  fullPrice: number | null;
  onChange: (plans: PaymentPlanOption[]) => void;
}

const INSTALLMENT_OPTIONS = [
  { value: 2, label: '2 payments' },
  { value: 3, label: '3 payments' },
  { value: 4, label: '4 payments' },
  { value: 6, label: '6 payments' },
  { value: 12, label: '12 payments' },
];

export function PaymentPlanBuilder({ plans, fullPrice, onChange }: PaymentPlanBuilderProps) {
  const [newInstallments, setNewInstallments] = useState<number>(3);
  const [newAmount, setNewAmount] = useState<string>('');

  const isValidAmount = newAmount.trim() !== '' && parseFloat(newAmount) > 0;

  const handleAddPlan = () => {
    if (!isValidAmount) return;
    
    const amount = parseFloat(newAmount);
    const newPlan: PaymentPlanOption = {
      id: crypto.randomUUID(),
      installments: newInstallments,
      installmentAmount: amount,
      totalAmount: amount * newInstallments,
    };
    
    // Create new array to ensure React detects the change
    const updatedPlans = [...plans, newPlan];
    console.log('Adding payment plan:', newPlan, 'Total plans:', updatedPlans.length);
    onChange(updatedPlans);
    setNewAmount('');
  };

  const handleRemovePlan = (id: string) => {
    onChange(plans.filter(p => p.id !== id));
  };

  // Detect payment plan types for adaptive messaging
  const hasUpchargePlans = plans.some(plan => {
    const total = plan.installmentAmount * plan.installments;
    return fullPrice && total > fullPrice;
  });

  const hasSamePricePlans = plans.some(plan => {
    const total = plan.installmentAmount * plan.installments;
    return fullPrice && total === fullPrice;
  });

  return (
    <div className="space-y-4">
      <Label className="flex items-center gap-2 text-sm font-medium">
        <CreditCard className="h-4 w-4" />
        Payment Plans
      </Label>

      {/* Existing plans */}
      {plans.length > 0 && (
        <div className="space-y-2">
          {plans.map((plan) => {
            const total = plan.installmentAmount * plan.installments;
            
            return (
              <Card key={plan.id} className="bg-muted/30">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">
                      {plan.installments} payments of ${plan.installmentAmount.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total: ${total.toLocaleString()}
                      {(() => {
                        if (!fullPrice || fullPrice <= 0) return null;
                        const diff = total - fullPrice;
                        if (diff > 0) {
                          return (
                            <span className="text-amber-600 ml-2">
                              (+${diff.toLocaleString()} vs pay-in-full)
                            </span>
                          );
                        } else if (diff === 0) {
                          return (
                            <span className="text-green-600 ml-2">
                              (0% interest - same as pay-in-full)
                            </span>
                          );
                        } else {
                          return (
                            <span className="text-blue-600 ml-2">
                              (${Math.abs(diff).toLocaleString()} discount)
                            </span>
                          );
                        }
                      })()}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemovePlan(plan.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add new plan */}
      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="installments" className="text-xs text-muted-foreground">
            # of payments
          </Label>
          <Select
            value={newInstallments.toString()}
            onValueChange={(v) => setNewInstallments(parseInt(v))}
          >
            <SelectTrigger id="installments" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INSTALLMENT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value.toString()}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="amount" className="text-xs text-muted-foreground">
            Amount per payment
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input
              id="amount"
              type="number"
              min="0"
              step="1"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddPlan()}
              className="pl-7"
              placeholder="349"
            />
          </div>
        </div>
        
        <Button
          type="button"
          variant="outline"
          onClick={handleAddPlan}
          disabled={!isValidAmount}
          className="shrink-0"
          aria-label="Add payment plan"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Tip */}
      {plans.length === 0 && (
        <p className="text-xs text-muted-foreground">
          💡 Payment plans typically convert 20-40% more buyers. The total is usually 10-20% higher than pay-in-full.
        </p>
      )}

      {/* Adaptive messaging based on plan types */}
      {plans.length > 0 && fullPrice && fullPrice > 0 && (
        <>
          {hasUpchargePlans && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200">
                💰 <strong>Pay-in-full saves money</strong> — your customers save by paying ${fullPrice.toLocaleString()} upfront vs payment plan totals.
              </p>
            </div>
          )}
          {hasSamePricePlans && !hasUpchargePlans && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                ✨ <strong>0% interest payment plans</strong> — customers pay the same total whether they pay upfront or in installments. Great for accessibility!
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
