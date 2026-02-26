import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserPlatforms } from '@/hooks/useUserPlatforms';
import { PLATFORM_LABELS, PLATFORM_SHORT_LABELS } from '@/lib/calendarConstants';

interface PlatformFilterBarProps {
  selectedPlatforms: string[];
  onTogglePlatform: (platform: string) => void;
  onConfigureClick?: () => void;
}

export function PlatformFilterBar({ 
  selectedPlatforms, 
  onTogglePlatform,
  onConfigureClick,
}: PlatformFilterBarProps) {
  const { activePlatforms, getPlatformColor } = useUserPlatforms();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mr-1">
        Platforms
      </span>
      
      {activePlatforms.map((platform) => {
        const isSelected = selectedPlatforms.includes(platform.platform);
        const color = getPlatformColor(platform.platform);
        const shortLabel = PLATFORM_SHORT_LABELS[platform.platform] || platform.platform.slice(0, 2).toUpperCase();
        
        return (
          <button
            key={platform.platform}
            className={cn(
              "inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold transition-all duration-200 border",
              isSelected 
                ? "shadow-sm scale-100 border-transparent" 
                : "opacity-40 hover:opacity-70 border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/50"
            )}
            style={isSelected ? {
              backgroundColor: `${color}18`,
              color: color,
              boxShadow: `0 0 0 1px ${color}30`,
            } : undefined}
            onClick={() => onTogglePlatform(platform.platform)}
          >
            {shortLabel}
          </button>
        );
      })}

      {onConfigureClick && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[10px] text-muted-foreground/50 hover:text-foreground ml-1"
          onClick={onConfigureClick}
        >
          <Settings className="h-3 w-3 mr-1" />
          Configure
        </Button>
      )}
    </div>
  );
}
