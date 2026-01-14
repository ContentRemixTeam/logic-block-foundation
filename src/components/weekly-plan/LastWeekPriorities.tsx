import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowRight, X, History, CheckCircle2 } from 'lucide-react';

interface LastWeekPrioritiesProps {
  priorities: string[];
  onCarryOver: (priority: string, index: number) => void;
  onDrop: (index: number) => void;
  onMarkDone: (index: number) => void;
}

export function LastWeekPriorities({
  priorities,
  onCarryOver,
  onDrop,
  onMarkDone,
}: LastWeekPrioritiesProps) {
  const [handledPriorities, setHandledPriorities] = useState<Set<number>>(new Set());
  const [priorityStatuses, setPriorityStatuses] = useState<Record<number, 'done' | 'carried' | 'dropped'>>({});

  const validPriorities = priorities.filter((p) => p && p.trim());

  if (validPriorities.length === 0) {
    return null;
  }

  const handleAction = (action: 'done' | 'carried' | 'dropped', priority: string, index: number) => {
    setHandledPriorities((prev) => new Set([...prev, index]));
    setPriorityStatuses((prev) => ({ ...prev, [index]: action }));

    if (action === 'carried') {
      onCarryOver(priority, index);
    } else if (action === 'dropped') {
      onDrop(index);
    } else if (action === 'done') {
      onMarkDone(index);
    }
  };

  const allHandled = validPriorities.every((_, idx) => handledPriorities.has(idx));

  if (allHandled) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <CardTitle className="text-base">Last Week's Priorities</CardTitle>
        </div>
        <CardDescription>Review and decide what to do with each priority</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {validPriorities.map((priority, idx) => {
          const status = priorityStatuses[idx];
          const isHandled = handledPriorities.has(idx);

          return (
            <div
              key={idx}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                isHandled
                  ? 'bg-muted/50 border-muted opacity-60'
                  : 'bg-background border-border'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${isHandled ? 'line-through text-muted-foreground' : ''}`}>
                  {priority}
                </p>
                {status && (
                  <Badge
                    variant={status === 'done' ? 'default' : status === 'carried' ? 'secondary' : 'outline'}
                    className="mt-2 text-xs"
                  >
                    {status === 'done' && (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Completed
                      </>
                    )}
                    {status === 'carried' && (
                      <>
                        <ArrowRight className="h-3 w-3 mr-1" />
                        Carried over
                      </>
                    )}
                    {status === 'dropped' && (
                      <>
                        <X className="h-3 w-3 mr-1" />
                        Dropped
                      </>
                    )}
                  </Badge>
                )}
              </div>
              {!isHandled && (
                <div className="flex gap-1 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                    onClick={() => handleAction('done', priority, idx)}
                    title="Mark as done"
                  >
                    <Check className="h-4 w-4" />
                    <span className="ml-1 hidden sm:inline">Done</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                    onClick={() => handleAction('carried', priority, idx)}
                    title="Carry over to this week"
                  >
                    <ArrowRight className="h-4 w-4" />
                    <span className="ml-1 hidden sm:inline">Carry Over</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleAction('dropped', priority, idx)}
                    title="Drop this priority"
                  >
                    <X className="h-4 w-4" />
                    <span className="ml-1 hidden sm:inline">Drop</span>
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
