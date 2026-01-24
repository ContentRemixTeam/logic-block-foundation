import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, Clock, Target, Mail, Video, MessageSquare, 
  Mic, FileText, Users, Megaphone, CheckCircle2, AlertTriangle,
  Rocket, Sparkles
} from 'lucide-react';
import { LaunchWizardData } from '@/types/launch';
import { format, parseISO, differenceInDays, addDays, subWeeks } from 'date-fns';

interface LaunchVisualTimelineProps {
  data: LaunchWizardData;
  onChange?: (updates: Partial<LaunchWizardData>) => void;
}

interface TimelineTask {
  id: string;
  title: string;
  type: 'email' | 'social' | 'video' | 'podcast' | 'event' | 'asset' | 'milestone';
  week: number;
  source: string;
  completed?: boolean;
}

const TYPE_CONFIG = {
  email: { icon: Mail, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', label: 'Email' },
  social: { icon: MessageSquare, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', label: 'Social' },
  video: { icon: Video, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', label: 'Video' },
  podcast: { icon: Mic, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', label: 'Podcast' },
  event: { icon: Users, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', label: 'Live Event' },
  asset: { icon: FileText, color: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300', label: 'Asset' },
  milestone: { icon: Target, color: 'bg-primary/10 text-primary', label: 'Milestone' },
};

const WEEK_THEMES = [
  { week: -4, theme: 'Runway Start', icon: Rocket, description: 'Build awareness & seed problem' },
  { week: -3, theme: 'Content Heavy', icon: FileText, description: 'Deliver value & share stories' },
  { week: -2, theme: 'Warm Up', icon: Sparkles, description: 'Increase engagement & proof' },
  { week: -1, theme: 'Final Prep', icon: Target, description: 'Last touches & anticipation' },
  { week: 0, theme: 'Launch Week', icon: Megaphone, description: 'Cart open - make offers!' },
];

export function LaunchVisualTimeline({ data }: LaunchVisualTimelineProps) {
  const runwayWeeks = data.runwayWeeks || 4;

  // Generate week columns based on runway
  const weekColumns = Array.from({ length: runwayWeeks + 1 }, (_, i) => ({
    week: -runwayWeeks + i,
    ...WEEK_THEMES.find(t => t.week === -runwayWeeks + i) || 
      { theme: `Week ${-runwayWeeks + i}`, icon: Calendar, description: '' },
  }));

  // Aggregate all tasks from wizard data
  const allTasks: TimelineTask[] = [];

  // Add content pieces
  data.contentPieces?.forEach(piece => {
    allTasks.push({
      id: piece.id,
      title: piece.title,
      type: piece.type as TimelineTask['type'],
      week: piece.scheduledWeek,
      source: 'content',
      completed: piece.status === 'published',
    });
  });

  // Add video content
  data.videoContent?.forEach(video => {
    // Estimate week from date
    const week = estimateWeekFromDate(video.scheduledDate, data.cartOpens, runwayWeeks);
    allTasks.push({
      id: video.id,
      title: video.topic,
      type: 'video',
      week,
      source: 'video',
    });
  });

  // Add podcast appearances
  data.podcastAppearances?.forEach(podcast => {
    const week = estimateWeekFromDate(podcast.recordingDate, data.cartOpens, runwayWeeks);
    allTasks.push({
      id: podcast.id,
      title: podcast.showName,
      type: 'podcast',
      week,
      source: 'podcast',
    });
  });

  // Add live events
  data.liveEvents?.forEach((event, idx) => {
    const week = estimateWeekFromDate(event.date, data.cartOpens, runwayWeeks);
    allTasks.push({
      id: `event-${idx}`,
      title: event.topic || event.type,
      type: 'event',
      week,
      source: 'events',
    });
  });

  // Add email sequences as milestones from preLaunchTasks
  if (data.preLaunchTasks?.emailSequences) {
    const emailTypes = data.preLaunchTasks.emailTypes;
    if (emailTypes.warmUp) {
      allTasks.push({
        id: 'email-seq-warmup',
        title: 'Warm-up emails',
        type: 'email',
        week: -2,
        source: 'sequences',
      });
    }
    if (emailTypes.launch) {
      allTasks.push({
        id: 'email-seq-launch',
        title: 'Launch emails',
        type: 'email',
        week: 0,
        source: 'sequences',
      });
    }
    if (emailTypes.cartClose) {
      allTasks.push({
        id: 'email-seq-urgency',
        title: 'Cart close emails',
        type: 'email',
        week: 0,
        source: 'sequences',
      });
    }
  }

  // Add milestones from preLaunchTasks
  if (data.preLaunchTasks?.salesPage && data.preLaunchTasks.salesPageDeadline) {
    const week = estimateWeekFromDate(data.preLaunchTasks.salesPageDeadline, data.cartOpens, runwayWeeks);
    allTasks.push({
      id: 'milestone-sales-page',
      title: 'Sales page complete',
      type: 'asset',
      week,
      source: 'assets',
    });
  }

  if (data.preLaunchTasks?.waitlistPage && data.preLaunchTasks.waitlistDeadline) {
    const week = estimateWeekFromDate(data.preLaunchTasks.waitlistDeadline, data.cartOpens, runwayWeeks);
    allTasks.push({
      id: 'milestone-waitlist',
      title: 'Waitlist opens',
      type: 'milestone',
      week,
      source: 'waitlist',
    });
  }

  // Add cart open milestone
  allTasks.push({
    id: 'milestone-cart-open',
    title: '🚀 Cart Opens!',
    type: 'milestone',
    week: 0,
    source: 'launch',
  });

  // Group tasks by week
  const tasksByWeek = weekColumns.reduce((acc, col) => {
    acc[col.week] = allTasks.filter(t => t.week === col.week);
    return acc;
  }, {} as Record<number, TimelineTask[]>);

  // Calculate dates for each week
  const getWeekDates = (week: number) => {
    if (!data.cartOpens) return '';
    try {
      const cartOpen = parseISO(data.cartOpens);
      const weekStart = subWeeks(cartOpen, -week);
      return format(weekStart, 'MMM d');
    } catch {
      return '';
    }
  };

  // Calculate days until launch
  const daysUntilLaunch = () => {
    if (!data.cartOpens) return null;
    try {
      return differenceInDays(parseISO(data.cartOpens), new Date());
    } catch {
      return null;
    }
  };

  const days = daysUntilLaunch();

  // Stats
  const stats = {
    total: allTasks.length,
    emails: allTasks.filter(t => t.type === 'email').length,
    videos: allTasks.filter(t => t.type === 'video').length,
    social: allTasks.filter(t => t.type === 'social').length,
    events: allTasks.filter(t => t.type === 'event').length,
  };

  // Warnings
  const warnings: string[] = [];
  if (stats.total === 0) warnings.push('No content or tasks planned yet');
  if (!data.salesPageDeadline) warnings.push('Sales page deadline not set');
  if (!data.hasTestimonials) warnings.push('No testimonials planned');
  if (days !== null && days < 14 && stats.total < 5) warnings.push('Less than 2 weeks out with minimal content');

  return (
    <div className="space-y-6">
      {/* Header with countdown */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Launch Timeline: {data.name || 'Your Launch'}
              </CardTitle>
              <CardDescription className="mt-1">
                {runwayWeeks}-week runway • Cart opens {data.cartOpens ? format(parseISO(data.cartOpens), 'MMMM d, yyyy') : '—'}
              </CardDescription>
            </div>
            {days !== null && (
              <div className="text-right">
                <div className="text-3xl font-bold text-primary">{days}</div>
                <div className="text-xs text-muted-foreground">days until launch</div>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="pt-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div className="space-y-1">
                {warnings.map((warning, i) => (
                  <p key={i} className="text-sm text-amber-700 dark:text-amber-300">• {warning}</p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats row */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="gap-1">
          <Target className="h-3 w-3" />
          {stats.total} items planned
        </Badge>
        {stats.emails > 0 && (
          <Badge variant="secondary" className={TYPE_CONFIG.email.color}>
            <Mail className="h-3 w-3 mr-1" />
            {stats.emails} emails
          </Badge>
        )}
        {stats.videos > 0 && (
          <Badge variant="secondary" className={TYPE_CONFIG.video.color}>
            <Video className="h-3 w-3 mr-1" />
            {stats.videos} videos
          </Badge>
        )}
        {stats.social > 0 && (
          <Badge variant="secondary" className={TYPE_CONFIG.social.color}>
            <MessageSquare className="h-3 w-3 mr-1" />
            {stats.social} social
          </Badge>
        )}
        {stats.events > 0 && (
          <Badge variant="secondary" className={TYPE_CONFIG.event.color}>
            <Users className="h-3 w-3 mr-1" />
            {stats.events} events
          </Badge>
        )}
      </div>

      {/* Week-by-week timeline */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${weekColumns.length}, minmax(150px, 1fr))` }}>
        {weekColumns.map(col => {
          const Icon = col.icon;
          const tasks = tasksByWeek[col.week] || [];
          const isLaunchWeek = col.week === 0;
          
          return (
            <Card 
              key={col.week}
              className={`${isLaunchWeek ? 'border-primary bg-primary/5' : ''}`}
            >
              <CardHeader className="pb-2 px-3 pt-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${isLaunchWeek ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-xs font-medium ${isLaunchWeek ? 'text-primary' : 'text-muted-foreground'}`}>
                    {col.week === 0 ? 'Launch' : `Week ${col.week}`}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">{col.theme}</p>
                {data.cartOpens && (
                  <p className="text-[10px] text-muted-foreground">{getWeekDates(col.week)}</p>
                )}
              </CardHeader>
              <CardContent className="px-3 pb-3 pt-0">
                <div className="space-y-1 min-h-[60px]">
                  {tasks.length > 0 ? (
                    tasks.slice(0, 5).map(task => {
                      const config = TYPE_CONFIG[task.type];
                      const TaskIcon = config.icon;
                      return (
                        <div
                          key={task.id}
                          className={`flex items-center gap-1.5 p-1.5 rounded text-[10px] ${config.color}`}
                        >
                          <TaskIcon className="h-3 w-3 shrink-0" />
                          <span className="truncate">{task.title}</span>
                          {task.completed && <CheckCircle2 className="h-3 w-3 ml-auto text-green-600" />}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-[10px] text-muted-foreground italic py-2">No tasks</p>
                  )}
                  {tasks.length > 5 && (
                    <p className="text-[10px] text-muted-foreground">+{tasks.length - 5} more</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center text-xs text-muted-foreground">
        {Object.entries(TYPE_CONFIG).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <div key={key} className="flex items-center gap-1">
              <Icon className="h-3 w-3" />
              <span>{config.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper to estimate week from a specific date
function estimateWeekFromDate(dateStr: string, cartOpensStr: string, runwayWeeks: number): number {
  if (!dateStr || !cartOpensStr) return -1;
  try {
    const date = parseISO(dateStr);
    const cartOpens = parseISO(cartOpensStr);
    const daysDiff = differenceInDays(date, cartOpens);
    const week = Math.ceil(daysDiff / 7);
    // Clamp to runway range
    return Math.max(-runwayWeeks, Math.min(0, week));
  } catch {
    return -1;
  }
}