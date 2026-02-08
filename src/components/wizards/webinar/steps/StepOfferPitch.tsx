// Step 6: Offer/Pitch
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WebinarWizardData, BONUS_DEADLINES } from '@/types/webinar';
import { DollarSign, Lightbulb, Gift, CreditCard } from 'lucide-react';

interface StepOfferPitchProps {
  data: WebinarWizardData;
  onChange: (updates: Partial<WebinarWizardData>) => void;
}

export function StepOfferPitch({ data, onChange }: StepOfferPitchProps) {
  return (
    <div className="space-y-6">
      {/* Teaching Callout */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Pitch Tips</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your webinar content should naturally lead to your offer. The pitch isn't a hard 
                pivot—it's the logical next step. "I taught you X, here's how to go deeper..."
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Offer */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Your Offer</CardTitle>
          </div>
          <CardDescription>What will you pitch at the end?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="offerName">Offer Name</Label>
            <Input
              id="offerName"
              placeholder="e.g., The Client Attraction Accelerator"
              value={data.offerName}
              onChange={(e) => onChange({ offerName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="offerPrice">Price</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="offerPrice"
                type="number"
                placeholder="997"
                value={data.offerPrice || ''}
                onChange={(e) => onChange({ offerPrice: parseFloat(e.target.value) || 0 })}
                className="pl-7"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="offerDescription">Offer Description</Label>
            <Textarea
              id="offerDescription"
              placeholder="Brief description of what's included and the transformation it provides..."
              value={data.offerDescription}
              onChange={(e) => onChange({ offerDescription: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salesPageUrl">Sales Page URL (optional)</Label>
              <Input
                id="salesPageUrl"
                placeholder="https://..."
                value={data.salesPageUrl}
                onChange={(e) => onChange({ salesPageUrl: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkoutUrl">Checkout URL (optional)</Label>
              <Input
                id="checkoutUrl"
                placeholder="https://..."
                value={data.checkoutUrl}
                onChange={(e) => onChange({ checkoutUrl: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendee Bonus */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Attendee Bonus</CardTitle>
          </div>
          <CardDescription>Special incentive for live attendees who buy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Offer Live Attendee Bonus</Label>
              <p className="text-sm text-muted-foreground">Special offer only for those who show up live</p>
            </div>
            <Switch
              checked={data.hasAttendeeBonus}
              onCheckedChange={(checked) => onChange({ hasAttendeeBonus: checked })}
            />
          </div>

          {data.hasAttendeeBonus && (
            <>
              <div className="space-y-2">
                <Label htmlFor="attendeeBonusDescription">Bonus Description</Label>
                <Textarea
                  id="attendeeBonusDescription"
                  placeholder="e.g., FREE 30-minute strategy call ($297 value) for anyone who enrolls during the live session"
                  value={data.attendeeBonusDescription}
                  onChange={(e) => onChange({ attendeeBonusDescription: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Bonus Deadline</Label>
                <Select
                  value={data.attendeeBonusDeadline}
                  onValueChange={(value) => onChange({ attendeeBonusDeadline: value as WebinarWizardData['attendeeBonusDeadline'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BONUS_DEADLINES.map((deadline) => (
                      <SelectItem key={deadline.value} value={deadline.value}>
                        {deadline.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Payment Options</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Offer Payment Plan</Label>
              <p className="text-sm text-muted-foreground">Allow customers to pay in installments</p>
            </div>
            <Switch
              checked={data.hasPaymentPlan}
              onCheckedChange={(checked) => onChange({ hasPaymentPlan: checked })}
            />
          </div>

          {data.hasPaymentPlan && (
            <div className="space-y-2">
              <Label htmlFor="paymentPlanDetails">Payment Plan Details</Label>
              <Input
                id="paymentPlanDetails"
                placeholder="e.g., 3 payments of $397 or $997 pay-in-full"
                value={data.paymentPlanDetails}
                onChange={(e) => onChange({ paymentPlanDetails: e.target.value })}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
