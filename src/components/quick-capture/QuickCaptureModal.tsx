import { useState, useEffect, useRef, useCallback } from 'react';
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
import { useTaskMutations } from '@/hooks/useTasks';
import { Zap, ListTodo, Lightbulb, LogIn, Calendar, Plus, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  CaptureType,
  detectCaptureTypeWithConfidence,
  cleanIdeaInput,
  parseTaskInput,
  ParsedTask,
} from './useCaptureTypeDetection';
import { useSpeechDictation } from './useSpeechDictation';
import { EditableChips } from './EditableChips';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface QuickCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReopenCapture?: () => void;
  stayOpenAfterSave?: boolean;
}

export function QuickCaptureModal({ open, onOpenChange, onReopenCapture, stayOpenAfterSave = false }: QuickCaptureModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);
  const { createTask } = useTaskMutations();

  const [input, setInput] = useState('');
  const [captureType, setCaptureType] = useState<CaptureType>('task');
  const [parsedTask, setParsedTask] = useState<ParsedTask | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastCaptureType, setLastCaptureType] = useState<CaptureType>('task');
  const [showConvertChips, setShowConvertChips] = useState(false);
  const [userOverrodeType, setUserOverrodeType] = useState(false);

  // Speech dictation
  const {
    isSupported: speechSupported,
    isListening,
    interimText,
    finalText,
    error: speechError,
    start: startListening,
    stop: stopListening,
    reset: resetSpeech,
  } = useSpeechDictation();

  // Handle speech dictation results
  useEffect(() => {
    if (finalText) {
      setInput(prev => prev + finalText);
      setShowConvertChips(true);
      setUserOverrodeType(false);
      resetSpeech();
    }
  }, [finalText, resetSpeech]);

  // Show error toast for speech
  useEffect(() => {
    if (speechError) {
      toast.error('Voice capture failed', {
        description: speechError,
      });
    }
  }, [speechError]);

  // Auto-detect type and parse input (only if user hasn't manually overridden)
  useEffect(() => {
    if (!userOverrodeType) {
      const detection = detectCaptureTypeWithConfidence(input);
      setCaptureType(detection.suggestedType);
    }

    // Only auto-parse if we don't already have a parsed task with edits
    if (captureType === 'task' && input.trim()) {
      // Parse the input but preserve any user edits to chips
      const newParsed = parseTaskInput(input);
      setParsedTask(prev => {
        // If no previous state or text changed significantly, use new parse
        if (!prev || prev.text !== newParsed.text) {
          return newParsed;
        }
        // Otherwise keep the existing state (user may have edited chips)
        return prev;
      });
    } else {
      setParsedTask(null);
    }
  }, [input, userOverrodeType, captureType]);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      // Preserve last mode when reopening
      setCaptureType(lastCaptureType);
      setUserOverrodeType(false);
      setShowConvertChips(false);
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      // Reset input but preserve mode
      setInput('');
      setParsedTask(null);
      setShowConvertChips(false);
      setUserOverrodeType(false);
      if (isListening) {
        stopListening();
      }
    }
  }, [open, lastCaptureType, isListening, stopListening]);

  // Handle paste to show convert chips
  const handlePaste = useCallback(() => {
    setShowConvertChips(true);
    setUserOverrodeType(false);
  }, []);

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

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
        // Save as task using unified hook - use parsedTask (edited chips) as source of truth
        const taskData = parsedTask || parseTaskInput(input);
        savedText = taskData.text;
        
        const createdTask = await createTask.mutateAsync({
          task_text: taskData.text,
          scheduled_date: taskData.date ? format(taskData.date, 'yyyy-MM-dd') : null,
          priority: taskData.priority || null,
          estimated_minutes: taskData.duration || null,
          context_tags: taskData.tags.length > 0 ? taskData.tags : null,
          project_id: taskData.projectId || null,
          status: 'backlog',
        });
        
        savedId = createdTask?.task_id || '';
      }

      // Handle stay-open mode vs close mode
      if (stayOpenAfterSave) {
        // Stay open: clear input, keep mode, refocus
        setInput('');
        setParsedTask(null);
        setShowConvertChips(false);
        setUserOverrodeType(false);
        
        // Show a quick inline toast
        toast.success(savedType === 'task' ? '✅ Task saved' : '💡 Idea saved', {
          duration: 2000,
        });
        
        // Refocus input after a short delay
        setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
      } else {
        // Close modal and show actionable toast
        onOpenChange(false);
        
        setTimeout(() => {
          showActionableToast(savedText, savedId, savedType);
        }, 100);
      }

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

  const toggleCaptureType = (type: CaptureType, isUserOverride: boolean = false) => {
    setCaptureType(type);
    setLastCaptureType(type);
    if (isUserOverride) {
      setUserOverrodeType(true);
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
              onClick={() => toggleCaptureType('task', true)}
              className="gap-1"
            >
              <ListTodo className="h-4 w-4" />
              Task
            </Button>
            <Button
              variant={captureType === 'idea' ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleCaptureType('idea', true)}
              className="gap-1"
            >
              <Lightbulb className="h-4 w-4" />
              Idea
            </Button>
          </div>

          {/* Input field with mic button */}
          <div className="relative">
            <Input
              ref={inputRef}
              value={isListening ? input + interimText : input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={
                isListening 
                  ? "Listening..."
                  : captureType === 'task'
                    ? "Call client tomorrow 2pm 30m !high #sales"
                    : "Start with #idea or idea: for ideas..."
              }
              className={cn(
                "text-base h-12 pr-12",
                isListening && "border-primary ring-2 ring-primary/20"
              )}
              autoComplete="off"
              disabled={isListening}
            />
            
            {/* Mic button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleMicClick}
                    disabled={!speechSupported}
                    className={cn(
                      "absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10",
                      isListening && "text-primary animate-pulse"
                    )}
                  >
                    {isListening ? (
                      <MicOff className="h-5 w-5" />
                    ) : (
                      <Mic className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {!speechSupported 
                    ? "Voice capture isn't supported in this browser"
                    : isListening 
                      ? "Stop listening" 
                      : "Start voice capture"
                  }
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Listening indicator */}
          {isListening && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
              Listening... Tap mic or speak to finish
            </div>
          )}

          {/* Convert chips - shown after dictation or paste */}
          {showConvertChips && input.trim() && !isListening && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Detected as:</span>
              <Button
                variant={captureType === 'task' ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleCaptureType('task', true)}
                className="h-9 gap-1"
              >
                <ListTodo className="h-4 w-4" />
                Convert to Task
              </Button>
              <Button
                variant={captureType === 'idea' ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleCaptureType('idea', true)}
                className="h-9 gap-1"
              >
                <Lightbulb className="h-4 w-4" />
                Convert to Idea
              </Button>
            </div>
          )}

          {/* Editable chips for tasks */}
          {captureType === 'task' && parsedTask && input.trim() && (
            <div className="p-3 rounded-lg bg-muted/50 space-y-3">
              <div className="text-sm font-medium">
                {parsedTask.text || '(enter task name)'}
              </div>
              <EditableChips
                parsedTask={parsedTask}
                onUpdate={(updates) => {
                  setParsedTask(prev => prev ? { ...prev, ...updates } : prev);
                }}
              />
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
