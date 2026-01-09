import { supabase } from '@/integrations/supabase/client';

interface ErrorLogData {
  error_type: string;
  error_message: string;
  error_stack?: string;
  component?: string;
  route?: string;
  metadata?: Record<string, any>;
}

/**
 * Log an error to the backend for admin visibility
 */
export async function logError(data: ErrorLogData): Promise<void> {
  try {
    // Get current route
    const route = window.location.pathname;
    
    await supabase.functions.invoke('log-error', {
      body: {
        ...data,
        route: data.route || route,
      },
    });
  } catch (err) {
    // Silently fail - don't want error logging to cause more errors
    console.error('Failed to log error:', err);
  }
}

/**
 * Create a wrapped error handler that logs errors before throwing
 */
export function createErrorLogger(component: string) {
  return async (error: Error | unknown, context?: Record<string, any>) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    await logError({
      error_type: 'RUNTIME_ERROR',
      error_message: errorMessage,
      error_stack: errorStack,
      component,
      metadata: context,
    });
  };
}

/**
 * Log API/edge function errors
 */
export async function logApiError(
  functionName: string,
  error: any,
  requestData?: Record<string, any>
): Promise<void> {
  await logError({
    error_type: 'API_ERROR',
    error_message: error?.message || String(error),
    error_stack: error?.stack,
    component: `edge-function:${functionName}`,
    metadata: {
      functionName,
      requestData,
      errorDetails: error,
    },
  });
}