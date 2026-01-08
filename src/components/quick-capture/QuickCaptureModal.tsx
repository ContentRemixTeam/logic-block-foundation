import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/use-mobile';
import { Zap, ListTodo, Lightbulb, LogIn, Calendar, Plus } from 'lucide-react';
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
  onReopenCapture?: () => void;
}

export function QuickCaptureModal({ open, onOpenChange, onReopenCapture }: QuickCaptureModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);

  const [input, setInput] = useState('');
  const [captureType, setCaptureType] = useState<CaptureType>('task');
  const [parsedTask, setParsedTask] = useState<ParsedTask | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastCaptureType, setLastCaptureType] = useState<CaptureType>('task');

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
      // Preserve last mode when reopening
      setCaptureType(lastCaptureType);
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      // Reset input but preserve mode
      setInput('');
      setParsedTask(null);
    }
  }, [open, lastCaptureType]);

  const truncateText = (text: string, maxLength: number = 40) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleAddAnother = () => {
    // Reopen the modal with preserved mode
    if (onReopenCapture) {
      onReopenCapture();
    }
  };

  const handlePlanForWeek = (id: string, type: CaptureType) => {
    if (type === 'task') {
      navigate(`/weekly-plan?highlightTask=${id}`);
    } else {
      navigate(`/ideas?highlightIdea=${id}`);
    }
  };

  const showActionableToast = (
    savedText: string, 
    savedId: string, 
    savedType: CaptureType
  ) => {
    const truncated = truncateText(savedText);
    
    toast.success(
      <div className="flex flex-col gap-1">
        <span className="font-medium">
          {savedType === 'task' ? '✅ Task saved' : '💡 Idea saved'}
        </span>
        <span className="text-sm text-muted-foreground">{truncated}</span>
      </div>,
      {
        duration: 5000,
        action: {
          label: (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Plan this week
            </span>
          ),
          onClick: () => handlePlanForWeek(savedId, savedType),
        },
        cancel: {
          label: (
            <span className="flex items-center gap-1">
              <Plus className="h-3 w-3" />
              Add another
            </span>
          ),
          onClick: handleAddAnother,
        },
      }
    );
  };

  const handleSave = async () => {
    if (!input.trim()) return;

    if (!user) {
      toast.error('Not logged in', {
        description: 'Please log in to capture tasks and ideas',
      });
      return;
    }

    setSaving(true);
    const savedInput = input;
    const savedType = captureType;
    setLastCaptureType(captureType);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      let savedId = '';
      let savedText = '';

      if (captureType === 'idea') {
        // Save as idea
        const ideaContent = cleanIdeaInput(input);
        savedText = ideaContent;
        
        const { data, error } = await supabase.functions.invoke('save-idea', {
          body: { content: ideaContent },
        });
        if (error) throw error;
        
        savedId = data?.idea?.id || '';
        queryClient.invalidateQueries({ queryKey: ['ideas'] });
      } else {
        // Save as task
        const parsed = parseTaskInput(input);
        savedText = parsed.text;
        
        const { data, error } = await supabase.functions.invoke('manage-task', {
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
        
        savedId = data?.data?.task_id || '';
        queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      }

      onOpenChange(false);
      
      // Show actionable toast after modal closes
      setTimeout(() => {
        showActionableToast(savedText, savedId, savedType);
      }, 100);

    } catch (error: any) {
      console.error('Error saving:', error);
      toast.error('Error', {
        description: error.message || 'Failed to save',
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
    setLastCaptureType(type);
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
