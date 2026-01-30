import { useState, useEffect, useCallback, useRef, useMemo, MutableRefObject } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, subDays, startOfWeek } from 'date-fns';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { detectGap, type GapStatus } from '@/utils/gapDetection';
import { useActiveCycle } from '@/hooks/useActiveCycle';
import { useDailyPageLayout } from '@/hooks/useDailyPageLayout';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SmartScratchPad } from '@/components/SmartScratchPad';
import { CharacterCounter } from '@/components/ui/character-counter';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/Layout';
import { LoadingState } from '@/components/system/LoadingState';
import { ErrorState } from '@/components/system/ErrorState';
import { OfficeHoursDisplay } from '@/components/OfficeHoursDisplay';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { normalizeArray, normalizeString, normalizeObject } from '@/lib/normalize';
import { UsefulThoughtsModal } from '@/components/UsefulThoughtsModal';
import BeliefSelectorModal from '@/components/BeliefSelectorModal';
import { ScratchPadOrganizeModal } from '@/components/ScratchPadOrganizeModal';
import { YesterdayReviewPopup } from '@/components/YesterdayReviewPopup';
import { CycleSnapshotCard } from '@/components/cycle/CycleSnapshotCard';
import { GoalRewritePrompt } from '@/components/cycle/GoalRewritePrompt';
import { InlineCalendarAgenda } from '@/components/daily-plan/InlineCalendarAgenda';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, ChevronDown, ChevronUp, Loader2, Save, CheckCircle2, Brain, TrendingUp, Zap, Target, Sparkles, Trash2, BookOpen, ListTodo, Lightbulb, Clock, Calendar, CalendarRange, Moon, AlertCircle, Rocket, Diamond, Check, Settings } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PostingSlotCard } from '@/components/daily-plan/PostingSlotCard';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';


import { QuickLogCard } from '@/components/content';
import { NurtureCheckinCard } from '@/components/nurture';
import { HabitTrackerCard } from '@/components/habits';
// ArcadeIntroCard removed - moved to onboarding
import { CalendarReconnectBanner } from '@/components/google-calendar/CalendarReconnectBanner';
import { CycleProgressBanner } from '@/components/cycle/CycleProgressBanner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ToastAction } from '@/components/ui/toast';
import { useLocalStorageSync } from '@/hooks/useLocalStorageSync';
import { useServerSync, SyncStatus } from '@/hooks/useServerSync';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';
import { useMobileProtection } from '@/hooks/useMobileProtection';
import { SaveStatusIndicator, SaveStatusBanner } from '@/components/SaveStatusIndicator';
import { UnprocessedTagsWarning } from '@/components/daily-plan/UnprocessedTagsWarning';
import { InfoCards } from '@/components/daily/InfoCards';

