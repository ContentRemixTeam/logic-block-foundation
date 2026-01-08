import { Link } from 'react-router-dom';
import { CalendarDays, Calendar, CalendarRange, Target } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PlanningCard {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColorClass: string;
  iconBgClass: string;
}

const planningCards: PlanningCard[] = [
  {
    title: 'Daily Planning',
    description: "Plan what's most important for today.",
    href: '/daily-plan',
    icon: CalendarDays,
    iconColorClass: 'text-violet-600',
    iconBgClass: 'bg-violet-100',
  },
  {
    title: 'Weekly Planner',
    description: 'Review and plan your weekly focus.',
    href: '/weekly-plan',
    icon: Calendar,
    iconColorClass: 'text-teal-600',
    iconBgClass: 'bg-teal-100',
  },
  {
    title: 'Monthly Planning',
    description: 'Set your main business focus for this month.',
    href: '/monthly-review',
    icon: CalendarRange,
    iconColorClass: 'text-rose-500',
    iconBgClass: 'bg-rose-100',
  },
  {
    title: '90-Day Goals',
    description: 'Define your quarterly goal and milestones.',
    href: '/cycle-setup',
    icon: Target,
    iconColorClass: 'text-purple-600',
    iconBgClass: 'bg-purple-100',
  },
];

export function TaskPlanningCards() {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Task Planning
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {planningCards.map((card) => (
          <Link key={card.href} to={card.href}>
            <Card className="p-4 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                  card.iconBgClass
                )}>
                  <card.icon className={cn('h-5 w-5', card.iconColorClass)} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {card.description}
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
