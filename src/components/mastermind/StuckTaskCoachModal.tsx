import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Battery, MessageCircleQuestion, Loader2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMastermindAI, parseAIJson } from '@/hooks/useMastermindAI';
import { useTaskMutations } from '@/hooks/useTasks';
import { Task } from '@/components/tasks/types';
import { toast } from 'sonner';

interface Props {
  task: Task | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface Suggestion {
  ten_minute_step: string;
  low_energy_version: string;
  support_question: string;
}

export function StuckTaskCoachModal({ task, open, onOpenChange }: Props) {
  const ai = useMastermindAI();
  const { createTask, updateTask } = useTaskMutations();
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [edit, setEdit] = useState<Suggestion | null>(null);

  const run = async () => {
    if (!task) return;
    setSuggestion(null);
    setEdit(null);
    const res = await ai.mutateAsync({
      messages: [
        { role: 'system', content: 'You are a calm productivity coach for an overwhelmed solopreneur. Make tasks tiny and doable. Reply ONLY with JSON: {"ten_minute_step": string, "low_energy_version": string, "support_question": string}. Each field <= 160 chars. Use plain language, no preamble.' },
        { role: 'user', content: `Task: "${task.task_text}"\nPriority: ${task.priority || 'normal'}\nEnergy required: ${task.energy_level || 'unknown'}\nProject: ${task.project?.name || 'none'}\n\nReturn the JSON now.` },
      ],
      temperature: 0.5,
      max_tokens: 500,
    });
    const parsed = parseAIJson<Suggestion>(res.content);
    if (!parsed?.ten_minute_step) {
      toast.error('Could not parse coach response. Try again.');
      return;
    }
    setSuggestion(parsed);
    setEdit(parsed);
  };

  useEffect(() => {
    if (open && task && !suggestion && !ai.isPending) run();
    if (!open) { setSuggestion(null); setEdit(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task?.task_id]);

  if (!task) return null;

  const applyAsReplacement = async () => {
    if (!edit) return;
    await updateTask.mutateAsync({ taskId: task.task_id, updates: { task_text: edit.ten_minute_step } });
    toast.success('Task simplified');
    onOpenChange(false);
  };

  const addLowEnergyTask = async () => {
    if (!edit) return;
    await createTask.mutateAsync({
      task_text: edit.low_energy_version,
      project_id: task.project_id ?? null,
      energy_level: 'low_energy',
      priority: task.priority ?? 'medium',
      status: 'backlog',
    });
    toast.success('Low-energy version added');
  };

  const saveSupportQuestion = async () => {
    if (!edit) return;
    // Save as a brain dump #support note via tasks table? Use ideas? Simplest: copy + create a task tagged for coach prep.
    await createTask.mutateAsync({
      task_text: `Ask coach: ${edit.support_question}`,
      project_id: task.project_id ?? null,
      priority: 'low',
      status: 'backlog',
    });
    toast.success('Support question saved');
  };

  const moveToSomeday = async () => {
    await updateTask.mutateAsync({
      taskId: task.task_id,
      updates: { status: 'someday', scheduled_date: null },
    });
    toast.success('Moved to Someday');
    onOpenChange(false);
  };

  const breakIntoSubtasks = async () => {
    const res = await ai.mutateAsync({
      messages: [
        {
          role: 'system',
          content:
            'You break overwhelming tasks into 2–4 small, doable subtasks. Reply ONLY with JSON: {"subtasks": string[]}. Each subtask <= 80 chars, action-led.',
        },
        { role: 'user', content: `Parent task: "${task.task_text}". Return JSON now.` },
      ],
      temperature: 0.4,
      max_tokens: 400,
    });
    const parsed = parseAIJson<{ subtasks: string[] }>(res.content);
    if (!parsed?.subtasks?.length) {
      toast.error('Could not generate subtasks.');
      return;
    }
    for (const text of parsed.subtasks.slice(0, 4)) {
      await createTask.mutateAsync({
        task_text: text,
        parent_task_id: task.task_id,
        project_id: task.project_id ?? null,
        priority: task.priority ?? 'medium',
        status: 'backlog',
      } as any);
    }
    toast.success(`Added ${parsed.subtasks.length} subtasks`);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Make this easier
          </DialogTitle>
          <DialogDescription className="line-clamp-2">{task.task_text}</DialogDescription>
        </DialogHeader>

        {ai.isPending && !suggestion && (
          <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Coaching…
          </div>
        )}

        {edit && (
          <div className="space-y-4">
            <Field
              icon={<Sparkles className="h-3.5 w-3.5" />}
              label="Next 10-minute step"
              value={edit.ten_minute_step}
              onChange={v => setEdit({ ...edit, ten_minute_step: v })}
            />
            <Field
              icon={<Battery className="h-3.5 w-3.5" />}
              label="Low-energy version"
              value={edit.low_energy_version}
              onChange={v => setEdit({ ...edit, low_energy_version: v })}
            />
            <Field
              icon={<MessageCircleQuestion className="h-3.5 w-3.5" />}
              label="Support question"
              value={edit.support_question}
              onChange={v => setEdit({ ...edit, support_question: v })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
              <Button size="sm" variant="default" onClick={applyAsReplacement} disabled={updateTask.isPending}>
                Use 10-min step
              </Button>
              <Button size="sm" variant="outline" onClick={addLowEnergyTask} disabled={createTask.isPending}>
                Add low-energy task
              </Button>
              <Button size="sm" variant="outline" onClick={saveSupportQuestion} disabled={createTask.isPending}>
                Save support Q
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="flex sm:justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={run} disabled={ai.isPending}>
            <RotateCcw className={cn('h-3.5 w-3.5 mr-1', ai.isPending && 'animate-spin')} /> Regenerate
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ icon, label, value, onChange }: { icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon} {label}
      </div>
      <Textarea value={value} onChange={e => onChange(e.target.value)} rows={2} className="resize-none text-sm" />
    </div>
  );
}
