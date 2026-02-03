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
              "cursor-pointer transition-all text-xs font-medium px-2 py-0.5",
              isSelected 
                ? "ring-2 ring-offset-1" 
                : "opacity-50 hover:opacity-75"
            )}
            style={{
              backgroundColor: isSelected ? `${color}20` : 'transparent',
              borderColor: color,
              color: isSelected ? color : undefined,
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
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={onConfigureClick}
        >
          <Settings className="h-3 w-3 mr-1" />
          Configure
        </Button>
      )}
    </div>
  );
}
