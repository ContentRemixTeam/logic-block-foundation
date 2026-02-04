
# Editorial Calendar Content Saving Logic Fix

## Problem Statement

Currently, every item created from the Editorial Calendar's "Add Content" dialog is saved to the `content_items` table (Content Vault). This creates empty/useless entries in the vault because:

1. The Content Vault is designed for **pieces of content that have been posted and might be reused later**
2. Users are creating planning entries (just title + dates) without any actual copy
3. Empty items clutter the vault and provide no reuse value

---

## Solution: Two-Path Content Creation

Introduce a toggle that lets users choose whether to save content to the vault or just schedule it on the calendar.

### Option 1: "Save to Vault" Toggle (Recommended)

Add an explicit toggle in the form that determines where content is saved:

| User Choice | Where it's Saved | Vault Visible? |
|-------------|------------------|----------------|
| Toggle OFF (default) | `content_plan_items` only | No |
| Toggle ON | `content_items` | Yes |

**When to suggest Vault:**
- Automatically enable toggle if `copyNotes` field has content (> 50 characters)
- Show helper text: "Save to Content Vault for reuse later"

---

## Implementation Details

### File: `src/components/editorial-calendar/AddContentDialog.tsx`

**1. Add new state variable:**
```typescript
const [saveToVault, setSaveToVault] = useState(false);
```

**2. Add toggle UI in the form (after the "Content" section):**
```text
┌──────────────────────────────────────────┐
│ 📦 Save to Content Vault                 │
│                                          │
│ [ Toggle Switch ]                        │
│                                          │
│ Save this content to your vault for      │
│ future reuse. Enable this if you've      │
│ written copy you want to keep.           │
└──────────────────────────────────────────┘
```

**3. Auto-enable toggle when copy has content:**
```typescript
useEffect(() => {
  // Auto-suggest vault save if substantial copy exists
  if (copyNotes.trim().length > 50 && !saveToVault) {
    setSaveToVault(true);
  }
}, [copyNotes]);
```

**4. Modify `handleSubmit` function:**

When `saveToVault` is **OFF**:
- Create a `content_plan_item` instead of `content_item`
- This requires a default plan or creating a "Calendar Plan" on-the-fly
- Lighter weight entry that won't appear in Content Vault

When `saveToVault` is **ON**:
- Current behavior: create `content_item`
- Appears in Content Vault for future reuse

---

## Alternative: Use content_items with "hide from vault" Flag

Instead of two tables, add a field to content_items:

**Database change:**
```sql
ALTER TABLE content_items 
ADD COLUMN hide_from_vault BOOLEAN DEFAULT FALSE;
```

**Content Vault query update:**
Filter out items where `hide_from_vault = true`

**Pros:** Simpler logic, single table
**Cons:** Still creates records, just hides them

---

## Recommended Approach: Hybrid

For simplicity, I recommend:

1. **Add "Save to Content Vault" toggle** - visible in the form
2. **Default OFF** - calendar items are lightweight planning entries
3. **When OFF** - Still save to `content_items` but with `hide_from_vault = true`
4. **When ON or has copy** - Normal vault entry

This is simpler than managing `content_plan_items` separately.

---

## Detailed Changes

### Database Migration

```sql
-- Add flag to hide items from vault view
ALTER TABLE content_items 
ADD COLUMN show_in_vault BOOLEAN DEFAULT TRUE;

-- Update existing empty items to be hidden
UPDATE content_items 
SET show_in_vault = false 
WHERE (body IS NULL OR body = '') 
AND (notes IS NULL OR notes = '');
```

### File Changes

**1. `src/components/editorial-calendar/AddContentDialog.tsx`**

Add state:
```typescript
const [saveToVault, setSaveToVault] = useState(false);
```

Add toggle UI in "Content" section:
```typescript
<div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
  <div className="space-y-0.5">
    <Label className="flex items-center gap-2 font-medium cursor-pointer">
      <Library className="h-4 w-4 text-muted-foreground" />
      Save to Content Vault
    </Label>
    <p className="text-xs text-muted-foreground">
      Store this content for future reuse
    </p>
  </div>
  <Switch
    checked={saveToVault}
    onCheckedChange={setSaveToVault}
  />
</div>
```

Modify `handleSubmit`:
```typescript
const baseItem = {
  // ... existing fields
  show_in_vault: saveToVault || copyNotes.trim().length > 0,
};
```

**2. `src/lib/contentService.ts`**

Update `getContentItems` to filter by vault visibility:
```typescript
export async function getContentItems(filters?: ContentFilters): Promise<ContentItem[]> {
  let query = supabase
    .from('content_items')
    .select('*')
    .eq('show_in_vault', true)  // Only show vault-worthy items
    .order('updated_at', { ascending: false });
  // ... rest of function
}
```

**3. `src/hooks/useContentVaultItems.ts`**

Add vault filter:
```typescript
let q = supabase
  .from('content_items')
  .select('...')
  .eq('user_id', user.id)
  .eq('show_in_vault', true)  // Add this filter
  .neq('status', 'published')
  // ...
```

---

## User Experience

### Before
- Every calendar item clutters the vault
- Empty items with just a title show up
- Vault becomes unusable for finding actual reusable content

### After
- Clean vault with only content worth reusing
- Toggle clearly indicates "this has copy I want to keep"
- Auto-detects when user has written substantial copy
- Calendar items still exist but don't pollute the vault

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| User adds title only, toggle OFF | Creates item, hidden from vault |
| User adds title + copy, toggle OFF | Auto-enables toggle (has content) |
| User adds from Idea, toggle OFF | Creates item linked to idea, hidden from vault |
| User later adds copy to hidden item | Update `show_in_vault = true` on next save |
| User views Content Vault | Only sees `show_in_vault = true` items |
| User views Editorial Calendar | Sees ALL items regardless of vault flag |

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/migrations/` | Add `show_in_vault` column |
| `src/components/editorial-calendar/AddContentDialog.tsx` | Add toggle UI and logic |
| `src/lib/contentService.ts` | Filter vault queries |
| `src/hooks/useContentVaultItems.ts` | Filter vault queries |
| `src/integrations/supabase/types.ts` | Auto-regenerates |
