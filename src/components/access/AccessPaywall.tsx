import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Battery, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// Placeholder — point this at the GHL checkout URL when ready.
const RENEW_URL = 'https://plan.faithmariah.com/#renew';

export function AccessPaywall({
  status,
  onRetry,
}: {
  status: 'revoked' | 'expired' | 'none' | 'error' | null;
  onRetry?: () => Promise<void>;
}) {
  const { signOut } = useAuth();

  const heading =
    status === 'error'
      ? "We couldn't verify your access"
      : status === 'expired'
      ? 'Your annual access has ended'
      : status === 'revoked'
      ? 'Your access has ended'
      : "We can't find active access for this email";

  const body =
    status === 'error'
      ? 'Your membership may still be active. Please retry the access check — your data is safe.'
      : status === 'none'
      ? "If you just purchased, it can take a moment for your access to arrive. Try signing out and back in, or reach out and we'll sort it."
      : "Renew to keep planning at your own pace — nothing you've created is lost.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full text-center border-primary/10">
        <CardHeader className="space-y-3">
          <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit">
            <Battery className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="font-serif text-2xl">{heading}</CardTitle>
          <CardDescription className="text-base leading-relaxed">{body}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {status === 'error' ? (
            <Button className="w-full" size="lg" onClick={() => void onRetry?.()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          ) : (
            <Button asChild className="w-full" size="lg">
              <a href={RENEW_URL} target="_blank" rel="noopener noreferrer">
                Renew access
              </a>
            </Button>
          )}
          <Button variant="ghost" className="w-full" onClick={signOut}>
            Sign out
          </Button>
          <p className="text-xs text-muted-foreground pt-2">
            Your data is safe. Renewing brings you right back where you left off.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
