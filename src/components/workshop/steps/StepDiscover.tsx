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

  const toggleAdditional = (id: string) => {
    const current = data.additionalPlatforms;
    const updated = current.includes(id)
      ? current.filter((p) => p !== id)
      : [...current, id];
    onChange({ additionalPlatforms: updated });
  };

  const setAdditionalAction = (platformId: string, action: string) => {
    onChange({
      additionalPlatformActions: {
        ...data.additionalPlatformActions,
        [platformId]: action,
      },
    });
  };

  // Platforms available as additional (exclude primary)
  const additionalOptions = PLATFORMS.filter(
    (p) => p.id !== data.primaryPlatform
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          ⛽ Fill Your Tank — Where do people find you?
        </h3>
        <p className="text-sm text-muted-foreground">
          Pick your PRIMARY platform — the one you'll commit to most consistently for the next 90 days. Then optionally add secondary sources.
        </p>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-foreground mb-2">🥇 Primary Platform</h4>
        <PlatformScorecard
          selectedPlatform={data.primaryPlatform}
          onSelect={(id) => onChange({
            primaryPlatform: id,
            customPlatform: '',
            additionalPlatforms: data.additionalPlatforms.filter((p) => p !== id),
          })}
        />
      </div>

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

      {/* Additional Lead Gen Sources */}
      {data.primaryPlatform && (
        <div className="space-y-3 pt-2">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
              <span>🔋</span> Additional Lead Gen Sources <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </h4>
            <p className="text-xs text-muted-foreground">
              Select any other ways people find you. These are your secondary fuel lines.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {additionalOptions.map((platform) => {
              const isSelected = data.additionalPlatforms.includes(platform.id);
              return (
                <button
                  key={platform.id}
                  onClick={() => toggleAdditional(platform.id)}
                  className={`
                    flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all duration-200
                    ${isSelected
                      ? 'border-primary bg-accent shadow-sm'
                      : 'border-border bg-card hover:border-primary/40'
                    }
                  `}
                >
                  <span className="text-lg">{platform.emoji}</span>
                  <span className="text-sm font-medium text-foreground">{platform.name}</span>
                  {isSelected && <span className="ml-auto text-primary text-xs">✓</span>}
                </button>
              );
            })}
            {/* Custom additional */}
            <button
              onClick={() => toggleAdditional('other')}
              className={`
                flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all duration-200
                ${data.additionalPlatforms.includes('other')
                  ? 'border-primary bg-accent shadow-sm'
                  : 'border-dashed border-border bg-card hover:border-primary/40'
                }
              `}
            >
              <span className="text-lg">✨</span>
              <span className="text-sm font-medium text-foreground">Other</span>
            </button>
          </div>

          {data.additionalPlatforms.includes('other') && (
            <input
              type="text"
              value={data.customAdditionalPlatform}
              onChange={(e) => onChange({ customAdditionalPlatform: e.target.value })}
              placeholder="What other platform or method?"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          )}

          {/* Actions for selected additional platforms */}
          {data.additionalPlatforms.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-medium text-muted-foreground">Quick actions for your secondary sources:</p>
              {data.additionalPlatforms.map((id) => {
                const p = PLATFORMS.find((pl) => pl.id === id);
                const label = p ? p.name : (id === 'other' ? (data.customAdditionalPlatform || 'Other') : id);
                const emoji = p ? p.emoji : '✨';
                return (
                  <div key={id} className="flex items-center gap-2">
                    <span className="text-sm shrink-0">{emoji}</span>
                    <input
                      type="text"
                      value={data.additionalPlatformActions[id] || ''}
                      onChange={(e) => setAdditionalAction(id, e.target.value)}
                      placeholder={`Weekly action for ${label}...`}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
