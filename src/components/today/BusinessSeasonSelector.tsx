import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronDown } from 'lucide-react';
import { BUSINESS_SEASONS } from '@/lib/businessSeasons';
import { useBusinessSeason } from '@/hooks/useBusinessSeason';
import { cn } from '@/lib/utils';

interface Props {
  className?: string;
  size?: 'sm' | 'default';
}

/** Small popover selector for the user's current Business Season. */
export function BusinessSeasonSelector({ className, size = 'sm' }: Props) {
  const { season, seasonMeta, setSeason, isSaving } = useBusinessSeason();

  const label = seasonMeta ? `${seasonMeta.emoji} ${seasonMeta.label}` : 'Set business season';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size={size}
          disabled={isSaving}
          className={cn('gap-1.5 font-normal', className)}
        >
          <span className="truncate max-w-[180px]">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-1" align="end">
        <div className="px-2 py-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            What season is your business in?
          </p>
        </div>
        <div className="max-h-[320px] overflow-y-auto">
          {BUSINESS_SEASONS.map((s) => {
            const active = s.id === season;
            return (
              <button
                key={s.id}
                onClick={() => setSeason(active ? null : s.id)}
                className={cn(
                  'w-full text-left rounded-md px-2 py-1.5 hover:bg-accent transition-colors flex items-start gap-2',
                  active && 'bg-accent'
                )}
              >
                <span className="text-base leading-none mt-0.5">{s.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium flex items-center gap-1.5">
                    {s.label}
                    {active && <Check className="h-3 w-3 text-primary" />}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{s.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
