// Webinar Launch Configuration Component
// Deep configuration for free training leading to offers

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue, 
} from '@/components/ui/select';
import { Video, Clock, Gift, Target } from 'lucide-react';
import { WebinarConfig, DEFAULT_WEBINAR_CONFIG } from '@/types/launchV2';

interface WebinarConfigProps {
  config: WebinarConfig;
  onChange: (config: WebinarConfig) => void;
}

export function WebinarConfigComponent({ config, onChange }: WebinarConfigProps) {
  const safeConfig = { ...DEFAULT_WEBINAR_CONFIG, ...config };

  const handleChange = <K extends keyof WebinarConfig>(
    key: K,
    value: WebinarConfig[K]
  ) => {
    onChange({ ...safeConfig, [key]: value });
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Video className="h-5 w-5 text-primary" />
          Webinar Configuration
        </CardTitle>
        <CardDescription>
          Set up your free training that leads to your offer
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Platform */}
        <div className="space-y-3">
          <Label className="font-medium">Webinar platform</Label>
          <Select
            value={safeConfig.platform}
            onValueChange={(value) => handleChange('platform', value as WebinarConfig['platform'])}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="zoom">Zoom</SelectItem>
              <SelectItem value="webinarjam">WebinarJam</SelectItem>
              <SelectItem value="streamyard">StreamYard</SelectItem>
              <SelectItem value="crowdcast">Crowdcast</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          {safeConfig.platform === 'other' && (
            <Input
              value={safeConfig.platformOther}
              onChange={(e) => handleChange('platformOther', e.target.value)}
              placeholder="Specify platform..."
              className="mt-2"
            />
          )}
        </div>

        {/* Registration Goal */}
        <div className="space-y-3">
          <Label className="font-medium flex items-center gap-2">
            <Target className="h-4 w-4" />
            Registration goal
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={safeConfig.registrationGoal || ''}
              onChange={(e) => handleChange('registrationGoal', e.target.value ? Number(e.target.value) : null)}
              placeholder="e.g., 500"
              className="w-32"
            />
            <span className="text-sm text-muted-foreground">registrations</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Aim for 3-5x your sales goal (expect 30-50% show-up rate)
          </p>
        </div>

        {/* Show-up Strategy */}
        <div className="space-y-3">
          <Label className="font-medium">Show-up strategy</Label>
          <RadioGroup
            value={safeConfig.showUpStrategy}
            onValueChange={(value) => handleChange('showUpStrategy', value as WebinarConfig['showUpStrategy'])}
            className="space-y-2"
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="email-reminders" id="showup-email" />
              <Label htmlFor="showup-email" className="cursor-pointer">
                Email reminders only
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="sms" id="showup-sms" />
              <Label htmlFor="showup-sms" className="cursor-pointer">
                SMS reminders only
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="both" id="showup-both" />
              <Label htmlFor="showup-both" className="cursor-pointer">
                Both email + SMS
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Replay Settings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Offer replay
            </Label>
            <Switch
              checked={safeConfig.hasReplay}
              onCheckedChange={(checked) => handleChange('hasReplay', checked)}
            />
          </div>

          {safeConfig.hasReplay && (
            <div className="pl-6 space-y-3 border-l-2 border-primary/20">
              <Label className="text-sm">Replay available for</Label>
              <Select
                value={safeConfig.replayDuration}
                onValueChange={(value) => handleChange('replayDuration', value as WebinarConfig['replayDuration'])}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24-hours">24 hours</SelectItem>
                  <SelectItem value="48-hours">48 hours</SelectItem>
                  <SelectItem value="72-hours">72 hours</SelectItem>
                  <SelectItem value="until-cart-close">Until cart closes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Pitch Timing */}
        <div className="space-y-3">
          <Label className="font-medium">When will you pitch?</Label>
          <RadioGroup
            value={safeConfig.pitchTiming}
            onValueChange={(value) => handleChange('pitchTiming', value as WebinarConfig['pitchTiming'])}
            className="space-y-2"
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="at-end" id="pitch-end" />
              <Label htmlFor="pitch-end" className="cursor-pointer">
                At the end (classic approach)
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="throughout" id="pitch-throughout" />
              <Label htmlFor="pitch-throughout" className="cursor-pointer">
                Throughout the training
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="after-qa" id="pitch-qa" />
              <Label htmlFor="pitch-qa" className="cursor-pointer">
                After Q&A
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Live-only Bonus */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="font-medium flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Live-only bonus
            </Label>
            <Switch
              checked={safeConfig.hasLiveBonus}
              onCheckedChange={(checked) => handleChange('hasLiveBonus', checked)}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Special offer only for live attendees (increases show-up rate)
          </p>

          {safeConfig.hasLiveBonus && (
            <div className="pl-6 space-y-2 border-l-2 border-primary/20">
              <Label className="text-sm">Describe your live-only bonus</Label>
              <Input
                value={safeConfig.liveBonusDescription}
                onChange={(e) => handleChange('liveBonusDescription', e.target.value)}
                placeholder="e.g., $200 off + bonus coaching call for live attendees"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
