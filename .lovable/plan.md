

# Remove Unused `usePaginatedQuery` Hook

## What

Delete `src/hooks/usePaginatedQuery.tsx` -- it's dead code. The `useTasks` hook already implements its own cursor-based pagination logic and doesn't use this hook.

## Why

- The hook is imported nowhere in the codebase
- `useTasks` has its own `loadMore`/`hasMore`/pagination built in
- Keeping dead code adds confusion (as the audit demonstrated -- it flagged this as "not connected" when in reality pagination is just done differently)

## Changes

1. **Delete** `src/hooks/usePaginatedQuery.tsx`

That's it -- one file removal, no other files reference it.

