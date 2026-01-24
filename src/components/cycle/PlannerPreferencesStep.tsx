import { useState } from 'react';
import { Check, Sparkles, List, LayoutGrid, Settings2, Calendar, Target, Brain, Clock, FileText, BarChart3, BookOpen, Repeat, Coffee, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  PlannerStyle,
  PlannerPreferences,
  DailyPageWidgets,
  WeeklyPageWidgets,
  PLANNER_STYLE_PRESETS,
} from '@/hooks/usePlannerPreferences';

interface PlannerPreferencesStepProps {
  preferences: PlannerPreferences;
  onChange: (preferences: PlannerPreferences) => void;
}

const STYLE_OPTIONS: {
  value: PlannerStyle;
  label: string;
  description: string;
  icon: React.ReactNode;
  recommended?: boolean;
}[] = [
  {
    value: 'minimal',
    label: 'Keep It Simple',
    description: 'Just the essentials. Top 3 tasks and quick capture—no overwhelm.',
    icon: <List className="h-5 w-5" />,
  },
  {
    value: 'balanced',
    label: 'Balanced',
    description: 'Core features with habits, calendar, and time blocks. Great default.',
    icon: <LayoutGrid className="h-5 w-5" />,
    recommended: true,
  },
  {
    value: 'detailed',
    label: 'Full Control',
    description: 'Everything enabled—metrics, journaling, thought work, and more.',
    icon: <Settings2 className="h-5 w-5" />,
  },
];

const DAILY_WIDGET_OPTIONS: {
  key: keyof DailyPageWidgets;
  label: string;
  description: string;
  icon: React.ReactNode;
  essential?: boolean;
}[] = [
  { key: 'top3Tasks', label: 'Top 3 Tasks', description: 'Your most important tasks for the day', icon: <Target className="h-4 w-4" />, essential: true },
  { key: 'todayFocus', label: 'Today\'s Focus', description: 'One-line intention for your day', icon: <Lightbulb className="h-4 w-4" /> },
  { key: 'habits', label: 'Habit Tracker', description: 'Track daily habits and streaks', icon: <Repeat className="h-4 w-4" /> },
  { key: 'timeBlocks', label: 'Time Blocks', description: 'Visual schedule with drag-and-drop', icon: <Clock className="h-4 w-4" /> },
  { key: 'calendar', label: 'Calendar Events', description: 'Google Calendar integration', icon: <Calendar className="h-4 w-4" /> },
  { key: 'scratchPad', label: 'Scratch Pad', description: 'Quick notes and brain dump', icon: <FileText className="h-4 w-4" /> },
  { key: 'metrics', label: 'Daily Metrics', description: 'Track key business numbers', icon: <BarChart3 className="h-4 w-4" /> },
  { key: 'journaling', label: 'Journaling', description: 'Morning/evening reflection prompts', icon: <BookOpen className="h-4 w-4" /> },
  { key: 'thoughtWork', label: 'Thought Work', description: 'CTFAR model for mindset', icon: <Brain className="h-4 w-4" /> },
];

const WEEKLY_WIDGET_OPTIONS: {
  key: keyof WeeklyPageWidgets;
  label: string;
  description: string;
  icon: React.ReactNode;
  essential?: boolean;
}[] = [
  { key: 'weeklyGoals', label: 'Weekly Goals', description: 'Set your top priorities for the week', icon: <Target className="h-4 w-4" />, essential: true },
  { key: 'priorityList', label: 'Priority List', description: 'Drag tasks to schedule your week', icon: <List className="h-4 w-4" /> },
  { key: 'habitTracker', label: 'Habit Overview', description: 'Weekly habit completion view', icon: <Repeat className="h-4 w-4" /> },
  { key: 'calendar', label: 'Week Calendar', description: 'Full week calendar view', icon: <Calendar className="h-4 w-4" /> },
  { key: 'courseStudy', label: 'Course Sessions', description: 'Scheduled study sessions', icon: <BookOpen className="h-4 w-4" /> },
  { key: 'projectProgress', label: 'Project Progress', description: 'Active project status cards', icon: <LayoutGrid className="h-4 w-4" /> },
  { key: 'metricsReview', label: 'Metrics Review', description: 'Weekly metrics summary', icon: <BarChart3 className="h-4 w-4" /> },
  { key: 'contentPlan', label: 'Content Plan', description: 'Planned content for the week', icon: <FileText className="h-4 w-4" /> },
  { key: 'thoughtWork', label: 'Mindset Check', description: 'Weekly thought work review', icon: <Brain className="h-4 w-4" /> },
];

