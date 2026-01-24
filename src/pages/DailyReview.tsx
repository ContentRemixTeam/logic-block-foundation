import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CalendarIcon, CheckCircle2, Loader2, ChevronLeft, ChevronRight, Sparkles, Swords, Shield, Skull, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CycleSnapshotCard } from '@/components/cycle/CycleSnapshotCard';
import { SaveStatusIndicator, SaveStatusBanner } from '@/components/SaveStatusIndicator';
import { LaunchCheckInCard } from '@/components/launch/LaunchCheckInCard';
// Modular 4-hook data protection system (Prompt 5)
import { useLocalStorageSync, ConflictInfo } from '@/hooks/useLocalStorageSync';
import { useServerSync, SyncStatus } from '@/hooks/useServerSync';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';
import { useMobileProtection } from '@/hooks/useMobileProtection';
import { ConflictResolutionModal, ConflictData } from '@/components/data-protection';

export default function DailyReview() {
  const { user } = useAuth();
  const { isQuestMode, getNavLabel, refreshXP, refreshStreak } = useTheme();
  const [selectedDate, setSelectedDate] = useState<Date>(subDays(new Date(), 1));
  const [loading, setLoading] = useState(true);
  const [hasPlan, setHasPlan] = useState(false);
  const [showXPAnimation, setShowXPAnimation] = useState(false);
  
  const [whatWorked, setWhatWorked] = useState('');
  const [whatDidnt, setWhatDidnt] = useState('');
  const [wins, setWins] = useState('');
  const [goalSupport, setGoalSupport] = useState('');
  const [cycleData, setCycleData] = useState<any>(null);
  
  // Quest mode quick rating
  const [quickRating, setQuickRating] = useState<'crushed' | 'survived' | 'struggled' | null>(null);

  // Track initial load to prevent auto-save on first load
  const isInitialLoadRef = useRef(true);
  const selectedDateRef = useRef(selectedDate);

  // Conflict resolution state (Prompt 12)
  const [conflictData, setConflictData] = useState<ConflictData<typeof reviewData> | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);

  // Update ref when date changes
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  // Memoize review data for data protection
  const reviewData = useMemo(() => ({
    whatWorked,
    whatDidnt,
    wins,
    goalSupport,
    quickRating,
    date: format(selectedDate, 'yyyy-MM-dd'),
  }), [whatWorked, whatDidnt, wins, goalSupport, quickRating, selectedDate]);

  const reviewDataRef = useRef(reviewData);
  useEffect(() => {
    reviewDataRef.current = reviewData;
  }, [reviewData]);

  // Local storage key for this review
  const storageKey = `daily_review_backup_${format(selectedDate, 'yyyy-MM-dd')}`;

  // ===== HOOK 1: Local Storage Sync (0ms, immediate) =====
  const { 
    save: saveLocal, 
    load: loadLocalBackup,
    tabId 
  } = useLocalStorageSync<typeof reviewData>({
    key: storageKey,
    enableIndexDBFallback: true,
    enableCrossTabSync: true,
    pageType: 'Daily Review',
    onRemoteUpdate: (data) => {
      // Another tab updated - refresh local state
      if (data.whatWorked !== undefined) setWhatWorked(data.whatWorked);
      if (data.whatDidnt !== undefined) setWhatDidnt(data.whatDidnt);
      if (data.wins !== undefined) setWins(data.wins);
      if (data.goalSupport !== undefined) setGoalSupport(data.goalSupport);
      if (data.quickRating !== undefined) setQuickRating(data.quickRating);
      toast.info('Updated from another tab');
    },
    onConflict: (conflict) => {
      setConflictData(conflict as ConflictData<typeof reviewData>);
      setShowConflictModal(true);
    },
  });

  // Save function for server sync
  const handleServerSave = useCallback(async (data: typeof reviewData) => {
    if (!user) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-daily-review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        date: data.date,
        what_worked: data.whatWorked,
        what_didnt: data.whatDidnt,
        wins: data.wins,
        goal_support: data.goalSupport,
      }),
    });

    const result = await res.json();
    if (result.error) {
      throw new Error(result.error);
    }
  }, [user]);

  // ===== HOOK 2: Server Sync (1s debounce) =====
  const { 
    sync: syncServer, 
    syncNow: syncServerNow, 
    status: serverStatus, 
    lastSynced: lastSaved 
  } = useServerSync<typeof reviewData>({
    saveFn: handleServerSave,
    delay: 1000,
    maxRetries: 3,
    retryDelay: 5000,
    onSuccess: () => {
      // Quest mode XP animation on successful save
      if (isQuestMode) {
        setShowXPAnimation(true);
        setTimeout(() => setShowXPAnimation(false), 2000);
        Promise.all([refreshXP(), refreshStreak()]);
      }
    },
  });

  // Combined save status
  const saveStatus: SyncStatus = serverStatus;

  // ===== HOOK 3: Before Unload (desktop warning) =====
  const hasUnsavedChanges = serverStatus === 'pending' || serverStatus === 'saving';
  useBeforeUnload({
    hasUnsavedChanges,
    onFinalSave: () => { saveLocal(reviewDataRef.current); },
    emergencyConfig: user ? {
      userId: user.id,
      pageType: 'daily_review',
      pageId: format(selectedDate, 'yyyy-MM-dd'),
      getData: () => reviewDataRef.current,
    } : undefined,
  });

  // ===== HOOK 4: Mobile Protection (visibility/pagehide) =====
  useMobileProtection({
    getData: () => reviewDataRef.current,
    onSave: (data) => { saveLocal(data); },
    emergencyConfig: user ? {
      userId: user.id,
      pageType: 'daily_review',
      pageId: format(selectedDate, 'yyyy-MM-dd'),
    } : undefined,
  });

  // Register changes after initial load - trigger both local and server sync
  useEffect(() => {
    if (!loading && !isInitialLoadRef.current) {
      saveLocal(reviewData);
      syncServer(reviewData);
    }
  }, [reviewData, loading, saveLocal, syncServer]);

  // Manual save function
  const saveNow = useCallback(async () => {
    await saveLocal(reviewData);
    await syncServerNow(reviewData);
  }, [reviewData, saveLocal, syncServerNow]);

  // Handle conflict resolution
  const handleConflictResolve = useCallback(async (
    choice: 'local' | 'remote' | 'merge',
    mergedData?: typeof reviewData
  ) => {
    setShowConflictModal(false);
    
    const dataToUse = choice === 'merge' && mergedData 
      ? mergedData 
      : choice === 'local' 
        ? conflictData?.local.data 
        : conflictData?.remote.data;
    
    if (dataToUse) {
      // Apply the chosen data
      if (dataToUse.whatWorked !== undefined) setWhatWorked(dataToUse.whatWorked);
      if (dataToUse.whatDidnt !== undefined) setWhatDidnt(dataToUse.whatDidnt);
      if (dataToUse.wins !== undefined) setWins(dataToUse.wins);
      if (dataToUse.goalSupport !== undefined) setGoalSupport(dataToUse.goalSupport);
      if (dataToUse.quickRating !== undefined) setQuickRating(dataToUse.quickRating);
      
      // Save the resolved data
      await saveLocal(dataToUse);
      await syncServerNow(dataToUse);
    }
    
    setConflictData(null);
  }, [conflictData, saveLocal, syncServerNow]);

  useEffect(() => {
    if (user) {
      loadReview();
    }
  }, [user, selectedDate]);

  const loadReview = async () => {
    if (!user) return;
    setLoading(true);
    isInitialLoadRef.current = true;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-daily-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ date: format(selectedDate, 'yyyy-MM-dd') }),
      });

      const data = await res.json();
      
      if (data.error) {
        console.error('Error loading review:', data.error);
        return;
      }

      setHasPlan(data.hasPlan);
      setCycleData(data.cycle || null);
      
      if (data.review) {
        setWhatWorked(data.review.what_worked || '');
        setWhatDidnt(data.review.what_didnt || '');
        setWins(data.review.wins || '');
        setGoalSupport(data.review.goal_support || '');
      } else {
        setWhatWorked('');
        setWhatDidnt('');
        setWins('');
        setGoalSupport('');
      }
    } catch (error) {
      console.error('Error loading review:', error);
    } finally {
      setLoading(false);
      // Allow auto-save after a short delay to prevent immediate trigger
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 500);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    // Mark as initial load when changing dates to prevent auto-save during load
    isInitialLoadRef.current = true;
    setSelectedDate(prev => 
      direction === 'prev' ? subDays(prev, 1) : subDays(prev, -1)
    );
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const isYesterday = format(selectedDate, 'yyyy-MM-dd') === format(subDays(new Date(), 1), 'yyyy-MM-dd');

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* XP Animation Overlay */}
        {showXPAnimation && (
          <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
            <div className="animate-xp-pop text-4xl font-bold text-primary">
              +5 XP
            </div>
          </div>
        )}

        {/* Save Status Banner */}
        <SaveStatusBanner status={saveStatus} onRetry={saveNow} />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 
              className="text-3xl font-bold flex items-center gap-2"
              style={{ fontFamily: isQuestMode ? 'var(--font-heading)' : 'inherit' }}
            >
              {isQuestMode ? <Swords className="h-8 w-8 text-primary" /> : <Sparkles className="h-8 w-8 text-primary" />}
              {getNavLabel('dailyReview')}
            </h1>
            <p className="text-muted-foreground">
              {isQuestMode ? 'Debrief your mission and log your victories' : 'Reflect on your day and celebrate your wins'}
            </p>
          </div>
          <SaveStatusIndicator status={saveStatus} lastSaved={lastSaved} />
        </div>

        {/* Date Navigation */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="min-w-[200px]">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                      {isYesterday && <span className="ml-2 text-muted-foreground">(Yesterday)</span>}
                      {isToday && <span className="ml-2 text-muted-foreground">(Today)</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          isInitialLoadRef.current = true;
                          setSelectedDate(date);
                        }
                      }}
                      disabled={(date) => date > new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => navigateDate('next')}
                disabled={isToday}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 90-Day Cycle Snapshot */}
        <CycleSnapshotCard />

        {/* Launch Check-In (if active launches) */}
        <LaunchCheckInCard reviewType="daily" />

        {loading ? (
          <Card>
            <CardContent className="py-12 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle style={{ fontFamily: isQuestMode ? 'var(--font-heading)' : 'inherit' }}>
                {isQuestMode ? `Mission Debrief - ${format(selectedDate, 'MMMM d')}` : `Review for ${format(selectedDate, 'MMMM d')}`}
              </CardTitle>
              <CardDescription>
                {isQuestMode ? "How did today's mission go?" : 'Take a moment to reflect on this day'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quest Mode Quick Rating */}
              {isQuestMode && (
                <div className="space-y-3">
                  <Label className="text-base font-medium">Quick Assessment</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setQuickRating('crushed')}
                      className={cn(
                        "p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2",
                        quickRating === 'crushed'
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <Swords className="h-6 w-6 text-primary" />
                      <span className="text-sm font-medium">Crushed It</span>
                    </button>
                    <button
                      onClick={() => setQuickRating('survived')}
                      className={cn(
                        "p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2",
                        quickRating === 'survived'
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <Shield className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm font-medium">Survived</span>
                    </button>
                    <button
                      onClick={() => setQuickRating('struggled')}
                      className={cn(
                        "p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2",
                        quickRating === 'struggled'
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <Skull className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm font-medium">Struggled</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Goal Support Question */}
              {cycleData && (
                <div className="space-y-2">
                  <Label htmlFor="goalSupport" className="text-base font-medium flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    {isQuestMode ? 'Quest Progress' : 'What did you do today that supported your 90-day goal?'}
                  </Label>
                  <p className="text-xs text-muted-foreground">Today moved me toward: {cycleData.goal}</p>
                  <Textarea
                    id="goalSupport"
                    placeholder={isQuestMode ? "How did today advance your main quest?" : "How did today's actions support your goal?"}
                    value={goalSupport}
                    onChange={(e) => setGoalSupport(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
              )}

              {/* What did you accomplish? */}
              <div className="space-y-2">
                <Label htmlFor="wins" className="text-base font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  {isQuestMode ? 'Victories & Loot' : 'What did you accomplish?'}
                </Label>
                <Textarea
                  id="wins"
                  placeholder={isQuestMode ? "What treasures did you claim today?" : "List your wins and accomplishments for the day..."}
                  value={wins}
                  onChange={(e) => setWins(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              {/* What went well? */}
              <div className="space-y-2">
                <Label htmlFor="whatWorked" className="text-base font-medium">
                  {isQuestMode ? 'Successful Strategies' : 'What went well?'}
                </Label>
                <Textarea
                  id="whatWorked"
                  placeholder={isQuestMode ? "What tactics served you well?" : "What worked well today? What are you proud of?"}
                  value={whatWorked}
                  onChange={(e) => setWhatWorked(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              {/* What could have been better? */}
              <div className="space-y-2">
                <Label htmlFor="whatDidnt" className="text-base font-medium">
                  {isQuestMode ? 'Lessons Learned' : 'What could have been better?'}
                </Label>
                <Textarea
                  id="whatDidnt"
                  placeholder={isQuestMode ? "What would you do differently next time?" : "What would you do differently? What lessons did you learn?"}
                  value={whatDidnt}
                  onChange={(e) => setWhatDidnt(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              {/* Manual Save Button (optional, since auto-save is enabled) */}
              <div className="flex justify-end pt-4">
                <Button onClick={saveNow} disabled={saveStatus === 'saving'}>
                  {saveStatus === 'saving' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {isQuestMode ? 'Complete Debrief' : 'Save Review'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Conflict Resolution Modal (Prompt 12) */}
        <ConflictResolutionModal
          open={showConflictModal}
          onOpenChange={setShowConflictModal}
          conflict={conflictData}
          onResolve={handleConflictResolve}
          fieldLabels={{
            whatWorked: 'What Worked',
            whatDidnt: "What Didn't Work",
            wins: 'Wins',
            goalSupport: 'Goal Support',
            quickRating: 'Quick Rating',
          }}
        />
      </div>
    </Layout>
  );
}
