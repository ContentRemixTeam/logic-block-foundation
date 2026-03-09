import { PlatformScorecard } from '../PlatformScorecard';
import { PLATFORMS } from '../PlatformScorecardData';
import type { EngineBuilderData } from '../EngineBuilderTypes';

interface StepDiscoverProps {
  data: EngineBuilderData;
  onChange: (updates: Partial<EngineBuilderData>) => void;
}

export function StepDiscover({ data, onChange }: StepDiscoverProps) {
  const selectedPlatform = PLATFORMS.find((p) => p.id === data.primaryPlatform);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          ⛽ Fill Your Tank — Where do people find you?
        </h3>
        <p className="text-sm text-muted-foreground">
          Pick the ONE platform you'll commit to for the next 90 days. This is your fuel — how new people discover you.
        </p>
      </div>

      <PlatformScorecard
        selectedPlatform={data.primaryPlatform}
        onSelect={(id) => onChange({ primaryPlatform: id })}
      />

      {selectedPlatform && (
        <div className="bg-accent/50 border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{selectedPlatform.emoji}</span>
            <h4 className="font-semibold text-foreground">{selectedPlatform.name} — locked in!</h4>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              What's ONE specific action you'll take every week on {selectedPlatform.name}?
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              e.g., "Post 3 reels per week" or "Publish 2 articles" or "Reach out to 5 collaboration partners"
            </p>
            <input
              type="text"
              value={data.specificAction}
              onChange={(e) => onChange({ specificAction: e.target.value })}
              placeholder={`My weekly ${selectedPlatform.name} commitment...`}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>
      )}
    </div>
  );
}
