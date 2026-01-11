import { toast } from 'sonner';

// ==================== RATE LIMIT ERROR HANDLING ====================

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
      id: 'rate-limit-error'
    }
  );
}

// ==================== VALIDATION ERROR HANDLING ====================

export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
}

export interface ValidationError {
  error: string;
  code: 'VALIDATION_ERROR';
  details: ValidationErrorDetail[];
}

export function isValidationError(error: any): error is ValidationError {
  return error?.code === 'VALIDATION_ERROR' && Array.isArray(error?.details);
}

export function handleValidationError(error: ValidationError): void {
  const firstError = error.details[0];
  const message = firstError 
    ? `${firstError.field ? `${firstError.field}: ` : ''}${firstError.message}`
    : 'Invalid input data';
  
  toast.error(message, {
    duration: 5000,
    id: 'validation-error'
  });
}

/**
 * Get all validation error messages
 */
export function getValidationErrors(error: ValidationError): string[] {
  return error.details.map(d => `${d.field ? `${d.field}: ` : ''}${d.message}`);
}

// ==================== COMBINED ERROR CHECKING ====================

/**
 * Check if a response indicates rate limiting and handle it
 * Returns true if rate limited (caller should abort), false otherwise
 */
export function checkAndHandleRateLimit(response: { data: any; error: any }): boolean {
  if (response.error) {
    const isRateLimited = 
      response.error.status === 429 || 
      isRateLimitError(response.error) ||
      (typeof response.error === 'object' && response.error?.code === 'RATE_LIMIT_EXCEEDED');
    
    if (isRateLimited) {
      handleRateLimitError(response.error);
      return true;
    }
  }
  
  if (response.data?.code === 'RATE_LIMIT_EXCEEDED') {
    handleRateLimitError(response.data);
    return true;
  }
  
  return false;
}

/**
 * Check if a response indicates validation error and handle it
 * Returns true if validation failed (caller should abort), false otherwise
 */
export function checkAndHandleValidation(response: { data: any; error: any }): boolean {
  if (response.error && isValidationError(response.error)) {
    handleValidationError(response.error);
    return true;
  }
  
  if (response.data && isValidationError(response.data)) {
    handleValidationError(response.data);
    return true;
  }
  
  return false;
}

/**
 * Combined check for all known error types
 * Returns true if any error was handled (caller should abort), false otherwise
 */
export function checkAndHandleApiErrors(response: { data: any; error: any }): boolean {
  return checkAndHandleRateLimit(response) || checkAndHandleValidation(response);
}
