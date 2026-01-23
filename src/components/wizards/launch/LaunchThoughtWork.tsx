import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Brain, Heart, Lightbulb, Calendar } from 'lucide-react';
import { LaunchWizardData, POST_PURCHASE_OPTIONS, NON_BUYER_OPTIONS } from '@/types/launch';

interface LaunchThoughtWorkProps {
  data: LaunchWizardData;
  onChange: (updates: Partial<LaunchWizardData>) => void;
}

export function LaunchThoughtWork({ data, onChange }: LaunchThoughtWorkProps) {
  const togglePostPurchase = (value: string) => {
    const current = data.postPurchaseFlow || [];
    const updated = current.includes(value)
      ? current.filter((p) => p !== value)
      : [...current, value];
    onChange({ postPurchaseFlow: updated });
  };

  return (
    <div className="space-y-8">
      {/* Thought Work Intro */}
      <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="h-5 w-5 text-primary" />
          <p className="font-semibold text-lg">Thought Work + Post-Launch</p>
        </div>
        <p className="text-muted-foreground">
          Week 3-4 belief drop applies to launches too. Let's prepare your mind AND plan what happens after.
        </p>
      </div>

      {/* Belief */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-primary" />
          <Label className="text-lg font-semibold">
            What will you believe during this launch?
          </Label>
        </div>
        <p className="text-sm text-muted-foreground">
          Write it like you're coaching yourself. Make it true. Not toxic positivity.
        </p>
        <Textarea
          value={data.belief}
          onChange={(e) => onChange({ belief: e.target.value })}
          placeholder="e.g., Most people won't buy - that's normal. Every no gets me closer to a yes."
          className="min-h-[80px]"
        />
        <div className="text-xs text-muted-foreground">
          <strong>Examples:</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>"Most people won't buy - that's normal"</li>
            <li>"Every no gets me closer to a yes"</li>
            <li>"I'm learning my sales process - this is practice"</li>
          </ul>
        </div>
      </div>

      {/* Limiting Thought */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-destructive" />
          <Label className="text-lg font-semibold">What thought might stop you?</Label>
        </div>
        <p className="text-sm text-muted-foreground">
          Your brain will offer you thoughts designed to make you quit. What will it say?
        </p>
        <Textarea
          value={data.limitingThought}
          onChange={(e) => onChange({ limitingThought: e.target.value })}
          placeholder="e.g., Nobody's going to buy. This was a waste of time."
          className="min-h-[60px]"
        />
      </div>

      {/* Useful Thought */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <Label className="text-lg font-semibold">What will you think instead?</Label>
        </div>
        <p className="text-sm text-muted-foreground">
          Not "I'm amazing" or other bullshit you don't believe. Something TRUE and USEFUL.
        </p>
        <Textarea
          value={data.usefulThought}
          onChange={(e) => onChange({ usefulThought: e.target.value })}
          placeholder="e.g., I'm collecting data. Every launch teaches me something new about my audience."
          className="min-h-[60px]"
        />
      </div>

      <hr className="border-t" />

      {/* Post-Purchase Flow */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold">
          When someone buys, what happens?
        </Label>
        <div className="space-y-2">
          {POST_PURCHASE_OPTIONS.map((option) => (
            <div
              key={option.value}
              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                data.postPurchaseFlow?.includes(option.value)
                  ? 'bg-primary/10 border-primary'
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => togglePostPurchase(option.value)}
            >
              <Checkbox
                checked={data.postPurchaseFlow?.includes(option.value)}
                className="pointer-events-none"
              />
              <span>{option.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Non-Buyer Follow-Up */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold">
          What happens with people who didn't buy?
        </Label>
        <RadioGroup
          value={data.nonBuyerFollowup || ''}
          onValueChange={(v) => onChange({ nonBuyerFollowup: v })}
          className="space-y-2"
        >
          {NON_BUYER_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={`nonbuyer-${option.value}`} />
              <Label htmlFor={`nonbuyer-${option.value}`} className="cursor-pointer">
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Debrief */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <Label className="text-lg font-semibold">
            Do you want to schedule a debrief after launch?
          </Label>
        </div>
        <p className="text-sm text-muted-foreground">
          (You probably should. This is where you review what worked, what flopped, and what you'll do different next time.)
        </p>
        <Input
          type="date"
          value={data.debriefDate}
          onChange={(e) => onChange({ debriefDate: e.target.value })}
          className="w-48"
        />
      </div>
    </div>
  );
}
