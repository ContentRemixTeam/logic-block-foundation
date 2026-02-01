import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  SummitWizardData, 
  DAYS_OPTIONS, 
  SESSIONS_PER_DAY_OPTIONS, 
  FORMAT_OPTIONS, 
  LENGTH_OPTIONS,
  SessionFormat,
  SessionLength
} from '@/types/summit';

interface StepProps {
  data: SummitWizardData;
  updateData: (updates: Partial<SummitWizardData>) => void;
}

export function StepSummitStructure({ data, updateData }: StepProps) {
  const handleDaysChange = (value: string) => {
    const numValue = parseInt(value);
    if (numValue === 0) {
      // Custom selected
      updateData({ numDays: 0, customDays: data.customDays || 5 });
    } else {
      updateData({ numDays: numValue, customDays: null });
    }
  };

  const effectiveDays = data.numDays === 0 ? data.customDays || 5 : data.numDays;

  return (
    <div className="space-y-6">
      {/* Number of Days */}
      <div className="space-y-3">
        <Label>How many days will your summit run?</Label>
        <RadioGroup
          value={data.numDays.toString()}
          onValueChange={handleDaysChange}
          className="grid grid-cols-2 gap-2"
        >
          {DAYS_OPTIONS.map((option) => (
            <div
              key={option.value}
              className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                (data.numDays === option.value || (option.value === 0 && data.numDays === 0))
                  ? 'border-primary bg-primary/10'
                  : 'hover:bg-accent/50'
              }`}
              onClick={() => handleDaysChange(option.value.toString())}
            >
              <RadioGroupItem value={option.value.toString()} id={`days-${option.value}`} />
              <div>
                <label htmlFor={`days-${option.value}`} className="font-medium cursor-pointer">
                  {option.label}
                </label>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
            </div>
          ))}
        </RadioGroup>

        {data.numDays === 0 && (
          <div className="mt-2">
            <Input
              type="number"
              min={1}
              max={30}
              value={data.customDays || ''}
              onChange={(e) => updateData({ customDays: parseInt(e.target.value) || null })}
              placeholder="Enter number of days"
              className="w-32"
            />
          </div>
        )}
      </div>

      {/* Sessions per Day */}
      <div className="space-y-3">
        <Label>How many sessions per day?</Label>
        <RadioGroup
          value={data.sessionsPerDay.toString()}
          onValueChange={(value) => updateData({ sessionsPerDay: parseInt(value) })}
          className="flex flex-wrap gap-2"
        >
          {SESSIONS_PER_DAY_OPTIONS.map((option) => (
            <div
              key={option.value}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                data.sessionsPerDay === option.value
                  ? 'border-primary bg-primary/10'
                  : 'hover:bg-accent/50'
              }`}
              onClick={() => updateData({ sessionsPerDay: option.value })}
            >
              <RadioGroupItem value={option.value.toString()} id={`sessions-${option.value}`} />
              <label htmlFor={`sessions-${option.value}`} className="cursor-pointer">
                {option.label}
              </label>
            </div>
          ))}
        </RadioGroup>

        <p className="text-sm text-muted-foreground">
          Total sessions: ~{effectiveDays * data.sessionsPerDay} sessions
        </p>
      </div>

      {/* Session Format */}
      <div className="space-y-3">
        <Label>Session format</Label>
        <RadioGroup
          value={data.sessionFormat}
          onValueChange={(value) => updateData({ sessionFormat: value as SessionFormat })}
          className="space-y-2"
        >
          {FORMAT_OPTIONS.map((option) => (
            <div
              key={option.value}
              className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                data.sessionFormat === option.value
                  ? 'border-primary bg-primary/10'
                  : 'hover:bg-accent/50'
              }`}
              onClick={() => updateData({ sessionFormat: option.value as SessionFormat })}
            >
              <RadioGroupItem value={option.value} id={`format-${option.value}`} className="mt-1" />
              <div>
                <label htmlFor={`format-${option.value}`} className="font-medium cursor-pointer">
                  {option.label}
                </label>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Session Length */}
      <div className="space-y-3">
        <Label>Session length</Label>
        <RadioGroup
          value={data.sessionLength}
          onValueChange={(value) => updateData({ sessionLength: value as SessionLength })}
          className="flex flex-wrap gap-2"
        >
          {LENGTH_OPTIONS.map((option) => (
            <div
              key={option.value}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                data.sessionLength === option.value
                  ? 'border-primary bg-primary/10'
                  : 'hover:bg-accent/50'
              }`}
              onClick={() => updateData({ sessionLength: option.value as SessionLength })}
            >
              <RadioGroupItem value={option.value} id={`length-${option.value}`} />
              <div>
                <label htmlFor={`length-${option.value}`} className="cursor-pointer font-medium">
                  {option.label}
                </label>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}
