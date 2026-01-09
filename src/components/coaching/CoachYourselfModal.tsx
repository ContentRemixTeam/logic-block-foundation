/**
 * Coach Yourself Modal
 * 
 * Premium self-coaching worksheet (CTFAR-style) that helps users
 * work through task avoidance in 60-90 seconds.
 * 
 * QA Checklist:
 * - [ ] open from task drawer
 * - [ ] open from weekly planner
 * - [ ] save coaching entry
 * - [ ] entry appears in task drawer log + coaching log page
 * - [ ] create tiny task and schedule it
 * - [ ] tiny task appears immediately on weekly timeline and daily planner
 * - [ ] user can only see their own entries (RLS)
 */

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, ChevronRight, ChevronLeft, Calendar as CalendarIcon, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Task } from '@/components/tasks/types';
import { useCoachingMutations, CreateCoachingEntryParams } from '@/hooks/useCoachingEntries';
import { useTaskMutations } from '@/hooks/useTasks';
import { useActiveCycle } from '@/hooks/useActiveCycle';

const FEELING_OPTIONS = [
  'Overwhelmed', 'Anxious', 'Resistant', 'Doubtful', 
  'Annoyed', 'Tired', 'Scared', 'Avoidant', 
  'Confident', 'Calm', 'Focused', 'Other'
];

const REFRAME_SUGGESTIONS = [
  "I don't need confidence first. I start, and confidence follows.",
  "My job is reps. The result comes later.",
  "I can do the next tiny step in 10 minutes.",
];

interface CoachYourselfModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  onTaskSelect?: () => void;
  prefilledCircumstance?: string;
  prefilledThought?: string;
}

