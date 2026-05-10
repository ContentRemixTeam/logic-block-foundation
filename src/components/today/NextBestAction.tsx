import { Link } from 'react-router-dom';
import { ArrowRight, Compass } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNextBestAction } from '@/hooks/useNextBestAction';

interface NextBestActionProps {
  /** Pass true when today's plan is flagged low-energy. */
  lowEnergyDay?: boolean;
  className?: string;
}

/**
 * Calm, deterministic "next best action" panel for the Today surface.
 * Pure presentation — uses existing query data only.
 */
export function NextBestAction({ lowEnergyDay, className }: NextBestActionProps) {
  const suggestion = useNextBestAction({ lowEnergyDay });

  return (
    <Card className={className}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
            <Compass className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Next best action
              </span>
              {typeof suggestion.count === 'number' && suggestion.count > 0 && (
                <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px] tabular-nums">
                  {suggestion.count}
                </Badge>
              )}
            </div>
            <h3 className="text-base font-semibold leading-tight">{suggestion.title}</h3>
            <p className="text-sm text-muted-foreground">{suggestion.body}</p>
          </div>
          <Button asChild size="sm" variant="ghost" className="shrink-0 self-center gap-1">
            <Link to={suggestion.href}>
              <span className="hidden sm:inline">{suggestion.ctaLabel}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
