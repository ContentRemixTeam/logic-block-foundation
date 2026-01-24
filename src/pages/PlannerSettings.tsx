import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Check, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePlannerPreferences, PLANNER_STYLE_PRESETS, PlannerStyle } from '@/hooks/usePlannerPreferences';
import { PlannerPreferencesStep } from '@/components/cycle/PlannerPreferencesStep';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function PlannerSettings() {
  const { preferences, isLoading, savePreferences } = usePlannerPreferences();
  const [localPreferences, setLocalPreferences] = useState(preferences);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local state when server preferences load
  useState(() => {
    if (!isLoading && preferences) {
      setLocalPreferences(preferences);
    }
  });

  const handleChange = (newPrefs: typeof preferences) => {
    setLocalPreferences(newPrefs);
    setHasChanges(true);
  };

  const handleSave = async () => {
    await savePreferences(localPreferences);
    setHasChanges(false);
    toast.success('Planner preferences saved');
  };

  const handleReset = () => {
    const balanced = {
      plannerStyle: 'balanced' as PlannerStyle,
      ...PLANNER_STYLE_PRESETS.balanced,
    };
    setLocalPreferences(balanced);
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container max-w-3xl py-8 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-3xl py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/settings">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Settings className="h-6 w-6" />
                Planner Preferences
              </h1>
              <p className="text-muted-foreground">
                Customize what appears on your daily and weekly planning pages
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle>Planning Style</CardTitle>
            <CardDescription>
              Choose how much detail you want in your planning pages. Start simple and add more as needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PlannerPreferencesStep
              preferences={localPreferences}
              onChange={handleChange}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={handleReset}>
            Reset to Balanced
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            {hasChanges ? (
              <>Save Changes</>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Saved
              </>
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
