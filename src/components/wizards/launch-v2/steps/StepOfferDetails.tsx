// Step 3: Offer Details (Q7-Q10)
// Captures pricing, ideal customer, bonuses, and limitations

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, Users, Gift, Lock, Plus, AlertTriangle } from 'lucide-react';
import {
  LaunchWizardV2Data,
  HasLimitations,
  HAS_LIMITATIONS_OPTIONS,
  BonusItem,
} from '@/types/launchV2';
import { calculateSalesNeeded } from '@/lib/launchV2Validation';
import { BonusItemCard } from '@/components/wizards/shared/BonusItemCard';
import { parseISO, isAfter } from 'date-fns';

interface StepOfferDetailsProps {
  data: LaunchWizardV2Data;
  onChange: (updates: Partial<LaunchWizardV2Data>) => void;
}

export function StepOfferDetails({ data, onChange }: StepOfferDetailsProps) {
  const [newBonusName, setNewBonusName] = useState('');

  const handlePriceChange = (value: string) => {
    const price = value ? parseFloat(value) : null;
    onChange({
      pricePoint: price,
      salesNeeded: calculateSalesNeeded(data.customRevenueGoal, price),
    });
  };

  const offerTypeLabel = data.offerType === 'other' 
    ? data.otherOfferType || 'your offer'
    : data.offerType || 'your offer';

  // Bonus handlers
  const handleAddBonus = () => {
    if (!newBonusName.trim()) return;
    const newBonus: BonusItem = {
      id: crypto.randomUUID(),
      name: newBonusName.trim(),
      status: 'existing', // Default to existing
    };
    onChange({ bonusStack: [...(data.bonusStack || []), newBonus] });
    setNewBonusName('');
  };

  const handleUpdateBonus = (id: string, updates: Partial<BonusItem>) => {
    const updated = (data.bonusStack || []).map(b => 
      b.id === id ? { ...b, ...updates } : b
    );
    onChange({ bonusStack: updated });
  };

  const handleRemoveBonus = (id: string) => {
    onChange({ bonusStack: (data.bonusStack || []).filter(b => b.id !== id) });
  };

  // Check for bonuses that need creation with deadlines after cart opens
  const bonusesNeedingCreation = (data.bonusStack || []).filter(b => b.status === 'needs-creation');
  const bonusesWithLateDeadlines = bonusesNeedingCreation.filter(b => {
    if (!b.deadline || !data.cartOpensDate) return false;
    try {
      return isAfter(parseISO(b.deadline), parseISO(data.cartOpensDate));
    } catch {
      return false;
    }
  });

  return (
    <div className="space-y-8">
      {/* Launch Name */}
      <div className="space-y-3">
        <Label htmlFor="launch-name" className="text-lg font-semibold">
          What are you calling this launch?
        </Label>
        <p className="text-sm text-muted-foreground -mt-1">
          The name of your {offerTypeLabel}
        </p>
        <Input
          id="launch-name"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g., The Content Creator Accelerator"
          className="text-lg"
        />
      </div>

      {/* Q7: Pricing */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          How much are you charging?
        </Label>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="price-point" className="text-sm text-muted-foreground">
              Price
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="price-point"
                type="number"
                min="0"
                step="1"
                value={data.pricePoint ?? ''}
                onChange={(e) => handlePriceChange(e.target.value)}
                className="pl-7"
                placeholder="997"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="payment-plan" className="text-sm text-muted-foreground">
                Payment plan available?
              </Label>
              <Switch
                id="payment-plan"
                checked={data.hasPaymentPlan}
                onCheckedChange={(checked) => onChange({ hasPaymentPlan: checked })}
              />
            </div>
            {data.hasPaymentPlan && (
              <Input
                id="payment-plan-details"
                value={data.paymentPlanDetails}
                onChange={(e) => onChange({ paymentPlanDetails: e.target.value })}
                placeholder="e.g., 3 payments of $349"
                className="mt-2"
              />
            )}
          </div>
        </div>

        {/* Sales needed calculation */}
        {data.salesNeeded > 0 && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <p className="text-sm">
                To hit your revenue goal, you need{' '}
                <span className="font-bold text-primary text-lg">{data.salesNeeded} sales</span>
              </p>
              {data.salesNeeded > 30 && (
                <p className="text-xs text-muted-foreground mt-1">
                  If that feels like a lot, consider raising your price or lowering your goal. Math is your friend.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Q8: Ideal Customer */}
      <div className="space-y-3">
        <Label htmlFor="ideal-customer" className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Who is this offer FOR?
        </Label>
        <p className="text-sm text-muted-foreground -mt-1">
          Brief description of your ideal buyer. Be specific.
        </p>
        <Textarea
          id="ideal-customer"
          value={data.idealCustomer}
          onChange={(e) => onChange({ idealCustomer: e.target.value.slice(0, 200) })}
          placeholder="e.g., Female entrepreneurs who have been in business 1-3 years and want to create their first online course but feel overwhelmed by the tech..."
          rows={3}
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground text-right">
          {data.idealCustomer.length}/200
        </p>
      </div>

      {/* Q9: Bonus Stack */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Bonus Stack
        </Label>
        <p className="text-sm text-muted-foreground -mt-1">
          Add bonuses to increase value. For each, tell us if it's ready or needs to be created.
        </p>

        {/* Add new bonus */}
        <div className="flex gap-2">
          <Input
            value={newBonusName}
            onChange={(e) => setNewBonusName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddBonus()}
            placeholder="Bonus name (e.g., 'Private Q&A calls')"
            className="flex-1"
          />
          <Button 
            type="button"
            onClick={handleAddBonus} 
            disabled={!newBonusName.trim()}
            variant="outline"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Bonus list */}
        {(data.bonusStack?.length ?? 0) > 0 && (
          <div className="space-y-3">
            {data.bonusStack?.map((bonus) => (
              <BonusItemCard
                key={bonus.id}
                bonus={bonus}
                onUpdate={(updates) => handleUpdateBonus(bonus.id, updates)}
                onRemove={() => handleRemoveBonus(bonus.id)}
                maxDeadline={data.cartOpensDate}
              />
            ))}
          </div>
        )}

        {/* Warning for late deadlines */}
        {bonusesWithLateDeadlines.length > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {bonusesWithLateDeadlines.length} bonus{bonusesWithLateDeadlines.length > 1 ? 'es' : ''} ha{bonusesWithLateDeadlines.length > 1 ? 've' : 's'} a deadline after cart opens. 
              Consider adjusting the deadline to have everything ready before launch.
            </p>
          </div>
        )}

        {/* Summary of bonuses needing creation */}
        {bonusesNeedingCreation.length > 0 && (
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-sm">
              📋 <strong>{bonusesNeedingCreation.length}</strong> bonus{bonusesNeedingCreation.length > 1 ? 'es' : ''} to create before launch
            </p>
          </div>
        )}

        {!data.bonusStack?.length && (
          <p className="text-xs text-muted-foreground">
            💡 Don't have a bonus? That's okay. Scarcity (limited time/spots) works too.
          </p>
        )}
      </div>

      {/* Q10: Limitations */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Any limitations on who can buy?
        </Label>
        
        <RadioGroup
          value={data.hasLimitations}
          onValueChange={(value) => onChange({ 
            hasLimitations: value as HasLimitations,
            // Clear spot limit if not limited spots
            ...(value !== 'limited-spots' ? { spotLimit: null } : {}),
          })}
          className="space-y-3"
        >
          {HAS_LIMITATIONS_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-3">
              <RadioGroupItem 
                value={option.value} 
                id={`limits-${option.value}`}
              />
              <Label 
                htmlFor={`limits-${option.value}`} 
                className="cursor-pointer"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>

        {/* Existing clients detail */}
        {data.hasLimitations === 'existing-clients' && (
          <div className="mt-3">
            <Label htmlFor="limitation-details" className="text-sm">
              Who specifically can buy?
            </Label>
            <Input
              id="limitation-details"
              value={data.limitationDetails}
              onChange={(e) => onChange({ limitationDetails: e.target.value })}
              placeholder="e.g., Past course students, coaching clients..."
              className="mt-1"
            />
          </div>
        )}

        {/* Limited spots */}
        {data.hasLimitations === 'limited-spots' && (
          <div className="mt-3 space-y-3">
            <div>
              <Label htmlFor="spot-limit" className="text-sm">
                How many spots are available?
              </Label>
              <Input
                id="spot-limit"
                type="number"
                min="1"
                value={data.spotLimit ?? ''}
                onChange={(e) => onChange({ spotLimit: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="e.g., 20"
                className="mt-1 w-32"
              />
            </div>
            
            {data.spotLimit && data.spotLimit < data.salesNeeded && data.salesNeeded > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  ⚠️ You need {data.salesNeeded} sales to hit your goal, but only have {data.spotLimit} spots. 
                  Consider raising your price or adjusting your revenue goal.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary Card */}
      {data.name && data.pricePoint && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-2">Your offer at a glance:</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{data.name}</Badge>
              <Badge variant="outline">${data.pricePoint}</Badge>
              {data.hasPaymentPlan && (
                <Badge variant="outline" className="border-green-500 text-green-600">
                  Payment plan
                </Badge>
              )}
              {data.hasLimitations === 'limited-spots' && data.spotLimit && (
                <Badge variant="outline" className="border-amber-500 text-amber-600">
                  {data.spotLimit} spots
                </Badge>
              )}
              {(data.bonusStack?.length ?? 0) > 0 && (
                <Badge variant="outline" className="border-purple-500 text-purple-600">
                  + {data.bonusStack?.length} bonus{(data.bonusStack?.length ?? 0) > 1 ? 'es' : ''}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
