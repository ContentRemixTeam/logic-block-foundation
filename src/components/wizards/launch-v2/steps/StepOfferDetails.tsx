// Step 3: Offer Details - ENHANCED with pricing structure and offer stack
// Captures pricing, payment plans, ideal customer, bonuses, and limitations

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  DollarSign, 
  Users, 
  Gift, 
  Lock, 
  Plus, 
  AlertTriangle,
  ChevronDown,
  CreditCard,
  ShoppingCart,
  Shield,
  Sparkles,
  Tag,
  TrendingUp,
} from 'lucide-react';
import {
  LaunchWizardV2Data,
  HasLimitations,
  HAS_LIMITATIONS_OPTIONS,
  BonusItem,
  OfferPricing,
  OfferStack,
  OrderBump,
  Upsell,
  DEFAULT_OFFER_PRICING,
  DEFAULT_OFFER_STACK,
} from '@/types/launchV2';
import { calculateSalesNeeded } from '@/lib/launchV2Validation';
import { BonusItemCard } from '@/components/wizards/shared/BonusItemCard';
import { PaymentPlanBuilder } from '@/components/wizards/launch-v2/shared/PaymentPlanBuilder';
import { OrderBumpCard } from '@/components/wizards/launch-v2/shared/OrderBumpCard';
import { UpsellCard } from '@/components/wizards/launch-v2/shared/UpsellCard';
import { parseISO, isAfter } from 'date-fns';

interface StepOfferDetailsProps {
  data: LaunchWizardV2Data;
  onChange: (updates: Partial<LaunchWizardV2Data>) => void;
}

const GUARANTEE_TYPE_OPTIONS = [
  { value: 'money-back', label: 'Money-Back Guarantee' },
  { value: 'results', label: 'Results Guarantee' },
  { value: 'satisfaction', label: 'Satisfaction Guarantee' },
  { value: 'none', label: 'No Guarantee' },
  { value: 'other', label: 'Other' },
] as const;

