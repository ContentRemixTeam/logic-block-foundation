import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home, RotateCw, RefreshCw, Mail, ExternalLink } from 'lucide-react';
import { getFriendlyError } from '@/lib/errorMessages';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  showDashboard?: boolean;
  showRefresh?: boolean;
  showSupport?: boolean;
  errorCode?: string;
  /** Raw error - will be converted to friendly message if message not provided */
  error?: unknown;
}

export function ErrorState({
  title,
  message,
  onRetry,
  showDashboard = true,
  showRefresh = false,
  showSupport = false,
  errorCode,
  error,
}: ErrorStateProps) {
  // If raw error provided without message, convert to friendly
  const friendly = error && !message ? getFriendlyError(error) : null;
  const displayTitle = title || friendly?.title || 'Something went wrong';
  const displayMessage = message || friendly?.message || 'An unexpected error occurred.';
  const displayAction = friendly?.action;
  
  // Auto-show refresh button for session errors
  const shouldShowRefresh = showRefresh || displayAction === 'refresh';
  // Auto-show support link for certain errors
  const shouldShowSupport = showSupport || displayAction === 'contact';

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">{displayTitle}</CardTitle>
          </div>
          <CardDescription className="whitespace-pre-line">{displayMessage}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorCode && (
            <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
              Reference: {errorCode}
            </p>
          )}
          
          <div className="flex flex-wrap gap-2">
            {onRetry && (
              <Button onClick={onRetry} variant="default">
                <RotateCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            )}
            
            {shouldShowRefresh && (
              <Button onClick={() => window.location.reload()} variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Page
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
          
          {shouldShowSupport && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground mb-2">Still having trouble?</p>
              <div className="flex flex-wrap gap-2">
                <Link to="/support">
                  <Button variant="ghost" size="sm">
                    <Mail className="mr-2 h-3 w-3" />
                    Contact Support
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
