import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import { ReflectionList } from '@/components/ReflectionList';

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
  });

  const [dailyQuestions, setDailyQuestions] = useState<string[]>([""]);
  const [weeklyQuestions, setWeeklyQuestions] = useState<string[]>([""]);
  const [monthlyQuestions, setMonthlyQuestions] = useState<string[]>([""]);
  const [cycleSummaryQuestions, setCycleSummaryQuestions] = useState<string[]>([""]);

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
        minimal_mode: data.minimal_mode || false,
        quick_mode_default: data.quick_mode_default !== false,
        habit_categories_enabled: data.habit_categories_enabled !== false,
        show_income_tracker: data.show_income_tracker || false,
      });

      setDailyQuestions(
        Array.isArray(data.daily_review_questions) && data.daily_review_questions.length > 0
          ? data.daily_review_questions
          : [""]
      );
      setWeeklyQuestions(
        Array.isArray(data.weekly_review_questions) && data.weekly_review_questions.length > 0
          ? data.weekly_review_questions
          : [""]
      );
      setMonthlyQuestions(
        Array.isArray(data.monthly_review_questions) && data.monthly_review_questions.length > 0
          ? data.monthly_review_questions
          : [""]
      );
      setCycleSummaryQuestions(
        Array.isArray(data.cycle_summary_questions) && data.cycle_summary_questions.length > 0
          ? data.cycle_summary_questions
          : [""]
      );
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({ title: "Failed to load settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: boolean) => {
    if (!user) return;

    try {
      setSettings((prev) => ({ ...prev, [key]: value }));

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          [key]: value,
        });

      if (error) throw error;

      toast({
        title: 'Settings updated!',
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
    </Layout>
  );
}
