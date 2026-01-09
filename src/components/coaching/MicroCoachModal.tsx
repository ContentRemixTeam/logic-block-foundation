/**
 * Micro Coach Modal
 * A quick single-question coaching prompt for reschedule loop detection
 */

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Sparkles, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Task } from '@/components/tasks/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActiveCycle } from '@/hooks/useActiveCycle';
import { toast } from 'sonner';
import { CoachYourselfModal } from './CoachYourselfModal';

interface MicroCoachModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
}

const MICRO_QUESTIONS = [
  "What are you afraid will happen if you do this?",
  "What does your brain keep saying about this?",
];

export function MicroCoachModal({ open, onOpenChange, task }: MicroCoachModalProps) {
  const { user } = useAuth();
  const { data: activeCycle } = useActiveCycle();
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  const [showFullCoaching, setShowFullCoaching] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState('');
  
  // Randomly select a question on open
  useEffect(() => {
    if (open) {
      const randomIndex = Math.floor(Math.random() * MICRO_QUESTIONS.length);
      setSelectedQuestion(MICRO_QUESTIONS[randomIndex]);
      setAnswer('');
    }
  }, [open]);

  const generateContextSummary = () => {
    const parts: string[] = [];
    parts.push(`Task: "${task.task_text}"`);
    if (task.planned_day) {
      parts.push(`Scheduled: ${format(new Date(task.planned_day), 'EEEE, MMM d')}`);
    }
    if (task.scheduled_date) {
      parts.push(`Due: ${format(new Date(task.scheduled_date), 'MMM d')}`);
    }
    if (task.project?.name) {
      parts.push(`Project: ${task.project.name}`);
    }
    return parts.join(' • ');
  };

  const handleSave = async () => {
    if (!user || !answer.trim()) return;
    
    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Not authenticated');

      // Create a coaching entry with the micro prompt answer
      const { error } = await supabase
        .from('coaching_entries')
        .insert({
          user_id: user.id,
          task_id: task.task_id,
          cycle_id: activeCycle?.cycle_id || null,
          context_summary: generateContextSummary(),
          circumstance: `I keep rescheduling "${task.task_text}"`,
          thought: answer.trim(),
          // Other fields remain null for micro entries
        });

      if (error) throw error;

      onOpenChange(false);
      toast.success('Saved. Want to take the next tiny step?', {
        duration: 5000,
        action: {
          label: 'Open full thought work',
          onClick: () => setShowFullCoaching(true),
        },
      });
    } catch (error) {
      console.error('Failed to save micro coaching:', error);
      toast.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenFullCoaching = () => {
    onOpenChange(false);
    setShowFullCoaching(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Only close on escape if there's no text
    if (e.key === 'Escape' && answer.trim()) {
      e.preventDefault();
      const confirmed = window.confirm('You have unsaved text. Close anyway?');
      if (confirmed) {
        onOpenChange(false);
      }
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="sm:max-w-lg"
          onKeyDown={handleKeyDown}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Quick check
            </DialogTitle>
            <DialogDescription>
              Let's make this easier.
            </DialogDescription>
          </DialogHeader>

          {/* Context */}
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
            {generateContextSummary()}
          </div>

          {/* Question */}
          <div className="space-y-3">
            <Label className="text-base font-medium">
              {selectedQuestion}
            </Label>
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your honest answer here..."
              className="min-h-[100px] resize-none"
              autoFocus
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              onClick={handleSave}
              disabled={!answer.trim() || saving}
              className="flex-1"
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              variant="outline"
              onClick={handleOpenFullCoaching}
              className="flex-1 gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              Open full thought work
            </Button>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Not now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full coaching modal */}
      <CoachYourselfModal
        open={showFullCoaching}
        onOpenChange={setShowFullCoaching}
        task={task}
        prefilledCircumstance={`I keep rescheduling "${task.task_text}"`}
        prefilledThought={answer}
      />
    </>
  );
}
