
# Fix Multiple Textarea and Search Issues

## Issue 1: SmartScratchPad Scroll (Already Fixed)
The SmartScratchPad already has `min-h-[200px] max-h-[500px] overflow-y-auto resize-none` on the textarea (line 368) and scroll sync via `handleScroll`. No changes needed.

## Issue 2: CycleSetup Textareas - Add overflow-y-auto
Six textareas in `src/pages/CycleSetup.tsx` use `resize-none` without `overflow-y-auto`, trapping content in small boxes.

**Changes in `src/pages/CycleSetup.tsx`:**
- Line 4797: `className="resize-none"` --> `className="resize-none overflow-y-auto"`
- Line 4815: `className="resize-none"` --> `className="resize-none overflow-y-auto"`
- Line 4833: `className="resize-none"` --> `className="resize-none overflow-y-auto"`
- Line 4940: `className="bg-background resize-none"` --> `className="bg-background resize-none overflow-y-auto min-h-[80px]"`
- Line 5011: `className="bg-background resize-none"` --> `className="bg-background resize-none overflow-y-auto min-h-[80px]"`
- Line 5082: `className="bg-background resize-none"` --> `className="bg-background resize-none overflow-y-auto min-h-[80px]"`

## Issue 3: Ideas Search - Server-side Search
Currently, search only filters the loaded 50 ideas client-side. When a user types a search query, we need to call the backend with the search term.

**Changes in `supabase/functions/get-ideas/index.ts`:**
- Read a `search` parameter from the request body
- Apply `.ilike('content', '%search%')` filter to both the count query and the ideas query

**Changes in `src/pages/Ideas.tsx`:**
- When `searchQuery` changes (debounced ~300ms), call `loadData` with the search term passed to the backend
- Update `loadData` to accept and pass a `search` parameter in the request body
- Reset pagination when search changes (offset back to 0)

## Issue 4: SOPs Notes Textarea
The notes textarea at line 551-557 of `src/pages/SOPs.tsx` has no scroll or maxLength.

**Change in `src/pages/SOPs.tsx`:**
- Add `className="resize-none overflow-y-auto"` and `maxLength={2000}` to the notes textarea

## Issue 5: Leaked Password Protection
This is a backend authentication configuration change, not a code change. I will enable leaked password protection via the auth configuration tool.

---

## Technical Summary

| File | Change |
|------|--------|
| `src/pages/CycleSetup.tsx` | Add `overflow-y-auto` to 6 textareas, add `min-h-[80px]` to Day 1/2/3 Why fields |
| `supabase/functions/get-ideas/index.ts` | Add server-side `search` parameter with `ilike` filter |
| `src/pages/Ideas.tsx` | Debounce search, pass search to backend, reset pagination on search |
| `src/pages/SOPs.tsx` | Add `resize-none overflow-y-auto` and `maxLength={2000}` to notes textarea |
| Auth config | Enable leaked password protection |
