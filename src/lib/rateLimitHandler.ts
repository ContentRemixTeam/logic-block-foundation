import { toast } from 'sonner';

export interface RateLimitError {
  error: string;
  code: 'RATE_LIMIT_EXCEEDED';
  retry_after: number;
}

export function isRateLimitError(error: any): error is RateLimitError {
  return error?.code === 'RATE_LIMIT_EXCEEDED' || 
         error?.message?.includes('Too many requests') ||
         error?.error?.includes('Too many requests');
}

export function handleRateLimitError(error: RateLimitError | any): void {
  const retryAfter = error?.retry_after || error?.retryAfter || 60;
  toast.error(
    `You're doing that too fast! Please wait ${retryAfter} seconds before trying again.`,
    {
      duration: 5000,
      id: 'rate-limit-error' // Prevent duplicate toasts
    }
  );
}

/**
 * Check if a response indicates rate limiting and handle it
 * Returns true if rate limited (caller should abort), false otherwise
 */
export function checkAndHandleRateLimit(response: { data: any; error: any }): boolean {
  if (response.error) {
    // Check for 429 status or rate limit error code
    const isRateLimited = 
      response.error.status === 429 || 
      isRateLimitError(response.error) ||
      (typeof response.error === 'object' && response.error?.code === 'RATE_LIMIT_EXCEEDED');
    
    if (isRateLimited) {
      handleRateLimitError(response.error);
      return true;
    }
  }
  
  // Also check if error is in the data (edge function response pattern)
  if (response.data?.code === 'RATE_LIMIT_EXCEEDED') {
    handleRateLimitError(response.data);
    return true;
  }
  
  return false;
}
