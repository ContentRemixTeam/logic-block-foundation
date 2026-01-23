import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { LaunchWizardData, EMAIL_SEQUENCE_OPTIONS } from '@/types/launch';

interface LaunchPreLaunchProps {
  data: LaunchWizardData;
  onChange: (updates: Partial<LaunchWizardData>) => void;
}

export function LaunchPreLaunch({ data, onChange }: LaunchPreLaunchProps) {
  const toggleSequence = (value: string) => {
    const current = data.emailSequences || [];
    const updated = current.includes(value)
      ? current.filter((s) => s !== value)
      : [...current, value];
    onChange({ emailSequences: updated });
  };

  return (
    <div className="space-y-8">
      {/* Waitlist */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-lg font-semibold">Do you want a waitlist?</Label>
          <p className="text-sm text-muted-foreground">Build hype before launch</p>
        </div>
        <RadioGroup
          value={data.hasWaitlist ? 'yes' : 'no'}
          onValueChange={(v) => onChange({ hasWaitlist: v === 'yes' })}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="waitlist-yes" />
            <Label htmlFor="waitlist-yes" className="cursor-pointer">
              Yes - Build hype before launch
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="waitlist-no" />
            <Label htmlFor="waitlist-no" className="cursor-pointer">
              No - Skip straight to launch
            </Label>
          </div>
        </RadioGroup>

        {data.hasWaitlist && (
          <div className="grid grid-cols-2 gap-4 ml-6 mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="waitlist-opens">When does the waitlist open?</Label>
              <Input
                id="waitlist-opens"
                type="date"
                value={data.waitlistOpens}
                onChange={(e) => onChange({ waitlistOpens: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="waitlist-incentive">What's the waitlist incentive?</Label>
              <Input
                id="waitlist-incentive"
                value={data.waitlistIncentive}
                onChange={(e) => onChange({ waitlistIncentive: e.target.value })}
                placeholder="e.g., Early bird pricing, bonus content"
              />
            </div>
          </div>
        )}
      </div>

      {/* Lead Magnet */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-lg font-semibold">Lead Magnet</Label>
          <p className="text-sm text-muted-foreground">
            Do you have a lead magnet to grow your list before launch?
          </p>
        </div>
        <RadioGroup
          value={
            data.hasLeadMagnet === 'skip'
              ? 'skip'
              : data.hasLeadMagnet
              ? 'yes'
              : 'no'
          }
          onValueChange={(v) =>
            onChange({
              hasLeadMagnet: v === 'skip' ? 'skip' : v === 'yes',
            })
          }
          className="space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="magnet-yes" />
            <Label htmlFor="magnet-yes" className="cursor-pointer">
              Yes - I have one ready
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="magnet-no" />
            <Label htmlFor="magnet-no" className="cursor-pointer">
              No - I need to create one
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="skip" id="magnet-skip" />
            <Label htmlFor="magnet-skip" className="cursor-pointer">
              Skip - Not using a lead magnet
            </Label>
          </div>
        </RadioGroup>

        {data.hasLeadMagnet === false && (
          <div className="grid grid-cols-2 gap-4 ml-6 mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="magnet-topic">What's it about?</Label>
              <Input
                id="magnet-topic"
                value={data.leadMagnetTopic}
                onChange={(e) => onChange({ leadMagnetTopic: e.target.value })}
                placeholder="e.g., 5-day challenge, checklist, guide"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="magnet-due">When will you make it?</Label>
              <Input
                id="magnet-due"
                type="date"
                value={data.leadMagnetDueDate}
                onChange={(e) => onChange({ leadMagnetDueDate: e.target.value })}
              />
            </div>
          </div>
        )}
      </div>

      {/* Email Sequences */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-lg font-semibold">What email sequences do you need?</Label>
          <p className="text-sm text-muted-foreground">
            Check all that apply. The app will create writing tasks for each one you check.
          </p>
        </div>
        <div className="space-y-3">
          {EMAIL_SEQUENCE_OPTIONS.map((option) => (
            <div
              key={option.value}
              className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                data.emailSequences.includes(option.value)
                  ? 'bg-primary/10 border-primary'
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => toggleSequence(option.value)}
            >
              <Checkbox
                checked={data.emailSequences.includes(option.value)}
                className="mt-0.5 pointer-events-none"
              />
              <div>
                <p className="font-medium">{option.label}</p>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
