import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Target, 
  Megaphone, 
  DollarSign, 
  Mail,
  ChevronRight,
  Circle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { 
  getCurrentLaunchPhase, 
  getDailyOfferGoal,
  getPhaseTaskEstimate,
  type ActiveLaunch,
  type PhaseInfo,
  type LaunchPhase
} from '@/lib/launchHelpers';

interface LaunchPhaseReminderWidgetProps {
  launch: ActiveLaunch;
  offersCompletedToday?: number;
  className?: string;
}

interface PhaseContent {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  gradient: string;
  focus: string[];
  actions: { label: string; href: string; primary?: boolean }[];
}

const PHASE_CONTENT: Record<LaunchPhase, PhaseContent> = {
  'runway': {
    icon: <Target className="h-5 w-5 text-blue-500" />,
    iconBg: 'bg-blue-500/10',
    title: 'BUILD BUZZ QUIETLY',
    gradient: 'from-blue-500/10 to-cyan-500/10',
    focus: [
      'Segment your email list',
      'Prep free event content',
      'Build anticipation posts',
    ],
    actions: [
      { label: 'View Tasks', href: '/tasks' },
      { label: 'Go to Daily Plan', href: '/daily-plan', primary: true },
    ],
  },
  'pre-launch': {
    icon: <Megaphone className="h-5 w-5 text-purple-500" />,
    iconBg: 'bg-purple-500/10',
    title: 'ANNOUNCE & PROMOTE',
    gradient: 'from-purple-500/10 to-pink-500/10',
    focus: [
      'Heavy promotion mode',
      'Host your free event',
      'Build urgency & scarcity',
    ],
    actions: [
      { label: 'View Tasks', href: '/tasks' },
      { label: 'Go to Daily Plan', href: '/daily-plan', primary: true },
    ],
  },
  'cart-open': {
    icon: <DollarSign className="h-5 w-5 text-green-500" />,
    iconBg: 'bg-green-500/10',
    title: "YOU'RE LIVE - MAKE OFFERS",
    gradient: 'from-green-500/10 to-emerald-500/10',
    focus: [
      'Make daily offers',
      'Handle objections',
      'Personal DM outreach',
    ],
    actions: [
      { label: 'Log Offer', href: '/daily-plan' },
      { label: 'Go to Daily Plan', href: '/daily-plan', primary: true },
    ],
  },
  'post-launch': {
    icon: <Mail className="h-5 w-5 text-orange-500" />,
    iconBg: 'bg-orange-500/10',
    title: 'FOLLOW UP & DEBRIEF',
    gradient: 'from-orange-500/10 to-amber-500/10',
    focus: [
      'Final follow-up emails',
      'Nurture non-buyers',
      'Complete launch debrief',
    ],
    actions: [
      { label: 'Complete Debrief', href: '/launches', primary: true },
      { label: 'View Results', href: '/progress' },
    ],
  },
};

export function LaunchPhaseReminderWidget({ 
  launch, 
  offersCompletedToday = 0,
  className 
}: LaunchPhaseReminderWidgetProps) {
  const navigate = useNavigate();
  
  const phaseData = useMemo(() => {
    const today = new Date();
    const phaseInfo = getCurrentLaunchPhase(launch, today);
    
    if (!phaseInfo) return null;
    
    const content = PHASE_CONTENT[phaseInfo.phase];
    const taskEstimate = getPhaseTaskEstimate(phaseInfo.phase, phaseInfo.totalPhaseDays);
    const dailyOfferGoal = phaseInfo.phase === 'cart-open' 
      ? getDailyOfferGoal(launch, offersCompletedToday)
      : null;
    
    return {
      phaseInfo,
      content,
      taskEstimate,
      dailyOfferGoal,
    };
  }, [launch, offersCompletedToday]);

  if (!phaseData) {
    return null;
  }

  const { phaseInfo, content, taskEstimate, dailyOfferGoal } = phaseData;

  // Render offer goal dots for cart-open phase
  const renderOfferDots = () => {
    if (!dailyOfferGoal || dailyOfferGoal.daily === 0) return null;
    
    const dots = [];
    for (let i = 0; i < dailyOfferGoal.daily; i++) {
      const isCompleted = i < offersCompletedToday;
      dots.push(
        <div 
          key={i}
          className={cn(
            "transition-all",
            isCompleted ? "text-green-500" : "text-muted-foreground/30"
          )}
        >
          {isCompleted ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </div>
      );
    }
    return dots;
  };

  return (
    <Card className={cn(
      "overflow-hidden border-border/40 hover:shadow-lg transition-all duration-300",
      className
    )}>
      <CardHeader className={cn("bg-gradient-to-r to-transparent pb-3", content.gradient)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", content.iconBg)}>
              {content.icon}
            </div>
            <div>
              <CardTitle className="text-base">{content.title}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {phaseInfo.phaseName} Phase (Day {phaseInfo.dayInPhase} of {phaseInfo.totalPhaseDays})
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs capitalize">
            {taskEstimate.intensity} intensity
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Focus items */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Focus:</p>
          <ul className="space-y-1">
            {content.focus.map((item, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Time commitment */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>~{taskEstimate.dailyMinutes >= 60 
            ? `${Math.round(taskEstimate.dailyMinutes / 60)} hr${taskEstimate.dailyMinutes >= 120 ? 's' : ''}/day`
            : `${taskEstimate.dailyMinutes} min/day`
          }</span>
        </div>

        {/* Offer goal (cart-open only) */}
        {dailyOfferGoal && phaseInfo.phase === 'cart-open' && (
          <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Today's offers:</span>
              <span className="text-sm text-muted-foreground">
                {offersCompletedToday} of {dailyOfferGoal.daily}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {renderOfferDots()}
            </div>
            {dailyOfferGoal.onTrack && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                ✓ You're on track today!
              </p>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {content.actions.map((action, i) => (
            <Button
              key={i}
              variant={action.primary ? 'default' : 'outline'}
              size="sm"
              className={cn("flex-1 gap-1", action.primary && "shadow-sm")}
              onClick={() => navigate(action.href)}
            >
              {action.label}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
