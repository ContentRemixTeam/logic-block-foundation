import { PLATFORMS, type PlatformProfile } from './PlatformScorecardData';

interface PlatformScorecardProps {
  selectedPlatform: string;
  onSelect: (platformId: string) => void;
}

function EffortBadge({ effort }: { effort: PlatformProfile['effort'] }) {
  const colors = {
    Low: 'bg-success/10 text-success',
    Medium: 'bg-warning/10 text-warning',
    High: 'bg-destructive/10 text-destructive',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[effort]}`}>
      {effort} Effort
    </span>
  );
}

function GrowthDots({ speed }: { speed: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((dot) => (
        <div
          key={dot}
          className={`w-2 h-2 rounded-full ${dot <= speed ? 'bg-primary' : 'bg-muted'}`}
        />
      ))}
    </div>
  );
}

export function PlatformScorecard({ selectedPlatform, onSelect }: PlatformScorecardProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {PLATFORMS.map((platform) => {
        const isSelected = selectedPlatform === platform.id;
        return (
          <button
            key={platform.id}
            onClick={() => onSelect(platform.id)}
            className={`
              text-left p-4 rounded-xl border-2 transition-all duration-200
              hover:shadow-md hover:border-primary/40
              ${isSelected
                ? 'border-primary bg-accent shadow-md ring-2 ring-primary/20'
                : 'border-border bg-card hover:bg-accent/50'
              }
            `}
          >
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{platform.emoji}</span>
              <h4 className="font-semibold text-sm text-foreground">{platform.name}</h4>
              {isSelected && <span className="ml-auto text-primary text-sm">✓</span>}
            </div>

            {/* Ideal For */}
            <p className="text-xs text-muted-foreground mb-2">{platform.idealFor}</p>

            {/* Strengths */}
            <div className="flex flex-wrap gap-1 mb-3">
              {platform.strengths.map((s) => (
                <span key={s} className="text-[10px] px-1.5 py-0.5 bg-secondary rounded text-secondary-foreground">
                  {s}
                </span>
              ))}
            </div>

            {/* Footer stats */}
            <div className="flex items-center justify-between">
              <EffortBadge effort={platform.effort} />
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">Growth</span>
                <GrowthDots speed={platform.growthSpeed} />
              </div>
            </div>

            {/* Time to results */}
            <p className="text-[10px] text-muted-foreground mt-2">
              ⏱️ {platform.timeToResults}
            </p>

            {/* Best when */}
            {isSelected && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-primary font-medium">Best when:</p>
                <p className="text-xs text-muted-foreground">{platform.bestWhen}</p>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
