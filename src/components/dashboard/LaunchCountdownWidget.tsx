import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO, differenceInHours } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Rocket, 
  Clock, 
  Flame, 
  Calendar,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { 
  getCurrentLaunchPhase, 
  daysUntilCartOpens, 
  daysUntilCartCloses,
  hoursUntilCartCloses,
  type ActiveLaunch 
} from '@/lib/launchHelpers';

interface LaunchCountdownWidgetProps {
  launch: ActiveLaunch;
  className?: string;
}

type CountdownState = 
  | 'pre-runway'
  | 'runway'
  | 'pre-launch'
  | 'cart-open'
  | 'last-48h'
  | 'post-launch';

export function LaunchCountdownWidget({ launch, className }: LaunchCountdownWidgetProps) {
  const countdownData = useMemo(() => {
    const today = new Date();
    const phaseInfo = getCurrentLaunchPhase(launch, today);
    const hoursLeft = hoursUntilCartCloses(launch, today);
    const daysToOpen = daysUntilCartOpens(launch, today);
    const daysToClose = daysUntilCartCloses(launch, today);
    
    // Determine state
    let state: CountdownState = 'pre-runway';
    
    if (phaseInfo) {
      if (phaseInfo.phase === 'runway') state = 'runway';
      else if (phaseInfo.phase === 'pre-launch') state = 'pre-launch';
      else if (phaseInfo.phase === 'cart-open') {
        state = hoursLeft <= 48 ? 'last-48h' : 'cart-open';
      }
      else if (phaseInfo.phase === 'post-launch') state = 'post-launch';
    } else if (daysToOpen > 0) {
      state = 'pre-runway';
    }

    // Calculate countdown values
    const runwayStart = launch.runway_start_date 
      ? parseISO(launch.runway_start_date) 
      : null;
    const cartOpens = parseISO(launch.cart_opens);
    const cartCloses = parseISO(launch.cart_closes);
    
    let countdownValue: number;
    let countdownLabel: string;
    let targetDate: Date;
    
    switch (state) {
      case 'pre-runway':
        countdownValue = runwayStart 
          ? Math.ceil((runwayStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : daysToOpen;
        countdownLabel = 'until runway starts';
        targetDate = runwayStart || cartOpens;
        break;
      case 'runway':
        countdownValue = daysToOpen;
        countdownLabel = 'until pre-launch';
        targetDate = launch.pre_launch_start_date 
          ? parseISO(launch.pre_launch_start_date)
          : cartOpens;
        break;
      case 'pre-launch':
        countdownValue = daysToOpen;
        countdownLabel = 'until CART OPENS';
        targetDate = cartOpens;
        break;
      case 'cart-open':
        countdownValue = daysToClose;
        countdownLabel = 'until cart closes';
        targetDate = cartCloses;
        break;
      case 'last-48h':
        countdownValue = hoursLeft;
        countdownLabel = 'CART CLOSES';
        targetDate = cartCloses;
        break;
      case 'post-launch':
        const postEnd = launch.post_launch_end_date 
          ? parseISO(launch.post_launch_end_date)
          : cartCloses;
        countdownValue = Math.ceil((postEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        countdownLabel = 'post-launch remaining';
        targetDate = postEnd;
        break;
    }

    return {
      state,
      phaseInfo,
      countdownValue,
      countdownLabel,
      targetDate,
      daysToOpen,
      daysToClose,
      hoursLeft,
    };
  }, [launch]);

  const { state, phaseInfo, countdownValue, countdownLabel, targetDate } = countdownData;

  // Get styling based on state
  const getStateStyles = () => {
    switch (state) {
      case 'last-48h':
        return {
          icon: <Flame className="h-5 w-5 text-red-500" />,
          bgClass: 'bg-red-500/10',
          borderClass: 'border-red-500/30',
          textClass: 'text-red-600 dark:text-red-400',
          gradient: 'from-red-500/10 to-orange-500/10',
          animate: true,
        };
      case 'cart-open':
        return {
          icon: <Sparkles className="h-5 w-5 text-green-500" />,
          bgClass: 'bg-green-500/10',
          borderClass: 'border-green-500/30',
          textClass: 'text-green-600 dark:text-green-400',
          gradient: 'from-green-500/10 to-emerald-500/10',
          animate: false,
        };
      case 'pre-launch':
        return {
          icon: <Rocket className="h-5 w-5 text-purple-500" />,
          bgClass: 'bg-purple-500/10',
          borderClass: 'border-purple-500/30',
          textClass: 'text-purple-600 dark:text-purple-400',
          gradient: 'from-purple-500/10 to-pink-500/10',
          animate: false,
        };
      case 'runway':
        return {
          icon: <Clock className="h-5 w-5 text-blue-500" />,
          bgClass: 'bg-blue-500/10',
          borderClass: 'border-blue-500/30',
          textClass: 'text-blue-600 dark:text-blue-400',
          gradient: 'from-blue-500/10 to-cyan-500/10',
          animate: false,
        };
      case 'post-launch':
        return {
          icon: <Calendar className="h-5 w-5 text-orange-500" />,
          bgClass: 'bg-orange-500/10',
          borderClass: 'border-orange-500/30',
          textClass: 'text-orange-600 dark:text-orange-400',
          gradient: 'from-orange-500/10 to-amber-500/10',
          animate: false,
        };
      default:
        return {
          icon: <Rocket className="h-5 w-5 text-primary" />,
          bgClass: 'bg-primary/10',
          borderClass: 'border-primary/30',
          textClass: 'text-primary',
          gradient: 'from-primary/10 to-primary/5',
          animate: false,
        };
    }
  };

  const styles = getStateStyles();

  return (
    <Card className={cn(
      "overflow-hidden border-border/40 hover:shadow-lg transition-all duration-300",
      styles.borderClass,
      styles.animate && "animate-pulse",
      className
    )}>
      <CardHeader className={cn("bg-gradient-to-r to-transparent pb-3", styles.gradient)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", styles.bgClass)}>
              {styles.icon}
            </div>
            <div>
              <CardTitle className="text-base">Launch Countdown</CardTitle>
              <p className="text-xs text-muted-foreground">{launch.name}</p>
            </div>
          </div>
          {phaseInfo && (
            <Badge variant="outline" className={cn("text-xs", styles.textClass)}>
              {phaseInfo.phaseName}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className={cn(
          "rounded-lg p-4 text-center border",
          styles.bgClass,
          styles.borderClass
        )}>
          {/* Large countdown number */}
          <div className={cn("text-4xl font-bold mb-1", styles.textClass)}>
            {countdownValue}
            {state === 'last-48h' && <span className="text-xl ml-1">hrs</span>}
          </div>
          
          {/* Countdown label */}
          <p className="text-sm text-muted-foreground mb-2">
            {countdownLabel}
          </p>
          
          {/* Target date */}
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{format(targetDate, 'MMM d, yyyy')}</span>
          </div>
        </div>

        {/* Phase info */}
        {phaseInfo && (
          <div className="mt-3 text-center">
            <p className="text-xs text-muted-foreground">
              Day {phaseInfo.dayInPhase} of {phaseInfo.totalPhaseDays} in {phaseInfo.phaseName}
            </p>
          </div>
        )}

        {/* Action button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-4 gap-2 group"
          asChild
        >
          <Link to={`/projects/${launch.id}`}>
            View Launch Dashboard
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
