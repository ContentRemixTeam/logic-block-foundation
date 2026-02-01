import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { SummitWizardData, ALL_ACCESS_INCLUDES_OPTIONS } from '@/types/summit';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface StepProps {
  data: SummitWizardData;
  updateData: (updates: Partial<SummitWizardData>) => void;
}

export function StepAllAccessPass({ data, updateData }: StepProps) {
  const [vipOpen, setVipOpen] = useState(data.hasVipTier);

  const toggleInclude = (value: string) => {
    const current = data.allAccessIncludes;
    if (current.includes(value)) {
      updateData({ allAccessIncludes: current.filter(v => v !== value) });
    } else {
      updateData({ allAccessIncludes: [...current, value] });
    }
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
          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price">Price point</Label>
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
          </div>

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
