// Step 7: Promotion Plan
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { LeadMagnetWizardData, PROMOTION_METHODS, SOCIAL_PLATFORMS, PromotionMethod } from '@/types/leadMagnet';
import { Megaphone, Calendar, Lightbulb } from 'lucide-react';

interface StepPromotionPlanProps {
  data: LeadMagnetWizardData;
  onChange: (updates: Partial<LeadMagnetWizardData>) => void;
}

const DURATION_OPTIONS = [
  { value: '2 weeks', label: '2 Weeks' },
  { value: '4 weeks', label: '4 Weeks (Recommended)' },
  { value: '8 weeks', label: '8 Weeks' },
  { value: 'ongoing', label: 'Ongoing' },
];

export function StepPromotionPlan({ data, onChange }: StepPromotionPlanProps) {
  const handlePlatformToggle = (platform: string, checked: boolean) => {
    const updated = checked
      ? [...data.promotionPlatforms, platform]
      : data.promotionPlatforms.filter(p => p !== platform);
    onChange({ promotionPlatforms: updated });
  };

  return (
    <div className="space-y-6">
      {/* Teaching Callout */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Promotion Reality Check</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your freebie won't promote itself! Plan for at least 4 weeks of consistent promotion. 
                The more you talk about it, the more downloads you'll get.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary Promotion Method */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">How Will You Promote Your Freebie?</CardTitle>
          </div>
          <CardDescription>
            Select your primary promotion strategy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={data.promotionMethod}
            onValueChange={(value) => onChange({ promotionMethod: value as PromotionMethod })}
            className="space-y-3"
          >
            {PROMOTION_METHODS.map((method) => (
              <div
                key={method.value}
                className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
              >
                <RadioGroupItem value={method.value} id={`method-${method.value}`} className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor={`method-${method.value}`} className="font-medium cursor-pointer">
                    {method.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">{method.description}</p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Platform Selection */}
      {(data.promotionMethod === 'social' || data.promotionMethod === 'combination') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Which Platforms?</CardTitle>
            <CardDescription>
              Select the platforms you'll use to promote.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {SOCIAL_PLATFORMS.map((platform) => (
                <div key={platform} className="flex items-center space-x-2">
                  <Checkbox
                    id={`promo-${platform}`}
                    checked={data.promotionPlatforms.includes(platform)}
                    onCheckedChange={(checked) => handlePlatformToggle(platform, checked === true)}
                  />
                  <Label htmlFor={`promo-${platform}`} className="font-normal text-sm">
                    {platform}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Promotion Timeline</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="promo-start">When will you start promoting?</Label>
            <Input
              id="promo-start"
              type="date"
              value={data.promotionStartDate}
              onChange={(e) => onChange({ promotionStartDate: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Promotion Duration</Label>
            <Select
              value={data.promotionDuration}
              onValueChange={(value) => onChange({ promotionDuration: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Commitment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Weekly Commitment</CardTitle>
          <CardDescription>
            How many promo posts or mentions per week?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Posts/mentions per week</span>
            <span className="text-2xl font-bold text-primary">{data.weeklyCommitment}</span>
          </div>
          <Slider
            value={[data.weeklyCommitment]}
            onValueChange={(value) => onChange({ weeklyCommitment: value[0] })}
            min={1}
            max={7}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1x/week</span>
            <span>3x (Sweet spot)</span>
            <span>Daily</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
