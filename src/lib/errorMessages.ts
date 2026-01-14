/**
 * User-friendly error messages utility
 * Converts technical errors to plain English with actionable guidance
 */

export interface FriendlyError {
  title: string;
  message: string;
  action?: 'retry' | 'refresh' | 'contact' | 'login';
  technical?: string; // Optional: for logging
}

// Common error patterns and their friendly translations
const ERROR_PATTERNS: Array<{
  pattern: RegExp | string;
  friendly: FriendlyError;
}> = [
  // Network/Connection errors
  {
    pattern: /failed to fetch|network|connection|offline|ERR_NETWORK/i,
    friendly: {
      title: "Connection Problem",
      message: "Couldn't connect to the server. Please check your internet connection and try again.",
      action: 'retry',
    },
  },
  {
    pattern: /timeout|timed out/i,
    friendly: {
      title: "Request Timed Out",
      message: "The server took too long to respond. Please try again.",
      action: 'retry',
    },
  },
  
  // Authentication errors
  {
    pattern: /invalid token|jwt|expired|unauthorized|401|not authenticated/i,
    friendly: {
      title: "Session Expired",
      message: "Your session has expired. Please refresh the page to log in again.",
      action: 'refresh',
    },
  },
  {
    pattern: /no authorization header|no session/i,
    friendly: {
      title: "Not Logged In",
      message: "Please log in to continue.",
      action: 'login',
    },
  },
  
  // Rate limiting
  {
    pattern: /rate limit|too many requests|429/i,
    friendly: {
      title: "Too Many Requests",
      message: "You're making requests too quickly. Please wait a moment and try again.",
      action: 'retry',
    },
  },
  
  // Database/Server errors
  {
    pattern: /database|postgres|supabase|500|internal server/i,
    friendly: {
      title: "Server Error",
      message: "Something went wrong on our end. Please try again, or contact support if this continues.",
      action: 'retry',
    },
  },
  {
    pattern: /permission denied|rls|row.level.security/i,
    friendly: {
      title: "Access Denied",
      message: "You don't have permission to perform this action.",
      action: 'contact',
    },
  },
  {
    pattern: /duplicate|unique constraint|already exists/i,
    friendly: {
      title: "Already Exists",
      message: "This item already exists. Please use a different name or update the existing one.",
      action: 'retry',
    },
  },
  {
    pattern: /foreign key|reference|constraint/i,
    friendly: {
      title: "Can't Delete",
      message: "This item is connected to other data. Please remove those connections first.",
      action: 'retry',
    },
  },
  
  // Validation errors
  {
    pattern: /validation|required|invalid|must be/i,
    friendly: {
      title: "Invalid Input",
      message: "Please check your input and try again.",
      action: 'retry',
    },
  },
  
  // Not found errors
  {
    pattern: /not found|404|does not exist/i,
    friendly: {
      title: "Not Found",
      message: "The item you're looking for doesn't exist or may have been deleted.",
      action: 'retry',
    },
  },
];

/**
 * Convert a technical error to a user-friendly message
 */
export function getFriendlyError(error: unknown, context?: string): FriendlyError {
  const errorMessage = getErrorMessage(error);
  
  // Check for specific patterns
  for (const { pattern, friendly } of ERROR_PATTERNS) {
    if (typeof pattern === 'string') {
      if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
        return { ...friendly, technical: errorMessage };
      }
    } else if (pattern.test(errorMessage)) {
      return { ...friendly, technical: errorMessage };
    }
  }
  
  // Default fallback
  return {
    title: "Something Went Wrong",
    message: context 
      ? `We couldn't ${context}. Please try again or contact support if this continues.`
      : "An unexpected error occurred. Please try again.",
    action: 'retry',
    technical: errorMessage,
  };
}

/**
 * Extract error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    // Handle Supabase-style errors
    const e = error as Record<string, unknown>;
    if (e.message) return String(e.message);
    if (e.error) return String(e.error);
    if (e.error_description) return String(e.error_description);
    // Handle validation errors with details
    if (e.details && Array.isArray(e.details)) {
      return e.details.map((d: any) => d.message || d.field).join(', ');
    }
  }
  return 'Unknown error';
}

/**
 * Get a context-specific error message for common operations
 */
export function getOperationError(
  operation: 'create' | 'update' | 'delete' | 'load' | 'save',
  itemType: string,
  error: unknown
): FriendlyError {
  const errorMessage = getErrorMessage(error);
  
  // Check for specific validation errors
  if (errorMessage.toLowerCase().includes('required')) {
    const match = errorMessage.match(/(\w+)\s+(?:is\s+)?required/i);
    const field = match?.[1] || 'A field';
    return {
      title: "Missing Required Field",
      message: `Couldn't ${operation}: ${field} is required.`,
      action: 'retry',
      technical: errorMessage,
    };
  }
  
  // Check for "in use" errors
  if (errorMessage.toLowerCase().includes('in use') || 
      errorMessage.toLowerCase().includes('attached to') ||
      errorMessage.toLowerCase().includes('has tasks') ||
      errorMessage.toLowerCase().includes('foreign key')) {
    return {
      title: `Can't Delete ${itemType}`,
      message: `This ${itemType.toLowerCase()} is being used elsewhere. Remove those connections first.`,
      action: 'retry',
      technical: errorMessage,
    };
  }
  
  // Default to general friendly error with operation context
  const contextMap = {
    create: `create the ${itemType.toLowerCase()}`,
    update: `update the ${itemType.toLowerCase()}`,
    delete: `delete the ${itemType.toLowerCase()}`,
    load: `load your ${itemType.toLowerCase()}`,
    save: `save the ${itemType.toLowerCase()}`,
  };
  
  return getFriendlyError(error, contextMap[operation]);
}

/**
 * Format validation errors from edge functions
 */
export function formatValidationErrors(
  details: Array<{ field: string; message: string }>
): string {
  if (!details || details.length === 0) {
    return "Please check your input and try again.";
  }
  
  const messages = details.map(d => {
    // Make field names more readable
    const field = d.field
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase();
    return `${field}: ${d.message}`;
  });
  
  return messages.join('\n');
}