export function StepOfferDetails({ data, onChange }: StepOfferDetailsProps) {
  const [newBonusName, setNewBonusName] = useState('');
  const [specialPricingOpen, setSpecialPricingOpen] = useState(false);
  const [offerStackOpen, setOfferStackOpen] = useState(false);

  // Ensure offerPricing and offerStack exist with defaults
  const offerPricing = data.offerPricing || DEFAULT_OFFER_PRICING;
  const offerStack = data.offerStack || DEFAULT_OFFER_STACK;

  const handlePricingChange = (updates: Partial<OfferPricing>) => {
    const newPricing = { ...offerPricing, ...updates };
    onChange({ 
      offerPricing: newPricing,
      // Also update legacy pricePoint for compatibility
      pricePoint: newPricing.fullPrice,
      salesNeeded: calculateSalesNeeded(data.customRevenueGoal, newPricing.fullPrice),
    });
  };

  const handleOfferStackChange = (updates: Partial<OfferStack>) => {
    onChange({ offerStack: { ...offerStack, ...updates } });
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
      status: 'existing',
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

  // Order bump handlers
  const handleAddOrderBump = () => {
    const newBump: OrderBump = {
      id: crypto.randomUUID(),
      name: '',
      price: 0,
      description: '',
    };
    handleOfferStackChange({ orderBumps: [...offerStack.orderBumps, newBump] });
  };

  const handleUpdateOrderBump = (id: string, updates: Partial<OrderBump>) => {
    const updated = offerStack.orderBumps.map(b => 
      b.id === id ? { ...b, ...updates } : b
    );
    handleOfferStackChange({ orderBumps: updated });
  };

  const handleRemoveOrderBump = (id: string) => {
    handleOfferStackChange({ orderBumps: offerStack.orderBumps.filter(b => b.id !== id) });
  };

  // Upsell handlers
  const handleAddUpsell = () => {
    const newUpsell: Upsell = {
      id: crypto.randomUUID(),
      name: '',
      price: 0,
      showWhen: 'post-purchase',
    };
    handleOfferStackChange({ upsells: [...offerStack.upsells, newUpsell] });
  };

  const handleUpdateUpsell = (id: string, updates: Partial<Upsell>) => {
    const updated = offerStack.upsells.map(u => 
      u.id === id ? { ...u, ...updates } : u
    );
    handleOfferStackChange({ upsells: updated });
  };

  const handleRemoveUpsell = (id: string) => {
    handleOfferStackChange({ upsells: offerStack.upsells.filter(u => u.id !== id) });
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

      {/* SECTION 1: Core Pricing */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Pricing Structure
        </Label>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Full Price */}
          <div className="space-y-2">
            <Label htmlFor="full-price" className="text-sm text-muted-foreground">
              Full Price (pay-in-full)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="full-price"
                type="number"
                min="0"
                step="1"
                value={offerPricing.fullPrice ?? ''}
                onChange={(e) => handlePricingChange({ 
                  fullPrice: e.target.value ? parseFloat(e.target.value) : null 
                })}
                className="pl-7"
                placeholder="997"
              />
            </div>
          </div>

          {/* Original Value (optional) */}
          <div className="space-y-2">
            <Label htmlFor="original-value" className="text-sm text-muted-foreground flex items-center gap-1">
              Original Value
              <span className="text-xs">(optional - for anchoring)</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="original-value"
                type="number"
                min="0"
                step="1"
                value={offerPricing.originalValue ?? ''}
                onChange={(e) => handlePricingChange({ 
                  originalValue: e.target.value ? parseFloat(e.target.value) : null 
                })}
                className="pl-7"
                placeholder="2,997"
              />
            </div>
          </div>
        </div>

        {/* Value comparison hint */}
        {offerPricing.originalValue && offerPricing.fullPrice && offerPricing.originalValue > offerPricing.fullPrice && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-800 dark:text-green-200">
              💰 <strong>That's {Math.round((1 - offerPricing.fullPrice / offerPricing.originalValue) * 100)}% off!</strong> You can show customers they're saving ${(offerPricing.originalValue - offerPricing.fullPrice).toLocaleString()}.
            </p>
          </div>
        )}

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

      {/* SECTION 2: Payment Plans */}
      <div className="space-y-4">
        <PaymentPlanBuilder
          plans={offerPricing.paymentPlans}
          fullPrice={offerPricing.fullPrice}
          onChange={(plans) => handlePricingChange({ paymentPlans: plans })}
        />
      </div>

      {/* SECTION 3: Special Pricing (Collapsible) */}
      <Collapsible open={specialPricingOpen} onOpenChange={setSpecialPricingOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-4 h-auto">
            <span className="flex items-center gap-2 font-medium">
              <Tag className="h-4 w-4" />
              Special Pricing (Early Bird, Waitlist, VIP)
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${specialPricingOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          {/* Early Bird */}
          <Card className="bg-muted/30">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="early-bird-toggle" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Early Bird Pricing
                </Label>
                <Switch
                  id="early-bird-toggle"
                  checked={offerPricing.hasEarlyBirdPrice}
                  onCheckedChange={(checked) => handlePricingChange({ hasEarlyBirdPrice: checked })}
                />
              </div>
              {offerPricing.hasEarlyBirdPrice && (
                <div className="space-y-3 mt-3">
                  {/* Deadline - always shown */}
                  <div className="space-y-1.5">
                    <Label htmlFor="early-bird-deadline" className="text-xs text-muted-foreground">Expires</Label>
                    <Input
                      id="early-bird-deadline"
                      type="date"
                      value={offerPricing.earlyBirdDeadline}
                      onChange={(e) => handlePricingChange({ earlyBirdDeadline: e.target.value })}
                      className="w-1/2"
                    />
                  </div>

                  {/* Offer Type Selector - Optional */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">What's the early bird incentive? (Optional)</Label>
                    <RadioGroup
                      value={offerPricing.earlyBirdOfferType || 'none'}
                      onValueChange={(v) => handlePricingChange({ earlyBirdOfferType: v as 'none' | 'discount' | 'bonus' | 'both' })}
                      className="flex flex-wrap gap-3"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="none" id="eb-none" />
                        <Label htmlFor="eb-none" className="text-sm font-normal cursor-pointer">Just scarcity</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="discount" id="eb-discount" />
                        <Label htmlFor="eb-discount" className="text-sm font-normal cursor-pointer">Discount</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="bonus" id="eb-bonus" />
                        <Label htmlFor="eb-bonus" className="text-sm font-normal cursor-pointer">Bonus</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="both" id="eb-both" />
                        <Label htmlFor="eb-both" className="text-sm font-normal cursor-pointer">Both</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Discount Price - show if discount or both */}
                  {(offerPricing.earlyBirdOfferType === 'discount' || offerPricing.earlyBirdOfferType === 'both') && (
                    <div className="space-y-1.5">
                      <Label htmlFor="early-bird-price" className="text-xs text-muted-foreground">Discounted Price</Label>
                      <div className="relative w-1/2">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input
                          id="early-bird-price"
                          type="number"
                          min="0"
                          value={offerPricing.earlyBirdPrice ?? ''}
                          onChange={(e) => handlePricingChange({ 
                            earlyBirdPrice: e.target.value ? parseFloat(e.target.value) : null 
                          })}
                          className="pl-7"
                          placeholder="797"
                        />
                      </div>
                    </div>
                  )}

                  {/* Bonus Description - show if bonus or both */}
                  {(offerPricing.earlyBirdOfferType === 'bonus' || offerPricing.earlyBirdOfferType === 'both') && (
                    <div className="space-y-1.5">
                      <Label htmlFor="early-bird-bonus" className="text-xs text-muted-foreground">Bonus Description</Label>
                      <Input
                        id="early-bird-bonus"
                        value={offerPricing.earlyBirdBonus || ''}
                        onChange={(e) => handlePricingChange({ earlyBirdBonus: e.target.value })}
                        placeholder="e.g., Private 1:1 onboarding call ($500 value)"
                      />
                    </div>
                  )}

                  {/* Scarcity tip */}
                  {offerPricing.earlyBirdOfferType === 'none' && (
                    <p className="text-xs text-muted-foreground">
                      💡 Don't have a bonus? That's okay. Scarcity (limited time/spots) works too.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Waitlist Pricing */}
          <Card className="bg-muted/30">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="waitlist-toggle" className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  Waitlist-Only Pricing
                </Label>
                <Switch
                  id="waitlist-toggle"
                  checked={offerPricing.hasWaitlistPrice}
                  onCheckedChange={(checked) => handlePricingChange({ hasWaitlistPrice: checked })}
                />
              </div>
              {offerPricing.hasWaitlistPrice && (
                <div className="space-y-3 mt-3">
                  {/* Offer Type Selector - Optional */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">What's the waitlist incentive? (Optional)</Label>
                    <RadioGroup
                      value={offerPricing.waitlistOfferType || 'none'}
                      onValueChange={(v) => handlePricingChange({ waitlistOfferType: v as 'none' | 'discount' | 'bonus' | 'both' })}
                      className="flex flex-wrap gap-3"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="none" id="wl-none" />
                        <Label htmlFor="wl-none" className="text-sm font-normal cursor-pointer">Just scarcity</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="discount" id="wl-discount" />
                        <Label htmlFor="wl-discount" className="text-sm font-normal cursor-pointer">Discount</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="bonus" id="wl-bonus" />
                        <Label htmlFor="wl-bonus" className="text-sm font-normal cursor-pointer">Bonus</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="both" id="wl-both" />
                        <Label htmlFor="wl-both" className="text-sm font-normal cursor-pointer">Both</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Discount Price - show if discount or both */}
                  {(offerPricing.waitlistOfferType === 'discount' || offerPricing.waitlistOfferType === 'both') && (
                    <div className="space-y-1.5">
                      <Label htmlFor="waitlist-price" className="text-xs text-muted-foreground">Special price for waitlist subscribers</Label>
                      <div className="relative w-1/2">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input
                          id="waitlist-price"
                          type="number"
                          min="0"
                          value={offerPricing.waitlistPrice ?? ''}
                          onChange={(e) => handlePricingChange({ 
                            waitlistPrice: e.target.value ? parseFloat(e.target.value) : null 
                          })}
                          className="pl-7"
                          placeholder="897"
                        />
                      </div>
                    </div>
                  )}

                  {/* Bonus Description - show if bonus or both */}
                  {(offerPricing.waitlistOfferType === 'bonus' || offerPricing.waitlistOfferType === 'both') && (
                    <div className="space-y-1.5">
                      <Label htmlFor="waitlist-bonus" className="text-xs text-muted-foreground">Bonus Description</Label>
                      <Input
                        id="waitlist-bonus"
                        value={offerPricing.waitlistBonus || ''}
                        onChange={(e) => handlePricingChange({ waitlistBonus: e.target.value })}
                        placeholder="e.g., Exclusive resource bundle ($300 value)"
                      />
                    </div>
                  )}

                  {/* Scarcity tip */}
                  {offerPricing.waitlistOfferType === 'none' && (
                    <p className="text-xs text-muted-foreground">
                      💡 Don't have a bonus? That's okay. Scarcity (limited time/spots) works too.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>


          {/* VIP Tier */}
          <Card className="bg-muted/30">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="vip-toggle" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  VIP/Premium Tier
                </Label>
                <Switch
                  id="vip-toggle"
                  checked={offerPricing.hasVipTier}
                  onCheckedChange={(checked) => handlePricingChange({ hasVipTier: checked })}
                />
              </div>
              {offerPricing.hasVipTier && (
                <div className="space-y-3 mt-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="vip-price" className="text-xs text-muted-foreground">VIP Price</Label>
                    <div className="relative w-1/2">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input
                        id="vip-price"
                        type="number"
                        min="0"
                        value={offerPricing.vipPrice ?? ''}
                        onChange={(e) => handlePricingChange({ 
                          vipPrice: e.target.value ? parseFloat(e.target.value) : null 
                        })}
                        className="pl-7"
                        placeholder="2,497"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="vip-includes" className="text-xs text-muted-foreground">What's included in VIP?</Label>
                    <Input
                      id="vip-includes"
                      value={offerPricing.vipIncludes}
                      onChange={(e) => handlePricingChange({ vipIncludes: e.target.value })}
                      placeholder="e.g., 1:1 coaching calls, private Slack access, done-for-you templates"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Ideal Customer */}
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

      {/* Bonus Stack */}
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

      {/* SECTION 4: Offer Stack (Collapsible) */}
      <Collapsible open={offerStackOpen} onOpenChange={setOfferStackOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-4 h-auto">
            <span className="flex items-center gap-2 font-medium">
              <ShoppingCart className="h-4 w-4" />
              Offer Stack (Order Bumps, Upsells, Guarantee)
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${offerStackOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-6 pt-2">
          {/* Order Bumps */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-medium flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Order Bumps
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddOrderBump}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Small add-ons shown at checkout (typically $17-$97)
            </p>
            {offerStack.orderBumps.map((bump) => (
              <OrderBumpCard
                key={bump.id}
                bump={bump}
                onUpdate={(updates) => handleUpdateOrderBump(bump.id, updates)}
                onRemove={() => handleRemoveOrderBump(bump.id)}
              />
            ))}
          </div>

          {/* Upsells */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Upsells
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddUpsell}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Higher-value offers shown during or after checkout
            </p>
            {offerStack.upsells.map((upsell) => (
              <UpsellCard
                key={upsell.id}
                upsell={upsell}
                onUpdate={(updates) => handleUpdateUpsell(upsell.id, updates)}
                onRemove={() => handleRemoveUpsell(upsell.id)}
              />
            ))}
          </div>

          {/* Downsell */}
          <Card className="bg-muted/30">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="downsell-toggle" className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Downsell for Non-Buyers
                </Label>
                <Switch
                  id="downsell-toggle"
                  checked={offerStack.hasDownsell}
                  onCheckedChange={(checked) => handleOfferStackChange({ hasDownsell: checked })}
                />
              </div>
              {offerStack.hasDownsell && (
                <div className="space-y-1.5 mt-3">
                  <Label htmlFor="downsell-details" className="text-xs text-muted-foreground">
                    What will you offer people who don't buy?
                  </Label>
                  <Input
                    id="downsell-details"
                    value={offerStack.downsellDetails}
                    onChange={(e) => handleOfferStackChange({ downsellDetails: e.target.value })}
                    placeholder="e.g., $47 mini-course, payment plan, lower-tier offer"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Guarantee */}
          <Card className="bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Guarantee
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="guarantee-type" className="text-xs text-muted-foreground">Type</Label>
                  <Select
                    value={offerStack.guaranteeType}
                    onValueChange={(value) => handleOfferStackChange({ 
                      guaranteeType: value as OfferStack['guaranteeType'] 
                    })}
                  >
                    <SelectTrigger id="guarantee-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {GUARANTEE_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="guarantee-duration" className="text-xs text-muted-foreground">Duration</Label>
                  <Input
                    id="guarantee-duration"
                    value={offerStack.guaranteeDuration}
                    onChange={(e) => handleOfferStackChange({ guaranteeDuration: e.target.value })}
                    placeholder="e.g., 30 days, 60 days"
                  />
                </div>
              </div>
              {offerStack.guaranteeType !== 'none' && (
                <div className="space-y-1.5">
                  <Label htmlFor="guarantee-details" className="text-xs text-muted-foreground">Details (what do they get?)</Label>
                  <Input
                    id="guarantee-details"
                    value={offerStack.guaranteeDetails}
                    onChange={(e) => handleOfferStackChange({ guaranteeDetails: e.target.value })}
                    placeholder="e.g., Full refund, no questions asked"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Limitations */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Any limitations on who can buy?
        </Label>
        
        <RadioGroup
          value={data.hasLimitations}
          onValueChange={(value) => onChange({ 
            hasLimitations: value as HasLimitations,
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
      {data.name && offerPricing.fullPrice && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-2">Your offer at a glance:</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{data.name}</Badge>
              <Badge variant="outline">${offerPricing.fullPrice.toLocaleString()}</Badge>
              {offerPricing.paymentPlans.length > 0 && (
                <Badge variant="outline" className="border-green-500 text-green-600">
                  {offerPricing.paymentPlans.length} payment plan{offerPricing.paymentPlans.length > 1 ? 's' : ''}
                </Badge>
              )}
              {offerPricing.hasEarlyBirdPrice && (
                <Badge variant="outline" className="border-amber-500 text-amber-600">
                  Early bird
                </Badge>
              )}
              {offerPricing.hasVipTier && (
                <Badge variant="outline" className="border-purple-500 text-purple-600">
                  VIP tier
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
              {offerStack.orderBumps.length > 0 && (
                <Badge variant="outline" className="border-blue-500 text-blue-600">
                  {offerStack.orderBumps.length} bump{offerStack.orderBumps.length > 1 ? 's' : ''}
                </Badge>
              )}
              {offerStack.guaranteeType !== 'none' && (
                <Badge variant="outline" className="border-green-500 text-green-600">
                  <Shield className="h-3 w-3 mr-1" />
                  Guarantee
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
