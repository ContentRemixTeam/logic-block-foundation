import { PLATFORMS, type PlatformProfile } from './PlatformScorecardData';

interface PlatformScorecardProps {
  selectedPlatform: string;
  onSelect: (platformId: string) => void;
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
            <div className="flex flex-wrap gap-1 mb-2">
              {platform.strengths.map((s) => (
                <span key={s} className="text-[10px] px-1.5 py-0.5 bg-secondary rounded text-secondary-foreground">
                  {s}
                </span>
              ))}
            </div>

            {/* Content type */}
            <p className="text-[10px] text-muted-foreground">
              📝 {platform.contentType}
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
