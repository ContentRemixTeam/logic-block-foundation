import { type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * A calm empty state. Icon + one warm sentence + one primary action.
 * Never a blank white area. Always feels like an invitation.
 */
export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, body, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-6 gap-4',
        className,
      )}
      role="status"
    >
      <div className="h-14 w-14 rounded-2xl bg-primary/[0.06] flex items-center justify-center">
        <Icon className="h-6 w-6 text-primary/70" aria-hidden />
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="text-base font-medium text-foreground">{title}</h3>
        {body && <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>}
      </div>
      {action &&
        (action.href ? (
          <Button asChild size="sm" variant="secondary">
            <a href={action.href}>{action.label}</a>
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={action.onClick}>
            {action.label}
          </Button>
        ))}
    </div>
  );
}
