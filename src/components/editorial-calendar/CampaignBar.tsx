import { format, parseISO, startOfWeek, endOfWeek, differenceInDays, isAfter, isBefore } from 'date-fns';
import { Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface Campaign {
  id: string;
  name: string;
  cart_opens: string | null;
  cart_closes: string | null;
  display_color: string;
}

interface CampaignBarProps {
  campaign: Campaign;
  weekStart: Date;
  onClick: (campaignId: string) => void;
}

export function CampaignBar({ campaign, weekStart, onClick }: CampaignBarProps) {
  // Handle null dates gracefully
  if (!campaign.cart_opens || !campaign.cart_closes) {
    return null;
  }

  const weekStartDate = startOfWeek(weekStart, { weekStartsOn: 1 });
  const weekEndDate = endOfWeek(weekStart, { weekStartsOn: 1 });
  
  const campaignStart = parseISO(campaign.cart_opens);
  const campaignEnd = parseISO(campaign.cart_closes);
  
  // Clamp dates to the current week
  const effectiveStart = isBefore(campaignStart, weekStartDate) ? weekStartDate : campaignStart;
  const effectiveEnd = isAfter(campaignEnd, weekEndDate) ? weekEndDate : campaignEnd;
  
  // Calculate grid columns (1 = Monday, 7 = Sunday)
  // getDay() returns 0 for Sunday, 1 for Monday, etc.
  const startDayOfWeek = effectiveStart.getDay();
  const endDayOfWeek = effectiveEnd.getDay();
  
  // Convert to Monday-based grid (1-7)
  const gridStart = startDayOfWeek === 0 ? 7 : startDayOfWeek;
  const gridEnd = endDayOfWeek === 0 ? 7 : endDayOfWeek;
  const span = gridEnd - gridStart + 1;
  
  const tooltipText = `${campaign.name}\n${format(campaignStart, 'MMM d')} – ${format(campaignEnd, 'MMM d, yyyy')}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onClick(campaign.id)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-white",
              "hover:opacity-90 transition-opacity cursor-pointer truncate",
              "shadow-sm border border-white/20"
            )}
            style={{
              backgroundColor: campaign.display_color,
              gridColumn: `${gridStart} / span ${span}`,
            }}
          >
            <Rocket className="h-3 w-3 shrink-0" />
            <span className="truncate">{campaign.name}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="text-sm">
            <p className="font-medium">{campaign.name}</p>
            <p className="text-muted-foreground">
              {format(campaignStart, 'MMM d')} – {format(campaignEnd, 'MMM d, yyyy')}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
