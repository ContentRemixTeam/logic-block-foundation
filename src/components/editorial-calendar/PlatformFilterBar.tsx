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
    <div className="flex items-center gap-2.5 flex-wrap">
      <span className="text-xs text-muted-foreground font-medium">Platforms:</span>
      
      {activePlatforms.map((platform) => {
        const isSelected = selectedPlatforms.includes(platform.platform);
        const color = getPlatformColor(platform.platform);
        const shortLabel = PLATFORM_SHORT_LABELS[platform.platform] || platform.platform.slice(0, 2).toUpperCase();
        
        return (
          <Badge
            key={platform.platform}
            variant="outline"
            className={cn(
              "cursor-pointer transition-all duration-200 text-xs font-semibold px-2.5 py-1",
              isSelected 
                ? "ring-2 ring-offset-2 ring-offset-background shadow-sm scale-105" 
                : "opacity-50 hover:opacity-80 hover:scale-105"
            )}
            style={{
              backgroundColor: isSelected ? `${color}25` : 'transparent',
              borderColor: color,
              color: isSelected ? color : undefined,
              ...(isSelected && { boxShadow: `0 0 0 2px ${color}40` }),
            }}
            onClick={() => onTogglePlatform(platform.platform)}
          >
            {shortLabel}
          </Badge>
        );
      })}

      {onConfigureClick && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground ml-1"
          onClick={onConfigureClick}
        >
          <Settings className="h-3.5 w-3.5 mr-1.5" />
          Configure
        </Button>
      )}
    </div>
  );
}
