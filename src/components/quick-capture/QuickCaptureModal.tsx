import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/use-mobile';
import { Zap, ListTodo, Lightbulb, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  CaptureType,
  detectCaptureType,
  cleanIdeaInput,
  parseTaskInput,
  ParsedTask,
} from './useCaptureTypeDetection';

interface QuickCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickCaptureModal({ open, onOpenChange }: QuickCaptureModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);

  const [input, setInput] = useState('');
  const [captureType, setCaptureType] = useState<CaptureType>('task');
  const [parsedTask, setParsedTask] = useState<ParsedTask | null>(null);
  const [saving, setSaving] = useState(false);

  // Auto-detect type and parse input
  useEffect(() => {
    const detected = detectCaptureType(input);
    setCaptureType(detected);

    if (detected === 'task' && input.trim()) {
      setParsedTask(parseTaskInput(input));
    } else {
      setParsedTask(null);
    }
  }, [input]);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      // Reset state when closing
      setInput('');
      setCaptureType('task');
      setParsedTask(null);
    }
  }, [open]);

  const handleSave = async () => {
    if (!input.trim()) return;

    if (!user) {
      toast({
        title: 'Not logged in',
        description: 'Please log in to capture tasks and ideas',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      if (captureType === 'idea') {
        // Save as idea
        const ideaContent = cleanIdeaInput(input);
        const { error } = await supabase.functions.invoke('save-idea', {
          body: { content: ideaContent },
        });
        if (error) throw error;

        toast({ title: '💡 Idea saved!' });
        queryClient.invalidateQueries({ queryKey: ['ideas'] });
      } else {
        // Save as task
        const parsed = parseTaskInput(input);
        const { error } = await supabase.functions.invoke('manage-task', {
          body: {
            action: 'create',
            task_text: parsed.text,
            scheduled_date: parsed.date ? format(parsed.date, 'yyyy-MM-dd') : null,
            priority: parsed.priority || null,
            estimated_minutes: parsed.duration || null,
            context_tags: parsed.tags.length > 0 ? parsed.tags : null,
            status: 'backlog',
          },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (error) throw error;

        toast({ title: '✅ Task saved!' });
        queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  const toggleCaptureType = (type: CaptureType) => {
    setCaptureType(type);
    // Update input if switching to idea and no prefix exists
    if (type === 'idea' && !input.toLowerCase().startsWith('#idea') && !input.toLowerCase().startsWith('idea:')) {
      // Don't modify input, just set the type
    }
  };

  // Content for both mobile and desktop
  const modalContent = (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Quick Capture</h2>
        <Badge variant="outline" className="ml-auto text-xs">
          ⌘K
        </Badge>
      </div>

      {/* Not logged in state */}
      {!user && (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <LogIn className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground text-center">
            Log in to capture tasks and ideas
          </p>
          <Button onClick={() => window.location.href = '/auth'}>
            Go to Login
          </Button>
        </div>
      )}

      {/* Logged in content */}
      {user && (
        <>
          {/* Type selector chips */}
          <div className="flex gap-2">
            <Button
              variant={captureType === 'task' ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleCaptureType('task')}
              className="gap-1"
            >
              <ListTodo className="h-4 w-4" />
              Task
            </Button>
            <Button
              variant={captureType === 'idea' ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleCaptureType('idea')}
              className="gap-1"
            >
              <Lightbulb className="h-4 w-4" />
              Idea
            </Button>
          </div>

          {/* Input field */}
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              captureType === 'task'
                ? "Call client tomorrow 2pm 30m !high #sales"
                : "Start with #idea or idea: for ideas..."
            }
            className="text-base h-12"
            autoComplete="off"
          />

          {/* Parsed preview for tasks */}
          {captureType === 'task' && parsedTask && input.trim() && (
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="text-sm font-medium">
                {parsedTask.text || '(enter task name)'}
              </div>
              <div className="flex flex-wrap gap-2">
                {parsedTask.date && (
                  <Badge variant="secondary" className="text-xs">
                    📅 {parsedTask.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Badge>
                )}
                {parsedTask.time && (
                  <Badge variant="secondary" className="text-xs">
                    🕐 {parsedTask.time}
                  </Badge>
                )}
                {parsedTask.duration && (
                  <Badge variant="secondary" className="text-xs">
                    ⏱️ {parsedTask.duration >= 60 ? `${parsedTask.duration / 60}h` : `${parsedTask.duration}m`}
                  </Badge>
                )}
                {parsedTask.priority && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      parsedTask.priority === 'high' && "border-destructive text-destructive",
                      parsedTask.priority === 'medium' && "border-yellow-500 text-yellow-600",
                      parsedTask.priority === 'low' && "border-muted-foreground"
                    )}
                  >
                    !{parsedTask.priority}
                  </Badge>
                )}
                {parsedTask.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Idea preview */}
          {captureType === 'idea' && input.trim() && (
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                {cleanIdeaInput(input) || '(enter your idea)'}
              </div>
            </div>
          )}

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={!input.trim() || saving}
            className="w-full h-12"
          >
            {saving ? 'Saving...' : `Save ${captureType === 'task' ? 'Task' : 'Idea'}`}
          </Button>

          {/* Hint text */}
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> to save • <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Esc</kbd> to close
          </p>
        </>
      )}
    </div>
  );

  // Use Drawer on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="px-4 pb-8 pt-4">
          {modalContent}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {modalContent}
      </DialogContent>
    </Dialog>
  );
}