export default function DailyPlan() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: activeCycleData } = useActiveCycle();
  
  // Layout preferences
  const { layout, isSectionVisible, isLoading: layoutLoading } = useDailyPageLayout();
  
  const [gapStatus, setGapStatus] = useState<GapStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deepMode, setDeepMode] = useState(false);
  
  // Plan data
  const [dayId, setDayId] = useState<string | null>(null);
  const [top3, setTop3] = useState<string[]>(['', '', '']);
  const [oneThing, setOneThing] = useState('');
  const [thought, setThought] = useState('');
  const [feeling, setFeeling] = useState('');
  const [focusArea, setFocusArea] = useState<string | null>(null);
  const [deepModeNotes, setDeepModeNotes] = useState({
    win: '',
    obstacles: '',
    show_up: '',
  });
  
  // Top 3 Tasks (unified with tasks table)
  const [top3Tasks, setTop3Tasks] = useState<any[]>([]);
  const [otherTasks, setOtherTasks] = useState<any[]>([]);
  const [newTop3Text, setNewTop3Text] = useState(['', '', '']);
  const [savingTop3, setSavingTop3] = useState(false);
  
  // Scratch pad (unified brain dump)
  const [scratchPadContent, setScratchPadContent] = useState('');
  const [scratchPadTitle, setScratchPadTitle] = useState('');
  const [processingTags, setProcessingTags] = useState(false);
  const scratchPadRef = useRef<HTMLTextAreaElement>(null);
  
  // Weekly priorities
  const [weeklyPriorities, setWeeklyPriorities] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  
  // Habits
  const [habits, setHabits] = useState<any[]>([]);
  const [habitLogs, setHabitLogs] = useState<Record<string, boolean>>({});
  const [thoughtsModalOpen, setThoughtsModalOpen] = useState(false);
  const [beliefsModalOpen, setBeliefsModalOpen] = useState(false);
  const [identityAnchor, setIdentityAnchor] = useState<any>(null);
  
  // Organize modal state
  const [organizeModalOpen, setOrganizeModalOpen] = useState(false);
  const [processedData, setProcessedData] = useState<any>(null);
  const [scratchPadReviewMode, setScratchPadReviewMode] = useState<'quick_save' | 'organize_now'>('quick_save');
  
  // Yesterday review popup
  const [showYesterdayReview, setShowYesterdayReview] = useState(false);
  const [checkedYesterdayReview, setCheckedYesterdayReview] = useState(false);
  
  // Cycle and goal rewrite
  const [cycleData, setCycleData] = useState<any>(null);
  const [goalRewrite, setGoalRewrite] = useState('');
  const [previousGoalRewrite, setPreviousGoalRewrite] = useState('');
  const [savingGoalRewrite, setSavingGoalRewrite] = useState(false);
  
  // Monthly focus
  const [monthlyFocus, setMonthlyFocus] = useState<string | null>(null);
  
  // NEW: Weekly alignment, end of day reflection
  const [alignmentScore, setAlignmentScore] = useState<number>(5);
  const [endOfDayReflection, setEndOfDayReflection] = useState('');
  
  // Track initial load to prevent auto-save during data population
  const isInitialLoadRef = useRef(true);
  
  // View mode toggle
  // View mode removed - single scrollable page
  
  // Query: Check if this is user's first day of the week (no alignment set yet this week)
  const { data: weeklyActivity } = useQuery({
    queryKey: ['weekly-activity-check', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Get start of this week (Sunday)
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 0 });
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      
      // Check if they've set alignment_score ANY day this week
      const { data } = await supabase
        .from('daily_plans')
        .select('alignment_score, date')
        .eq('user_id', user.id)
        .gte('date', weekStartStr)
        .not('alignment_score', 'is', null);
      
      return data;
    },
    enabled: !!user?.id,
  });
  
  // Query: Get current weekly plan priorities
  const { data: currentWeeklyPlan } = useQuery({
    queryKey: ['current-weekly-plan', user?.id, activeCycleData?.cycle_id],
    queryFn: async (): Promise<{ top_3_priorities: string[] } | null> => {
      if (!user?.id || !activeCycleData) return null;
      
      // Get start of this week (Sunday)
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 0 });
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      
      const { data } = await supabase
        .from('weekly_plans')
        .select('top_3_priorities')
        .eq('user_id', user.id)
        .eq('cycle_id', activeCycleData.cycle_id)
        .eq('start_of_week', weekStartStr)
        .maybeSingle();
      
      if (!data) return null;
      
      // Normalize top_3_priorities from Json to string[]
      const priorities = Array.isArray(data.top_3_priorities) 
        ? data.top_3_priorities.map(String).filter(Boolean)
        : [];
      
      return { top_3_priorities: priorities };
    },
    enabled: !!user?.id && !!activeCycleData,
  });
  
  // Derived: Determine if this is first day of week (no alignment set this week)
  const isFirstDayOfWeek = useMemo(() => {
    return !weeklyActivity || weeklyActivity.length === 0;
  }, [weeklyActivity]);

  // Build the data object for protection
  const dailyPlanData = useMemo(() => ({
    day_id: dayId,
    top_3_today: newTop3Text.filter((t) => t.trim()),
    selected_weekly_priorities: selectedPriorities,
    thought,
    feeling,
    deep_mode_notes: deepModeNotes,
    scratch_pad_content: scratchPadContent,
    scratch_pad_title: scratchPadTitle,
    one_thing: oneThing,
    goal_rewrite: goalRewrite,
    alignment_score: alignmentScore,
    brain_dump: scratchPadContent, // Map scratch pad to brain_dump for server sync
    end_of_day_reflection: endOfDayReflection,
  }), [dayId, newTop3Text, selectedPriorities, thought, feeling, deepModeNotes, scratchPadContent, scratchPadTitle, oneThing, goalRewrite, alignmentScore, endOfDayReflection]);

  // Track if we have unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const lastDataHashRef = useRef<string | null>(null);

  // 1. Immediate localStorage sync (0ms delay)
  const localStorageKey = `daily_plan_backup_${dayId || 'pending'}`;
  const { save: saveToLocal, load: loadFromLocal, clear: clearLocal } = useLocalStorageSync<typeof dailyPlanData>({
    key: localStorageKey,
    enableIndexDBFallback: true,
  });

  // 2. Debounced server sync (1 second delay)
  const {
    sync: syncToServer,
    syncNow: saveNow,
    status: serverSyncStatus,
    isOnline,
    lastSynced: lastSaved,
  } = useServerSync<typeof dailyPlanData>({
    saveFn: async (data) => {
      if (!user || !data.day_id) return;
      
      const { error: fnError } = await supabase.functions.invoke('save-daily-plan', {
        body: {
          day_id: data.day_id,
          user_id: user.id,
          ...data,
        },
      });

      if (fnError) throw fnError;
    },
    delay: 1000,
    maxRetries: 3,
    retryDelay: 5000,
    onSuccess: () => {
      clearLocal();
      setHasUnsavedChanges(false);
    },
  });

  // Map server sync status to SaveStatus type for compatibility
  const saveStatus = serverSyncStatus;

  // 3. Warn before closing with unsaved changes
  useBeforeUnload({
    hasUnsavedChanges,
    onFinalSave: () => {
      // Synchronous final save to localStorage
      if (dayId) {
        const backup = {
          data: dailyPlanData,
          timestamp: new Date().toISOString(),
          version: '2.0',
        };
        try {
          localStorage.setItem(localStorageKey, JSON.stringify(backup));
        } catch (e) {
          console.error('[DailyPlan] Final save failed:', e);
        }
      }
    },
    enabled: true,
  });

  // 4. Force save on mobile when app is backgrounded
  useMobileProtection({
    getData: () => dayId ? dailyPlanData : null,
    onSave: (data) => {
      saveToLocal(data);
      if (isOnline) {
        syncToServer(data);
      }
    },
    enabled: !loading && !!dayId,
  });

  // Register data changes - immediate localStorage + debounced server save
  useEffect(() => {
    if (!loading && dayId && !isInitialLoadRef.current) {
      const dataHash = JSON.stringify(dailyPlanData);
      if (lastDataHashRef.current === dataHash) return;
      lastDataHashRef.current = dataHash;
      
      setHasUnsavedChanges(true);
      
      // Immediate localStorage save (0ms)
      saveToLocal(dailyPlanData);
      
      // Debounced server save (1s)
      syncToServer(dailyPlanData);
    }
  }, [dailyPlanData, loading, dayId, saveToLocal, syncToServer]);

  // Try to restore from localStorage on initial load
  useEffect(() => {
    const tryRestoreBackup = async () => {
      if (!dayId || !isInitialLoadRef.current) return;
      
      const backup = await loadFromLocal();
      if (backup && backup.day_id === dayId) {
        // Ask user if they want to restore
        toast({
          title: '📋 Unsaved changes found',
          description: 'Would you like to restore your previous work?',
          action: (
            <ToastAction altText="Restore" onClick={() => {
              if (backup.thought) setThought(backup.thought);
              if (backup.feeling) setFeeling(backup.feeling);
              if (backup.scratch_pad_content) setScratchPadContent(backup.scratch_pad_content);
              if (backup.scratch_pad_title) setScratchPadTitle(backup.scratch_pad_title);
              if (backup.deep_mode_notes) setDeepModeNotes(backup.deep_mode_notes);
              if (backup.alignment_score !== undefined) setAlignmentScore(backup.alignment_score);
              if (backup.brain_dump) setScratchPadContent(backup.brain_dump); // Restore brain_dump to scratch pad
              if (backup.end_of_day_reflection) setEndOfDayReflection(backup.end_of_day_reflection);
              if (backup.top_3_today) setNewTop3Text([
                backup.top_3_today[0] || '',
                backup.top_3_today[1] || '',
                backup.top_3_today[2] || '',
              ]);
              toast({ title: '✅ Changes restored!' });
            }}>
              Restore
            </ToastAction>
          ),
          duration: 10000,
        });
      }
    };
    
    tryRestoreBackup();
  }, [dayId, loadFromLocal, toast]);

  useEffect(() => {
    loadDailyPlan();
    loadIdentityAnchor();
    loadUserSettings();
    checkYesterdayReview();
  }, [user]);

  // Check for disengagement gap when user loads page
  useEffect(() => {
    if (user?.id) {
      detectGap(user.id).then(setGapStatus);
    }
  }, [user?.id]);

  const loadUserSettings = async () => {
    if (!user) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-user-settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.scratch_pad_review_mode) {
          setScratchPadReviewMode(data.scratch_pad_review_mode as 'quick_save' | 'organize_now');
        }
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
  };

  const checkYesterdayReview = async () => {
    if (!user || checkedYesterdayReview) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-daily-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ date: yesterday }),
      });

      const data = await res.json();
      setCheckedYesterdayReview(true);
      
      // Show popup if there was a plan yesterday but no review
      if (data.hasPlan && !data.review) {
        setShowYesterdayReview(true);
      }
    } catch (error) {
      console.error('Error checking yesterday review:', error);
      setCheckedYesterdayReview(true);
    }
  };

  const loadDailyPlan = async () => {
    if (!user) return;

    try {
      setError(null);
      console.log('Loading daily plan...');
      
      const { data, error: fnError } = await supabase.functions.invoke('get-daily-plan');

      console.log('Daily plan response:', { hasData: Boolean(data), error: fnError });

      if (fnError) throw fnError;

      if (data?.error) {
        setError(data.error);
        return;
      }

      if (data?.data) {
        const plan = data.data;
        console.log('Plan loaded:', plan);

        setDayId(plan.day_id || null);
        setFocusArea(plan.focus_area || null);
        
        // Normalize top 3
        const normalizedTop3 = Array.isArray(plan.top_3_today)
          ? plan.top_3_today.map(String).filter(Boolean)
          : [];
        setTop3([
          normalizedTop3[0] || '',
          normalizedTop3[1] || '',
          normalizedTop3[2] || '',
        ]);

        // Normalize weekly priorities
        const normalizedWeekly = Array.isArray(plan.weekly_priorities)
          ? plan.weekly_priorities.map(String).filter(Boolean)
          : [];
        setWeeklyPriorities(normalizedWeekly);

        const normalizedSelected = Array.isArray(plan.selected_weekly_priorities)
          ? plan.selected_weekly_priorities.map(String).filter(Boolean)
          : [];
        setSelectedPriorities(normalizedSelected);

        setThought(plan.thought || '');
        setFeeling(plan.feeling || '');
        setScratchPadContent(plan.scratch_pad_content || '');
        setScratchPadTitle(plan.scratch_pad_title || '');
        setOneThing(plan.one_thing || '');
        
        // Set Top 3 Tasks from API
        setTop3Tasks(plan.top_3_tasks || []);
        setOtherTasks(plan.other_tasks || []);
        
        // Pre-populate newTop3Text from existing Top 3 tasks
        const existingTexts = ['', '', ''];
        (plan.top_3_tasks || []).forEach((task: any) => {
          if (task.priority_order >= 1 && task.priority_order <= 3) {
            existingTexts[task.priority_order - 1] = task.task_text;
          }
        });
        setNewTop3Text(existingTexts);

        // Normalize deep mode notes
        const notes = plan.deep_mode_notes || {};
        setDeepModeNotes({
          win: notes.win || '',
          obstacles: notes.obstacles || '',
          show_up: notes.show_up || '',
        });
        
        // Goal rewrite data
        setGoalRewrite(plan.goal_rewrite || '');
        setPreviousGoalRewrite(plan.previous_goal_rewrite || '');
        setCycleData(plan.cycle || null);
        
        // NEW: Set alignment, reflection fields - brain_dump maps to scratchPadContent
        setAlignmentScore(plan.alignment_score ?? 5);
        // If scratch_pad_content is empty but brain_dump has content, use brain_dump
        if (!plan.scratch_pad_content && plan.brain_dump) {
          setScratchPadContent(plan.brain_dump);
        }
        setEndOfDayReflection(plan.end_of_day_reflection || '');
        
        // Load monthly focus if we have a cycle
        if (plan.cycle?.cycle_id) {
          loadMonthlyFocus(plan.cycle.cycle_id);
        }
      }

      // Load habits separately
      await loadHabits();
    } catch (error: any) {
      console.error('Error loading daily plan:', error);
      setError(error?.message || 'Failed to load daily plan');
    } finally {
      setLoading(false);
      // Mark initial load complete after a short delay to let React batch state updates
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 500);
    }
  };

  const loadHabits = async () => {
    if (!user) return;

    try {
      // Load active habits
      const { data: habitsData, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('display_order');

      if (habitsError) throw habitsError;
      setHabits(habitsData || []);

      // Load today's habit logs
      const today = new Date().toISOString().split('T')[0];
      const { data: logsData, error: logsError } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today);

      if (logsError) throw logsError;
      
      const logsMap = (logsData || []).reduce(
        (acc, log) => ({ ...acc, [log.habit_id]: log.completed }),
        {} as Record<string, boolean>
      );
      setHabitLogs(logsMap);
    } catch (error) {
      console.error('Error loading habits:', error);
    }
  };

  const loadMonthlyFocus = async (cycleId: string) => {
    if (!user) return;
    try {
      const currentMonth = new Date().getMonth() + 1; // 1-12
      const { data, error } = await supabase
        .from('cycle_month_plans')
        .select('main_focus')
        .eq('user_id', user.id)
        .eq('cycle_id', cycleId)
        .eq('month_number', currentMonth <= 3 ? currentMonth : ((currentMonth - 1) % 3) + 1)
        .maybeSingle();
      
      if (!error && data?.main_focus) {
        setMonthlyFocus(data.main_focus);
      }
    } catch (error) {
      console.error('Error loading monthly focus:', error);
    }
  };

  const loadIdentityAnchor = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke('get-identity-anchors');
      if (!error && data && data.length > 0) {
        setIdentityAnchor(normalizeObject(data[0], null));
      }
    } catch (error) {
      console.error('Error loading identity anchor:', error);
    }
  };

  const updateTop3 = (idx: number, value: string) => {
    const updated = [...newTop3Text];
    updated[idx] = value;
    setNewTop3Text(updated);
  };

  // Create or update Top 3 task
  const saveTop3Task = async (priorityOrder: number, text: string) => {
    if (!user || !dayId) return;
    
    const today = new Date().toISOString().split('T')[0];
    const existingTask = top3Tasks.find(t => t.priority_order === priorityOrder);
    
    try {
      if (existingTask) {
        if (!text.trim()) {
          // Delete task if text is empty
          await supabase.functions.invoke('manage-task', {
            body: {
              action: 'delete',
              task_id: existingTask.task_id,
            },
          });
          // Update local state
          setTop3Tasks(prev => prev.filter(t => t.task_id !== existingTask.task_id));
        } else {
          // Update existing task
          const { data } = await supabase.functions.invoke('manage-task', {
            body: {
              action: 'update',
              task_id: existingTask.task_id,
              task_text: text.trim(),
            },
          });
          // Update local state
          if (data?.data) {
            setTop3Tasks(prev => prev.map(t => 
              t.task_id === existingTask.task_id ? data.data : t
            ));
          }
        }
      } else if (text.trim()) {
        // Create new task only if there's text
        const { data } = await supabase.functions.invoke('manage-task', {
          body: {
            action: 'create',
            task_text: text.trim(),
            scheduled_date: today,
            priority_order: priorityOrder,
            source: 'top_3',
            priority: 'high',
            daily_plan_id: dayId,
          },
        });
        // Add to local state
        if (data?.data) {
          setTop3Tasks(prev => [...prev, data.data].sort((a, b) => a.priority_order - b.priority_order));
        }
      }
    } catch (error) {
      console.error('Error saving top 3 task:', error);
    }
  };

  // Toggle Top 3 task completion
  const toggleTop3Task = async (taskId: string, currentStatus: boolean) => {
    try {
      await supabase.functions.invoke('manage-task', {
        body: {
          action: 'update',
          task_id: taskId,
          is_completed: !currentStatus,
        },
      });
      
      // Update local state
      setTop3Tasks(prev => prev.map(t => 
        t.task_id === taskId ? { ...t, is_completed: !currentStatus } : t
      ));
      
      toast({
        title: !currentStatus ? "✅ Task completed!" : "Task unchecked",
      });
    } catch (error: any) {
      console.error('Error toggling task:', error);
      toast({
        title: 'Error updating task',
        description: error?.message,
        variant: 'destructive',
      });
    }
  };

  // Toggle other task completion
  const toggleOtherTask = async (taskId: string, currentStatus: boolean) => {
    try {
      await supabase.functions.invoke('manage-task', {
        body: {
          action: 'update',
          task_id: taskId,
          is_completed: !currentStatus,
        },
      });
      
      setOtherTasks(prev => prev.map(t => 
        t.task_id === taskId ? { ...t, is_completed: !currentStatus } : t
      ));
    } catch (error: any) {
      console.error('Error toggling task:', error);
    }
  };

  const toggleHabit = async (habitId: string) => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase.rpc('toggle_habit', {
        p_user_id: user.id,
        p_habit_id: habitId,
        p_date: today,
      });

      if (error) throw error;
      
      setHabitLogs((prev) => ({ ...prev, [habitId]: data }));
    } catch (error: any) {
      console.error('Habit toggle error:', error);
      toast({
        title: 'Error toggling habit',
        description: error?.message,
        variant: 'destructive',
      });
    }
  };

  const [manualSaving, setManualSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !dayId) return;
    
    setManualSaving(true);
    setSavingTop3(true);

    try {
      // Save Top 3 tasks to tasks table
      const today = new Date().toISOString().split('T')[0];
      for (let i = 0; i < 3; i++) {
        const text = newTop3Text[i];
        if (text.trim()) {
          await saveTop3Task(i + 1, text);
        }
      }

      // Use the data protection's saveNow
      await saveNow(dailyPlanData);
      
      // Reload to get fresh tasks
      await loadDailyPlan();

      toast({
        title: '⚡ Daily plan saved!',
        description: 'Your day is set.',
      });
    } catch (error: any) {
      console.error('SAVE ERROR:', error);
      toast({
        title: 'Error saving daily plan',
        description: error?.message || JSON.stringify(error),
        variant: 'destructive',
      });
    } finally {
      setManualSaving(false);
      setSavingTop3(false);
    }
  };

  // All localStorage, auto-save, and beforeUnload logic is now handled by useDataProtection hook

  const handleProcessTags = async () => {
    if (!user || !dayId || !scratchPadContent.trim()) return;
    
    setProcessingTags(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-scratch-pad-tags', {
        body: {
          daily_plan_id: dayId,
          scratch_pad_content: scratchPadContent,
        },
      });

      if (error) throw error;

      const processed = data?.processed || {};
      const total = (processed.tasks || 0) + (processed.ideas || 0) + (processed.thoughts || 0) + (processed.offers || 0) + (processed.wins || 0);
      
      if (total > 0) {
        const parts = [];
        if (processed.tasks > 0) parts.push(`${processed.tasks} task${processed.tasks > 1 ? 's' : ''}`);
        if (processed.ideas > 0) parts.push(`${processed.ideas} idea${processed.ideas > 1 ? 's' : ''}`);
        if (processed.thoughts > 0) parts.push(`${processed.thoughts} thought${processed.thoughts > 1 ? 's' : ''}`);
        if (processed.offers > 0) parts.push(`${processed.offers} offer${processed.offers > 1 ? 's' : ''}`);
        if (processed.wins > 0) parts.push(`${processed.wins} win${processed.wins > 1 ? 's' : ''}`);

        // Invalidate caches so items appear immediately in their destinations
        queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['ideas'] });
        queryClient.invalidateQueries({ queryKey: ['useful-thoughts'] });
        queryClient.invalidateQueries({ queryKey: ['daily-plan'] });

        // Store processed data for organize modal
        setProcessedData(data);
        
        // Check if we should show organize modal
        if (scratchPadReviewMode === 'organize_now') {
          setOrganizeModalOpen(true);
        } else {
          // Show enhanced toast with organize option
          toast({
            title: "✅ Tags Processed!",
            description: (
              <div className="space-y-2">
                <p>Created:</p>
                <ul className="text-sm space-y-1">
                  {processed.tasks > 0 && <li className="flex items-center gap-1"><ListTodo className="h-3 w-3" /> {processed.tasks} task{processed.tasks > 1 ? 's' : ''}</li>}
                  {processed.ideas > 0 && <li className="flex items-center gap-1"><Lightbulb className="h-3 w-3" /> {processed.ideas} idea{processed.ideas > 1 ? 's' : ''}</li>}
                  {processed.thoughts > 0 && <li className="flex items-center gap-1"><Brain className="h-3 w-3" /> {processed.thoughts} thought{processed.thoughts > 1 ? 's' : ''}</li>}
                  {processed.wins > 0 && <li>🏆 {processed.wins} win{processed.wins > 1 ? 's' : ''}</li>}
                </ul>
              </div>
            ),
            action: (processed.tasks > 0 || processed.ideas > 0) ? (
              <ToastAction altText="Organize now" onClick={() => setOrganizeModalOpen(true)}>
                Organize →
              </ToastAction>
            ) : undefined,
            duration: 8000,
          });
        }
      } else {
        toast({
          title: "No tags found",
          description: "Use #task, #idea, #thought, #offer, or #win to tag items",
        });
      }
    } catch (error: any) {
      console.error('Process tags error:', error);
      
      // Check for session/auth errors
      const errorMessage = error?.message || "Something went wrong";
      const isAuthError = errorMessage.toLowerCase().includes('token') || 
                          errorMessage.toLowerCase().includes('auth') ||
                          errorMessage.toLowerCase().includes('unauthorized');
      
      toast({
        title: isAuthError ? "Session expired" : "Error processing tags",
        description: isAuthError ? "Please refresh the page and try again" : errorMessage,
        variant: "destructive",
      });
    } finally {
      setProcessingTags(false);
    }
  };

  const handleClearPad = () => {
    setScratchPadContent('');
    toast({
      title: "Scratch pad cleared",
      description: "Your scratch pad has been cleared",
    });
  };


  // Show loading while both layout and daily plan data load
  if (loading || layoutLoading) {
    return (
      <Layout>
        <LoadingState message="Loading daily plan..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <ErrorState
          title={error.includes('No active cycle') ? 'No Active Cycle' : 'Error Loading Daily Plan'}
          message={error}
          onRetry={loadDailyPlan}
        />
      </Layout>
    );
  }

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <Layout>
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Daily Plan</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-muted-foreground">{today}</p>
              {/* Office Hours Display */}
              {cycleData?.office_hours_start && (
                <OfficeHoursDisplay
                  officeHoursStart={cycleData.office_hours_start}
                  officeHoursEnd={cycleData.office_hours_end}
                  officeHoursDays={cycleData.office_hours_days}
                  variant="compact"
                />
              )}
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {/* Save Status Indicator */}
            <SaveStatusIndicator status={saveStatus} lastSaved={lastSaved} />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" asChild>
                  <Link to="/settings/daily-page">
                    <Settings className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Customize this page</p>
              </TooltipContent>
            </Tooltip>
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard">Dashboard</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/habits">Habits</Link>
            </Button>
          </div>
        </div>

        {/* ============================================ */}
        {/* BANNERS ZONE (always visible at top)        */}
        {/* ============================================ */}

        {/* 1. Cycle Progress Banner */}
        <CycleProgressBanner compact />

        {/* 2. Calendar Reconnect Banner */}
        <CalendarReconnectBanner />

        {/* 3. GAP Reconnection Message (conditional) */}
        {gapStatus?.shouldShowAlert && activeCycleData && (
          <Card className={`border-2 ${
            gapStatus.severity === 'critical' ? 'border-destructive bg-destructive/5' :
            gapStatus.severity === 'urgent' ? 'border-orange-500 bg-orange-500/5' :
            'border-primary bg-primary/5'
          }`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Welcome back! Let's reconnect to your goal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-background/80 rounded-lg p-4 border border-border">
                <p className="text-sm text-muted-foreground mb-1">
                  You're working toward:
                </p>
                <p className="text-lg font-semibold">
                  {activeCycleData.goal}
                </p>
                {activeCycleData.identity && (
                  <p className="text-sm text-muted-foreground italic mt-2">
                    "{activeCycleData.identity}"
                  </p>
                )}
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  What would feel good to do today?
                </p>
                <p className="text-sm text-muted-foreground">
                  You don't have to catch up on everything. Just start with ONE thing.
                </p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    setGapStatus(null);
                    document.querySelector('[data-section="one-thing"]')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  variant="default"
                  size="sm"
                >
                  Pick My One Thing →
                </Button>
                <Button
                  onClick={() => navigate('/cycle-setup')}
                  variant="outline"
                  size="sm"
                >
                  Review My Full Plan
                </Button>
                <Button
                  onClick={() => setGapStatus(null)}
                  variant="ghost"
                  size="sm"
                >
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 4. Weekly Focus Launch (conditional - first day of week) */}
        {isFirstDayOfWeek && currentWeeklyPlan && currentWeeklyPlan.top_3_priorities.length > 0 && (
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Weekly Focus Launch
              </CardTitle>
              <CardDescription>
                Here's what you're focusing on this week
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {currentWeeklyPlan.top_3_priorities.map((priority, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{idx + 1}.</span>
                    <p className="font-medium">{priority}</p>
                  </div>
                ))}
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <Label className="text-base font-medium">
                  Alignment Check: How aligned do you feel with this week's focus?
                </Label>
                <Slider
                  value={[alignmentScore]}
                  onValueChange={([value]) => {
                    setAlignmentScore(value);
                  }}
                  min={1}
                  max={10}
                  step={1}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Not aligned</span>
                  <span className="font-semibold text-base">{alignmentScore}/10</span>
                  <span>Fully aligned</span>
                </div>
                
                {alignmentScore <= 6 && (
                  <Alert className="mt-4 border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
                    <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <AlertDescription className="text-sm">
                      Feeling misaligned? Take a few minutes to work through what's creating the gap.
                      <div className="flex gap-2 mt-3">
                        <Button 
                          onClick={() => navigate('/tools/ctfar')}
                          variant="outline"
                          size="sm"
                        >
                          Self-Coach Now
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 5. Save Status Banner for offline/error states */}
        <SaveStatusBanner status={saveStatus} onRetry={() => saveNow(dailyPlanData)} />

        {/* ============================================ */}
        {/* MORNING ZONE (High Energy)                  */}
        {/* ============================================ */}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 6. Habits Tracker Card */}
          {isSectionVisible('habits_tracker') && (
            <HabitTrackerCard view="daily" />
          )}

          {/* 7. Identity Anchor (if exists) */}
          {isSectionVisible('identity_anchor') && identityAnchor && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Today's Identity Anchor
                </CardTitle>
                <CardDescription>
                  Remember who you are and what you stand for
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold mb-4">{identityAnchor.identity_statement}</p>
                {(normalizeArray(identityAnchor.supporting_habits).length > 0 || normalizeArray(identityAnchor.supporting_actions).length > 0) && (
                  <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                    {normalizeArray(identityAnchor.supporting_habits).length > 0 && (
                      <div>
                        <p className="font-semibold mb-1">Key Habits:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {normalizeArray(identityAnchor.supporting_habits).slice(0, 3).map((habit: string, idx: number) => (
                            <li key={idx}>{habit}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {normalizeArray(identityAnchor.supporting_actions).length > 0 && (
                      <div>
                        <p className="font-semibold mb-1">Key Actions:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {normalizeArray(identityAnchor.supporting_actions).slice(0, 3).map((action: string, idx: number) => (
                            <li key={idx}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 8. Brain Dump & Scratch Pad */}
          {isSectionVisible('brain_dump') && (
            <Card className="bg-gradient-to-br from-muted/30 to-muted/10 border-dashed">
              <CardHeader>
                <div className="flex flex-col gap-1">
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    Brain Dump & Scratch Pad
                  </CardTitle>
                  <p className="text-sm font-medium text-primary">{today}</p>
                </div>
                <CardDescription>
                  Capture everything on your mind. Use #task, #idea, #thought, or #win to tag items.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="scratch-title" className="text-sm text-muted-foreground">
                    Entry Title (optional)
                  </Label>
                  <Input
                    id="scratch-title"
                    value={scratchPadTitle}
                    onChange={(e) => setScratchPadTitle(e.target.value)}
                    placeholder="e.g., Planning Q1 Launch, Morning Thoughts, Weekly Wins"
                    className="mt-1"
                    maxLength={200}
                  />
                </div>
                <SmartScratchPad
                  value={scratchPadContent}
                  onChange={setScratchPadContent}
                  onBlur={() => saveNow(dailyPlanData)}
                  maxLength={10000}
                  placeholder="Brain dump here... Type # for tag suggestions

Example:
Record podcast #task
New ad funnel #task  
Maybe pivot to B2B? #idea
Revenue grows with retention #thought
Closed the big deal! #win"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleProcessTags}
                    disabled={processingTags || !scratchPadContent.trim()}
                  >
                    {processingTags ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Process Tags
                      </>
                    )}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!scratchPadContent.trim()}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear Pad
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear scratch pad?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will clear all content from your scratch pad. Make sure you have processed any tags you want to save first.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearPad}>Clear</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <Link to="/journal">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Past Entries
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 9. ONE Thing */}
          {isSectionVisible('one_thing') && (
            <Card data-section="one-thing">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Diamond className="h-5 w-5 text-primary" />
                  Your ONE Thing
                </CardTitle>
                <CardDescription>
                  What's the ONE thing that, if you do it today, everything else will be easier or unnecessary?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={oneThing}
                  onChange={(e) => setOneThing(e.target.value)}
                  placeholder="Your single most important priority for today..."
                  maxLength={200}
                  className="min-h-[100px] resize-none"
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-muted-foreground">
                    {oneThing.length}/200 characters
                  </span>
                  {saveStatus === 'saved' && (
                    <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Auto-saved
                    </span>
                  )}
                  {saveStatus === 'saving' && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Saving...
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 10. Top 3 Priorities */}
          {isSectionVisible('top_3_priorities') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  🎯 Top 3 Priorities
                </CardTitle>
                <CardDescription>
                  Your most important tasks today (should support your ONE thing)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2, 3].map((priorityNum) => {
                  const existingTask = top3Tasks.find(t => t.priority_order === priorityNum);
                  const inputValue = newTop3Text[priorityNum - 1];
                  
                  return (
                    <div key={priorityNum} className="flex items-center gap-3">
                      {existingTask ? (
                        <>
                          <Checkbox
                            checked={existingTask.is_completed}
                            onCheckedChange={() => toggleTop3Task(existingTask.task_id, existingTask.is_completed)}
                          />
                          <div className="flex-1">
                            <Input
                              value={inputValue}
                              onChange={(e) => updateTop3(priorityNum - 1, e.target.value)}
                              onBlur={() => saveTop3Task(priorityNum, inputValue)}
                              placeholder={`Priority ${priorityNum}`}
                              className={existingTask.is_completed ? 'line-through text-muted-foreground' : ''}
                              maxLength={200}
                            />
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {priorityNum === 1 ? 'HIGH' : priorityNum === 2 ? 'MED' : 'LOW'}
                          </Badge>
                        </>
                      ) : (
                        <>
                          <Checkbox disabled className="opacity-30" />
                          <div className="flex-1">
                            <Input
                              value={inputValue}
                              onChange={(e) => updateTop3(priorityNum - 1, e.target.value)}
                              onBlur={() => saveTop3Task(priorityNum, inputValue)}
                              placeholder={`Priority ${priorityNum} - What must you accomplish?`}
                              required={priorityNum === 1}
                              maxLength={200}
                            />
                          </div>
                          <Badge variant="outline" className="text-xs opacity-50">
                            {priorityNum === 1 ? 'HIGH' : priorityNum === 2 ? 'MED' : 'LOW'}
                          </Badge>
                        </>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* 11. Daily Mindset */}
          {isSectionVisible('daily_mindset') && (
            <Card>
              <CardHeader>
                <CardTitle>Daily Mindset</CardTitle>
                <CardDescription>
                  Set your intention and energy for today
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="thought">Today's Key Thought</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setThoughtsModalOpen(true)}
                      >
                        <Brain className="h-4 w-4 mr-2" />
                        Browse Thoughts
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setBeliefsModalOpen(true)}
                      >
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Insert Belief
                      </Button>
                    </div>
                  </div>
                  <Input
                    id="thought"
                    value={thought}
                    onChange={(e) => setThought(e.target.value)}
                    placeholder="What's your focus today?"
                    maxLength={300}
                  />
                  <CharacterCounter current={thought.length} max={300} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="feeling">How I Want to Feel</Label>
                  <Input
                    id="feeling"
                    value={feeling}
                    onChange={(e) => setFeeling(e.target.value)}
                    placeholder="e.g., Energized, Calm, Productive"
                    maxLength={300}
                  />
                  <CharacterCounter current={feeling.length} max={300} className="mt-1" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ============================================ */}
          {/* CONTEXT ZONE (Alignment)                    */}
          {/* ============================================ */}

          {/* 12. Weekly Priorities Display */}
          {isSectionVisible('weekly_priorities') && weeklyPriorities.length > 0 && (
            <Card className="border-accent/30 bg-gradient-to-r from-accent/10 to-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  📅 This Week's 3 Priorities
                </CardTitle>
                <CardDescription>
                  Your focus areas for the week - align your daily tasks to these
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {weeklyPriorities.map((priority, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                        selectedPriorities.includes(priority) 
                          ? 'bg-accent/20 border border-accent/40' 
                          : 'bg-muted/30 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-accent/20 text-accent font-bold text-sm shrink-0">
                        {idx + 1}
                      </div>
                      <span className="text-sm font-medium flex-1">{priority}</span>
                      <Checkbox
                        checked={selectedPriorities.includes(priority)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPriorities([...selectedPriorities, priority]);
                          } else {
                            setSelectedPriorities(selectedPriorities.filter((p) => p !== priority));
                          }
                        }}
                        className="shrink-0"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  ✓ Check the priorities you're working on today
                </p>
              </CardContent>
            </Card>
          )}

          {/* 13. Monthly Focus Reminder */}
          {isSectionVisible('monthly_focus') && monthlyFocus && (
            <Card className="border-accent/20 bg-accent/5">
              <CardContent className="py-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium">
                  📅 This Month: <span className="text-accent font-bold">{monthlyFocus}</span>
                </span>
              </CardContent>
            </Card>
          )}

          {/* 14. Cycle Snapshot Card */}
          {isSectionVisible('cycle_snapshot') && cycleData && (
            <CycleSnapshotCard />
          )}

          {/* 15. Goal Rewrite Prompt */}
          {isSectionVisible('goal_rewrite') && cycleData && (
            <GoalRewritePrompt
              context="daily"
              currentRewrite={goalRewrite}
              previousRewrite={previousGoalRewrite}
              cycleGoal={cycleData?.goal || ''}
              onSave={(text) => {
                setGoalRewrite(text);
                toast({ title: 'Goal saved!' });
              }}
              saving={savingGoalRewrite}
            />
          )}

          {/* ============================================ */}
          {/* EXECUTION ZONE (During Day)                 */}
          {/* ============================================ */}

          {/* 16. Calendar Agenda + Tasks Pool (inline, side-by-side) */}
          {isSectionVisible('calendar_agenda') && (
            <InlineCalendarAgenda
              officeHoursStart={cycleData?.office_hours_start ? parseInt(cycleData.office_hours_start.split(':')[0], 10) : 9}
              officeHoursEnd={cycleData?.office_hours_end ? parseInt(cycleData.office_hours_end.split(':')[0], 10) : 17}
              onTaskUpdate={loadDailyPlan}
            />
          )}

          {/* 17. Info Cards Row */}
          {isSectionVisible('info_cards') && (
            <InfoCards />
          )}

          {/* 18. Posting Slot Card */}
          {isSectionVisible('posting_slot') && (
            <PostingSlotCard />
          )}

          {/* 19. Nurture Checkin Card */}
          {isSectionVisible('nurture_checkin') && (
            <NurtureCheckinCard />
          )}

          {/* 20. Quick Log Card */}
          {isSectionVisible('quick_log') && (
            <QuickLogCard />
          )}

          {/* 21. Completed Today (dynamic - only shows if tasks completed) */}
          {isSectionVisible('completed_today') && (() => {
            const completedTop3 = top3Tasks.filter(t => t.is_completed);
            const completedOther = otherTasks.filter(t => t.is_completed);
            const totalCompleted = completedTop3.length + completedOther.length;
            
            if (totalCompleted === 0) return null;
            
            return (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                    ✅ Completed Today ({totalCompleted})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {completedTop3.map((task) => (
                    <div key={task.task_id} className="flex items-center gap-3">
                      <Checkbox
                        checked={true}
                        onCheckedChange={() => toggleTop3Task(task.task_id, true)}
                      />
                      <span className="text-sm line-through text-muted-foreground">{task.task_text}</span>
                      <Badge variant="outline" className="text-xs">Top 3</Badge>
                    </div>
                  ))}
                  {completedOther.map((task) => (
                    <div key={task.task_id} className="flex items-center gap-3">
                      <Checkbox
                        checked={true}
                        onCheckedChange={() => toggleOtherTask(task.task_id, true)}
                      />
                      <span className="text-sm line-through text-muted-foreground">{task.task_text}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })()}

          {/* ============================================ */}
          {/* EVENING ZONE (Reflection)                   */}
          {/* ============================================ */}

          {/* 22. End of Day Reflection (only after 5pm) */}
          {isSectionVisible('end_of_day_reflection') && (() => {
            const currentHour = new Date().getHours();
            if (currentHour < 17) return null;
            
            return (
              <Card className="border-accent/20 bg-gradient-to-r from-accent/5 to-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Moon className="h-5 w-5 text-accent" />
                    🌙 End of Day Reflection
                  </CardTitle>
                  <CardDescription>
                    Take a moment to reflect on your day before wrapping up
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Textarea
                    value={endOfDayReflection}
                    onChange={(e) => setEndOfDayReflection(e.target.value)}
                    placeholder="How did today go? What are you grateful for? What will you do differently tomorrow?"
                    className="min-h-[150px] resize-y"
                    maxLength={1000}
                  />
                  <CharacterCounter current={endOfDayReflection.length} max={1000} />
                </CardContent>
              </Card>
            );
          })()}

          {/* 23. Deep Mode toggle */}
          {isSectionVisible('deep_mode') && (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setDeepMode(!deepMode)}
              >
                {deepMode ? (
                  <>
                    <ChevronUp className="mr-2 h-4 w-4" />
                    Back to Quick Mode
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-2 h-4 w-4" />
                    Switch to Deep Mode
                  </>
                )}
              </Button>

              {/* Deep Mode Content */}
              {deepMode && (
                <Card>
                  <CardHeader>
                    <CardTitle>Deep Mode</CardTitle>
                    <CardDescription>
                      Dig deeper into your planning and reflection
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="win">What would make today a win?</Label>
                      <Textarea
                        id="win"
                        value={deepModeNotes.win}
                        onChange={(e) => setDeepModeNotes({ ...deepModeNotes, win: e.target.value })}
                        placeholder="Define success for today..."
                        rows={3}
                        maxLength={500}
                      />
                    </div>
                    <div>
                      <Label htmlFor="obstacles">Obstacles & Solutions</Label>
                      <Textarea
                        id="obstacles"
                        value={deepModeNotes.obstacles}
                        onChange={(e) => setDeepModeNotes({ ...deepModeNotes, obstacles: e.target.value })}
                        placeholder="What might get in the way? How will you handle it?"
                        rows={4}
                        maxLength={500}
                      />
                    </div>
                    <div>
                      <Label htmlFor="show_up">How do I want to show up?</Label>
                      <Textarea
                        id="show_up"
                        value={deepModeNotes.show_up}
                        onChange={(e) => setDeepModeNotes({ ...deepModeNotes, show_up: e.target.value })}
                        placeholder="What energy and presence do you want to bring?"
                        rows={3}
                        maxLength={500}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={manualSaving || saveStatus === 'saving'}>
            {manualSaving || saveStatus === 'saving' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Daily Plan'
            )}
          </Button>
        </form>

        {/* ============================================ */}
        {/* BOTTOM (Navigation)                         */}
        {/* ============================================ */}

        {/* 24. Quick Actions links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Link to="/dashboard">
              <Button variant="outline" className="w-full justify-start">
                View Dashboard →
              </Button>
            </Link>
            <Link to="/weekly-plan">
              <Button variant="outline" className="w-full justify-start">
                Weekly Plan →
              </Button>
            </Link>
            <Link to="/habits">
              <Button variant="outline" className="w-full justify-start">
                Track Habits →
              </Button>
            </Link>
            <Link to="/cycle-setup">
              <Button variant="outline" className="w-full justify-start">
                Manage 90-Day Cycle →
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      
      <UsefulThoughtsModal
        open={thoughtsModalOpen}
        onOpenChange={setThoughtsModalOpen}
        onSelect={(selectedThought) => setThought(selectedThought)}
      />
      
      <BeliefSelectorModal
        open={beliefsModalOpen}
        onOpenChange={setBeliefsModalOpen}
        onSelect={(belief) => setThought(belief)}
      />
      
      <ScratchPadOrganizeModal
        open={organizeModalOpen}
        onOpenChange={setOrganizeModalOpen}
        processedData={processedData}
        scratchPadContent={scratchPadContent}
        onComplete={() => setProcessedData(null)}
      />
      
      {user && (
        <YesterdayReviewPopup
          open={showYesterdayReview}
          onClose={() => setShowYesterdayReview(false)}
          userId={user.id}
        />
      )}

      {/* Navigation warning for unprocessed tags */}
      <UnprocessedTagsWarning
        scratchPadContent={scratchPadContent}
        onProcessTags={handleProcessTags}
      />
    </Layout>
  );
}
