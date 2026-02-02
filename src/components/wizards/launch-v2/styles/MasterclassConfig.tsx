// Masterclass Configuration Component
// Multi-day deep training event configuration

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue, 
} from '@/components/ui/select';
import { GraduationCap, Calendar, Clock, Gift, Plus, X } from 'lucide-react';
import { MasterclassConfig, DEFAULT_MASTERCLASS_CONFIG } from '@/types/launchV2';

interface MasterclassConfigProps {
  config: MasterclassConfig;
  onChange: (config: MasterclassConfig) => void;
}

export function MasterclassConfigComponent({ config, onChange }: MasterclassConfigProps) {
  const safeConfig = { ...DEFAULT_MASTERCLASS_CONFIG, ...config };

  const handleChange = <K extends keyof MasterclassConfig>(
    key: K,
    value: MasterclassConfig[K]
  ) => {
    onChange({ ...safeConfig, [key]: value });
  };

  const handleAddTheme = () => {
    const newThemes = [...safeConfig.dailyThemes, ''];
    handleChange('dailyThemes', newThemes);
  };

  const handleRemoveTheme = (index: number) => {
    const newThemes = safeConfig.dailyThemes.filter((_, i) => i !== index);
    handleChange('dailyThemes', newThemes);
  };

  const handleThemeChange = (index: number, value: string) => {
    const newThemes = [...safeConfig.dailyThemes];
    newThemes[index] = value;
    handleChange('dailyThemes', newThemes);
  };

  const ensureThemeSlots = () => {
    const days = safeConfig.numberOfDays || 3;
    if (safeConfig.dailyThemes.length < days) {
      const newThemes = [...safeConfig.dailyThemes];
      while (newThemes.length < days) {
        newThemes.push('');
      }
      handleChange('dailyThemes', newThemes);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <GraduationCap className="h-5 w-5 text-primary" />
          Masterclass Configuration
        </CardTitle>
        <CardDescription>
          Multi-day deep training leading to your offer
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Number of Days */}
        <div className="space-y-3">
          <Label className="font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            How many days?
          </Label>
          <Select
            value={String(safeConfig.numberOfDays)}
            onValueChange={(value) => {
              handleChange('numberOfDays', Number(value) as 2 | 3 | 4 | 5);
              handleChange('dailyThemes', []);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 days (intensive)</SelectItem>
              <SelectItem value="3">3 days (standard)</SelectItem>
              <SelectItem value="4">4 days (comprehensive)</SelectItem>
              <SelectItem value="5">5 days (deep dive)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Daily Themes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="font-medium">Daily themes</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={ensureThemeSlots}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add all days
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            What's the focus/topic for each day?
          </p>
          <div className="space-y-2">
            {safeConfig.dailyThemes.map((theme, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-sm font-medium w-16">Day {index + 1}:</span>
                <Input
                  value={theme}
                  onChange={(e) => handleThemeChange(index, e.target.value)}
                  placeholder={`e.g., "Foundation & Fundamentals"`}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveTheme(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {safeConfig.dailyThemes.length < safeConfig.numberOfDays && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddTheme}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add day
              </Button>
            )}
          </div>
        </div>

        {/* Replay Period */}
        <div className="space-y-3">
          <Label className="font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Replay availability
          </Label>
          <Select
            value={safeConfig.replayPeriod}
            onValueChange={(value) => handleChange('replayPeriod', value as MasterclassConfig['replayPeriod'])}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24-hours">24 hours after each day</SelectItem>
              <SelectItem value="48-hours">48 hours after each day</SelectItem>
              <SelectItem value="72-hours">72 hours after each day</SelectItem>
              <SelectItem value="until-cart-close">Until cart closes</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Shorter replay windows create more urgency to attend live
          </p>
        </div>

        {/* Replay-only Offer */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="font-medium flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Replay-only special offer
            </Label>
            <Switch
              checked={safeConfig.hasReplayOnlyOffer}
              onCheckedChange={(checked) => handleChange('hasReplayOnlyOffer', checked)}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Special offer available only to those who watched replays
          </p>

          {safeConfig.hasReplayOnlyOffer && (
            <div className="pl-6 space-y-2 border-l-2 border-primary/20">
              <Label className="text-sm">Describe your replay-only offer</Label>
              <Input
                value={safeConfig.replayOnlyOfferDescription}
                onChange={(e) => handleChange('replayOnlyOfferDescription', e.target.value)}
                placeholder="e.g., Extended payment plan only for replay watchers"
              />
            </div>
          )}
        </div>

        {/* Tip Card */}
        <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <p className="text-sm text-purple-800 dark:text-purple-200">
              <strong>Masterclass Tip:</strong> Each day should build on the previous one, 
              creating a transformation journey. Make the pitch feel like a natural next step.
            </p>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
