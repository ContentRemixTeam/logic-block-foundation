import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  SummitWizardData, 
  SPEAKER_COUNT_OPTIONS, 
  AFFILIATE_OPTIONS, 
  COMMISSION_OPTIONS,
  SpeakersAreAffiliates
} from '@/types/summit';

interface StepProps {
  data: SummitWizardData;
  updateData: (updates: Partial<SummitWizardData>) => void;
}

export function StepSpeakerStrategy({ data, updateData }: StepProps) {
  const handleCommissionChange = (value: string) => {
    const numValue = parseInt(value);
    if (numValue === 0) {
      // Custom selected
      updateData({ affiliateCommission: 0, customCommission: data.customCommission || 40 });
    } else {
      updateData({ affiliateCommission: numValue, customCommission: null });
    }
  };

  return (
    <div className="space-y-6">
      {/* Target Speaker Count */}
      <div className="space-y-3">
        <Label>How many speakers are you recruiting?</Label>
        <RadioGroup
          value={data.targetSpeakerCount.toString()}
          onValueChange={(value) => updateData({ targetSpeakerCount: parseInt(value) })}
          className="grid grid-cols-2 gap-2"
        >
          {SPEAKER_COUNT_OPTIONS.map((option) => (
            <div
              key={option.value}
              className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                data.targetSpeakerCount === option.value
                  ? 'border-primary bg-primary/10'
                  : 'hover:bg-accent/50'
              }`}
              onClick={() => updateData({ targetSpeakerCount: option.value })}
            >
              <RadioGroupItem value={option.value.toString()} id={`count-${option.value}`} />
              <div>
                <label htmlFor={`count-${option.value}`} className="font-medium cursor-pointer">
                  {option.label}
                </label>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Speaker Recruitment Deadline */}
      <div className="space-y-2">
        <Label htmlFor="deadline">Speaker recruitment deadline</Label>
        <Input
          id="deadline"
          type="date"
          value={data.speakerRecruitmentDeadline}
          onChange={(e) => updateData({ speakerRecruitmentDeadline: e.target.value })}
        />
        <p className="text-sm text-muted-foreground">
          When do you need all speakers confirmed by?
        </p>
      </div>

      {/* Affiliate Program */}
      <div className="space-y-3">
        <Label>Are speakers affiliates for your all-access pass?</Label>
        <RadioGroup
          value={data.speakersAreAffiliates}
          onValueChange={(value) => updateData({ speakersAreAffiliates: value as SpeakersAreAffiliates })}
          className="space-y-2"
        >
          {AFFILIATE_OPTIONS.map((option) => (
            <div
              key={option.value}
              className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                data.speakersAreAffiliates === option.value
                  ? 'border-primary bg-primary/10'
                  : 'hover:bg-accent/50'
              }`}
              onClick={() => updateData({ speakersAreAffiliates: option.value as SpeakersAreAffiliates })}
            >
              <RadioGroupItem value={option.value} id={`affiliate-${option.value}`} />
              <label htmlFor={`affiliate-${option.value}`} className="cursor-pointer">
                {option.label}
              </label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Commission Rate */}
      {data.speakersAreAffiliates !== 'none' && (
        <div className="space-y-3">
          <Label>What commission % will you offer?</Label>
          <RadioGroup
            value={data.affiliateCommission.toString()}
            onValueChange={handleCommissionChange}
            className="flex flex-wrap gap-2"
          >
            {COMMISSION_OPTIONS.map((option) => (
              <div
                key={option.value}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                  data.affiliateCommission === option.value || (option.value === 0 && data.affiliateCommission === 0)
                    ? 'border-primary bg-primary/10'
                    : 'hover:bg-accent/50'
                }`}
                onClick={() => handleCommissionChange(option.value.toString())}
              >
                <RadioGroupItem value={option.value.toString()} id={`comm-${option.value}`} />
                <label htmlFor={`comm-${option.value}`} className="cursor-pointer">
                  {option.label}
                </label>
              </div>
            ))}
          </RadioGroup>

          {data.affiliateCommission === 0 && (
            <div className="flex items-center gap-2 mt-2">
              <Input
                type="number"
                min={1}
                max={100}
                value={data.customCommission || ''}
                onChange={(e) => updateData({ customCommission: parseInt(e.target.value) || null })}
                placeholder="Enter %"
                className="w-24"
              />
              <span className="text-muted-foreground">%</span>
            </div>
          )}
        </div>
      )}

      {/* Speaker Notes */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>Tip:</strong> You can add individual speakers after creating the summit. 
          The wizard will generate tasks for speaker outreach and asset collection.
        </p>
      </div>
    </div>
  );
}
