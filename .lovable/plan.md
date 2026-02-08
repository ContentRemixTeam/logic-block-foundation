
# Fix Text Cutoff in Content Generator and Dashboard

## Problem Identified

The text cutoff is happening in two locations where the `truncate` CSS class forces single-line display with ellipsis:

1. **ContentGenerator.tsx (line 538)** - "Recent Generations" section showing content type labels like "Welcome Email #1"
2. **AIDashboard.tsx (lines 208, 211)** - Generation history cards showing content types and copy previews

## Solution

Remove the `truncate` class and replace with `break-words` to allow proper text wrapping.

---

## File Changes

### 1. ContentGenerator.tsx (line 538)

**Current:**
```tsx
<p className="font-medium truncate">
  {getContentTypeLabel(gen.content_type)}
</p>
```

**Fixed:**
```tsx
<p className="font-medium text-sm break-words">
  {getContentTypeLabel(gen.content_type)}
</p>
```

---

### 2. AIDashboard.tsx (lines 208, 211)

**Current:**
```tsx
<p className="font-medium truncate">
  {getContentTypeLabel(gen.content_type)}
</p>
<p className="text-sm text-muted-foreground truncate">
  {gen.generated_copy.slice(0, 60)}...
</p>
```

**Fixed:**
```tsx
<p className="font-medium text-sm break-words">
  {getContentTypeLabel(gen.content_type)}
</p>
<p className="text-sm text-muted-foreground break-words">
  {gen.generated_copy.slice(0, 60)}...
</p>
```

---

## Summary

| File | Lines Changed | Change |
|------|---------------|--------|
| `ContentGenerator.tsx` | Line 538 | Remove `truncate`, add `text-sm break-words` |
| `AIDashboard.tsx` | Lines 208, 211 | Remove `truncate`, add `break-words` |

This will allow content type names like "Welcome Email #1" and "Welcome Email #2" to display fully without being cut off.
