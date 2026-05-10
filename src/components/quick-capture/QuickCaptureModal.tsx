import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ScrollIndicator } from '@/components/ui/scroll-indicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTaskMutations } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { Zap, ListTodo, Lightbulb, LogIn, Calendar, Plus, Mic, MicOff, FolderKanban, Clock, Hash, X, FileText, Tag, Check, Loader2, StickyNote, Battery, BatteryMedium } from 'lucide-react';
import { routeForLine } from '@/lib/captureTags';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { getStorageItem, setStorageItem } from '@/lib/storage';

 // Draft persistence key
 const QUICK_CAPTURE_DRAFT_KEY = 'quick-capture-draft';

import {
  CaptureType,
  detectCaptureTypeWithConfidence,
  cleanIdeaInput,
  parseTaskInput,
  ParsedTask,
} from './useCaptureTypeDetection';
import { useSpeechDictation } from './useSpeechDictation';
import { EditableChips } from './EditableChips';
import { QuickChips } from './QuickChips';
import { IdeaQuickChips } from './IdeaQuickChips';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ContentSaveModal } from '@/components/content/ContentSaveModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface QuickCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReopenCapture?: () => void;
  stayOpenAfterSave?: boolean;
}

interface IdeaData {
  categoryId: string | null;
  priority: string | null;
  tags: string[];
  projectId: string | null;
}

interface IdeaCategory {
  id: string;
  name: string;
  color: string;
}



const PRIORITY_OPTIONS = [
  { value: 'asap', label: 'ASAP' },
  { value: 'next_week', label: 'Next Week' },
  { value: 'next_month', label: 'Next Month' },
  { value: 'someday', label: 'Someday' },
];

// Helper for haptic feedback
const triggerHaptic = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
};

