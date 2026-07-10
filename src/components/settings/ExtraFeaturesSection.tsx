import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useFeatureToggles } from '@/hooks/useFeatureToggles';
import { FEATURE_LIST } from '@/lib/featureRoutes';

export function ExtraFeaturesSection() {
  const { toggles, setToggle, isLoading } = useFeatureToggles();

  return (
    <Card id="extra-features">
      <CardHeader>
        <CardTitle>Extra Features</CardTitle>
        <CardDescription>
          Turn on only what you need. Everything is off by default so the
          planner stays calm — you can flip a switch any time. Nothing gets
          deleted when you turn something off.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {FEATURE_LIST.map((feat) => {
          const enabled = toggles[feat.key];
          return (
            <div
              key={feat.key}
              className="flex items-start justify-between gap-4 py-2 border-b border-border/40 last:border-none"
            >
              <div className="space-y-0.5 flex-1 min-w-0">
                <Label htmlFor={`feature-${feat.key}`} className="text-sm font-medium">
                  {feat.label}
                </Label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feat.description}
                </p>
              </div>
              <Switch
                id={`feature-${feat.key}`}
                checked={enabled}
                disabled={isLoading}
                onCheckedChange={(v) => setToggle(feat.key, v)}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
