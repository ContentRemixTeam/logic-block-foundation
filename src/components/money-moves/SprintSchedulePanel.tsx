import { Card } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { MONEY_MOVES_SCHEDULE } from '@/constants/moneyMovesConfig';

export function SprintSchedulePanel() {
  return (
    <Card className="editorial-card p-6">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-display text-xl text-foreground">Sprint schedule</h3>
      </div>
      <ul className="space-y-2 text-sm">
        {MONEY_MOVES_SCHEDULE.map(s => (
          <li key={s.day} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <span className="font-medium text-foreground">{s.day}</span>
            <span className="text-muted-foreground">{s.date}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
