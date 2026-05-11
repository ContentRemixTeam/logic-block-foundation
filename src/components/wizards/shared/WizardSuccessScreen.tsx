import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, RotateCw } from 'lucide-react';

export interface SuccessDestination {
  label: string;
  to: string;
  variant?: 'default' | 'outline' | 'secondary';
}

interface WizardSuccessScreenProps {
  title?: string;
  message?: ReactNode;
  destinations: SuccessDestination[];
  partial?: {
    failedLabel: string;
    onRetry?: () => void;
    isRetrying?: boolean;
  };
}

/**
 * Reusable success screen shown after a wizard creates planner objects.
 * Pass `partial` when some creations succeeded and others failed.
 */
export function WizardSuccessScreen({
  title = 'Added to your planner!',
  message = 'You can find everything in the destinations below.',
  destinations,
  partial,
}: WizardSuccessScreenProps) {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardContent className="py-10 px-6 space-y-6 text-center">
          {partial ? (
            <AlertTriangle className="h-12 w-12 mx-auto text-amber-500" />
          ) : (
            <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
          )}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">{title}</h2>
            <p className="text-muted-foreground">{message}</p>
          </div>

          {partial && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-left text-sm space-y-3">
              <p>
                <strong>Heads up:</strong> {partial.failedLabel}
              </p>
              {partial.onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={partial.onRetry}
                  disabled={partial.isRetrying}
                >
                  <RotateCw
                    className={`h-4 w-4 mr-2 ${partial.isRetrying ? 'animate-spin' : ''}`}
                  />
                  Retry
                </Button>
              )}
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {destinations.map((dest) => (
              <Button
                key={dest.to}
                variant={dest.variant ?? 'default'}
                onClick={() => navigate(dest.to)}
              >
                {dest.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
