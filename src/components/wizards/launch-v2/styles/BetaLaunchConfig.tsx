// Beta Launch Configuration Component
// Test product at discount, gather feedback

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue, 
} from '@/components/ui/select';
import { FlaskConical, Users, MessageSquare, Star } from 'lucide-react';
import { BetaLaunchConfig, DEFAULT_BETA_LAUNCH_CONFIG } from '@/types/launchV2';

interface BetaLaunchConfigProps {
  config: BetaLaunchConfig;
  onChange: (config: BetaLaunchConfig) => void;
}

export function BetaLaunchConfigComponent({ config, onChange }: BetaLaunchConfigProps) {
  const safeConfig = { ...DEFAULT_BETA_LAUNCH_CONFIG, ...config };

  const handleChange = <K extends keyof BetaLaunchConfig>(
    key: K,
    value: BetaLaunchConfig[K]
  ) => {
    onChange({ ...safeConfig, [key]: value });
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FlaskConical className="h-5 w-5 text-primary" />
          Beta Launch Configuration
        </CardTitle>
        <CardDescription>
          Test your product with early adopters at a discount
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Beta Discount */}
        <div className="space-y-3">
          <Label className="font-medium">Beta pricing discount</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={10}
              max={75}
              value={safeConfig.betaDiscount}
              onChange={(e) => handleChange('betaDiscount', Number(e.target.value))}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">% off regular price</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Typical beta discounts are 30-50% off. You're exchanging feedback for savings.
          </p>
        </div>

        {/* Beta Spots */}
        <div className="space-y-3">
          <Label className="font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Number of beta spots
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={5}
              max={100}
              value={safeConfig.betaSpots}
              onChange={(e) => handleChange('betaSpots', Number(e.target.value))}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">spots available</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Keep it small (10-30) for better feedback. Scarcity also increases conversions.
          </p>
        </div>

        {/* Feedback Requirement */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Require feedback
            </Label>
            <Switch
              checked={safeConfig.requiresFeedback}
              onCheckedChange={(checked) => handleChange('requiresFeedback', checked)}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Make feedback part of the beta agreement
          </p>

          {safeConfig.requiresFeedback && (
            <div className="pl-6 space-y-2 border-l-2 border-primary/20">
              <Label className="text-sm">How will you collect feedback?</Label>
              <Select
                value={safeConfig.feedbackMethod}
                onValueChange={(value) => handleChange('feedbackMethod', value as BetaLaunchConfig['feedbackMethod'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="survey">Survey / Questionnaire</SelectItem>
                  <SelectItem value="calls">1-on-1 calls</SelectItem>
                  <SelectItem value="community">Private community discussions</SelectItem>
                  <SelectItem value="other">Other method</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Testimonial Collection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="font-medium flex items-center gap-2">
              <Star className="h-4 w-4" />
              Collect testimonials
            </Label>
            <Switch
              checked={safeConfig.collectsTestimonials}
              onCheckedChange={(checked) => handleChange('collectsTestimonials', checked)}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Turn beta feedback into social proof for your full launch
          </p>
        </div>

        {/* Tip Card */}
        <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>Beta Launch Goal:</strong> Success = feedback + testimonials, not revenue. 
              The insights you gather will make your full launch much stronger.
            </p>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
