import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SummitWizardData, ALL_ACCESS_INCLUDES_OPTIONS, OrderBump } from '@/types/summit';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, TrendingUp, Plus, Trash2, ShoppingCart, Lightbulb, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface StepProps {
  data: SummitWizardData;
  updateData: (updates: Partial<SummitWizardData>) => void;
}

const ORDER_BUMP_SUGGESTIONS = [
  { name: 'Speaker Swipe Files', price: 27, description: 'All speaker notes, slides, and resources in one download' },
  { name: 'Implementation Workbook', price: 17, description: 'Printable workbook with action steps for each session' },
  { name: 'VIP Community Access', price: 47, description: '90-day access to private implementation community' },
  { name: 'Behind-the-Scenes Training', price: 37, description: 'How I planned and executed this summit' },
];

export function StepAllAccessPass({ data, updateData }: StepProps) {
  const [vipOpen, setVipOpen] = useState(data.hasVipTier);
  const [priceIncreaseOpen, setPriceIncreaseOpen] = useState(data.hasPriceIncreases);
  const [orderBumpOpen, setOrderBumpOpen] = useState(data.hasOrderBumps);

  const toggleInclude = (value: string) => {
    const current = data.allAccessIncludes;
    if (current.includes(value)) {
      updateData({ allAccessIncludes: current.filter(v => v !== value) });
    } else {
      updateData({ allAccessIncludes: [...current, value] });
    }
  };

  const addOrderBump = (suggestion?: typeof ORDER_BUMP_SUGGESTIONS[0]) => {
    const newBump: OrderBump = {
      id: crypto.randomUUID(),
      name: suggestion?.name || '',
      price: suggestion?.price || null,
      description: suggestion?.description || '',
    };
    updateData({ orderBumps: [...(data.orderBumps || []), newBump] });
  };

  const updateOrderBump = (id: string, updates: Partial<OrderBump>) => {
    const bumps = data.orderBumps || [];
    updateData({
      orderBumps: bumps.map(b => b.id === id ? { ...b, ...updates } : b),
    });
  };

  const removeOrderBump = (id: string) => {
    updateData({
      orderBumps: (data.orderBumps || []).filter(b => b.id !== id),
    });
  };

  return (
    <div className="space-y-6">
      {/* Has All-Access Pass */}
      <div className="space-y-3">
        <Label>Do you have an all-access pass?</Label>
        <RadioGroup
          value={data.hasAllAccessPass}
          onValueChange={(value) => updateData({ hasAllAccessPass: value as 'yes' | 'no' | 'considering' })}
          className="space-y-2"
        >
          {[
            { value: 'yes', label: 'Yes', description: 'I have an all-access pass to sell' },
            { value: 'no', label: 'No (free summit only)', description: 'This is a free summit without upgrades' },
            { value: 'considering', label: 'Considering it', description: "I'm still deciding" },
          ].map((option) => (
            <div
              key={option.value}
              className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                data.hasAllAccessPass === option.value
                  ? 'border-primary bg-primary/10'
                  : 'hover:bg-accent/50'
              }`}
              onClick={() => updateData({ hasAllAccessPass: option.value as 'yes' | 'no' | 'considering' })}
            >
              <RadioGroupItem value={option.value} id={`aap-${option.value}`} className="mt-1" />
              <div>
                <label htmlFor={`aap-${option.value}`} className="font-medium cursor-pointer">
                  {option.label}
                </label>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* All-Access Pass Details */}
      {data.hasAllAccessPass !== 'no' && (
        <>
          {/* Base Price */}
          <div className="space-y-2">
            <Label htmlFor="price">Base price point</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">$</span>
              <Input
                id="price"
                type="number"
                min={0}
                value={data.allAccessPrice || ''}
                onChange={(e) => updateData({ allAccessPrice: parseFloat(e.target.value) || null })}
                placeholder="e.g., 97"
                className="w-32"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This is your standard price. You can add price increases below.
            </p>
          </div>

          {/* Price Increases Section */}
          <Collapsible open={priceIncreaseOpen} onOpenChange={setPriceIncreaseOpen}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <Label className="cursor-pointer">Price increase strategy</Label>
                    <p className="text-sm text-muted-foreground">
                      Offer different prices at different stages to maximize revenue
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={data.hasPriceIncreases}
                    onCheckedChange={(checked) => {
                      updateData({ hasPriceIncreases: checked });
                      setPriceIncreaseOpen(checked);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <ChevronDown className={`h-4 w-4 transition-transform ${priceIncreaseOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-4">
              <Card className="border-green-500/20 bg-green-500/5">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2 mb-4">
                    <Lightbulb className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">Pro tip:</strong> Price increases create urgency and reward early action. 
                      Waitlist buyers get the best deal, prices rise during the summit, and remain highest after.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="waitlist-price" className="text-sm">
                        Waitlist Price
                        <span className="text-xs text-muted-foreground ml-1">(lowest)</span>
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">$</span>
                        <Input
                          id="waitlist-price"
                          type="number"
                          min={0}
                          value={data.waitlistPrice || ''}
                          onChange={(e) => updateData({ waitlistPrice: parseFloat(e.target.value) || null })}
                          placeholder="e.g., 47"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="during-price" className="text-sm">
                        During Summit
                        <span className="text-xs text-muted-foreground ml-1">(standard)</span>
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">$</span>
                        <Input
                          id="during-price"
                          type="number"
                          min={0}
                          value={data.duringSummitPrice || ''}
                          onChange={(e) => updateData({ duringSummitPrice: parseFloat(e.target.value) || null })}
                          placeholder="e.g., 97"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="after-price" className="text-sm">
                        After Summit
                        <span className="text-xs text-muted-foreground ml-1">(highest)</span>
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">$</span>
                        <Input
                          id="after-price"
                          type="number"
                          min={0}
                          value={data.afterSummitPrice || ''}
                          onChange={(e) => updateData({ afterSummitPrice: parseFloat(e.target.value) || null })}
                          placeholder="e.g., 147"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* Order Bumps Section */}
          <Collapsible open={orderBumpOpen} onOpenChange={setOrderBumpOpen}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <ShoppingCart className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <Label className="cursor-pointer">Order bumps</Label>
                    <p className="text-sm text-muted-foreground">
                      Add low-ticket items at checkout to increase average order value
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={data.hasOrderBumps}
                    onCheckedChange={(checked) => {
                      updateData({ hasOrderBumps: checked });
                      setOrderBumpOpen(checked);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <ChevronDown className={`h-4 w-4 transition-transform ${orderBumpOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-4">
              <Card className="border-purple-500/20 bg-purple-500/5">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2 mb-4">
                    <Sparkles className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">Why order bumps work:</strong> These small add-ons can increase your average order value by 10-30%. 
                      Keep them priced low ($17-$47) so they're an easy "yes."
                    </p>
                  </div>

                  {/* Quick add suggestions */}
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Quick add popular bumps:</p>
                    <div className="flex flex-wrap gap-2">
                      {ORDER_BUMP_SUGGESTIONS.map((suggestion, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => addOrderBump(suggestion)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {suggestion.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Order bumps list */}
                  <div className="space-y-3">
                    {(data.orderBumps || []).map((bump, idx) => (
                      <div key={bump.id} className="p-3 bg-background rounded-lg border space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Order Bump {idx + 1}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => removeOrderBump(bump.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <Label className="text-xs">Name</Label>
                            <Input
                              value={bump.name}
                              onChange={(e) => updateOrderBump(bump.id, { name: e.target.value })}
                              placeholder="e.g., Implementation Workbook"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Price</Label>
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground text-sm">$</span>
                              <Input
                                type="number"
                                min={0}
                                value={bump.price || ''}
                                onChange={(e) => updateOrderBump(bump.id, { price: parseFloat(e.target.value) || null })}
                                placeholder="27"
                              />
                            </div>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Description</Label>
                          <Input
                            value={bump.description}
                            onChange={(e) => updateOrderBump(bump.id, { description: e.target.value })}
                            placeholder="Brief description for checkout page"
                          />
                        </div>
                      </div>
                    ))}

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => addOrderBump()}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Custom Order Bump
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* Payment Plan */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="payment-plan">Offer a payment plan?</Label>
              <p className="text-sm text-muted-foreground">
                Allow attendees to split the payment
              </p>
            </div>
            <Switch
              id="payment-plan"
              checked={data.allAccessHasPaymentPlan}
              onCheckedChange={(checked) => updateData({ allAccessHasPaymentPlan: checked })}
            />
          </div>

          {data.allAccessHasPaymentPlan && (
            <div className="space-y-2">
              <Label htmlFor="plan-details">Payment plan details</Label>
              <Input
                id="plan-details"
                value={data.allAccessPaymentPlanDetails}
                onChange={(e) => updateData({ allAccessPaymentPlanDetails: e.target.value })}
                placeholder="e.g., 3 payments of $37"
              />
            </div>
          )}

          {/* What's Included */}
          <div className="space-y-3">
            <Label>What's included in the all-access pass?</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ALL_ACCESS_INCLUDES_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    data.allAccessIncludes.includes(option.value)
                      ? 'border-primary bg-primary/10'
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => toggleInclude(option.value)}
                >
                  <Checkbox
                    id={`include-${option.value}`}
                    checked={data.allAccessIncludes.includes(option.value)}
                    onCheckedChange={() => toggleInclude(option.value)}
                  />
                  <label htmlFor={`include-${option.value}`} className="cursor-pointer flex-1">
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* VIP Tier */}
          <Collapsible open={vipOpen} onOpenChange={setVipOpen}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-accent/50">
                <div>
                  <Label>VIP tier available?</Label>
                  <p className="text-sm text-muted-foreground">
                    Offer a premium upgrade above the standard all-access pass
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={data.hasVipTier}
                    onCheckedChange={(checked) => {
                      updateData({ hasVipTier: checked });
                      setVipOpen(checked);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <ChevronDown className={`h-4 w-4 transition-transform ${vipOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-4 pl-4 border-l-2 border-primary/20">
              <div className="space-y-2">
                <Label htmlFor="vip-price">VIP price</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    id="vip-price"
                    type="number"
                    min={0}
                    value={data.vipPrice || ''}
                    onChange={(e) => updateData({ vipPrice: parseFloat(e.target.value) || null })}
                    placeholder="e.g., 297"
                    className="w-32"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vip-includes">VIP extras</Label>
                <Textarea
                  id="vip-includes"
                  value={data.vipIncludes}
                  onChange={(e) => updateData({ vipIncludes: e.target.value })}
                  placeholder="e.g., 1:1 call with host, exclusive Slack channel, bonus training..."
                  rows={3}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}
    </div>
  );
}
