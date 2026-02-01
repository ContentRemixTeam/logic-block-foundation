import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  SummitWizardData, 
  PROMOTION_METHODS, 
  SWIPE_EMAILS_OPTIONS,
  SpeakerEmailRequirement
} from '@/types/summit';

interface StepProps {
  data: SummitWizardData;
  updateData: (updates: Partial<SummitWizardData>) => void;
}

export function StepMarketingStrategy({ data, updateData }: StepProps) {
  const toggleMethod = (value: string) => {
    const current = data.promotionMethods;
    if (current.includes(value)) {
      updateData({ promotionMethods: current.filter(v => v !== value) });
    } else {
      updateData({ promotionMethods: [...current, value] });
    }
  };

  return (
    <div className="space-y-6">
      {/* Promotion Methods */}
      <div className="space-y-3">
        <Label>How will you promote registrations?</Label>
        <p className="text-sm text-muted-foreground">Select all that apply</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PROMOTION_METHODS.map((option) => (
            <div
              key={option.value}
              className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                data.promotionMethods.includes(option.value)
                  ? 'border-primary bg-primary/10'
                  : 'hover:bg-accent/50'
              }`}
              onClick={() => toggleMethod(option.value)}
            >
              <Checkbox
                id={`promo-${option.value}`}
                checked={data.promotionMethods.includes(option.value)}
                onCheckedChange={() => toggleMethod(option.value)}
              />
              <label htmlFor={`promo-${option.value}`} className="cursor-pointer flex-1">
                {option.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Registration Goal */}
      <div className="space-y-2">
        <Label htmlFor="reg-goal">Registration goal</Label>
        <Input
          id="reg-goal"
          type="number"
          min={0}
          value={data.registrationGoal || ''}
          onChange={(e) => updateData({ registrationGoal: parseInt(e.target.value) || null })}
          placeholder="e.g., 5000"
        />
        <p className="text-sm text-muted-foreground">
          How many registrations are you aiming for?
        </p>
      </div>

      {/* Speaker Email Requirement */}
      <div className="space-y-3">
        <Label>Will speakers send promotional emails?</Label>
        <RadioGroup
          value={data.speakerEmailRequirement}
          onValueChange={(value) => updateData({ speakerEmailRequirement: value as SpeakerEmailRequirement })}
          className="space-y-2"
        >
          {[
            { value: 'required', label: 'Yes, required', description: 'All speakers must promote' },
            { value: 'optional', label: 'Yes, optional', description: 'Encouraged but not required' },
            { value: 'none', label: 'No', description: 'Speakers are not expected to promote' },
          ].map((option) => (
            <div
              key={option.value}
              className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                data.speakerEmailRequirement === option.value
                  ? 'border-primary bg-primary/10'
                  : 'hover:bg-accent/50'
              }`}
              onClick={() => updateData({ speakerEmailRequirement: option.value as SpeakerEmailRequirement })}
            >
              <RadioGroupItem value={option.value} id={`speaker-email-${option.value}`} className="mt-1" />
              <div>
                <label htmlFor={`speaker-email-${option.value}`} className="font-medium cursor-pointer">
                  {option.label}
                </label>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Swipe Emails Count */}
      {data.speakerEmailRequirement !== 'none' && (
        <div className="space-y-3">
          <Label>Number of swipe copy emails you'll provide to speakers</Label>
          <RadioGroup
            value={data.swipeEmailsCount.toString()}
            onValueChange={(value) => updateData({ swipeEmailsCount: parseInt(value) })}
            className="flex flex-wrap gap-2"
          >
            {SWIPE_EMAILS_OPTIONS.map((option) => (
              <div
                key={option.value}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                  data.swipeEmailsCount === option.value
                    ? 'border-primary bg-primary/10'
                    : 'hover:bg-accent/50'
                }`}
                onClick={() => updateData({ swipeEmailsCount: option.value })}
              >
                <RadioGroupItem value={option.value.toString()} id={`swipe-${option.value}`} />
                <label htmlFor={`swipe-${option.value}`} className="cursor-pointer">
                  {option.label}
                </label>
              </div>
            ))}
          </RadioGroup>
        </div>
      )}

      {/* Social Promo Assets */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <Label htmlFor="social-kit">Social promo assets for speakers?</Label>
          <p className="text-sm text-muted-foreground">
            Will you provide graphics and social media assets?
          </p>
        </div>
        <Switch
          id="social-kit"
          checked={data.hasSocialKit}
          onCheckedChange={(checked) => updateData({ hasSocialKit: checked })}
        />
      </div>

      {/* Marketing Summary */}
      {data.promotionMethods.length > 0 && (
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium mb-2">Marketing Plan Summary:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• {data.promotionMethods.length} promotion channels selected</li>
            {data.registrationGoal && <li>• Target: {data.registrationGoal.toLocaleString()} registrations</li>}
            {data.speakerEmailRequirement !== 'none' && (
              <li>• {data.swipeEmailsCount} swipe emails for speakers</li>
            )}
            {data.hasSocialKit && <li>• Social media asset kit included</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
