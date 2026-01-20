/**
 * Delight Settings Card
 * Settings section for themes, celebrations, and sounds
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sparkles, Volume2, PartyPopper, Palette } from 'lucide-react';
import { useDelightSettings } from '@/hooks/useDelightSettings';
import { DelightIntensity } from '@/lib/themeConfigSchema';
import { testConfetti } from '@/lib/celebrationService';
import { Button } from '@/components/ui/button';

const INTENSITY_OPTIONS: { value: DelightIntensity; label: string; description: string }[] = [
  { value: 'none', label: 'None', description: 'No animations or effects' },
  { value: 'subtle', label: 'Subtle', description: 'Light, occasional celebrations' },
  { value: 'fun', label: 'Fun', description: 'Full celebration experience' },
];

export function DelightSettingsCard() {
  const { settings, updateSetting, isLoading, isUpdating } = useDelightSettings();

  const handleTestConfetti = () => {
    testConfetti('classic', 'medium');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Delight
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Delight
        </CardTitle>
        <CardDescription>
          Customize celebrations, sounds, and visual effects
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme FX Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Palette className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label htmlFor="themes-enabled" className="font-medium">
                Enable Theme Effects
              </Label>
              <p className="text-sm text-muted-foreground">
                Apply custom colors from unlocked themes
              </p>
            </div>
          </div>
          <Switch
            id="themes-enabled"
            checked={settings.themes_enabled}
            onCheckedChange={(checked) => updateSetting('themes_enabled', checked)}
            disabled={isUpdating}
          />
        </div>

        {/* Celebrations Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PartyPopper className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label htmlFor="celebrations-enabled" className="font-medium">
                Celebrations (Confetti)
              </Label>
              <p className="text-sm text-muted-foreground">
                Show confetti on theme unlocks and completions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleTestConfetti}>
              Test
            </Button>
            <Switch
              id="celebrations-enabled"
              checked={settings.celebrations_enabled}
              onCheckedChange={(checked) => updateSetting('celebrations_enabled', checked)}
              disabled={isUpdating}
            />
          </div>
        </div>

        {/* Sound Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Volume2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label htmlFor="sound-enabled" className="font-medium">
                Sound Effects
              </Label>
              <p className="text-sm text-muted-foreground">
                Play sounds on achievements (off by default)
              </p>
            </div>
          </div>
          <Switch
            id="sound-enabled"
            checked={settings.sound_enabled}
            onCheckedChange={(checked) => updateSetting('sound_enabled', checked)}
            disabled={isUpdating}
          />
        </div>

        {/* Delight Intensity */}
        <div className="space-y-3">
          <Label className="font-medium">Delight Intensity</Label>
          <RadioGroup
            value={settings.delight_intensity}
            onValueChange={(value) => updateSetting('delight_intensity', value as DelightIntensity)}
            disabled={isUpdating}
          >
            {INTENSITY_OPTIONS.map((option) => (
              <div
                key={option.value}
                className="flex items-center space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/50"
                onClick={() => updateSetting('delight_intensity', option.value)}
              >
                <RadioGroupItem value={option.value} id={`intensity-${option.value}`} />
                <div>
                  <Label htmlFor={`intensity-${option.value}`} className="font-medium cursor-pointer">
                    {option.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Reduced Motion Note */}
        <p className="text-xs text-muted-foreground border-t pt-4">
          💡 Animations are automatically disabled when your system's "Reduce Motion" setting is on.
        </p>
      </CardContent>
    </Card>
  );
}
