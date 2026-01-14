import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PremiumCard } from '@/components/ui/premium-card';
import { 
  Zap, 
  Calendar, 
  Target,
  CheckSquare,
  TrendingUp,
  ArrowRight,
  Lightbulb,
  BookOpen
} from 'lucide-react';

interface QuickActionsPanelProps {
  ideasCount?: number;
}

export function QuickActionsPanel({ ideasCount = 0 }: QuickActionsPanelProps) {
  const actions = [
    {
      label: "Today's Plan",
      href: '/daily-plan',
      icon: CheckSquare,
      color: 'text-[hsl(173,80%,40%)]',
      bgColor: 'bg-[hsl(173,80%,40%)]/10',
    },
    {
      label: 'Track Habits',
      href: '/habits',
      icon: Target,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Weekly Review',
      href: '/weekly-review',
      icon: TrendingUp,
      color: 'text-[hsl(38,92%,50%)]',
      bgColor: 'bg-[hsl(38,92%,50%)]/10',
    },
    {
      label: `Ideas (${ideasCount})`,
      href: '/ideas',
      icon: Lightbulb,
      color: 'text-[hsl(258,89%,66%)]',
      bgColor: 'bg-[hsl(258,89%,66%)]/10',
    },
  ];

  return (
    <PremiumCard showAccent={false}>
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Quick Actions</h3>
      </div>
      <div className="space-y-2">
        {actions.map((action) => (
          <Link key={action.href} to={action.href}>
            <Button 
              variant="ghost" 
              className="w-full justify-between h-11 px-3 hover:bg-muted/50 group"
            >
              <span className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg ${action.bgColor} flex items-center justify-center`}>
                  <action.icon className={`h-4 w-4 ${action.color}`} />
                </div>
                <span className="text-sm font-medium">{action.label}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-foreground-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          </Link>
        ))}
      </div>
    </PremiumCard>
  );
}
