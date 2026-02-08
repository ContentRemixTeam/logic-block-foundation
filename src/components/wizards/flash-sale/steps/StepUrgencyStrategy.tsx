import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FlashSaleWizardData, URGENCY_TYPES } from '@/types/flashSale';
import { Timer, Package, Gift, Sparkles } from 'lucide-react';

interface StepProps {
  data: FlashSaleWizardData;
  setData: (updates: Partial<FlashSaleWizardData>) => void;
}

const URGENCY_ICONS: Record<string, React.ReactNode> = {
  countdown: <Timer className="h-5 w-5" />,
  'limited-quantity': <Package className="h-5 w-5" />,
  'early-bird': <Sparkles className="h-5 w-5" />,
  'flash-bonus': <Gift className="h-5 w-5" />,
  combo: <Timer className="h-5 w-5" />,
};

export function StepUrgencyStrategy({ data, setData }: StepProps) {
  const showQuantityField = data.urgencyType === 'limited-quantity' || data.urgencyType === 'combo';
  const showEarlyBirdFields = data.urgencyType === 'early-bird' || data.urgencyType === 'combo';
  const showBonusFields = data.urgencyType === 'flash-bonus' || data.urgencyType === 'combo';

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-orange-500/10">
          <Timer className="h-8 w-8 text-orange-500" />
        </div>
        <h2 className="text-2xl font-bold">Urgency Strategy</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Choose how you'll create urgency to drive fast action
        </p>
      </div>

      {/* Urgency Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Primary Urgency Tactic</CardTitle>
          <CardDescription>
            What will make people buy NOW instead of "thinking about it"?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={data.urgencyType}
            onValueChange={(v) => setData({ urgencyType: v as FlashSaleWizardData['urgencyType'] })}
            className="space-y-3"
          >
            {URGENCY_TYPES.map((type) => (
              <Label
                key={type.value}
                className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  data.urgencyType === type.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <RadioGroupItem value={type.value} className="mt-0.5" />
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    {URGENCY_ICONS[type.value]}
                  </div>
                  <div>
                    <p className="font-medium">{type.label}</p>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </div>
                </div>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Limited Quantity Settings */}
      {showQuantityField && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Limited Quantity Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>How many spots/units available?</Label>
              <Input
                type="number"
                placeholder="e.g., 20"
                value={data.limitedQuantity ?? ''}
                onChange={(e) => setData({ limitedQuantity: e.target.value ? parseInt(e.target.value) : null })}
              />
              <p className="text-sm text-muted-foreground">
                This creates FOMO - "Only 20 spots at this price"
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Early Bird Settings */}
      {showEarlyBirdFields && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Early Bird Bonus
            </CardTitle>
            <CardDescription>
              Reward fast action with an extra bonus
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Early bird window (hours)</Label>
              <Input
                type="number"
                placeholder="e.g., 6"
                value={data.earlyBirdHours ?? ''}
                onChange={(e) => setData({ earlyBirdHours: e.target.value ? parseInt(e.target.value) : null })}
              />
              <p className="text-sm text-muted-foreground">
                Bonus available for the first X hours of the sale
              </p>
            </div>

            <div className="space-y-2">
              <Label>What's the early bird bonus?</Label>
              <Textarea
                placeholder="e.g., Free 1:1 strategy call (worth $297), Exclusive bonus module, Extra templates pack"
                value={data.earlyBirdBonus}
                onChange={(e) => setData({ earlyBirdBonus: e.target.value })}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Flash Bonus Settings */}
      {showBonusFields && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Disappearing Bonus
            </CardTitle>
            <CardDescription>
              A bonus that expires BEFORE the sale ends
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Bonus disappears after (hours from start)</Label>
              <Input
                type="number"
                placeholder="e.g., 12"
                value={data.flashBonusDeadlineHours ?? ''}
                onChange={(e) => setData({ flashBonusDeadlineHours: e.target.value ? parseInt(e.target.value) : null })}
              />
            </div>

            <div className="space-y-2">
              <Label>What's the disappearing bonus?</Label>
              <Textarea
                placeholder="e.g., Private community access, Implementation workshop recording, VIP support upgrade"
                value={data.flashBonus}
                onChange={(e) => setData({ flashBonus: e.target.value })}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scarcity Message */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Scarcity Headline</CardTitle>
          <CardDescription>
            The main message you'll use to create urgency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder={
              data.urgencyType === 'countdown'
                ? "e.g., Sale ends in 48 hours - price goes back up!"
                : data.urgencyType === 'limited-quantity'
                ? "e.g., Only 20 spots available at this price"
                : data.urgencyType === 'early-bird'
                ? "e.g., First 6 hours only: Get [bonus] FREE"
                : "e.g., [Bonus] disappears at midnight tonight"
            }
            value={data.scarcityMessage}
            onChange={(e) => setData({ scarcityMessage: e.target.value })}
            rows={2}
          />
        </CardContent>
      </Card>

      {/* Preview */}
      {(data.urgencyType && (data.scarcityMessage || data.discountValue)) && (
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardHeader>
            <CardTitle className="text-lg">Urgency Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-background rounded-lg border space-y-3">
              {data.discountValue && (
                <div className="inline-block px-3 py-1 bg-red-500 text-white text-sm font-bold rounded">
                  {data.discountType === 'percentage' ? `${data.discountValue}% OFF` : `$${data.discountValue} OFF`}
                </div>
              )}
              
              {data.scarcityMessage && (
                <p className="font-semibold text-lg">{data.scarcityMessage}</p>
              )}

              {data.urgencyType === 'countdown' && (
                <div className="flex gap-2 text-center">
                  {['12', '34', '56'].map((num, i) => (
                    <div key={i} className="bg-muted px-3 py-2 rounded font-mono text-xl font-bold">
                      {num}
                      <span className="block text-xs text-muted-foreground">
                        {i === 0 ? 'HRS' : i === 1 ? 'MIN' : 'SEC'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {showQuantityField && data.limitedQuantity && (
                <p className="text-sm text-orange-600 font-medium">
                  🔥 Only {data.limitedQuantity} spots remaining
                </p>
              )}

              {showEarlyBirdFields && data.earlyBirdBonus && (
                <p className="text-sm text-green-600 font-medium">
                  ✨ First {data.earlyBirdHours} hours: {data.earlyBirdBonus}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
