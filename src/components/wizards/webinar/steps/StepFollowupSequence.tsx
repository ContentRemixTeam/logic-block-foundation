// Step 7: Follow-up Sequence
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WebinarWizardData } from '@/types/webinar';
import { Mail, Lightbulb, Clock, Target } from 'lucide-react';

interface StepFollowupSequenceProps {
  data: WebinarWizardData;
  onChange: (updates: Partial<WebinarWizardData>) => void;
}

export function StepFollowupSequence({ data, onChange }: StepFollowupSequenceProps) {
  return (
    <div className="space-y-6">
      {/* Teaching Callout */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Follow-up Is Where Sales Happen</p>
              <p className="text-sm text-muted-foreground mt-1">
                Most sales come AFTER the webinar. A strong follow-up sequence with replay, 
                testimonials, objection handling, and deadline urgency can double your conversions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Replay Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Replay Access</CardTitle>
          </div>
          <CardDescription>How long will the replay be available?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Replay Duration</Label>
            <Select
              value={String(data.replayAccessHours)}
              onValueChange={(value) => onChange({ replayAccessHours: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24">24 hours</SelectItem>
                <SelectItem value="48">48 hours</SelectItem>
                <SelectItem value="72">72 hours</SelectItem>
                <SelectItem value="168">7 days</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Shorter replay windows create urgency. 48 hours is the sweet spot for most.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cartCloseDate">Cart Close Date</Label>
            <Input
              id="cartCloseDate"
              type="date"
              value={data.cartCloseDate}
              onChange={(e) => onChange({ cartCloseDate: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              When does your special offer expire?
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Follow-up Emails */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Follow-up Email Sequence</CardTitle>
          </div>
          <CardDescription>Emails to send after the webinar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Follow-up Email Status</Label>
            <Select
              value={data.followupEmailStatus}
              onValueChange={(value) => onChange({ followupEmailStatus: value as WebinarWizardData['followupEmailStatus'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="existing">I already have a sequence</SelectItem>
                <SelectItem value="need-to-create">I need to create one</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Number of Follow-up Emails</Label>
            <Select
              value={String(data.followupSequenceLength)}
              onValueChange={(value) => onChange({ followupSequenceLength: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 emails (minimal)</SelectItem>
                <SelectItem value="5">5 emails (recommended)</SelectItem>
                <SelectItem value="7">7 emails (aggressive)</SelectItem>
                <SelectItem value="10">10 emails (launch-style)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <p className="font-medium">Recommended Follow-up Sequence:</p>
            <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
              <li><strong>Email 1:</strong> Replay link + quick recap + offer reminder</li>
              <li><strong>Email 2:</strong> Testimonial/case study + handle objection</li>
              <li><strong>Email 3:</strong> FAQ + overcome hesitations</li>
              <li><strong>Email 4:</strong> Bonus reminder + 24h warning</li>
              <li><strong>Email 5:</strong> FINAL: Cart closing tonight!</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Goals */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Goals & Metrics</CardTitle>
          </div>
          <CardDescription>Set targets to measure success</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="registrationGoal">Registration Goal</Label>
              <Input
                id="registrationGoal"
                type="number"
                placeholder="100"
                value={data.registrationGoal || ''}
                onChange={(e) => onChange({ registrationGoal: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="showUpGoal">Show-up Rate Goal (%)</Label>
              <Input
                id="showUpGoal"
                type="number"
                placeholder="30"
                value={data.showUpGoalPercent || ''}
                onChange={(e) => onChange({ showUpGoalPercent: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="conversionGoal">Conversion Goal (%)</Label>
              <Input
                id="conversionGoal"
                type="number"
                placeholder="5"
                value={data.conversionGoalPercent || ''}
                onChange={(e) => onChange({ conversionGoalPercent: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          {data.registrationGoal > 0 && data.offerPrice > 0 && (
            <div className="p-3 bg-primary/5 rounded-lg text-sm">
              <p className="font-medium">Projected Results:</p>
              <p className="text-muted-foreground mt-1">
                {data.registrationGoal} registrations × {data.showUpGoalPercent}% show-up × {data.conversionGoalPercent}% conversion 
                = <strong>{Math.round(data.registrationGoal * (data.showUpGoalPercent / 100) * (data.conversionGoalPercent / 100))} sales</strong>
                {' '}× ${data.offerPrice} = <strong className="text-primary">
                  ${(Math.round(data.registrationGoal * (data.showUpGoalPercent / 100) * (data.conversionGoalPercent / 100)) * data.offerPrice).toLocaleString()}
                </strong> potential revenue
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
