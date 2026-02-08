// Step 6: Email Follow-Up Sequence
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { LeadMagnetWizardData, SequencePurpose, SequenceStatus } from '@/types/leadMagnet';
import { Mail, Calendar, Lightbulb, Sparkles } from 'lucide-react';

interface StepEmailSequenceProps {
  data: LeadMagnetWizardData;
  onChange: (updates: Partial<LeadMagnetWizardData>) => void;
}

const SEQUENCE_PURPOSE_OPTIONS: { value: SequencePurpose; label: string; description: string }[] = [
  { value: 'value', label: 'Pure Value', description: 'Build trust with helpful content only' },
  { value: 'soft-sell', label: 'Soft Sell at End', description: 'Value first, gentle offer in last email' },
  { value: 'discovery-call', label: 'Lead to Discovery Call', description: 'Invite them to book a call with you' },
  { value: 'paid-offer', label: 'Lead to Paid Offer', description: 'Direct them to your product or service' },
];

export function StepEmailSequence({ data, onChange }: StepEmailSequenceProps) {
  return (
    <div className="space-y-6">
      {/* Teaching Callout */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Email Sequence Tip</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your nurture sequence is where the magic happens. 5 emails is a sweet spot—
                enough to build trust without overwhelming new subscribers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sequence Length */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Nurture Sequence Length</CardTitle>
          </div>
          <CardDescription>
            How many emails will you send after the welcome email?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Number of nurture emails</span>
              <span className="text-2xl font-bold text-primary">{data.emailSequenceLength}</span>
            </div>
            <Slider
              value={[data.emailSequenceLength]}
              onValueChange={(value) => onChange({ emailSequenceLength: value[0] })}
              min={3}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>3 (Quick)</span>
              <span>5 (Recommended)</span>
              <span>10 (Extensive)</span>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground mt-4">
            Total emails: 1 welcome + {data.emailSequenceLength} nurture = <strong>{data.emailSequenceLength + 1} emails</strong>
          </p>
        </CardContent>
      </Card>

      {/* Sequence Purpose */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What's the Goal of Your Sequence?</CardTitle>
          <CardDescription>
            Where do you want subscribers to end up?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={data.emailSequencePurpose}
            onValueChange={(value) => onChange({ emailSequencePurpose: value as SequencePurpose })}
            className="space-y-3"
          >
            {SEQUENCE_PURPOSE_OPTIONS.map((option) => (
              <div
                key={option.value}
                className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
              >
                <RadioGroupItem value={option.value} id={`purpose-${option.value}`} className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor={`purpose-${option.value}`} className="font-medium cursor-pointer">
                    {option.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Sequence Status & Deadline */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Sequence Status</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Do you already have this sequence?</Label>
            <RadioGroup
              value={data.emailSequenceStatus}
              onValueChange={(value) => onChange({ emailSequenceStatus: value as SequenceStatus })}
              className="space-y-2"
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="existing" id="seq-existing" />
                <Label htmlFor="seq-existing" className="font-normal">
                  Yes, I already have my emails written
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="need-to-create" id="seq-create" />
                <Label htmlFor="seq-create" className="font-normal">
                  No, I need to create these emails
                </Label>
              </div>
            </RadioGroup>
          </div>

          {data.emailSequenceStatus === 'need-to-create' && (
            <div className="space-y-2">
              <Label htmlFor="seq-deadline">When do you want the sequence finished?</Label>
              <Input
                id="seq-deadline"
                type="date"
                value={data.emailSequenceDeadline}
                onChange={(e) => onChange({ emailSequenceDeadline: e.target.value })}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Copy Hint */}
      {data.emailSequenceStatus === 'need-to-create' && (
        <Card className="border-dashed border-2 bg-muted/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">AI can write your emails!</p>
                  <p className="text-xs text-muted-foreground">
                    On the final step, you can generate your entire nurture sequence.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