export function CoachYourselfModal({ 
  open, 
  onOpenChange, 
  task,
  onTaskSelect,
  prefilledCircumstance,
  prefilledThought,
}: CoachYourselfModalProps) {
  const navigate = useNavigate();
  const { data: activeCycle } = useActiveCycle();
  const { createEntry } = useCoachingMutations();
  const { createTask } = useTaskMutations();

  const [step, setStep] = useState(1);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Form state
  const [circumstance, setCircumstance] = useState('');
  const [thought, setThought] = useState('');
  const [feeling, setFeeling] = useState('');
  const [customFeeling, setCustomFeeling] = useState('');
  const [action, setAction] = useState('');
  const [result, setResult] = useState('');
  const [reframeThought, setReframeThought] = useState('');
  const [tinyNextAction, setTinyNextAction] = useState('');
  const [createTinyTask, setCreateTinyTask] = useState(false);
  const [scheduleTinyTaskAt, setScheduleTinyTaskAt] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState('');

  const totalSteps = 3;

  // Reset form when modal opens/closes or task changes
  useEffect(() => {
    if (open) {
      setStep(1);
      setHasChanges(false);
      
      // Auto-fill circumstance based on prefilled value or task
      if (prefilledCircumstance) {
        setCircumstance(prefilledCircumstance);
      } else if (task) {
        const scheduledInfo = task.time_block_start 
          ? format(new Date(task.time_block_start), "EEEE 'at' h:mm a")
          : task.planned_day 
            ? format(new Date(task.planned_day), 'EEEE, MMM d')
            : task.scheduled_date
              ? format(new Date(task.scheduled_date), 'EEEE, MMM d')
              : 'today';
        
        setCircumstance(`I planned to work on '${task.task_text}' on ${scheduledInfo}.`);
      } else {
        setCircumstance('');
      }
      
      // Use prefilled thought or reset
      setThought(prefilledThought || '');
      
      // Reset other fields
      setFeeling('');
      setCustomFeeling('');
      setAction('');
      setResult('');
      setReframeThought('');
      setTinyNextAction('');
      setCreateTinyTask(false);
      setScheduleTinyTaskAt(undefined);
      setScheduleTime('');
    }
  }, [open, task, prefilledCircumstance, prefilledThought]);

  const handleClose = useCallback(() => {
    if (hasChanges && (circumstance || thought || reframeThought)) {
      setShowExitConfirm(true);
    } else {
      onOpenChange(false);
    }
  }, [hasChanges, circumstance, thought, reframeThought, onOpenChange]);

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    onOpenChange(false);
  };

  const handleFieldChange = useCallback(() => {
    setHasChanges(true);
  }, []);

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // ESC to close (with confirmation if needed)
    if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    }
    // Don't submit on Enter until final step
    if (e.key === 'Enter' && !e.shiftKey && step < totalSteps) {
      e.preventDefault();
    }
  };

  const handleSave = async () => {
    const finalFeeling = feeling === 'Other' ? customFeeling : feeling;
    
    // Build context summary
    const contextSummary = task 
      ? `Planned "${task.task_text}" on ${task.planned_day || task.scheduled_date || 'unscheduled'}`
      : 'General coaching session';

    const params: CreateCoachingEntryParams = {
      task_id: task?.task_id || null,
      cycle_id: activeCycle?.cycle_id || null,
      context_summary: contextSummary,
      circumstance,
      thought,
      feeling: finalFeeling,
      action,
      result,
      reframe_thought: reframeThought,
      tiny_next_action: tinyNextAction || null,
      create_tiny_task: createTinyTask,
      schedule_tiny_task_at: scheduleTinyTaskAt && scheduleTime 
        ? `${format(scheduleTinyTaskAt, 'yyyy-MM-dd')}T${scheduleTime}:00`
        : scheduleTinyTaskAt 
          ? scheduleTinyTaskAt.toISOString()
          : null,
    };

    try {
      await createEntry.mutateAsync(params);

      // Create tiny task if requested
      let createdTinyTask: Task | null = null;
      if (createTinyTask && tinyNextAction.trim()) {
        const tinyTaskParams: any = {
          task_text: tinyNextAction.trim(),
          task_description: task ? `Tiny next action for: ${task.task_text}` : null,
          project_id: task?.project_id || null,
          cycle_id: activeCycle?.cycle_id || null,
          status: 'backlog',
        };

        // Schedule if date/time provided
        if (scheduleTinyTaskAt) {
          tinyTaskParams.planned_day = format(scheduleTinyTaskAt, 'yyyy-MM-dd');
          if (scheduleTime) {
            tinyTaskParams.time_block_start = `${format(scheduleTinyTaskAt, 'yyyy-MM-dd')}T${scheduleTime}:00`;
          }
        }

        createdTinyTask = await createTask.mutateAsync(tinyTaskParams);
      }

      toast.success("Saved. You're back in the driver's seat.", {
        duration: 5000,
        action: createdTinyTask ? {
          label: 'View task',
          onClick: () => navigate('/tasks'),
        } : undefined,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save coaching entry:', error);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setReframeThought(suggestion);
    handleFieldChange();
  };

  const progress = (step / totalSteps) * 100;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent 
          className="max-w-2xl max-h-[90vh] overflow-y-auto p-0"
          onKeyDown={handleKeyDown}
        >
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">Coach Yourself</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Do this when your brain is fighting the task.
                </p>
              </div>
            </div>

            {/* Progress indicator */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Step {step} of {totalSteps}</span>
                <span>{Math.round(progress)}% complete</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          </DialogHeader>

          {/* Task Context (read-only) */}
          {task && (
            <div className="px-6 py-3 bg-muted/30 border-b">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Task: </span>
                  <span className="font-medium">{task.task_text}</span>
                </div>
                {task.planned_day && (
                  <div>
                    <span className="text-muted-foreground">Scheduled: </span>
                    <span>{format(new Date(task.planned_day), 'EEE, MMM d')}</span>
                    {task.time_block_start && (
                      <span className="ml-1">
                        at {format(new Date(task.time_block_start), 'h:mm a')}
                      </span>
                    )}
                  </div>
                )}
                {task.scheduled_date && !task.planned_day && (
                  <div>
                    <span className="text-muted-foreground">Due: </span>
                    <span>{format(new Date(task.scheduled_date), 'EEE, MMM d')}</span>
                  </div>
                )}
                {task.project && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Project: </span>
                    <div 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: task.project.color }} 
                    />
                    <span>{task.project.name}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No task selected - show picker */}
          {!task && onTaskSelect && (
            <div className="px-6 py-4 bg-muted/30 border-b">
              <Button variant="outline" onClick={onTaskSelect} className="w-full">
                Select a task to coach yourself on
              </Button>
            </div>
          )}

          {/* Content */}
          <div className="px-6 py-6 space-y-6">
            {/* Step 1: What's happening? */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div>
                  <h3 className="text-lg font-semibold mb-1">What's happening?</h3>
                  <p className="text-sm text-muted-foreground">
                    Describe the situation objectively — just the facts.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="circumstance">Circumstance</Label>
                  <Textarea
                    id="circumstance"
                    value={circumstance}
                    onChange={(e) => { setCircumstance(e.target.value); handleFieldChange(); }}
                    placeholder="Example: I scheduled this task for today at 2pm and I keep avoiding it."
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
            )}

            {/* Step 2: What is your brain saying? */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div>
                  <h3 className="text-lg font-semibold mb-1">What is your brain saying?</h3>
                  <p className="text-sm text-muted-foreground">
                    Identify the thought and feeling driving the avoidance.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="thought">Thought</Label>
                  <Textarea
                    id="thought"
                    value={thought}
                    onChange={(e) => { setThought(e.target.value); handleFieldChange(); }}
                    placeholder="Example: This won't work / I'm behind / I don't know what to do / This is going to take forever."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feeling">Feeling</Label>
                  <Select value={feeling} onValueChange={(v) => { setFeeling(v); handleFieldChange(); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select how you're feeling" />
                    </SelectTrigger>
                    <SelectContent>
                      {FEELING_OPTIONS.map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {feeling === 'Other' && (
                    <Input
                      value={customFeeling}
                      onChange={(e) => { setCustomFeeling(e.target.value); handleFieldChange(); }}
                      placeholder="Describe your feeling..."
                      className="mt-2"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Step 3: What does that create? + Reframe */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h3 className="text-lg font-semibold mb-1">What does that create?</h3>
                  <p className="text-sm text-muted-foreground">
                    Notice the action and result from this thought pattern.
                  </p>
                </div>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="action">Action (what you do)</Label>
                    <Textarea
                      id="action"
                      value={action}
                      onChange={(e) => { setAction(e.target.value); handleFieldChange(); }}
                      placeholder="Example: I scroll, I reschedule, I do admin instead, I overthink."
                      rows={2}
                      className="resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="result">Result (what happens)</Label>
                    <Textarea
                      id="result"
                      value={result}
                      onChange={(e) => { setResult(e.target.value); handleFieldChange(); }}
                      placeholder="Example: The task stays undone and I feel worse."
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                </div>

                {/* Reframe section */}
                <div className="pt-4 border-t">
                  <h3 className="text-lg font-semibold mb-1">Choose a higher-quality thought</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    What thought would serve you better right now?
                  </p>

                  {/* Quick suggestion chips */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {REFRAME_SUGGESTIONS.map((suggestion, i) => (
                      <Badge
                        key={i}
                        variant={reframeThought === suggestion ? 'default' : 'outline'}
                        className="cursor-pointer hover:bg-primary/10 transition-colors py-1.5 px-3"
                        onClick={() => handleSelectSuggestion(suggestion)}
                      >
                        {suggestion}
                      </Badge>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reframe">Your reframe</Label>
                    <Textarea
                      id="reframe"
                      value={reframeThought}
                      onChange={(e) => { setReframeThought(e.target.value); handleFieldChange(); }}
                      placeholder="Example: I don't need certainty to do the next step."
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                </div>

                {/* Tiny Next Action */}
                <div className="pt-4 border-t">
                  <h3 className="text-lg font-semibold mb-1">Tiny Next Action</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    What's the smallest possible step you could take right now? (Optional)
                  </p>

                  <div className="space-y-3">
                    <Input
                      value={tinyNextAction}
                      onChange={(e) => { setTinyNextAction(e.target.value); handleFieldChange(); }}
                      placeholder="Example: Open the doc and write the first 3 bullet points."
                    />

                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="createTask"
                        checked={createTinyTask}
                        onCheckedChange={(checked) => { 
                          setCreateTinyTask(checked as boolean); 
                          handleFieldChange(); 
                        }}
                      />
                      <Label htmlFor="createTask" className="cursor-pointer">
                        Create this as a task
                      </Label>
                    </div>

                    {createTinyTask && tinyNextAction && (
                      <div className="pl-7 space-y-3 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="gap-2">
                                <CalendarIcon className="h-4 w-4" />
                                {scheduleTinyTaskAt 
                                  ? format(scheduleTinyTaskAt, 'EEE, MMM d')
                                  : 'Schedule for...'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={scheduleTinyTaskAt}
                                onSelect={(date) => { setScheduleTinyTaskAt(date); handleFieldChange(); }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>

                          {scheduleTinyTaskAt && (
                            <Input
                              type="time"
                              value={scheduleTime}
                              onChange={(e) => { setScheduleTime(e.target.value); handleFieldChange(); }}
                              className="w-32"
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={step > 1 ? handlePrev : handleClose}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              {step > 1 ? 'Back' : 'Cancel'}
            </Button>

            {step < totalSteps ? (
              <Button onClick={handleNext} className="gap-2">
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button 
                onClick={handleSave} 
                disabled={createEntry.isPending}
                className="gap-2 bg-gradient-to-r from-primary to-primary/80"
              >
                <Check className="h-4 w-4" />
                {createEntry.isPending ? 'Saving...' : 'Save & Get Back to Work'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Exit confirmation */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to close without saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExit}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
