import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Calendar, ListTodo } from 'lucide-react';
import { useCalendarSettings } from '@/hooks/useCalendarSettings';

export function CalendarSettingsCard() {
  const { settings, updateSettings, isLoading } = useCalendarSettings();

  if (isLoading) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Calendar Integration
        </CardTitle>
        <CardDescription>
          Control how content appears in your planners
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-tasks" className="text-sm font-medium">
              Auto-create tasks
            </Label>
            <p className="text-xs text-muted-foreground">
              Automatically create "Create" and "Publish" tasks when adding content with dates
            </p>
          </div>
          <Switch
            id="auto-tasks"
            checked={settings.autoCreateContentTasks}
            onCheckedChange={(checked) => updateSettings({ autoCreateContentTasks: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="show-content" className="text-sm font-medium">
              Show content in planners
            </Label>
            <p className="text-xs text-muted-foreground">
              Display scheduled content items in Daily, Weekly, and Monthly planners
            </p>
          </div>
          <Switch
            id="show-content"
            checked={settings.showContentInPlanners}
            onCheckedChange={(checked) => updateSettings({ showContentInPlanners: checked })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
