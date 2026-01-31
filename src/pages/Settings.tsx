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
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { normalizeArray, normalizeBoolean } from '@/lib/normalize';
import { Loader2, Save, ArrowLeft, Bug, Trash2, RotateCcw, Crown, Sparkles, Palette, Circle, Gamepad2, Coins, Dog, Timer, GraduationCap, DollarSign, LayoutGrid, ChevronRight, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useArcade } from '@/hooks/useArcade';
import { ReflectionList } from '@/components/ReflectionList';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTour } from '@/hooks/useTour';
import { GoogleCalendarPanel } from '@/components/google-calendar/GoogleCalendarPanel';
import { THEMES, THEME_IDS, ThemeId } from '@/lib/themes';
import { DelightSettingsCard, DataRecoveryCard } from '@/components/settings';
import { ThemeGallery } from '@/components/themes';

export default function Settings() {
  const { user } = useAuth();
  const { setTheme: setContextTheme } = useTheme();
  const { settings: arcadeSettings, updateSettings: updateArcadeSettings } = useArcade();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    minimal_mode: false,
    quick_mode_default: true,
    habit_categories_enabled: true,
    show_income_tracker: false,
    theme_preference: 'quest' as 'quest' | 'minimal' | 'vibrant' | 'bw',
    scratch_pad_review_mode: 'quick_save' as 'quick_save' | 'organize_now',
    works_weekends: false,
    show_mastermind_calls: true,
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
        works_weekends: normalizeBoolean(data.works_weekends, false),
        show_mastermind_calls: normalizeBoolean(data.show_mastermind_calls, true),
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

      // Use context's setTheme for theme_preference to update all components
      if (key === 'theme_preference') {
        await setContextTheme(value as 'quest' | 'minimal' | 'vibrant' | 'bw');
        toast({
          title: '⚡ Theme updated!',
        });
        return;
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

  // Help section component
  const HelpSection = () => {
    const { restartTour } = useTour();
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Help</CardTitle>
          <CardDescription>
            Need a refresher? Restart the interactive tour.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={restartTour}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Restart App Tour
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            This will show you the guided walkthrough of all the main features.
          </p>
        </CardContent>
      </Card>
    );
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
            <CardTitle>Visual Theme</CardTitle>
            <CardDescription>Choose your preferred experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {THEME_IDS.map((themeId) => {
                const themeConfig = THEMES[themeId];
                const isSelected = settings.theme_preference === themeId;
                
                const IconComponent = {
                  crown: Crown,
                  sparkles: Sparkles,
                  palette: Palette,
                  circle: Circle,
                }[themeConfig.icon];
                
                return (
                  <button
                    key={themeId}
                    onClick={() => updateSetting('theme_preference', themeId)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `hsl(${themeConfig.previewColor})` }}
                      >
                        <IconComponent className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="font-semibold">{themeConfig.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {themeConfig.description}
                    </p>
                  </button>
                );
              })}
            </div>
            
            {settings.theme_preference === 'quest' && (
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm">
                  🎮 <strong>Quest Mode Active!</strong> Earn XP for completing reviews, maintain streaks, and level up as you progress through your 90-day journey.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Install Apps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Install Apps
            </CardTitle>
            <CardDescription>
              Install Boss Planner apps on your home screen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link 
              to="/install" 
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <LayoutGrid className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">Boss Planner</div>
                  <div className="text-sm text-muted-foreground">Full planning experience</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
            <Link 
              to="/install-quick-add" 
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-medium">Quick Add</div>
                  <div className="text-sm text-muted-foreground">Fast capture for tasks & ideas</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>

        {/* Google Calendar Integration */}
        <GoogleCalendarPanel />

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

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="worksWeekends">Work on Weekends</Label>
                <div className="text-sm text-muted-foreground">
                  Include Saturday and Sunday in your work schedule
                </div>
              </div>
              <Switch
                id="worksWeekends"
                checked={settings.works_weekends}
                onCheckedChange={(checked) =>
                  updateSetting('works_weekends', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <div className="space-y-0.5">
                  <Label htmlFor="showMastermind">Show Mastermind Calls</Label>
                  <div className="text-sm text-muted-foreground">
                    Display mastermind calls button in weekly planner
                  </div>
                </div>
              </div>
              <Switch
                id="showMastermind"
                checked={settings.show_mastermind_calls}
                onCheckedChange={(checked) =>
                  updateSetting('show_mastermind_calls', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div className="space-y-0.5">
                  <Label htmlFor="showFinance">Finance Tracker</Label>
                  <div className="text-sm text-muted-foreground">
                    Show financial tracking in sidebar and dashboard
                  </div>
                </div>
              </div>
              <Switch
                id="showFinance"
                checked={settings.show_income_tracker}
                onCheckedChange={(checked) =>
                  updateSetting('show_income_tracker', checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Daily Page Layout */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              Daily Page Layout
            </CardTitle>
            <CardDescription>
              Customize sections and add custom check-ins
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full justify-between group"
              onClick={() => navigate('/settings/daily-page')}
            >
              <span>Customize Daily Page</span>
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Hide sections you don't use, reorder your workflow, add custom daily questions
            </p>
          </CardContent>
        </Card>

        {/* Mobile App */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Mobile App
            </CardTitle>
            <CardDescription>
              Install Boss Planner on your phone for the best mobile experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Get instant access from your home screen with mobile-optimized features:
              </p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Tap-to-schedule task scheduling</li>
                <li>• Larger touch targets for easy navigation</li>
                <li>• Swipeable day selector in weekly planner</li>
                <li>• Works offline for capturing ideas anywhere</li>
              </ul>
            </div>
            <Button asChild>
              <Link to="/install">
                <Smartphone className="h-4 w-4 mr-2" />
                Install App
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Gamification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5" />
              Gamification
            </CardTitle>
            <CardDescription>
              Task Arcade, Pet Store, and Focus Timer features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="arcade">Enable Gamification</Label>
                <div className="text-sm text-muted-foreground">
                  Earn coins for tasks, grow pets, play games
                </div>
              </div>
              <Switch
                id="arcade"
                checked={arcadeSettings.arcade_enabled}
                onCheckedChange={(checked) => {
                  updateArcadeSettings({ arcade_enabled: checked });
                  toast({ title: checked ? '🎮 Gamification enabled!' : 'Gamification disabled' });
                }}
              />
            </div>

            {arcadeSettings.arcade_enabled && (
              <>
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-3">Header Display</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-muted-foreground" />
                        <div className="space-y-0.5">
                          <Label htmlFor="showCoins">Show Coin Counter</Label>
                          <div className="text-sm text-muted-foreground">
                            Display coin balance in header
                          </div>
                        </div>
                      </div>
                      <Switch
                        id="showCoins"
                        checked={arcadeSettings.show_coin_counter}
                        onCheckedChange={(checked) => updateArcadeSettings({ show_coin_counter: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Dog className="h-4 w-4 text-muted-foreground" />
                        <div className="space-y-0.5">
                          <Label htmlFor="showPet">Show Pet Widget</Label>
                          <div className="text-sm text-muted-foreground">
                            Display your daily pet in header
                          </div>
                        </div>
                      </div>
                      <Switch
                        id="showPet"
                        checked={arcadeSettings.show_pet_widget}
                        onCheckedChange={(checked) => updateArcadeSettings({ show_pet_widget: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Timer className="h-4 w-4 text-muted-foreground" />
                        <div className="space-y-0.5">
                          <Label htmlFor="showTimer">Show Focus Timer</Label>
                          <div className="text-sm text-muted-foreground">
                            Display pomodoro timer in header
                          </div>
                        </div>
                      </div>
                      <Switch
                        id="showTimer"
                        checked={arcadeSettings.show_pomodoro_widget}
                        onCheckedChange={(checked) => updateArcadeSettings({ show_pomodoro_widget: checked })}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-3">Other Settings</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="reduceMotion">Reduce Motion</Label>
                        <div className="text-sm text-muted-foreground">
                          Minimize animations
                        </div>
                      </div>
                      <Switch
                        id="reduceMotion"
                        checked={arcadeSettings.arcade_reduce_motion}
                        onCheckedChange={(checked) => updateArcadeSettings({ arcade_reduce_motion: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="sounds">Sound Effects</Label>
                        <div className="text-sm text-muted-foreground">
                          Play sounds for actions
                        </div>
                      </div>
                      <Switch
                        id="sounds"
                        checked={!arcadeSettings.arcade_sounds_off}
                        onCheckedChange={(checked) => updateArcadeSettings({ arcade_sounds_off: !checked })}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Delight & Celebrations Settings (Theme FX) */}
        <DelightSettingsCard />

        {/* Theme Gallery (Unlocked Themes from Challenges) */}
        <ThemeGallery />

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
            <CardTitle>30-Day Review Questions</CardTitle>
            <CardDescription>Custom questions for your 30-day reflection</CardDescription>
          </CardHeader>
          <CardContent>
            <ReflectionList
              items={monthlyQuestions}
              onChange={setMonthlyQuestions}
              label="Question"
              placeholder="What question helps you reflect on your 30 days?"
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
        {/* Data Recovery - Prompt 10 */}
        <DataRecoveryCard />

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

        {/* Help Section */}
        <HelpSection />

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
