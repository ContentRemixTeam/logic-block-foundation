import { toast } from 'sonner';
import { FriendlyError, getFriendlyError, getOperationError } from '@/lib/errorMessages';

interface ToastOptions {
  duration?: number;
}

/**
 * Show a user-friendly error toast with optional actions
 */
export function showErrorToast(
  error: unknown,
  context?: string,
  options?: ToastOptions
): void {
  const friendly = getFriendlyError(error, context);
  
  const description = friendly.action === 'retry' 
    ? friendly.message
    : friendly.message;
  
  toast.error(friendly.title, {
    description,
    duration: options?.duration ?? 5000,
    action: friendly.action === 'refresh' 
      ? {
          label: 'Refresh',
          onClick: () => window.location.reload(),
        }
      : undefined,
  });
  
  // Log technical error for debugging
  if (friendly.technical) {
    console.error('[Error]', friendly.technical);
  }
}

/**
 * Show an operation-specific error toast
 */
export function showOperationError(
  operation: 'create' | 'update' | 'delete' | 'load' | 'save',
  itemType: string,
  error: unknown,
  options?: ToastOptions
): void {
  const friendly = getOperationError(operation, itemType, error);
  
  toast.error(friendly.title, {
    description: friendly.message,
    duration: options?.duration ?? 5000,
  });
  
  // Log technical error for debugging
  if (friendly.technical) {
    console.error(`[${operation} ${itemType}]`, friendly.technical);
  }
}

/**
 * Handle Supabase edge function responses
 */
export function handleEdgeFunctionError(
  response: { error?: unknown; data?: { error?: string; details?: any[] } },
  context?: string
): boolean {
  if (response.error) {
    showErrorToast(response.error, context);
    return true;
  }
  
  if (response.data?.error) {
    // Check for validation errors with details
    if (response.data.details && Array.isArray(response.data.details)) {
      const messages = response.data.details
        .map((d: any) => `${d.field?.replace(/_/g, ' ')}: ${d.message}`)
        .join('\n');
      
      toast.error("Validation Error", {
        description: messages || response.data.error,
        duration: 5000,
      });
    } else {
      showErrorToast(response.data.error, context);
    }
    return true;
  }
  
  return false;
}

// Re-export types for convenience
export type { FriendlyError };
