import type { EngineBuilderData } from './EngineBuilderTypes';
import { PLATFORMS } from './PlatformScorecardData';

interface EngineLoopGraphicProps {
  data: EngineBuilderData;
}

export function EngineLoopGraphic({ data }: EngineLoopGraphicProps) {
  const platform = PLATFORMS.find((p) => p.id === data.primaryPlatform);

  return (
    <div className="relative w-full max-w-md mx-auto">
      <svg viewBox="0 0 400 350" className="w-full h-auto">
        {/* Circular track */}
        <ellipse cx="200" cy="175" rx="150" ry="130" fill="none" stroke="hsl(var(--border-strong))" strokeWidth="3" strokeDasharray="8 4" />
        
        {/* Arrows on the track */}
        <path d="M 350 175 L 340 165 M 350 175 L 340 185" stroke="hsl(var(--muted-foreground))" strokeWidth="2" fill="none" />
        <path d="M 200 45 L 210 55 M 200 45 L 190 55" stroke="hsl(var(--muted-foreground))" strokeWidth="2" fill="none" />
        <path d="M 50 175 L 60 185 M 50 175 L 60 165" stroke="hsl(var(--muted-foreground))" strokeWidth="2" fill="none" />

        {/* Discover node — top */}
        <circle cx="200" cy="45" r="40" fill="hsl(var(--accent))" stroke="hsl(var(--primary))" strokeWidth="3" />
        <text x="200" y="38" textAnchor="middle" className="text-lg" fill="hsl(var(--foreground))">⛽</text>
        <text x="200" y="58" textAnchor="middle" fontSize="11" fontWeight="600" fill="hsl(var(--foreground))">DISCOVER</text>

        {/* Nurture node — bottom left */}
        <circle cx="80" cy="270" r="40" fill="hsl(var(--accent))" stroke="hsl(var(--primary))" strokeWidth="3" />
        <text x="80" y="263" textAnchor="middle" className="text-lg" fill="hsl(var(--foreground))">🔧</text>
        <text x="80" y="283" textAnchor="middle" fontSize="11" fontWeight="600" fill="hsl(var(--foreground))">NURTURE</text>

        {/* Convert node — bottom right */}
        <circle cx="320" cy="270" r="40" fill="hsl(var(--accent))" stroke="hsl(var(--primary))" strokeWidth="3" />
        <text x="320" y="263" textAnchor="middle" className="text-lg" fill="hsl(var(--foreground))">🚀</text>
        <text x="320" y="283" textAnchor="middle" fontSize="11" fontWeight="600" fill="hsl(var(--foreground))">CONVERT</text>

        {/* Labels with user data */}
        <text x="200" y="100" textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">
          {platform?.name || 'Platform'}
        </text>
        <text x="80" y="320" textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">
          Email + {data.secondaryNurture || 'nurture'}
        </text>
        <text x="320" y="320" textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">
          {data.offerName || 'Your offer'}
        </text>

        {/* Center racing flag */}
        <text x="200" y="185" textAnchor="middle" fontSize="32">🏎️</text>
        <text x="200" y="210" textAnchor="middle" fontSize="10" fontWeight="600" fill="hsl(var(--primary))">YOUR ENGINE</text>
      </svg>
    </div>
  );
}
