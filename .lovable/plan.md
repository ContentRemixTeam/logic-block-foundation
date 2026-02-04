
# Fix: AuthProvider Context Error During Calendar Operations

## Problem Summary

When trying to add items to the Editorial Calendar, you're seeing an "Invalid Input" error. The **actual underlying error** is:

```
useAuth must be used within an AuthProvider
```

This is a misleading error message because:
1. The real error is a **React context initialization issue**, not an input validation problem
2. The error message gets incorrectly classified as "Invalid Input" because it contains "must be"
3. The browser is running a stale version of the Dashboard code that's out of sync with the current source

## Root Causes

1. **Vite HMR Cache Desync**: After code changes, the browser cache can get out of sync with source files
2. **Error Classification Bug**: The error message pattern matcher incorrectly categorizes "useAuth must be used within an AuthProvider" as a validation error
3. **Aggressive Context Check**: The `useAuth` hook throws immediately if context is missing, which can happen briefly during hot module reloads

## Solution

### Part 1: Fix Error Classification (Immediate Priority)

Update `errorMessages.ts` to specifically handle the context provider error before the generic validation pattern.

**File: `src/lib/errorMessages.ts`**

Add a new pattern BEFORE the validation pattern:
```typescript
// React Context Provider errors (must be before validation pattern)
{
  pattern: /must be used within/i,
  friendly: {
    title: "Component Error",
    message: "A component failed to load properly. Please refresh the page to continue.",
    action: 'refresh',
  },
},
```

This ensures the error gets a proper message and prompts the user to refresh instead of retry.

### Part 2: Make useAuth More Resilient

Update `useAuth` hook to return a safe default during transient context issues instead of throwing.

**File: `src/hooks/useAuth.tsx`**

Current code (throws error):
```typescript
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

Updated code (safe fallback with warning):
```typescript
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    // During HMR or initial load, context might briefly be unavailable
    // Return a safe fallback instead of throwing
    console.warn('useAuth called outside AuthProvider - returning loading state');
    return {
      user: null,
      session: null,
      loading: true,  // Signal that we're still loading
      signOut: async () => { console.warn('signOut called during loading state'); },
    };
  }
  
  return context;
}
```

Benefits:
- Components gracefully handle the loading state
- No crash during HMR transitions
- Console warning helps with debugging
- User sees loading state instead of error page

### Part 3: Add Clear Cache Button for Users

To handle future cache sync issues, add a utility for hard refreshing.

This is optional but helpful - add a "Clear Cache & Reload" option in the error boundary.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/errorMessages.ts` | Add context provider error pattern before validation |
| `src/hooks/useAuth.tsx` | Return safe fallback instead of throwing |

---

## Immediate Workaround

Before implementing fixes, you can resolve this immediately by:
1. **Hard refresh the page**: Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. This clears the browser cache and reloads fresh code

---

## Why This Prevents Future Issues

1. **Error messages will be accurate**: Users will see "Please refresh the page" instead of "Invalid Input"
2. **No more crashes during HMR**: The app will show loading state instead of crashing
3. **Better developer experience**: Console warnings help identify the root cause quickly
4. **Users can self-recover**: Clear messaging tells users exactly what to do
