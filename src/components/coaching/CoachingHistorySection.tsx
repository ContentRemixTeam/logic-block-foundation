/**
 * Coaching History Section
 * Displays last 3 coaching entries for a task in the Task Detail Drawer
 */

import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCoachingEntriesForTask, CoachingEntry } from '@/hooks/useCoachingEntries';
import { cn } from '@/lib/utils';

interface CoachingHistorySectionProps {
  taskId: string;
  onCoachClick?: () => void;
}

export function CoachingHistorySection({ taskId, onCoachClick }: CoachingHistorySectionProps) {
  const { data: entries = [], isLoading } = useCoachingEntriesForTask(taskId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Coaching History</span>
        </div>
        {entries.length > 0 && (
          <Link 
            to={`/coaching-log?task=${taskId}`}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            View all
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="text-sm text-muted-foreground py-2">
          No coaching entries yet for this task.
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <CoachingEntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {onCoachClick && (
        <Button
          variant="outline"
          size="sm"
          onClick={onCoachClick}
          className="w-full gap-2 mt-2"
        >
          <Sparkles className="h-4 w-4" />
          Stuck? Coach Yourself
        </Button>
      )}
    </div>
  );
}

function CoachingEntryCard({ entry }: { entry: CoachingEntry }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-xs">
          {format(new Date(entry.created_at), 'MMM d, h:mm a')}
        </Badge>
        {entry.feeling && (
          <span className="text-xs text-muted-foreground">{entry.feeling}</span>
        )}
      </div>
      
      {entry.thought && (
        <div className="text-sm">
          <span className="text-muted-foreground">Thought: </span>
          <span className="italic">"{entry.thought}"</span>
        </div>
      )}
      
      {entry.reframe_thought && (
        <div className="text-sm">
          <span className="text-muted-foreground">Reframe: </span>
          <span className="text-primary font-medium">"{entry.reframe_thought}"</span>
        </div>
      )}
    </div>
  );
}
