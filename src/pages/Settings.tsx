import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    minimal_mode: false,
    quick_mode_default: true,
    habit_categories_enabled: true,
    show_income_tracker: false,
  });

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings({
          minimal_mode: data.minimal_mode || false,
          quick_mode_default: data.quick_mode_default !== false,
          habit_categories_enabled: data.habit_categories_enabled !== false,
          show_income_tracker: data.show_income_tracker || false,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const updateSetting = async (key: string, value: boolean) => {
    if (!user) return;
    setLoading(true);

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
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Customize your planning experience</p>
        </div>

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
                disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="income">Income Tracker</Label>
                <div className="text-sm text-muted-foreground">
                  Show income tracking features
                </div>
              </div>
              <Switch
                id="income"
                checked={settings.show_income_tracker}
                onCheckedChange={(checked) =>
                  updateSetting('show_income_tracker', checked)
                }
                disabled={loading}
              />
            </div>
          </CardContent>
        </Card>

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
