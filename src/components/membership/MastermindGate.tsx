import { useMembership } from '@/hooks/useMembership';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Lock } from 'lucide-react';
import { LoadingState } from '@/components/system/LoadingState';

interface MastermindGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function MastermindGate({ children, fallback }: MastermindGateProps) {
  const { isMastermind, loading } = useMembership();

  if (loading) {
    return <LoadingState message="Checking access..." />;
  }

  if (!isMastermind) {
    return fallback || <MastermindUpgradeMessage />;
  }

  return <>{children}</>;
}

function MastermindUpgradeMessage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Mastermind Access Required
          </CardTitle>
          <CardDescription>
            This feature is exclusively available to Mastermind members.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            If you're a current Mastermind member, make sure you're logged in with your Mastermind email address.
          </p>
          <div className="pt-2">
            <Button 
              variant="outline" 
              onClick={() => window.open('https://yvescameron.com/mastermind', '_blank')}
            >
              Learn About Mastermind
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
