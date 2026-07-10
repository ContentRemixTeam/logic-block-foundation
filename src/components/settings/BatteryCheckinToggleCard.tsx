/**
 * Small settings card: toggle the daily "How's your battery today?" auto-prompt.
 * When off, the chip in the daily plan header still lets users set battery manually.
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Battery } from 'lucide-react';
import { useBatteryPromptEnabled } from '@/hooks/useBatteryPromptEnabled';

export function BatteryCheckinToggleCard() {
  const { enabled, setEnabled, isLoading, isUpdating } = useBatteryPromptEnabled();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Battery className="h-5 w-5" />
          Daily battery check-in
        </CardTitle>
        <CardDescription>
          A gentle once-a-day prompt asking how your energy feels. When off, the
          prompt never auto-appears — you can still tap the battery chip in your
          daily plan any time to set it manually. Energy-matching and Low
          Battery Day keep working either way.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Label htmlFor="battery-checkin-prompt" className="font-medium">
            Show the daily prompt
          </Label>
          <Switch
            id="battery-checkin-prompt"
            checked={enabled}
            disabled={isLoading || isUpdating}
            onCheckedChange={setEnabled}
          />
        </div>
      </CardContent>
    </Card>
  );
}
