import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SummitWizardData, REPLAY_OPTIONS, ReplayPeriod } from '@/types/summit';
import { SummitTimelineVisual } from '../components/SummitTimelineVisual';

interface StepProps {
  data: SummitWizardData;
  updateData: (updates: Partial<SummitWizardData>) => void;
}

export function StepSummitTimeline({ data, updateData }: StepProps) {
  return (
    <div className="space-y-6">
      {/* Visual Timeline */}
      <SummitTimelineVisual data={data} />

      {/* Registration Opens */}
      <div className="space-y-2">
        <Label htmlFor="reg-opens">Registration opens</Label>
        <Input
          id="reg-opens"
          type="date"
          value={data.registrationOpens}
          onChange={(e) => updateData({ registrationOpens: e.target.value })}
        />
        <p className="text-sm text-muted-foreground">
          When will people be able to sign up for your summit?
        </p>
      </div>

      {/* Summit Start Date */}
      <div className="space-y-2">
        <Label htmlFor="start-date">Summit start date</Label>
        <Input
          id="start-date"
          type="date"
          value={data.summitStartDate}
          onChange={(e) => updateData({ summitStartDate: e.target.value })}
        />
      </div>

      {/* Summit End Date */}
      <div className="space-y-2">
        <Label htmlFor="end-date">Summit end date</Label>
        <Input
          id="end-date"
          type="date"
          value={data.summitEndDate}
          onChange={(e) => updateData({ summitEndDate: e.target.value })}
        />
      </div>

      {/* Cart Closes */}
      <div className="space-y-2">
        <Label htmlFor="cart-closes">All-access pass cart closes</Label>
        <Input
          id="cart-closes"
          type="date"
          value={data.cartCloses}
          onChange={(e) => updateData({ cartCloses: e.target.value })}
        />
        <p className="text-sm text-muted-foreground">
          When does the opportunity to purchase the all-access pass end?
        </p>
      </div>

      {/* Replay Period */}
      <div className="space-y-3">
        <Label>Post-summit replay period</Label>
        <p className="text-sm text-muted-foreground">
          How long can free attendees access replays after each session airs?
        </p>
        <RadioGroup
          value={data.replayPeriod}
          onValueChange={(value) => updateData({ replayPeriod: value as ReplayPeriod })}
          className="grid grid-cols-2 gap-2"
        >
          {REPLAY_OPTIONS.map((option) => (
            <div
              key={option.value}
              className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                data.replayPeriod === option.value
                  ? 'border-primary bg-primary/10'
                  : 'hover:bg-accent/50'
              }`}
              onClick={() => updateData({ replayPeriod: option.value as ReplayPeriod })}
            >
              <RadioGroupItem value={option.value} id={`replay-${option.value}`} />
              <label htmlFor={`replay-${option.value}`} className="cursor-pointer">
                {option.label}
              </label>
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}
