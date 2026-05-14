import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TRACK_LABELS, type MoneyTrack } from '@/constants/moneyMovesConfig';
import { getRung } from '@/data/moneyMovesLadder';

interface Props {
  track: MoneyTrack;
  rung: number;
  saleLogged?: boolean;
}

export function MoveCard({ track, rung, saleLogged }: Props) {
  const r = getRung(track, rung);
  return (
    <Card className="editorial-card p-6 sm:p-8 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{TRACK_LABELS[track]}</Badge>
        <Badge variant="outline">Rung {rung}</Badge>
        {saleLogged && <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">Sale logged</Badge>}
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
          Your move this week
        </p>
        <h2 className="font-display text-3xl sm:text-4xl leading-tight text-foreground">
          {r.moveTitle}
        </h2>
      </div>
      <p className="text-muted-foreground italic">{r.moveWhy}</p>
      <p className="text-sm text-muted-foreground">
        Rung context: <span className="text-foreground">{r.title}</span>
      </p>
    </Card>
  );
}
