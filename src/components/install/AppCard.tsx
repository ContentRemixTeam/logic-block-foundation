import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  iconGradient?: boolean;
  features: string[];
  badge?: string;
  isActive?: boolean;
  isCompleted?: boolean;
  children?: ReactNode;
}

export function AppCard({
  title,
  description,
  icon,
  iconGradient = false,
  features,
  badge,
  isActive = false,
  isCompleted = false,
  children,
}: AppCardProps) {
  return (
    <Card className={cn(
      "transition-all duration-200",
      isActive && "border-2 border-primary shadow-lg",
      isCompleted && "border-success/50 bg-success/5",
      !isActive && !isCompleted && "hover:border-muted-foreground/30"
    )}>
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center shrink-0",
            iconGradient 
              ? "bg-gradient-to-br from-primary to-accent text-primary-foreground" 
              : "bg-primary text-primary-foreground"
          )}>
            {icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <CardTitle className="text-xl">{title}</CardTitle>
              {badge && (
                <Badge variant={isCompleted ? "default" : "secondary"} className={cn(
                  isCompleted && "bg-success text-success-foreground"
                )}>
                  {isCompleted ? "✓ Installed" : badge}
                </Badge>
              )}
            </div>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 mb-4">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-success shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        {children}
      </CardContent>
    </Card>
  );
}
