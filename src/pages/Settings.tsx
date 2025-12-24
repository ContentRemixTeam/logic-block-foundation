import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Layout } from '@/components/Layout';
import { LoadingState } from '@/components/system/LoadingState';
import { ErrorState } from '@/components/system/ErrorState';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { normalizeArray, normalizeBoolean } from '@/lib/normalize';
import { Loader2, Save, ArrowLeft, Bug, Trash2 } from 'lucide-react';
import { ReflectionList } from '@/components/ReflectionList';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    minimal_mode: false,
    quick_mode_default: true,
    habit_categories_enabled: true,
    show_income_tracker: false,
    theme_preference: 'vibrant' as 'vibrant' | 'bw',
    scratch_pad_review_mode: 'quick_save' as 'quick_save' | 'organize_now',
  });

  const [dailyQuestions, setDailyQuestions] = useState<string[]>([""]);
  const [weeklyQuestions, setWeeklyQuestions] = useState<string[]>([""]);
  const [monthlyQuestions, setMonthlyQuestions] = useState<string[]>([""]);
  const [cycleSummaryQuestions, setCycleSummaryQuestions] = useState<string[]>([""]);
  
  const [debugDialogOpen, setDebugDialogOpen] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Please log in", variant: "destructive" });
        navigate("/auth");
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-user-settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load settings: ${res.status}`);
      }

      const data = await res.json();

      setSettings({
        minimal_mode: normalizeBoolean(data.minimal_mode),
        quick_mode_default: normalizeBoolean(data.quick_mode_default, true),
        habit_categories_enabled: normalizeBoolean(data.habit_categories_enabled, true),
        show_income_tracker: normalizeBoolean(data.show_income_tracker),
        theme_preference: data.theme_preference || 'vibrant',
        scratch_pad_review_mode: data.scratch_pad_review_mode || 'quick_save',
      });

      // Apply theme to document
      document.documentElement.setAttribute('data-theme', data.theme_preference || 'vibrant');

      const dailyQ = normalizeArray(data.daily_review_questions);
      const weeklyQ = normalizeArray(data.weekly_review_questions);
      const monthlyQ = normalizeArray(data.monthly_review_questions);
      const cycleQ = normalizeArray(data.cycle_summary_questions);

      setDailyQuestions(dailyQ.length > 0 ? dailyQ : [""]);
      setWeeklyQuestions(weeklyQ.length > 0 ? weeklyQ : [""]);
      setMonthlyQuestions(monthlyQ.length > 0 ? monthlyQ : [""]);
      setCycleSummaryQuestions(cycleQ.length > 0 ? cycleQ : [""]);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({ title: "Failed to load settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: boolean | string) => {
    if (!user) return;

    try {
      setSettings((prev) => ({ ...prev, [key]: value }));

      // Apply theme immediately if theme_preference is being updated
      if (key === 'theme_preference') {
        document.documentElement.setAttribute('data-theme', value as string);
      }

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          [key]: value,
        });

      if (error) throw error;

      toast({
        title: '⚡ Settings updated!',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSaveQuestions = async () => {
    try {
      setSaving(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Please log in", variant: "destructive" });
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-user-settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          daily_review_questions: dailyQuestions.filter(Boolean),
          weekly_review_questions: weeklyQuestions.filter(Boolean),
          monthly_review_questions: monthlyQuestions.filter(Boolean),
          cycle_summary_questions: cycleSummaryQuestions.filter(Boolean),
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to save settings: ${res.status}`);
      }

      toast({ title: "Custom Questions Saved!", description: "Your questions have been updated." });
    } catch (error) {
      console.error("Error saving questions:", error);
      toast({ title: "Failed to save questions", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDebugData = async () => {
    try {
      setDebugLoading(true);
      const { data, error } = await supabase.functions.invoke('debug-mindset-data');

      if (error) throw error;

      setDebugData(data);
      setDebugDialogOpen(true);
      toast({
        title: 'Debug Complete',
        description: 'Data retrieved successfully',
      });
    } catch (error) {
      console.error('Error debugging data:', error);
      toast({
        title: 'Error',
        description: 'Failed to retrieve debug data',
        variant: 'destructive',
      });
    } finally {
      setDebugLoading(false);
    }
  };

  const handleCleanupData = async () => {
    if (!confirm('This will permanently delete empty categories and thoughts, and merge duplicates. Continue?')) {
      return;
    }

    try {
      setCleanupLoading(true);
      const { data, error } = await supabase.functions.invoke('cleanup-mindset-data');

      if (error) throw error;

      toast({
        title: 'Cleanup Complete ⚡',
        description: `Deleted ${data.deleted_categories} categories, ${data.deleted_thoughts} thoughts. Merged ${data.merged_duplicates} duplicates.`,
      });

      // Refresh debug data if dialog is open
      if (debugDialogOpen) {
        handleDebugData();
      }
    } catch (error) {
      console.error('Error cleaning up data:', error);
      toast({
        title: 'Error',
        description: 'Failed to clean up data',
        variant: 'destructive',
      });
    } finally {
      setCleanupLoading(false);
    }
  };

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
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Customize your planning experience</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        </div>

        {/* Theme Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Theme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Choose your theme</Label>
              <div className="flex gap-4">
                <button
                  onClick={() => updateSetting('theme_preference', 'vibrant')}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    settings.theme_preference === 'vibrant'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-2xl">🎨</span>
                    <span className="font-semibold">Vibrant</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Colorful and energetic</p>
                </button>
                <button
                  onClick={() => updateSetting('theme_preference', 'bw')}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    settings.theme_preference === 'bw'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-2xl">⬛</span>
                    <span className="font-semibold">Black & White</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Clean and minimal</p>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Display Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Display Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="minimal">Minimal Mode</Label>
                <div className="text-sm text-muted-foreground">
                  Show only essential elements
                </div>
              </div>
              <Switch
                id="minimal"
                checked={settings.minimal_mode}
                onCheckedChange={(checked) =>
                  updateSetting('minimal_mode', checked)
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="quick">Quick Mode Default</Label>
                <div className="text-sm text-muted-foreground">
                  Start daily plan in quick mode
                </div>
              </div>
              <Switch
                id="quick"
                checked={settings.quick_mode_default}
                onCheckedChange={(checked) =>
                  updateSetting('quick_mode_default', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="categories">Habit Categories</Label>
                <div className="text-sm text-muted-foreground">
                  Enable habit categorization
                </div>
              </div>
              <Switch
                id="categories"
                checked={settings.habit_categories_enabled}
                onCheckedChange={(checked) =>
                  updateSetting('habit_categories_enabled', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="scratchPadMode">Scratch Pad Review Mode</Label>
                <div className="text-sm text-muted-foreground">
                  After processing tags, show organization step
                </div>
              </div>
              <Switch
                id="scratchPadMode"
                checked={settings.scratch_pad_review_mode === 'organize_now'}
                onCheckedChange={(checked) =>
                  updateSetting('scratch_pad_review_mode', checked ? 'organize_now' : 'quick_save')
                }
              />
            </div>
          </CardContent>
        </Card>
        {/* Custom Review Questions */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Review Questions</CardTitle>
            <CardDescription>
              Custom questions for your daily reflection (displayed in Deep Mode)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReflectionList
              items={dailyQuestions}
              onChange={setDailyQuestions}
              label="Question"
              placeholder="What question helps you reflect on your day?"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Review Questions</CardTitle>
            <CardDescription>Custom questions for your weekly reflection</CardDescription>
          </CardHeader>
          <CardContent>
            <ReflectionList
              items={weeklyQuestions}
              onChange={setWeeklyQuestions}
              label="Question"
              placeholder="What question helps you reflect on your week?"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Review Questions</CardTitle>
            <CardDescription>Custom questions for your monthly reflection</CardDescription>
          </CardHeader>
          <CardContent>
            <ReflectionList
              items={monthlyQuestions}
              onChange={setMonthlyQuestions}
              label="Question"
              placeholder="What question helps you reflect on your month?"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>90-Day Cycle Summary Questions</CardTitle>
            <CardDescription>Custom questions for your cycle completion reflection</CardDescription>
          </CardHeader>
          <CardContent>
            <ReflectionList
              items={cycleSummaryQuestions}
              onChange={setCycleSummaryQuestions}
              label="Question"
              placeholder="What question helps you reflect on your 90-day cycle?"
            />
          </CardContent>
        </Card>

        {/* Mindset Data Management */}
        <Card>
          <CardHeader>
            <CardTitle>Mindset Data Management</CardTitle>
            <CardDescription>
              Debug and clean up your mindset categories and thoughts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleDebugData}
                disabled={debugLoading}
              >
                {debugLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Bug className="h-4 w-4 mr-2" />
                    Debug Data
                  </>
                )}
              </Button>
              <Button
                variant="destructive"
                onClick={handleCleanupData}
                disabled={cleanupLoading}
              >
                {cleanupLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cleaning...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clean Up Data
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Debug Data shows all categories and thoughts. Clean Up Data removes empty entries, trims whitespace, and merges duplicate categories.
            </p>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Cancel
          </Button>
          <Button onClick={handleSaveQuestions} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Custom Questions"
            )}
          </Button>
        </div>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium">Email:</span>{' '}
                <span className="text-muted-foreground">{user?.email}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Debug Data Modal */}
      <Dialog open={debugDialogOpen} onOpenChange={setDebugDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Mindset Data Debug</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            {debugData && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Summary</h3>
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(debugData.data?.summary, null, 2)}
                  </pre>
                </div>

                {debugData.data?.issues && (
                  <div className="p-4 bg-destructive/10 rounded-lg">
                    <h3 className="font-semibold mb-2">Issues Found</h3>
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(debugData.data.issues, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Full Data</h3>
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(debugData.data, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
