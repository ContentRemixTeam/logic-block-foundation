import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Sparkles, ChevronRight, SkipForward, Trash2 } from 'lucide-react';
import { MomentumChip } from './MomentumChip';
import { MOMENTUM_TYPES, type MomentumType } from '@/lib/momentumTypes';
import { useTaskMutations } from '@/hooks/useTasks';
import type { Task } from './types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ConnectTasksSweepModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** All currently loaded tasks; the modal filters to unconnected ones. */
  tasks: Task[];
  /** Active 90-day goal text shown for context. */
  activeGoal?: string | null;
  /** Active cycle id — when set, "Connect to goal" tags `cycle_id`. */
  activeCycleId?: string | null;
}

const BATCH_SIZE = 10;

interface PendingChange {
  momentum_type?: MomentumType | null;
  is_maintenance?: boolean;
  connectToGoal?: boolean;
  action?: 'skip' | 'delete' | 'someday';
}

/**
 * One-time guided sweep: walk through unconnected tasks in batches and
 * tag them with momentum_type / connect to active goal / mark maintenance / skip.
 *
 * Sets `connection_swept_at = now()` for any task you act on (including Skip),
 * so the same task isn't re-prompted next time.
 */
export function ConnectTasksSweepModal({
  open,
  onOpenChange,
  tasks,
  activeGoal,
  activeCycleId,
}: ConnectTasksSweepModalProps) {
  const { updateTask, deleteTask } = useTaskMutations();
  const [batchIndex, setBatchIndex] = useState(0);
  const [pending, setPending] = useState<Record<string, PendingChange>>({});
  const [saving, setSaving] = useState(false);

  // Snapshot of unconnected tasks at modal open time so the queue is stable
  const [queue, setQueue] = useState<Task[]>([]);

  useEffect(() => {
    if (open) {
      const list = tasks.filter(
        (t) =>
          !t.is_completed &&
          !t.momentum_type &&
          !t.goal_id &&
          !t.connection_swept_at &&
          !(activeCycleId && t.cycle_id === activeCycleId),
      );
      setQueue(list);
      setBatchIndex(0);
      setPending({});
    }
  }, [open, tasks, activeCycleId]);

  const totalBatches = Math.max(1, Math.ceil(queue.length / BATCH_SIZE));
  const start = batchIndex * BATCH_SIZE;
  const currentBatch = queue.slice(start, start + BATCH_SIZE);
  const isLast = batchIndex >= totalBatches - 1;

  const setChange = (taskId: string, patch: Partial<PendingChange>) => {
    setPending((p) => ({ ...p, [taskId]: { ...p[taskId], ...patch } }));
  };

  const applyBatch = async () => {
    if (currentBatch.length === 0) return;
    setSaving(true);
    const now = new Date().toISOString();
    let touched = 0;
    try {
      for (const task of currentBatch) {
        const change = pending[task.task_id] ?? {};
        if (change.action === 'delete') {
          await deleteTask.mutateAsync({ taskId: task.task_id, deleteType: 'single' });
          touched++;
          continue;
        }
        const updates: Partial<Task> = {
          connection_swept_at: now,
        };
        if (change.action === 'someday') {
          updates.status = 'someday';
        }
        if (change.momentum_type !== undefined) {
          updates.momentum_type = change.momentum_type;
        }
        if (change.is_maintenance !== undefined) {
          updates.is_maintenance = change.is_maintenance;
        }
        if (change.connectToGoal && activeCycleId) {
          updates.cycle_id = activeCycleId;
        }
        await updateTask.mutateAsync({ taskId: task.task_id, updates });
        touched++;
      }
      toast.success(`Swept ${touched} task${touched === 1 ? '' : 's'}`);
      setPending({});
      if (isLast) {
        onOpenChange(false);
      } else {
        setBatchIndex((i) => i + 1);
      }
    } catch (err) {
      console.error('Sweep failed', err);
      toast.error('Some changes failed to save');
    } finally {
      setSaving(false);
    }
  };

  const skipBatch = () => {
    if (isLast) {
      onOpenChange(false);
    } else {
      setPending({});
      setBatchIndex((i) => i + 1);
    }
  };

  const progress = queue.length === 0 ? 100 : Math.round(((start + currentBatch.length) / queue.length) * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-warning" />
            Connect your tasks to what matters
          </DialogTitle>
          <DialogDescription>
            {activeGoal ? (
              <>
                Your 90-day goal: <span className="font-medium text-foreground">{activeGoal}</span>.
                Tag each task with how it actually moves the business.
              </>
            ) : (
              <>Tag each task with how it actually moves the business.</>
            )}
          </DialogDescription>
        </DialogHeader>

        {queue.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <div className="text-3xl">✨</div>
            <p className="text-sm text-muted-foreground">
              Every task is already connected. You're clear.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                Batch {batchIndex + 1} of {totalBatches} · {queue.length} unconnected total
              </span>
              <Progress value={progress} className="h-1 flex-1" />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1 my-2">
              {currentBatch.map((task) => {
                const change = pending[task.task_id] ?? {};
                const isDeleted = change.action === 'delete';
                const isSomeday = change.action === 'someday';
                return (
                  <div
                    key={task.task_id}
                    className={cn(
                      'rounded-lg border p-3 space-y-2 transition-opacity',
                      isDeleted && 'opacity-50 line-through',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <p className="flex-1 text-sm leading-snug">{task.task_text}</p>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant={isSomeday ? 'secondary' : 'ghost'}
                          className="h-7 text-xs"
                          onClick={() =>
                            setChange(task.task_id, {
                              action: isSomeday ? undefined : 'someday',
                            })
                          }
                        >
                          Someday
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            setChange(task.task_id, {
                              action: isDeleted ? undefined : 'delete',
                            })
                          }
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {!isDeleted && (
                      <div className="flex flex-wrap items-center gap-2">
                        {MOMENTUM_TYPES.map((m) => {
                          const selected = change.momentum_type === m.value;
                          return (
                            <button
                              key={m.value}
                              type="button"
                              onClick={() =>
                                setChange(task.task_id, {
                                  momentum_type: selected ? null : m.value,
                                })
                              }
                              className={cn(
                                'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs transition-colors',
                                selected
                                  ? m.badgeClass
                                  : 'border-dashed border-border text-muted-foreground hover:bg-muted/50',
                              )}
                              title={m.description}
                            >
                              <span aria-hidden>{m.emoji}</span>
                              <span>{m.label}</span>
                            </button>
                          );
                        })}

                        <label className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Switch
                            checked={!!change.is_maintenance}
                            onCheckedChange={(v) =>
                              setChange(task.task_id, { is_maintenance: v })
                            }
                          />
                          Maintenance
                        </label>

                        {activeCycleId && (
                          <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Switch
                              checked={!!change.connectToGoal}
                              onCheckedChange={(v) =>
                                setChange(task.task_id, { connectToGoal: v })
                              }
                            />
                            Goal
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            onClick={skipBatch}
            disabled={saving || queue.length === 0}
          >
            <SkipForward className="h-4 w-4 mr-1.5" />
            Skip batch
          </Button>
          <Button
            onClick={applyBatch}
            disabled={saving || currentBatch.length === 0}
          >
            {isLast ? 'Save & finish' : 'Save & next'}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
