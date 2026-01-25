import { useState, useEffect, useMemo } from 'react';
import { format, addMonths } from 'date-fns';
import { DollarSign, CreditCard, CalendarClock, Sparkles } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import type { PaymentPlanType } from '@/types/course';
import { PAYMENT_PLAN_LABELS } from '@/types/course';

interface CourseInvestmentSectionProps {
  cost: number | undefined;
  onCostChange: (cost: number | undefined) => void;
  addToExpenses: boolean;
  onAddToExpensesChange: (value: boolean) => void;
  paymentPlanType: PaymentPlanType | undefined;
  onPaymentPlanTypeChange: (type: PaymentPlanType | undefined) => void;
  paymentPlanPayments: number | undefined;
  onPaymentPlanPaymentsChange: (count: number | undefined) => void;
  purchaseDate: Date | undefined;
}

export function CourseInvestmentSection({
  cost,
  onCostChange,
  addToExpenses,
  onAddToExpensesChange,
  paymentPlanType,
  onPaymentPlanTypeChange,
  paymentPlanPayments,
  onPaymentPlanPaymentsChange,
  purchaseDate,
}: CourseInvestmentSectionProps) {
  
  // Calculate payment preview
  const paymentPreview = useMemo(() => {
    if (!cost || !addToExpenses || paymentPlanType !== 'monthly' || !paymentPlanPayments) {
      return null;
    }

    const paymentAmount = cost / paymentPlanPayments;
    const baseDate = purchaseDate || new Date();
    const payments = [];

    for (let i = 0; i < Math.min(paymentPlanPayments, 4); i++) {
      const paymentDate = addMonths(baseDate, i);
      payments.push({
        date: format(paymentDate, 'MMM d'),
        amount: paymentAmount.toFixed(2),
      });
    }

    return {
      perPayment: paymentAmount.toFixed(2),
      payments,
      remaining: paymentPlanPayments > 4 ? paymentPlanPayments - 4 : 0,
    };
  }, [cost, addToExpenses, paymentPlanType, paymentPlanPayments, purchaseDate]);

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <DollarSign className="h-4 w-4" />
        Investment
      </h4>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cost">Course Cost</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="cost"
              type="number"
              placeholder="0.00"
              className="pl-7"
              value={cost ?? ''}
              onChange={(e) => onCostChange(e.target.value ? Number(e.target.value) : undefined)}
              step="0.01"
              min="0"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Add to Expense Tracker?
          </Label>
          <div className="flex items-center gap-2 h-10">
            <Switch
              checked={addToExpenses}
              onCheckedChange={onAddToExpensesChange}
              disabled={!cost}
            />
            <span className="text-sm text-muted-foreground">
              {addToExpenses ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {addToExpenses && cost && (
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payment Type</Label>
              <Select
                value={paymentPlanType || 'one_time'}
                onValueChange={(v) => onPaymentPlanTypeChange(v as PaymentPlanType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_PLAN_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {paymentPlanType === 'monthly' && (
              <div className="space-y-2">
                <Label>Number of Payments</Label>
                <Select
                  value={String(paymentPlanPayments || 2)}
                  onValueChange={(v) => onPaymentPlanPaymentsChange(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 12].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} payments
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Payment Preview */}
          {paymentPreview && (
            <Card className="bg-accent/50 border-accent">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <CreditCard className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">
                      ${paymentPreview.perPayment} × {paymentPlanPayments} payments
                    </p>
                    <p className="text-muted-foreground">
                      {paymentPreview.payments.map((p, i) => (
                        <span key={i}>
                          {i > 0 && ', '}
                          {p.date}
                        </span>
                      ))}
                      {paymentPreview.remaining > 0 && (
                        <span>, +{paymentPreview.remaining} more</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                      <Sparkles className="h-3 w-3" />
                      Expenses will be added to your tracker automatically
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {paymentPlanType === 'one_time' && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              A ${cost.toFixed(2)} expense will be added to your tracker
            </p>
          )}
        </div>
      )}
    </div>
  );
}
