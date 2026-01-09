import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { startOfWeek, format } from 'date-fns';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { WeeklyReflectionForm, type ReflectionData } from '@/components/reflections/WeeklyReflectionForm';
import { ShareReflectionCard } from '@/components/reflections/ShareReflectionCard';

const STORAGE_KEY = 'weekly_reflection_draft';

interface CycleData {
  goal: string;
  focus_area: string;
}

export default function WeeklyReflection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shareCount, setShareCount] = useState(0);
  const [cycleData, setCycleData] = useState<CycleData | null>(null);
  
  const [reflectionData, setReflectionData] = useState<ReflectionData>({
    weekStartDate: startOfWeek(new Date(), { weekStartsOn: 1 }),
    wins: '',
    wentWell: '',
    learned: '',
    nextWeekFocus: '',
    includePrompts: false,
    includeGoal: true,
  });

  // Debounce timer ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load reflection data on mount
  useEffect(() => {
    if (user) {
      loadReflection();
      loadCycleData();
    }
  }, [user]);

  // Check for prefill data from Weekly Review
  useEffect(() => {
    const prefill = location.state?.prefill;
    if (prefill) {
      setReflectionData((prev) => ({
        ...prev,
        wins: prefill.wins?.join('\n') || prev.wins,
        learned: prefill.lessons?.join('\n') || prev.learned,
        nextWeekFocus: prefill.intentions?.join('\n') || prev.nextWeekFocus,
      }));
      // Clear the state to prevent re-applying on navigation
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Save to localStorage immediately on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...reflectionData,
      weekStartDate: reflectionData.weekStartDate.toISOString(),
    }));
  }, [reflectionData]);

  // Debounced save to database
  useEffect(() => {
    if (!user || loading) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveReflection();
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [reflectionData, user, loading]);

  const loadCycleData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: cycle } = await supabase
        .from('cycles_90_day')
        .select('goal, focus_area')
        .eq('user_id', session.user.id)
        .lte('start_date', today)
        .gte('end_date', today)
        .maybeSingle();

      if (cycle) {
        setCycleData(cycle);
      }
    } catch (error) {
      console.error('Error loading cycle data:', error);
    }
  };

  const loadReflection = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');

      // Try to load from database first
      const { data: reflection, error } = await supabase
        .from('weekly_reflections')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('week_start_date', weekStartStr)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (reflection) {
        setReflectionData({
          weekStartDate: new Date(reflection.week_start_date),
          wins: reflection.wins || '',
          wentWell: reflection.went_well || '',
          learned: reflection.learned || '',
          nextWeekFocus: reflection.next_week_focus || '',
          includePrompts: reflection.include_prompts || false,
          includeGoal: reflection.include_goal !== false,
        });
        setShareCount(reflection.share_count || 0);
      } else {
        // Try localStorage fallback
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            const storedWeekStart = new Date(parsed.weekStartDate);
            // Only use localStorage data if it's for the current week
            if (format(storedWeekStart, 'yyyy-MM-dd') === weekStartStr) {
              setReflectionData({
                ...parsed,
                weekStartDate: storedWeekStart,
              });
            }
          } catch (e) {
            console.error('Error parsing stored reflection:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error loading reflection:', error);
      toast({
        title: 'Error loading reflection',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveReflection = async () => {
    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const weekStartStr = format(reflectionData.weekStartDate, 'yyyy-MM-dd');

      const { error } = await supabase
        .from('weekly_reflections')
        .upsert({
          user_id: session.user.id,
          week_start_date: weekStartStr,
          wins: reflectionData.wins,
          went_well: reflectionData.wentWell,
          learned: reflectionData.learned,
          next_week_focus: reflectionData.nextWeekFocus,
          include_prompts: reflectionData.includePrompts,
          include_goal: reflectionData.includeGoal,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,week_start_date',
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving reflection:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const weekStartStr = format(reflectionData.weekStartDate, 'yyyy-MM-dd');

      const { error } = await supabase
        .from('weekly_reflections')
        .upsert({
          user_id: session.user.id,
          week_start_date: weekStartStr,
          wins: reflectionData.wins,
          went_well: reflectionData.wentWell,
          learned: reflectionData.learned,
          next_week_focus: reflectionData.nextWeekFocus,
          include_prompts: reflectionData.includePrompts,
          include_goal: reflectionData.includeGoal,
          shared_at: new Date().toISOString(),
          share_count: shareCount + 1,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,week_start_date',
        });

      if (error) throw error;
      setShareCount((prev) => prev + 1);
    } catch (error) {
      console.error('Error updating share count:', error);
    }
  };

  const handleReflectionChange = useCallback((data: ReflectionData) => {
    setReflectionData(data);
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/reviews')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Weekly Reflection</h1>
              <p className="text-muted-foreground">
                Share your wins and lessons with the community
                {saving && <span className="ml-2 text-xs">(Saving...)</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>Your Reflection</CardTitle>
              <CardDescription>
                Fill in your wins, lessons, and insights from this week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WeeklyReflectionForm
                data={reflectionData}
                onChange={handleReflectionChange}
                hasActiveCycle={!!cycleData}
                cycleGoal={cycleData?.goal}
                focusArea={cycleData?.focus_area}
              />
            </CardContent>
          </Card>

          {/* Share Card */}
          <div className="lg:sticky lg:top-6 h-fit">
            <ShareReflectionCard
              data={reflectionData}
              cycleGoal={cycleData?.goal}
              focusArea={cycleData?.focus_area}
              shareCount={shareCount}
              onShare={handleShare}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
