import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SummitWizardData, EXPERIENCE_OPTIONS, GOAL_OPTIONS, ExperienceLevel, PrimaryGoal } from '@/types/summit';

interface StepProps {
  data: SummitWizardData;
  updateData: (updates: Partial<SummitWizardData>) => void;
}

export function StepSummitBasics({ data, updateData }: StepProps) {
  return (
    <div className="space-y-6">
      {/* Summit Name */}
      <div className="space-y-2">
        <Label htmlFor="name">What's the name of your summit?</Label>
        <Input
          id="name"
          value={data.name}
          onChange={(e) => updateData({ name: e.target.value })}
          placeholder="e.g., The Profitable Creator Summit"
        />
      </div>

      {/* Experience Level */}
      <div className="space-y-3">
        <Label>Have you hosted a summit before?</Label>
        <RadioGroup
          value={data.experienceLevel}
          onValueChange={(value) => updateData({ experienceLevel: value as ExperienceLevel })}
          className="space-y-2"
        >
          {EXPERIENCE_OPTIONS.map((option) => (
            <div
              key={option.value}
              className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
              onClick={() => updateData({ experienceLevel: option.value as ExperienceLevel })}
            >
              <RadioGroupItem value={option.value} id={`exp-${option.value}`} className="mt-1" />
              <div className="flex-1">
                <label htmlFor={`exp-${option.value}`} className="font-medium cursor-pointer">
                  {option.label}
                </label>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Primary Goal */}
      <div className="space-y-3">
        <Label>What's the primary goal of your summit?</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {GOAL_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateData({ primaryGoal: option.value as PrimaryGoal })}
              className={`p-3 rounded-lg border text-left transition-all ${
                data.primaryGoal === option.value
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                  : 'hover:bg-accent/50'
              }`}
            >
              <span className="text-xl mr-2">{option.icon}</span>
              <span className="font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
