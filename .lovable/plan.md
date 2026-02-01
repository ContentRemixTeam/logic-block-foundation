

# Fix Content Planner Wizard - Render Loop Issue

## Problem Identified

The Content Planner wizard has a **render loop** causing the screen to flash repeatedly with "Loading your draft..." This is caused by an unstable object reference in the `useWizard` hook's dependency array.

## Root Cause Analysis

### The Bug
In `ContentPlannerWizard.tsx` (lines 66-73), the `defaultData` is created as a new object on every render:

```typescript
defaultData: {
  ...DEFAULT_CONTENT_PLANNER_DATA,
  mode: launchIdFromUrl ? 'launch' : '',
  launchId: launchIdFromUrl,
},
```

### Why It Causes a Loop
In `useWizard.ts` (line 145), the `loadDraft` useEffect depends on `defaultData`:

```typescript
useEffect(() => {
  const loadDraft = async () => {
    setIsLoading(true);
    // ...
  };
  loadDraft();
}, [user, templateName, localStorageKey, defaultData]); // ← defaultData changes every render!
```

### The Loop Sequence
1. Component mounts, calls `useWizard` with new `defaultData` object
2. `loadDraft` effect runs → `setIsLoading(true)` 
3. Component re-renders (isLoading changed)
4. New `defaultData` object created (different reference)
5. `loadDraft` effect runs again because dependency changed
6. Repeat → **infinite loop**

This pattern also affects the `saveDraftInternal` useCallback (line 236) which has `data` in its dependencies, causing additional cascading updates.

---

## Solution

### Fix 1: Memoize defaultData in ContentPlannerWizard

Wrap the `defaultData` object in `useMemo` to ensure stable reference:

```typescript
const defaultData = useMemo(() => ({
  ...DEFAULT_CONTENT_PLANNER_DATA,
  mode: launchIdFromUrl ? 'launch' : '' as ContentPlanMode | '',
  launchId: launchIdFromUrl,
}), [launchIdFromUrl]);
```

### Fix 2: Add initialization guard in useWizard

Add a ref to track if initial load has already started to prevent re-triggering:

```typescript
const hasStartedLoadRef = useRef(false);

useEffect(() => {
  if (hasStartedLoadRef.current) return;
  hasStartedLoadRef.current = true;
  
  const loadDraft = async () => {
    // ...existing code
  };
  loadDraft();
}, [user, templateName]); // Remove defaultData from dependencies
```

### Fix 3: Remove defaultData from useEffect dependencies

The `defaultData` should only be used for initial state, not as a reactive dependency. Change the dependency array:

```typescript
// Before
}, [user, templateName, localStorageKey, defaultData]);

// After - use a ref for defaultData
const defaultDataRef = useRef(defaultData);
// ... in effect use defaultDataRef.current
}, [user, templateName, localStorageKey]);
```

---

## File Changes

### 1. src/components/wizards/content-planner/ContentPlannerWizard.tsx

**Change**: Wrap defaultData in useMemo

```typescript
// Before (lines 63-73):
const {
  step,
  data,
  // ...
} = useWizard<ContentPlannerData>({
  templateName: 'content-planner',
  totalSteps: 7,
  defaultData: {
    ...DEFAULT_CONTENT_PLANNER_DATA,
    mode: launchIdFromUrl ? 'launch' : '',
    launchId: launchIdFromUrl,
  },
  validateStep: validateContentPlannerStep,
});

// After:
import { useMemo } from 'react';

// Before the useWizard call:
const defaultData = useMemo(() => ({
  ...DEFAULT_CONTENT_PLANNER_DATA,
  mode: launchIdFromUrl ? 'launch' : '' as ContentPlanMode | '',
  launchId: launchIdFromUrl,
}), [launchIdFromUrl]);

const {
  step,
  data,
  // ...
} = useWizard<ContentPlannerData>({
  templateName: 'content-planner',
  totalSteps: 7,
  defaultData,
  validateStep: validateContentPlannerStep,
});
```

### 2. src/hooks/useWizard.ts

**Change 1**: Store defaultData in a ref to avoid dependency issues

```typescript
// Add ref near other refs (around line 59):
const defaultDataRef = useRef(defaultData);

// Update loadDraft effect (lines 78-145):
useEffect(() => {
  // Guard against re-running if already started
  if (!isInitialLoad.current) return;
  
  const loadDraft = async () => {
    setIsLoading(true);
    try {
      // ... existing code ...
      
      if (draftData) {
        setDataState({ ...defaultDataRef.current, ...draftData });
        // ... rest of existing code
      }
      
      isInitialLoad.current = false;
    } catch (err) {
      console.error('Error loading wizard draft:', err);
      isInitialLoad.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  loadDraft();
}, [user, templateName, localStorageKey]); // Remove defaultData
```

**Change 2**: Fix the initial load guard logic

The current code sets `isInitialLoad.current = false` inside `loadDraft`, but it's used as a guard for saving. We need a separate flag for tracking if load has started:

```typescript
// Add new ref:
const hasStartedLoadRef = useRef(false);

// Update effect:
useEffect(() => {
  if (hasStartedLoadRef.current) return;
  hasStartedLoadRef.current = true;
  
  const loadDraft = async () => {
    // ... existing code
  };
  loadDraft();
}, [user, templateName, localStorageKey]);
```

**Change 3**: Fix clearDraft to use ref

```typescript
// In clearDraft (around line 307):
setDataState(defaultDataRef.current);
```

---

## Verification Checklist

After implementing fixes:

- [ ] Wizard loads without flashing
- [ ] Loading state shows once, then content appears
- [ ] Draft persistence still works (save and reload page)
- [ ] Resume draft dialog appears correctly when draft exists
- [ ] No console errors about re-renders or state updates
- [ ] Works correctly with launchId URL parameter

---

## Additional Stability Improvements

While fixing this, also address these related issues:

### Issue: StepModeSelection fetch loop
The `useEffect` in `StepModeSelection.tsx` (lines 32-53) runs on every user change but doesn't check if data is already loaded. Add a check:

```typescript
useEffect(() => {
  if (!user || launches.length > 0) return; // Skip if already loaded
  // ... rest of effect
}, [user, launches.length]);
```

### Issue: Missing error boundary
Wrap the wizard in an error boundary to prevent crashes from breaking the entire app:

```typescript
// In ContentPlannerPage.tsx or the wizard itself
<ErrorBoundary fallback={<WizardErrorState />}>
  <ContentPlannerWizard />
</ErrorBoundary>
```

---

## Summary

| File | Change |
|------|--------|
| `ContentPlannerWizard.tsx` | Memoize `defaultData` with `useMemo` |
| `useWizard.ts` | Store `defaultData` in ref, add load guard, remove from deps |
| `StepModeSelection.tsx` | Add guard to prevent redundant fetches |

This fix follows React best practices for dependency management and prevents the render loop that causes the glitchy experience.

