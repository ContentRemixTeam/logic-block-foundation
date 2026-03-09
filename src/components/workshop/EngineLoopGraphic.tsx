import type { EngineBuilderData } from './EngineBuilderTypes';
import { PLATFORMS } from './PlatformScorecardData';

interface EngineLoopGraphicProps {
  data: EngineBuilderData;
}

export function EngineLoopGraphic({ data }: EngineLoopGraphicProps) {
  const platform = PLATFORMS.find((p) => p.id === data.primaryPlatform);
  const additionalCount = data.additionalPlatforms?.length || 0;

  return (
    <div className="relative w-full max-w-md mx-auto">
      <svg viewBox="0 0 400 350" className="w-full h-auto">
        {/* Circular track */}
        <ellipse cx="200" cy="175" rx="150" ry="130" fill="none" stroke="hsl(var(--border))" strokeWidth="3" strokeDasharray="8 4" />
        
        {/* Arrows on the track */}
        <path d="M 350 175 L 340 165 M 350 175 L 340 185" stroke="hsl(var(--muted-foreground))" strokeWidth="2.5" fill="none" />
        <path d="M 200 45 L 210 55 M 200 45 L 190 55" stroke="hsl(var(--muted-foreground))" strokeWidth="2.5" fill="none" />
        <path d="M 50 175 L 60 185 M 50 175 L 60 165" stroke="hsl(var(--muted-foreground))" strokeWidth="2.5" fill="none" />

        {/* Discover node — top */}
        <circle cx="200" cy="45" r="42" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="3" />
        <text x="200" y="38" textAnchor="middle" fontSize="22">⛽</text>
        <text x="200" y="60" textAnchor="middle" fontSize="12" fontWeight="700" fill="hsl(var(--foreground))">DISCOVER</text>

        {/* Nurture node — bottom left */}
        <circle cx="80" cy="270" r="42" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="3" />
        <text x="80" y="263" textAnchor="middle" fontSize="22">🔧</text>
        <text x="80" y="285" textAnchor="middle" fontSize="12" fontWeight="700" fill="hsl(var(--foreground))">NURTURE</text>

        {/* Convert node — bottom right */}
        <circle cx="320" cy="270" r="42" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="3" />
        <text x="320" y="263" textAnchor="middle" fontSize="22">🚀</text>
        <text x="320" y="285" textAnchor="middle" fontSize="12" fontWeight="700" fill="hsl(var(--foreground))">CONVERT</text>

        {/* Labels with user data — larger, bolder */}
        <text x="200" y="102" textAnchor="middle" fontSize="12" fontWeight="500" fill="hsl(var(--foreground))">
          {platform?.name || data.customPlatform || 'Platform'}
          {additionalCount > 0 ? ` + ${additionalCount} more` : ''}
        </text>
        <text x="80" y="324" textAnchor="middle" fontSize="12" fontWeight="500" fill="hsl(var(--foreground))">
          Email + {data.secondaryNurture || 'nurture'}
        </text>
        <text x="320" y="324" textAnchor="middle" fontSize="12" fontWeight="500" fill="hsl(var(--foreground))">
          {data.offerName || 'Your offer'}
        </text>

        {/* Center racing flag */}
        <text x="200" y="185" textAnchor="middle" fontSize="36">🏎️</text>
        <text x="200" y="215" textAnchor="middle" fontSize="12" fontWeight="700" fill="hsl(var(--foreground))">YOUR ENGINE</text>
      </svg>
    </div>
  );
}
