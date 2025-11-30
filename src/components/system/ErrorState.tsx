import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home, RotateCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  showDashboard?: boolean;
  errorCode?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  showDashboard = true,
  errorCode,
}: ErrorStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">{title}</CardTitle>
          </div>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorCode && (
            <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
              Error: {errorCode}
            </p>
          )}
          <div className="flex gap-2">
            {onRetry && (
              <Button onClick={onRetry} variant="default">
                <RotateCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            )}
            {showDashboard && (
              <Link to="/dashboard">
                <Button variant="outline">
                  <Home className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
