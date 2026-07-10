/**
 * Compact "Celebrations" toggle for the main Settings surface.
 *
 * Celebrations are core, on by default, and NOT part of the Extra Features
 * pool. This tiny card lets a user turn them off if animations feel too much.
 * prefers-reduced-motion is already honored automatically inside `useCelebrate`.
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sparkles } from 'lucide-react';
import { useDelightSettings } from '@/hooks/useDelightSettings';

export function CelebrationsToggleCard() {
  const { settings, updateSetting, isLoading, isUpdating } = useDelightSettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Celebrations
        </CardTitle>
        <CardDescription>
          Little confetti moments when you finish a task, close out today, or
          hit a cycle milestone. On by default. Reduced-motion users get a
          gentle text affirmation instead — automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Label htmlFor="celebrations-core" className="font-medium">
            Show celebrations
          </Label>
          <Switch
            id="celebrations-core"
            checked={settings.celebrations_enabled}
            disabled={isLoading || isUpdating}
            onCheckedChange={(v) => updateSetting('celebrations_enabled', v)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
