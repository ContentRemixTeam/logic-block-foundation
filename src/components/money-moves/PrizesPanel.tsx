import { Card } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import { MONEY_MOVES_PRIZES_COPY } from '@/constants/moneyMovesConfig';

export function PrizesPanel() {
  return (
    <Card className="editorial-card p-6">
      <div className="flex items-start gap-3">
        <Trophy className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <h3 className="font-display text-xl text-foreground">Sprint prizes</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {MONEY_MOVES_PRIZES_COPY}
          </p>
        </div>
      </div>
    </Card>
  );
}