export function QuickCaptureModal({ open, onOpenChange, onReopenCapture, stayOpenAfterSave = false }: QuickCaptureModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);
  const { createTask } = useTaskMutations();
  const { data: projects = [] } = useProjects();

  const [input, setInput] = useState('');
  const [captureType, setCaptureType] = useState<CaptureType>('task');
  const [parsedTask, setParsedTask] = useState<ParsedTask | null>(null);
  const [ideaData, setIdeaData] = useState<IdeaData>({ categoryId: null, priority: null, tags: [], projectId: null });
  const [saving, setSaving] = useState(false);
  const [ideaCategories, setIdeaCategories] = useState<IdeaCategory[]>([]);
  const [lastCaptureType, setLastCaptureType] = useState<CaptureType>('task');
  const [showConvertChips, setShowConvertChips] = useState(false);
  const [userOverrodeType, setUserOverrodeType] = useState(false);
  const [newIdeaTag, setNewIdeaTag] = useState('');
  const [contentModalOpen, setContentModalOpen] = useState(false);

  // Burst mode state for rapid adding
  const [burstModeActive, setBurstModeActive] = useState(false);
  const [savedThisSession, setSavedThisSession] = useState(0);
  const [justSaved, setJustSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Recent tags and projects from localStorage
  const [recentTags, setRecentTags] = useState<string[]>(() => {
    const stored = getStorageItem('quick-capture-recent-tags');
    return stored ? JSON.parse(stored) : [];
  });
  const [recentProjectIds, setRecentProjectIds] = useState<string[]>(() => {
    const stored = getStorageItem('quick-capture-recent-projects');
    return stored ? JSON.parse(stored) : [];
  });

  // Recent projects with full data
  const recentProjects = projects.filter(p => recentProjectIds.includes(p.id) && !p.is_template);

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

  // Fetch idea categories
  useEffect(() => {
    const fetchCategories = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase.functions.invoke('get-ideas', {});
        if (!error && data?.categories) {
          setIdeaCategories(data.categories);
        }
      } catch (err) {
        console.error('Failed to fetch idea categories:', err);
      }
    };
    if (open && user) {
      fetchCategories();
    }
  }, [open, user]);



  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      // Preserve last mode when reopening
      setCaptureType(lastCaptureType);
      setUserOverrodeType(false);
      setShowConvertChips(false);
      setSavedThisSession(0);
      setBurstModeActive(false);
      setJustSaved(false);
      

      // Restore draft if exists
      try {
        const savedDraft = localStorage.getItem(QUICK_CAPTURE_DRAFT_KEY);
        if (savedDraft) {
          const draft = JSON.parse(savedDraft);
          // Only restore if less than 24 hours old
          if (Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) {
            if (draft.input) {
              setInput(draft.input);
              toast.info('Restored unsaved draft', { duration: 2000 });
            }
            if (draft.captureType) {
              setCaptureType(draft.captureType);
              setLastCaptureType(draft.captureType);
              setUserOverrodeType(true);
            }
          } else {
            // Draft too old, remove it
            localStorage.removeItem(QUICK_CAPTURE_DRAFT_KEY);
          }
        }
      } catch (e) {
        console.error('Failed to restore draft:', e);
      }
      
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        if (isMobile && textareaRef.current) {
          textareaRef.current.focus();
        } else if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    } else {
      // Reset input but preserve mode
      setInput('');
      setParsedTask(null);
      setIdeaData({ categoryId: null, priority: null, tags: [], projectId: null });
      setNewIdeaTag('');
      setShowConvertChips(false);
      setUserOverrodeType(false);
      setSavedThisSession(0);
      setBurstModeActive(false);
      setJustSaved(false);
      if (isListening) {
        stopListening();
      }
      // Clear draft save timeout
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
      }
    }
  }, [open, lastCaptureType, isListening, stopListening, isMobile]);

  // Auto-save draft as user types (debounced)
  useEffect(() => {
    if (!open) return;
    
    // Clear any pending save
    if (draftSaveTimeoutRef.current) {
      clearTimeout(draftSaveTimeoutRef.current);
    }
    
    // Don't save empty input
    if (!input.trim()) {
      localStorage.removeItem(QUICK_CAPTURE_DRAFT_KEY);
      return;
    }
    
    // Debounce save to localStorage
    draftSaveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(QUICK_CAPTURE_DRAFT_KEY, JSON.stringify({
          input,
          captureType,
          timestamp: Date.now(),
        }));
      } catch (e) {
        console.error('Failed to save draft:', e);
      }
    }, 500);
    
    return () => {
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
      }
    };
  }, [open, input, captureType]);

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
    const title = savedType === 'task' ? '✅ Task saved' : '💡 Idea saved';
    
    toast.success(title, {
      description: truncated,
      duration: 5000,
      action: {
        label: '📅 Plan this week',
        onClick: () => handlePlanForWeek(savedId, savedType),
      },
      cancel: {
        label: '➕ Add another',
        onClick: handleAddAnother,
      },
    });
  };

  const handleAddIdeaTag = () => {
    if (newIdeaTag.trim() && !ideaData.tags.includes(newIdeaTag.trim())) {
      setIdeaData(prev => ({ ...prev, tags: [...prev.tags, newIdeaTag.trim()] }));
      setNewIdeaTag('');
    }
  };

  const handleRemoveIdeaTag = (tag: string) => {
    setIdeaData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  // Update recents after save
  const updateRecents = (tags: string[], projectId?: string) => {
    if (tags.length) {
      const updated = [...new Set([...tags, ...recentTags])].slice(0, 10);
      setRecentTags(updated);
      setStorageItem('quick-capture-recent-tags', JSON.stringify(updated));
    }
    if (projectId) {
      const updated = [projectId, ...recentProjectIds.filter(id => id !== projectId)].slice(0, 5);
      setRecentProjectIds(updated);
      setStorageItem('quick-capture-recent-projects', JSON.stringify(updated));
    }
  };

  // Save a single line according to its tag-routed destination.
  // Returns true if saved successfully.
  const saveLineByRouting = async (line: string): Promise<{ ok: boolean; type: CaptureType; text: string; tags: string[]; projectId?: string | null; error?: string }> => {
    const routed = routeForLine(line, 'note');
    const dest = routed.destination; // 'task' | 'idea' | 'note' | 'project'

    try {
      if (dest === 'task') {
        const taskParsed = parseTaskInput(routed.cleanedText);
        await createTask.mutateAsync({
          task_text: taskParsed.text || routed.cleanedText,
          scheduled_date: taskParsed.date ? format(taskParsed.date, 'yyyy-MM-dd') : null,
          priority: taskParsed.priority || null,
          estimated_minutes: taskParsed.duration || null,
          context_tags: taskParsed.tags.length > 0 ? taskParsed.tags : null,
          project_id: taskParsed.projectId || null,
          energy_level: taskParsed.energy_level || null,
          status: 'backlog',
        });
        return { ok: true, type: 'task', text: taskParsed.text, tags: taskParsed.tags, projectId: taskParsed.projectId };
      }

      if (dest === 'idea' || dest === 'project') {
        const content = routed.cleanedText;
        const { error } = await supabase.functions.invoke('save-idea', {
          body: {
            content,
            tags: routed.modifiers.length > 0 ? routed.modifiers : (dest === 'project' ? ['project'] : null),
          },
        });
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['ideas'] });
        return { ok: true, type: dest as CaptureType, text: content, tags: routed.modifiers };
      }

      // note (default)
      const { error } = await supabase.from('journal_pages').insert({
        user_id: user!.id,
        title: routed.cleanedText.slice(0, 80) || 'Untitled note',
        content: routed.cleanedText,
        page_type: 'note',
      } as any);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['journal-pages'] });
      return { ok: true, type: 'note', text: routed.cleanedText, tags: routed.modifiers };
    } catch (err: any) {
      return { ok: false, type: dest as CaptureType, text: routed.cleanedText, tags: [], error: err?.message || 'Save failed' };
    }
  };

  // Multi-line capture: routes each line by tag.
  const handleMultiLineSave = async (lines: string[]) => {
    let savedCount = 0;
    const errors: string[] = [];
    const allTags: string[] = [];
    let lastProjectId: string | null | undefined;

    for (const line of lines) {
      const res = await saveLineByRouting(line);
      if (res.ok) {
        savedCount++;
        allTags.push(...res.tags);
        if (res.projectId) lastProjectId = res.projectId;
      } else {
        errors.push(`"${line.slice(0, 24)}…": ${res.error}`);
      }
    }

    if (errors.length > 0) {
      toast.error(`Failed to save ${errors.length} item(s)`, {
        description: errors.slice(0, 2).join('\n'),
        duration: 5000,
      });
    }

    if (savedCount > 0) {
      if (isMobile) triggerHaptic();
      setSavedThisSession(prev => prev + savedCount);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 500);
      toast.success(`✅ Saved ${savedCount} item${savedCount > 1 ? 's' : ''}`, { duration: 1500 });
      updateRecents(allTags, lastProjectId || undefined);

      if (stayOpenAfterSave || burstModeActive) {
        setInput('');
        setParsedTask(null);
        localStorage.removeItem(QUICK_CAPTURE_DRAFT_KEY);
        setTimeout(() => {
          if (isMobile && textareaRef.current) textareaRef.current.focus();
          else if (inputRef.current) inputRef.current.focus();
        }, 50);
      } else {
        localStorage.removeItem(QUICK_CAPTURE_DRAFT_KEY);
        onOpenChange(false);
      }
    }
  };

  const handleSave = async () => {
    if (!input.trim()) return;

    if (!user) {
      toast.error('Not logged in', {
        description: 'Please log in to capture',
      });
      return;
    }

    setSaving(true);
    const savedType = captureType;
    setLastCaptureType(captureType);

    try {
      // Multi-line: route each line by tag (works for any capture type)
      const lines = input.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length > 1) {
        await handleMultiLineSave(lines);
        setSaving(false);
        return;
      }

      // Session refresh (iOS PWA fix)
      let { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        session = refreshData?.session;
        if (refreshError || !session) {
          toast.error('Session expired', {
            description: 'Please log in again to save',
            action: { label: 'Log in', onClick: () => navigate('/auth?redirect=/capture') },
            duration: 8000,
          });
          return;
        }
      }

      let savedId = '';
      let savedText = '';

      if (captureType === 'idea' || captureType === 'project') {
        const ideaContent = cleanIdeaInput(input);
        savedText = ideaContent;
        const { data, error } = await supabase.functions.invoke('save-idea', {
          body: {
            content: ideaContent,
            category_id: ideaData.categoryId,
            priority: ideaData.priority,
            tags: captureType === 'project'
              ? [...new Set([...(ideaData.tags || []), 'project'])]
              : ideaData.tags,
            project_id: ideaData.projectId,
          },
        });
        if (error) throw error;
        savedId = data?.idea?.id || '';
        queryClient.invalidateQueries({ queryKey: ['ideas'] });
      } else if (captureType === 'note' || captureType === 'question' || captureType === 'reminder') {
        // Notes/questions/reminders -> journal_pages (reminder/question kept as note for Phase 1)
        const content = input.trim();
        savedText = content;
        const { data, error } = await supabase.from('journal_pages').insert({
          user_id: user.id,
          title: content.slice(0, 80) || 'Untitled note',
          content,
          page_type: 'note',
        } as any).select('id').single();
        if (error) throw error;
        savedId = data?.id || '';
        queryClient.invalidateQueries({ queryKey: ['journal-pages'] });
      } else {
        // task
        const taskData = parsedTask || parseTaskInput(input);
        savedText = taskData.text;
        const createdTask = await createTask.mutateAsync({
          task_text: taskData.text,
          scheduled_date: taskData.date ? format(taskData.date, 'yyyy-MM-dd') : null,
          priority: taskData.priority || null,
          estimated_minutes: taskData.duration || null,
          context_tags: taskData.tags.length > 0 ? taskData.tags : null,
          project_id: taskData.projectId || null,
          energy_level: taskData.energy_level || null,
          status: 'backlog',
        });
        savedId = createdTask?.task_id || '';
        updateRecents(taskData.tags, taskData.projectId || undefined);
      }

      if (stayOpenAfterSave || burstModeActive) {
        setInput('');
        setParsedTask(null);
        setIdeaData({ categoryId: null, priority: null, tags: [], projectId: null });
        setNewIdeaTag('');
        setShowConvertChips(false);
        setUserOverrodeType(false);

        localStorage.removeItem(QUICK_CAPTURE_DRAFT_KEY);
        setSavedThisSession(prev => prev + 1);
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 500);
        if (isMobile) triggerHaptic();
        toast.success(
          savedType === 'task' ? '✅ Task saved'
          : savedType === 'idea' ? '💡 Idea saved'
          : savedType === 'project' ? '🚀 Project saved'
          : '📝 Note saved',
          { duration: 1000 }
        );
        setTimeout(() => {
          if (isMobile && textareaRef.current) textareaRef.current.focus();
          else if (inputRef.current) inputRef.current.focus();
        }, 50);
      } else {
        onOpenChange(false);
        localStorage.removeItem(QUICK_CAPTURE_DRAFT_KEY);
        if (savedType === 'task' || savedType === 'idea') {
          setTimeout(() => {
            showActionableToast(savedText, savedId, savedType);
          }, 100);
        } else {
          toast.success(savedType === 'project' ? '🚀 Project saved' : '📝 Note saved', {
            description: savedText.slice(0, 60),
            duration: 4000,
          });
        }
      }
    } catch (error: any) {
      console.error('Error saving:', error);
      const isAuthError = error.message?.includes('session') ||
                          error.message?.includes('auth') ||
                          error.message?.includes('JWT') ||
                          error.status === 401;
      if (isAuthError) {
        toast.error('Session expired', {
          description: 'Please log in again to save',
          action: { label: 'Log in', onClick: () => navigate('/auth?redirect=/capture') },
          duration: 8000,
        });
      } else {
        toast.error('Error', { description: error.message || 'Failed to save' });
      }
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
    if (type === 'content') {
      // Open content modal and close quick capture
      onOpenChange(false);
      setContentModalOpen(true);
      return;
    }
    setCaptureType(type);
    setLastCaptureType(type);
    if (isUserOverride) {
      setUserOverrodeType(true);
    }
  };

  // Handle quick chip updates
  const handleQuickChipUpdate = (updates: Partial<ParsedTask>) => {
    setParsedTask(prev => {
      if (!prev) {
        // Create new parsed task with defaults
        return {
          text: input.trim(),
          tags: [],
          ...updates,
        };
      }
      return { ...prev, ...updates };
    });
  };

  // Calculate multi-line count
  const lines = input.split('\n').map(l => l.trim()).filter(Boolean);
  const isMultiLine = lines.length > 1 && captureType === 'task';

  // Desktop content (without sticky footer)
  const desktopContent = (
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
          {/* Type selector - segmented control with scroll for overflow */}
          <div className="flex flex-wrap rounded-lg border bg-muted p-1 gap-1 w-full">
            <button
              type="button"
              onClick={() => toggleCaptureType('task', true)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap",
                captureType === 'task'
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              <ListTodo className="h-4 w-4" />
              Task
            </button>
            <button
              type="button"
              onClick={() => toggleCaptureType('idea', true)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap",
                captureType === 'idea'
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              <Lightbulb className="h-4 w-4" />
              Idea
            </button>
            <button
              type="button"
              onClick={() => toggleCaptureType('content', true)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap",
                captureType === 'content'
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              <FileText className="h-4 w-4" />
              Content
            </button>
            <button
              type="button"
              onClick={() => toggleCaptureType('note', true)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap",
                captureType === 'note'
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              <StickyNote className="h-4 w-4" />
              Note
            </button>
          </div>

          {/* Input field with mic button */}
          {true && (
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
          )}

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

          {/* Multi-line indicator */}
          {isMultiLine && (
            <Badge variant="secondary" className="text-xs">
              📝 {lines.length} tasks detected
            </Badge>
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

          {/* Idea preview with editable chips */}
          {captureType === 'idea' && input.trim() && (
            <div className="p-3 rounded-lg bg-muted/50 space-y-3">
              <div className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                {cleanIdeaInput(input) || '(enter your idea)'}
              </div>
              
              {/* Idea chips */}
              <div className="flex flex-wrap gap-2 items-center">
                {/* Category */}
                <Popover>
                  <PopoverTrigger asChild>
                    {ideaData.categoryId ? (
                      <Badge 
                        variant="secondary" 
                        className="text-xs cursor-pointer hover:opacity-80 gap-1 pr-1"
                        style={{ 
                          backgroundColor: ideaCategories.find(c => c.id === ideaData.categoryId)?.color || 'hsl(var(--secondary))',
                          color: 'white'
                        }}
                      >
                        <Tag className="h-3 w-3" />
                        {ideaCategories.find(c => c.id === ideaData.categoryId)?.name || 'Category'}
                        <button
                          onClick={(e) => { e.stopPropagation(); setIdeaData(prev => ({ ...prev, categoryId: null })); }}
                          className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ) : (
                      <Button variant="outline" size="sm" className="h-6 text-xs gap-1 text-muted-foreground">
                        <Tag className="h-3 w-3" />
                        Category
                      </Button>
                    )}
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2" align="start">
                    <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                      {ideaCategories.map(cat => (
                        <Button
                          key={cat.id}
                          variant={ideaData.categoryId === cat.id ? 'default' : 'ghost'}
                          size="sm"
                          className="h-7 text-xs justify-start gap-2"
                          onClick={() => setIdeaData(prev => ({ ...prev, categoryId: cat.id }))}
                        >
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.name}
                        </Button>
                      ))}
                      {ideaCategories.length === 0 && (
                        <p className="text-xs text-muted-foreground p-2">No categories yet</p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Priority */}
                <Popover>
                  <PopoverTrigger asChild>
                    {ideaData.priority ? (
                      <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80 gap-1 pr-1">
                        <Clock className="h-3 w-3" />
                        {PRIORITY_OPTIONS.find(p => p.value === ideaData.priority)?.label}
                        <button
                          onClick={(e) => { e.stopPropagation(); setIdeaData(prev => ({ ...prev, priority: null })); }}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ) : (
                      <Button variant="outline" size="sm" className="h-6 text-xs gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Priority
                      </Button>
                    )}
                  </PopoverTrigger>
                  <PopoverContent className="w-36 p-2" align="start">
                    <div className="flex flex-col gap-1">
                      {PRIORITY_OPTIONS.map(opt => (
                        <Button
                          key={opt.value}
                          variant={ideaData.priority === opt.value ? 'default' : 'ghost'}
                          size="sm"
                          className="h-7 text-xs justify-start"
                          onClick={() => setIdeaData(prev => ({ ...prev, priority: opt.value }))}
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Project */}
                <Popover>
                  <PopoverTrigger asChild>
                    {ideaData.projectId ? (
                      <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80 gap-1 pr-1">
                        <FolderKanban className="h-3 w-3" />
                        {projects.find(p => p.id === ideaData.projectId)?.name || 'Project'}
                        <button
                          onClick={(e) => { e.stopPropagation(); setIdeaData(prev => ({ ...prev, projectId: null })); }}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ) : (
                      <Button variant="outline" size="sm" className="h-6 text-xs gap-1 text-muted-foreground">
                        <FolderKanban className="h-3 w-3" />
                        Project
                      </Button>
                    )}
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2" align="start">
                    <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                      {projects.filter(p => !p.is_template).map(project => (
                        <Button
                          key={project.id}
                          variant={ideaData.projectId === project.id ? 'default' : 'ghost'}
                          size="sm"
                          className="h-7 text-xs justify-start gap-2"
                          onClick={() => setIdeaData(prev => ({ ...prev, projectId: project.id }))}
                        >
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: project.color || 'hsl(var(--primary))' }}
                          />
                          {project.name}
                        </Button>
                      ))}
                      {projects.filter(p => !p.is_template).length === 0 && (
                        <p className="text-xs text-muted-foreground p-2">No projects yet</p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Tags */}
                {ideaData.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs gap-1 pr-1">
                    <Hash className="h-3 w-3" />
                    {tag}
                    <button
                      onClick={() => handleRemoveIdeaTag(tag)}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}

                {/* Add tag */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-6 text-xs gap-1 text-muted-foreground">
                      <Plus className="h-3 w-3" />
                      Tag
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-40 p-2" align="start">
                    <div className="flex gap-1">
                      <Input
                        value={newIdeaTag}
                        onChange={(e) => setNewIdeaTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddIdeaTag();
                          }
                        }}
                        placeholder="Tag name"
                        className="h-7 text-xs"
                      />
                      <Button size="sm" className="h-7" onClick={handleAddIdeaTag}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={
              (captureType === 'income' || captureType === 'expense') 
                ? (!financialData.amount || !financialData.category || saving)
                : (!input.trim() || saving)
            }
            className={cn(
              "w-full h-12",
              captureType === 'income' && "bg-emerald-600 hover:bg-emerald-700",
              captureType === 'expense' && "bg-rose-600 hover:bg-rose-700"
            )}
          >
            {saving ? 'Saving...' : 
              captureType === 'income' ? 'Add Income' :
              captureType === 'expense' ? 'Add Expense' :
              captureType === 'task' ? (isMultiLine ? `Save ${lines.length} Tasks` : 'Save Task') : 
              'Save Idea'
            }
          </Button>

          {/* Hint text */}
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> to save • <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Esc</kbd> to close
          </p>
        </>
      )}
    </div>
  );

  // Mobile content with sticky footer and quick chips
  const mobileContent = (
    <div className="flex flex-col h-full">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {/* Header with session counter */}
        <div className="flex items-center gap-2">
          <Zap className={cn("h-5 w-5 transition-colors", justSaved ? "text-green-500" : "text-primary")} />
          <h2 className="text-lg font-semibold">Quick Capture</h2>
          
          {/* Session counter badge */}
          {savedThisSession > 0 && (
            <Badge variant="secondary" className="text-xs animate-in fade-in">
              <Check className="h-3 w-3 mr-1" />
              {savedThisSession} saved
            </Badge>
          )}
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="ml-auto h-8 w-8" 
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
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
            {/* Compact type selector - scrollable */}
            <div className="flex gap-1 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => toggleCaptureType('task', true)}
                className={cn(
                  "flex items-center justify-center gap-1 px-3 py-2.5 text-sm font-medium rounded-lg transition-all touch-manipulation whitespace-nowrap",
                  captureType === 'task'
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <ListTodo className="h-4 w-4" />
                Task
              </button>
              <button
                type="button"
                onClick={() => toggleCaptureType('idea', true)}
                className={cn(
                  "flex items-center justify-center gap-1 px-3 py-2.5 text-sm font-medium rounded-lg transition-all touch-manipulation whitespace-nowrap",
                  captureType === 'idea'
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Lightbulb className="h-4 w-4" />
                Idea
              </button>
              <button
                type="button"
                onClick={() => toggleCaptureType('income', true)}
                className={cn(
                  "flex items-center justify-center gap-1 px-3 py-2.5 text-sm font-medium rounded-lg transition-all touch-manipulation whitespace-nowrap",
                  captureType === 'income'
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <TrendingUp className="h-4 w-4" />
                Income
              </button>
              <button
                type="button"
                onClick={() => toggleCaptureType('expense', true)}
                className={cn(
                  "flex items-center justify-center gap-1 px-3 py-2.5 text-sm font-medium rounded-lg transition-all touch-manipulation whitespace-nowrap",
                  captureType === 'expense'
                    ? "bg-rose-600 text-white shadow-sm"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <TrendingDown className="h-4 w-4" />
                Expense
              </button>
            </div>

            {/* Financial form for income/expense on mobile */}
            {(captureType === 'income' || captureType === 'expense') && (
              <div className="space-y-3">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    ref={amountInputRef}
                    type="number"
                    step="0.01"
                    min="0"
                    value={financialData.amount}
                    onChange={(e) => setFinancialData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    className="text-xl h-14 pl-10 font-semibold"
                  />
                </div>
                <Select
                  value={financialData.category}
                  onValueChange={(value) => setFinancialData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {financialCategories
                      .filter(cat => cat.type === captureType)
                      .map(cat => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
                <Input
                  value={financialData.description}
                  onChange={(e) => setFinancialData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description (optional)"
                  className="h-10"
                />
              </div>
            )}

            {/* Multi-line Textarea for bulk entry - only for task/idea */}
            {captureType !== 'income' && captureType !== 'expense' && (
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  value={isListening ? input + interimText : input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleSave();
                    }
                  }}
                  onPaste={handlePaste}
                  placeholder={
                    isListening 
                      ? "Listening..."
                      : captureType === 'task'
                        ? "Add tasks (one per line for bulk)"
                        : "Add idea..."
                  }
                  className={cn(
                    "text-base min-h-[100px] resize-none pr-12 transition-all",
                    isListening && "border-primary ring-2 ring-primary/20",
                    isMultiLine && "min-h-[140px] border-primary/50"
                  )}
                  autoComplete="off"
                  disabled={isListening}
                  rows={isMultiLine ? 5 : 3}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleMicClick}
                  disabled={!speechSupported}
                  className={cn(
                    "absolute right-1 top-2 h-10 w-10",
                    isListening && "text-primary animate-pulse"
                  )}
                >
                  {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
              </div>
            )}

            {/* Listening indicator */}
            {isListening && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                </span>
                Listening... Tap mic to stop
              </div>
            )}

            {/* Multi-line indicator with burst mode toggle */}
            {isMultiLine && (
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs bg-primary/10 text-primary border-primary/20">
                  📝 {lines.length} tasks ready
                </Badge>
                <span className="text-xs text-muted-foreground">Will save all at once</span>
              </div>
            )}

            {/* Quick Chips for tasks - compact layout */}
            {captureType === 'task' && (
              <QuickChips
                parsedTask={parsedTask}
                onUpdate={handleQuickChipUpdate}
                recentTags={recentTags}
                recentProjects={recentProjects}
              />
            )}

            {/* Convert chips - shown after dictation or paste */}
            {showConvertChips && input.trim() && !isListening && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Detected as:</span>
                <Button
                  variant={captureType === 'task' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleCaptureType('task', true)}
                  className="h-10 gap-1"
                >
                  <ListTodo className="h-4 w-4" />
                  Task
                </Button>
                <Button
                  variant={captureType === 'idea' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleCaptureType('idea', true)}
                  className="h-10 gap-1"
                >
                  <Lightbulb className="h-4 w-4" />
                  Idea
                </Button>
              </div>
            )}

            {/* Task preview (simplified for mobile) */}
            {captureType === 'task' && parsedTask && input.trim() && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div className="text-sm font-medium">
                  {parsedTask.text || '(enter task name)'}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {parsedTask.date && (
                    <Badge variant="secondary" className="text-xs">
                      📅 {format(parsedTask.date, 'MMM d')}
                    </Badge>
                  )}
                  {parsedTask.duration && (
                    <Badge variant="secondary" className="text-xs">
                      ⏱️ {parsedTask.duration}m
                    </Badge>
                  )}
                  {parsedTask.priority && (
                    <Badge variant="secondary" className="text-xs">
                      {parsedTask.priority === 'high' ? '🔴' : parsedTask.priority === 'medium' ? '🟡' : '🟢'} {parsedTask.priority}
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

            {/* Idea preview with metadata chips */}
            {captureType === 'idea' && input.trim() && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  {cleanIdeaInput(input) || '(enter your idea)'}
                </div>
                
                {/* Idea metadata chips for mobile */}
                <IdeaQuickChips
                  ideaData={ideaData}
                  onUpdate={setIdeaData}
                  categories={ideaCategories}
                  projects={projects}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Sticky bottom action bar - optimized for rapid adding */}
      {user && (
        <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t pt-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] mt-3 -mx-4 px-4">
          <div className="flex gap-2">
            {/* Primary Save Button */}
            <Button
              onClick={() => {
                setBurstModeActive(false);
                handleSave();
              }}
              disabled={
                (captureType === 'income' || captureType === 'expense') 
                  ? (!financialData.amount || !financialData.category || saving)
                  : (!input.trim() || saving)
              }
              className={cn(
                "flex-1 h-12 transition-all",
                justSaved && "bg-green-600 hover:bg-green-700",
                captureType === 'income' && !justSaved && "bg-emerald-600 hover:bg-emerald-700",
                captureType === 'expense' && !justSaved && "bg-rose-600 hover:bg-rose-700"
              )}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : justSaved ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Saved!
                </>
              ) : (
                isMultiLine ? `Save ${lines.length} Tasks` : 'Save & Close'
              )}
            </Button>
            
            {/* Keep Adding Button - enables burst mode */}
            <Button
              variant={burstModeActive ? "default" : "outline"}
              onClick={() => {
                setBurstModeActive(true);
                handleSave();
              }}
              disabled={!input.trim() || saving}
              className={cn(
                "flex-1 h-12 transition-all",
                burstModeActive && "ring-2 ring-primary/50"
              )}
            >
              <Plus className="h-4 w-4 mr-1" />
              {burstModeActive ? 'Adding...' : 'Keep Adding'}
            </Button>
          </div>
          
          {/* Hint for burst mode */}
          {burstModeActive && (
            <p className="text-xs text-center text-muted-foreground mt-2 animate-in fade-in">
              ⚡ Burst mode active — tap "Save & Close" when done
            </p>
          )}
        </div>
      )}
    </div>
  );

  // Use Drawer on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="max-h-[85dvh] flex flex-col overflow-hidden px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
            <ScrollIndicator className="flex-1 overflow-hidden min-h-0">
              <ScrollArea className="h-full">
                <div className="pb-4">
                  {mobileContent}
                </div>
              </ScrollArea>
            </ScrollIndicator>
          </DrawerContent>
        </Drawer>
        
        {/* Content Save Modal */}
        <ContentSaveModal
          open={contentModalOpen}
          onOpenChange={setContentModalOpen}
          onSaved={() => {}}
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col overflow-hidden">
          <ScrollIndicator className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className="pr-2 pb-4">
                {desktopContent}
              </div>
            </ScrollArea>
          </ScrollIndicator>
        </DialogContent>
      </Dialog>
      
      {/* Content Save Modal */}
      <ContentSaveModal
        open={contentModalOpen}
        onOpenChange={setContentModalOpen}
        onSaved={() => {}}
      />
    </>
  );
}
