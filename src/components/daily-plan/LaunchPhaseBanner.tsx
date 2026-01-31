import { format, differenceInDays, differenceInHours, parseISO } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Rocket, 
  Flame, 
  Target, 
  Clock,
  Brain,
  ChevronRight
} from 'lucide-react';

interface LaunchPhaseBannerProps {
  launch: {
    id: string;
    name: string;
    cart_opens: string;
    cart_closes: string;
    project_id?: string;
    daysUntilOpen: number;
    daysUntilClose: number;
    hoursUntilClose: number;
    isLive: boolean;
    phase: string;
  };
  isInGap?: boolean;
  className?: string;
}

export function LaunchPhaseBanner({ launch, isInGap = false, className }: LaunchPhaseBannerProps) {
  const navigate = useNavigate();
  
  // Determine banner content based on phase
  const getBannerContent = () => {
    const hoursLeft = launch.hoursUntilClose;
    const daysLeft = launch.daysUntilClose;
    const daysToOpen = launch.daysUntilOpen;

    // Last 48 hours - URGENT
    if (launch.isLive && hoursLeft <= 48 && hoursLeft > 0) {
      return {
        icon: <Flame className="h-5 w-5" />,
        title: `CART CLOSES IN ${hoursLeft} HOURS`,
        description: "Final push time! Make those last offers count.",
        variant: 'destructive' as const,
        animate: true,
      };
    }

    // Live - ACTIVE
    if (launch.isLive) {
      return {
        icon: <Rocket className="h-5 w-5" />,
        title: "LAUNCH IS LIVE!",
        description: `${daysLeft} days left. Make offers. Track sales. You've got this.`,
        variant: 'default' as const,
        animate: false,
      };
    }

    // Pre-launch < 7 days - IMMINENT
    if (daysToOpen <= 7 && daysToOpen > 0) {
      return {
        icon: <Clock className="h-5 w-5" />,
        title: `${daysToOpen} DAYS UNTIL LAUNCH`,
        description: "Final prep time. Review your tasks and get ready.",
        variant: 'warning' as const,
        animate: false,
      };
    }

    // Pre-launch - NORMAL
    return {
      icon: <Target className="h-5 w-5" />,
      title: `Launch opens ${format(parseISO(launch.cart_opens), 'MMM d')}`,
      description: "Focus on your prep tasks today.",
      variant: 'default' as const,
      animate: false,
    };
  };

  const content = getBannerContent();

  const variantStyles = {
    destructive: 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400',
    warning: 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    default: 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400',
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Alert className={cn(
        variantStyles[content.variant],
        content.animate && "animate-pulse"
      )}>
        <div className="flex items-center gap-3">
          {content.icon}
          <div className="flex-1">
            <div className="font-semibold text-sm">{content.title}</div>
            <AlertDescription className="text-xs opacity-90">
              {content.description}
            </AlertDescription>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="shrink-0"
            onClick={() => navigate(`/projects/${launch.project_id}`)}
          >
            View
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </Alert>

      {/* GAP Warning (if applicable) */}
      {isInGap && launch.isLive && (
        <Alert className="border-purple-500/50 bg-purple-500/10 text-purple-700 dark:text-purple-400">
          <div className="flex items-center gap-3">
            <Brain className="h-5 w-5" />
            <div className="flex-1">
              <div className="font-semibold text-sm">You're in THE GAP</div>
              <AlertDescription className="text-xs opacity-90">
                Energy dips are normal. Your launch matters more than your mood. Keep going.
              </AlertDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="shrink-0"
              onClick={() => navigate('/self-coaching')}
            >
              <Brain className="h-4 w-4 mr-1" />
              Coach
            </Button>
          </div>
        </Alert>
      )}
    </div>
  );
}