export function PlannerPreferencesStep({ preferences, onChange }: PlannerPreferencesStepProps) {
  const [activeTab, setActiveTab] = useState<'style' | 'customize'>('style');

  const handleStyleChange = (style: PlannerStyle) => {
    onChange({
      plannerStyle: style,
      ...PLANNER_STYLE_PRESETS[style],
    });
  };

  const handleDailyWidgetToggle = (key: keyof DailyPageWidgets) => {
    onChange({
      ...preferences,
      dailyPageWidgets: {
        ...preferences.dailyPageWidgets,
        [key]: !preferences.dailyPageWidgets[key],
      },
    });
  };

  const handleWeeklyWidgetToggle = (key: keyof WeeklyPageWidgets) => {
    onChange({
      ...preferences,
      weeklyPageWidgets: {
        ...preferences.weeklyPageWidgets,
        [key]: !preferences.weeklyPageWidgets[key],
      },
    });
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'style' | 'customize')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="style" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Quick Setup
          </TabsTrigger>
          <TabsTrigger value="customize" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Customize
          </TabsTrigger>
        </TabsList>

        <TabsContent value="style" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Choose a planning style that matches how you work. You can always customize later.
          </p>

          <div className="grid gap-3">
            {STYLE_OPTIONS.map(option => {
              const isSelected = preferences.plannerStyle === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => handleStyleChange(option.value)}
                  className={cn(
                    'relative flex items-start p-4 rounded-lg border-2 text-left transition-all',
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  )}
                >
                  <div className={cn(
                    'p-2 rounded-lg mr-4 flex-shrink-0',
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}>
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{option.label}</span>
                      {option.recommended && (
                        <Badge variant="secondary" className="text-xs">
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {option.description}
                    </p>
                  </div>
                  {isSelected && (
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <Card className="bg-muted/50 border-dashed">
            <CardContent className="flex items-start gap-3 py-3">
              <Coffee className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Start simple, add as you need</p>
                <p className="mt-1">
                  Most successful users start with <strong>Balanced</strong> and tweak from there. 
                  Less is often more when building new habits.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customize" className="space-y-6 mt-4">
          {/* Daily Page Widgets */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Daily Planning Page</CardTitle>
              <CardDescription>Choose what to show on your daily view</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {DAILY_WIDGET_OPTIONS.map(option => (
                <div key={option.key} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded bg-muted">
                      {option.icon}
                    </div>
                    <div>
                      <Label htmlFor={`daily-${option.key}`} className="font-medium cursor-pointer">
                        {option.label}
                        {option.essential && (
                          <Badge variant="outline" className="ml-2 text-xs">Essential</Badge>
                        )}
                      </Label>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                  <Switch
                    id={`daily-${option.key}`}
                    checked={preferences.dailyPageWidgets[option.key]}
                    onCheckedChange={() => handleDailyWidgetToggle(option.key)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Separator />

          {/* Weekly Page Widgets */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Weekly Planning Page</CardTitle>
              <CardDescription>Choose what to show on your weekly view</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {WEEKLY_WIDGET_OPTIONS.map(option => (
                <div key={option.key} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded bg-muted">
                      {option.icon}
                    </div>
                    <div>
                      <Label htmlFor={`weekly-${option.key}`} className="font-medium cursor-pointer">
                        {option.label}
                        {option.essential && (
                          <Badge variant="outline" className="ml-2 text-xs">Essential</Badge>
                        )}
                      </Label>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                  <Switch
                    id={`weekly-${option.key}`}
                    checked={preferences.weeklyPageWidgets[option.key]}
                    onCheckedChange={() => handleWeeklyWidgetToggle(option.key)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
