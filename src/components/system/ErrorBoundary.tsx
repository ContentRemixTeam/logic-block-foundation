import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, Mail } from 'lucide-react';
import { getFriendlyError } from '@/lib/errorMessages';
import { logError } from '@/lib/errorLogger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    // Log to backend
    logError({
      error_type: 'UNCAUGHT_ERROR',
      error_message: error.message,
      error_stack: error.stack,
      component: 'ErrorBoundary',
      metadata: { componentStack: errorInfo.componentStack },
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // Convert error to friendly message
      const friendly = this.state.error 
        ? getFriendlyError(this.state.error.message)
        : { title: 'Something went wrong', message: 'An unexpected error occurred.' };

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <CardTitle>{friendly.title}</CardTitle>
              </div>
              <CardDescription className="text-base">
                {friendly.message}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Don't worry, your data is safe. Try one of these options:
              </p>
              
              <div className="flex flex-wrap gap-2">
                <Button onClick={this.handleReload}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reload Page
                </Button>
                <Button variant="outline" onClick={this.handleReset}>
                  <Home className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Button>
              </div>
              
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  If this keeps happening, please let us know:
                </p>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => window.location.href = '/support'}
                >
                  <Mail className="mr-2 h-3 w-3" />
                  Contact Support
                </Button>
                
                {/* Technical details (collapsed by default) */}
                {this.state.error && (
                  <details className="mt-3">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      Technical details
                    </summary>
                    <div className="bg-muted p-3 rounded text-xs font-mono overflow-auto max-h-32 mt-2">
                      {this.state.error.message}
                    </div>
                  </details>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
