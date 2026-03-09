import { PlatformScorecard } from '../PlatformScorecard';
import { PLATFORMS } from '../PlatformScorecardData';
import type { EngineBuilderData } from '../EngineBuilderTypes';

interface StepDiscoverProps {
  data: EngineBuilderData;
  onChange: (updates: Partial<EngineBuilderData>) => void;
}

export function StepDiscover({ data, onChange }: StepDiscoverProps) {
  const selectedPlatform = PLATFORMS.find((p) => p.id === data.primaryPlatform);
  const isCustom = data.primaryPlatform === 'other';

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
        onSelect={(id) => onChange({ primaryPlatform: id, customPlatform: '' })}
      />

      {/* Something else option */}
      <button
        onClick={() => onChange({ primaryPlatform: 'other' })}
        className={`
          w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200
          ${isCustom
            ? 'border-primary bg-accent shadow-md ring-2 ring-primary/20'
            : 'border-dashed border-border bg-card hover:border-primary/40'
          }
        `}
      >
        <span className="text-xl">✨</span>
        <div>
          <h5 className="font-semibold text-sm text-foreground">Something else</h5>
          <p className="text-xs text-muted-foreground">My platform isn't listed above</p>
        </div>
      </button>

      {isCustom && (
        <div className="bg-accent/50 border border-border rounded-xl p-4 space-y-3">
          <input
            type="text"
            value={data.customPlatform}
            onChange={(e) => onChange({ customPlatform: e.target.value })}
            placeholder="What platform or method do you use?"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              What's ONE specific action you'll take every week?
            </label>
            <input
              type="text"
              value={data.specificAction}
              onChange={(e) => onChange({ specificAction: e.target.value })}
              placeholder="My weekly commitment..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>
      )}

      {selectedPlatform && !isCustom && (
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
