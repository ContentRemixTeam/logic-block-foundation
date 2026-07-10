import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ComponentProps, ReactNode } from 'react';

/**
 * AppCard — the one canonical card surface for the whole product.
 *
 * All core pages should compose with this instead of hand-rolling `Card`
 * variants. It enforces a single radius / border / shadow rhythm so screens
 * feel consistent without touching 40 files at once.
 *
 * Usage:
 *   <AppCard>
 *     <AppCard.Header>...</AppCard.Header>
 *     <AppCard.Body>...</AppCard.Body>
 *   </AppCard>
 */
type AppCardProps = ComponentProps<typeof Card> & {
  tone?: 'default' | 'quiet' | 'primary';
  interactive?: boolean;
};

export function AppCard({ tone = 'default', interactive, className, ...rest }: AppCardProps) {
  return (
    <Card
      className={cn(
        'rounded-2xl border border-border/60 shadow-[var(--shadow-sm)]',
        tone === 'quiet' && 'bg-muted/40 border-border/40 shadow-none',
        tone === 'primary' && 'border-primary/20 bg-primary/[0.03]',
        interactive && 'transition-shadow hover:shadow-[var(--shadow-md)]',
        className,
      )}
      {...rest}
    />
  );
}

function AppCardHeader({ className, ...rest }: ComponentProps<typeof CardHeader>) {
  return <CardHeader className={cn('space-y-1.5 pb-3', className)} {...rest} />;
}

function AppCardBody({ className, children, ...rest }: ComponentProps<typeof CardContent> & { children?: ReactNode }) {
  return (
    <CardContent className={cn('pt-0', className)} {...rest}>
      {children}
    </CardContent>
  );
}

AppCard.Header = AppCardHeader;
AppCard.Body = AppCardBody;
