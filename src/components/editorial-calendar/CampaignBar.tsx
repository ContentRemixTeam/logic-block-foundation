import { format, parseISO, startOfWeek, endOfWeek, isAfter, isBefore } from 'date-fns';
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
  if (!campaign.cart_opens || !campaign.cart_closes) {
    return null;
  }

  const weekStartDate = startOfWeek(weekStart, { weekStartsOn: 1 });
  const weekEndDate = endOfWeek(weekStart, { weekStartsOn: 1 });
  
  const campaignStart = parseISO(campaign.cart_opens);
  const campaignEnd = parseISO(campaign.cart_closes);
  
  const effectiveStart = isBefore(campaignStart, weekStartDate) ? weekStartDate : campaignStart;
  const effectiveEnd = isAfter(campaignEnd, weekEndDate) ? weekEndDate : campaignEnd;
  
  const startDayOfWeek = effectiveStart.getDay();
  const endDayOfWeek = effectiveEnd.getDay();
  
  const gridStart = startDayOfWeek === 0 ? 7 : startDayOfWeek;
  const gridEnd = endDayOfWeek === 0 ? 7 : endDayOfWeek;
  const span = gridEnd - gridStart + 1;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onClick(campaign.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white",
              "hover:brightness-110 transition-all cursor-pointer truncate",
              "shadow-sm"
            )}
            style={{
              backgroundColor: campaign.display_color,
              gridColumn: `${gridStart} / span ${span}`,
            }}
          >
            <Rocket className="h-3 w-3 shrink-0 opacity-80" />
            <span className="truncate">{campaign.name}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="text-sm">
            <p className="font-semibold">{campaign.name}</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              {format(campaignStart, 'MMM d')} – {format(campaignEnd, 'MMM d, yyyy')}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
