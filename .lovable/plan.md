

# Editorial Calendar Improvements: Platform Selection & Clear Instructions

## Overview
Improve the Editorial Calendar with two major changes:
1. **Extended platform selection** with podcast support and user customization
2. **Clear onboarding instructions** so users understand how to add content and use drag-and-drop

---

## Problem Analysis

### Current Issues

1. **Limited Platform List**: Only 6 default platforms shown (instagram, linkedin, youtube, tiktok, facebook, email). Podcast exists in the constants but isn't activated by default.

2. **No Way to Add Content**: Users can only drag existing content items, but there's no clear way to CREATE new content directly from the calendar. The "Unscheduled Pool" shows existing items but doesn't explain how to add new ones.

3. **Confusing UX**: No onboarding, no tooltips, no instructions on how the calendar works.

---

## Solution

### Part 1: Extended Platform Selection

**Add Platform Configuration Modal**

When user clicks "Configure" in the PlatformFilterBar, open a modal where they can:
- See ALL available platforms (10+ options)
- Toggle which platforms they use
- Reorder their preferred platforms
- Customize colors (optional)

**Expand Available Platforms**

Update `calendarConstants.ts` to include more platforms:
- Pinterest
- Threads
- Substack
- Patreon
- Teachable/Courses
- Clubhouse (audio)
- Twitch
- Discord
- Slack Community
- WhatsApp Business

**Update Default Platforms**

Change `getDefaultPlatforms()` to show a more useful starter set including Podcast.

---

### Part 2: Clear Instructions & Quick-Add

**Add Onboarding Banner**

Show a dismissible banner when the calendar is empty or on first visit:

```
📅 How to use your Editorial Calendar

1. Add content using the "+ Add Content" button below
2. Drag items from "Unscheduled" to a day column
3. Drop on "Create" lane for production date, "Publish" lane for go-live date
4. Click any item to quick-edit dates and details

[Got it!]
```

**Add Prominent "+ Add Content" Button**

Add a floating action button or clear button in the Unscheduled Pool header that opens a quick-add modal for creating new content items with:
- Title (required)
- Platform/Channel (dropdown)
- Content Type (dropdown)
- Create Date (optional date picker)
- Publish Date (optional date picker)

**Empty State Improvements**

Replace current empty state text with clearer guidance:

Current: "No unscheduled content" / "Drag items here to unschedule"

New: 
```
No content yet

Click "+ Add Content" to create your first piece
or add content in the Content Vault
```

**Visual Cues for Drag-Drop**

Add subtle animations and visual indicators:
- Pulsing border on empty lane areas
- Arrow icons pointing from Unscheduled to calendar
- Hover tooltips on lanes explaining "Drop here to schedule"

---

## File Changes

### 1. Update `src/lib/calendarConstants.ts`

**Add more platforms:**
```typescript
export const DEFAULT_PLATFORM_COLORS: Record<string, string> = {
  // ... existing
  podcast: '#8B5CF6',
  pinterest: '#E60023',
  threads: '#000000',
  substack: '#FF6719',
  patreon: '#F96854',
  discord: '#5865F2',
  whatsapp: '#25D366',
  clubhouse: '#F6E05E',
  teachable: '#FF7849',
  twitch: '#9146FF',
};
```

**Update labels and short labels** for new platforms.

---

### 2. Update `src/hooks/useUserPlatforms.ts`

**Change default platforms** to include podcast and better starter set:
```typescript
function getDefaultPlatforms(): UserPlatform[] {
  // Show: Instagram, Email, Podcast, YouTube, LinkedIn, Blog, TikTok, Newsletter
  const defaultSet = ['instagram', 'email', 'podcast', 'youtube', 'linkedin', 'blog', 'tiktok', 'newsletter'];
  return defaultSet.map((platform, index) => ({...}));
}
```

---

### 3. Create `src/components/editorial-calendar/PlatformConfigModal.tsx`

New component for platform configuration:
- Grid of all available platforms with toggles
- Drag-to-reorder capability
- Color customization (expandable section)
- Save to `user_content_platforms` table

---

### 4. Create `src/components/editorial-calendar/CalendarQuickAdd.tsx`

New component for quick-adding content:

**Fields:**
- Title (text input, required)
- Platform (select from user's active platforms)
- Content Type (select from CONTENT_TYPES)
- Create Date (optional date picker)
- Publish Date (optional date picker)

**Behavior:**
- Creates entry in `content_items` table
- Immediately appears in calendar or Unscheduled Pool
- Toast confirmation: "Content added! Drag to schedule."

---

### 5. Create `src/components/editorial-calendar/CalendarOnboarding.tsx`

Dismissible onboarding banner:
- Uses `localStorage` to track if dismissed
- Clear step-by-step instructions
- Visual diagram of drag-drop flow
- "Got it!" button to dismiss

---

### 6. Update `src/components/editorial-calendar/UnscheduledPool.tsx`

**Add Quick-Add button in header:**
```tsx
<div className="px-3 py-2 border-b border-border">
  <div className="flex items-center gap-2">
    <Inbox className="h-4 w-4 text-muted-foreground" />
    <span className="text-sm font-medium">Unscheduled</span>
    <span className="text-xs text-muted-foreground ml-auto">
      {filteredItems.length}
    </span>
  </div>
  
  {/* NEW: Quick Add Button */}
  <Button 
    variant="outline" 
    size="sm" 
    className="w-full mt-2 gap-2"
    onClick={() => setQuickAddOpen(true)}
  >
    <Plus className="h-4 w-4" />
    Add Content
  </Button>
</div>
```

**Update empty state:**
```tsx
{filteredItems.length === 0 && (
  <div className="text-center py-8">
    <Inbox className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
    <p className="text-sm text-muted-foreground font-medium">
      No content to schedule
    </p>
    <p className="text-xs text-muted-foreground/60 mt-1 max-w-[180px] mx-auto">
      Click "Add Content" above to create something, then drag it to a day
    </p>
  </div>
)}
```

---

### 7. Update `src/components/editorial-calendar/PlatformFilterBar.tsx`

**Wire up Configure button:**
```tsx
{onConfigureClick && (
  <Button
    variant="ghost"
    size="sm"
    onClick={onConfigureClick}
  >
    <Settings className="h-3 w-3 mr-1" />
    Configure Platforms
  </Button>
)}
```

---

### 8. Update `src/components/editorial-calendar/EditorialCalendarView.tsx`

**Add new state and modals:**
```typescript
const [showOnboarding, setShowOnboarding] = useState(true);
const [platformConfigOpen, setPlatformConfigOpen] = useState(false);
const [quickAddOpen, setQuickAddOpen] = useState(false);
```

**Add onboarding banner above calendar:**
```tsx
{showOnboarding && !hasSeenOnboarding && (
  <CalendarOnboarding onDismiss={() => {
    setShowOnboarding(false);
    localStorage.setItem('calendar-onboarding-seen', 'true');
  }} />
)}
```

**Pass configure handler to PlatformFilterBar:**
```tsx
<PlatformFilterBar
  selectedPlatforms={selectedPlatforms}
  onTogglePlatform={togglePlatform}
  onConfigureClick={() => setPlatformConfigOpen(true)}
/>
```

---

## User Flow After Implementation

1. **First Visit**: User sees onboarding banner explaining how the calendar works
2. **Add Content**: User clicks "+ Add Content" in Unscheduled Pool sidebar
3. **Quick Form**: Enters title, selects platform (Podcast now available!), picks dates if known
4. **Content Created**: Item appears in Unscheduled Pool or directly on calendar
5. **Drag to Schedule**: User drags item to desired day/lane
6. **Configure Platforms**: User clicks "Configure Platforms" to add/remove platforms they use
7. **Platform Modal**: User toggles on Podcast, Threads, etc. and saves

---

## Visual Mockup

```
┌──────────────────────────────────────────────────────────────────┐
│ Editorial Calendar                                                │
│ Plan and schedule your content creation and publishing           │
├──────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ 📅 How to use: Add content → Drag to day → Drop on lane     │  │
│ │ Create = production date | Publish = go-live date  [Got it!] │  │
│ └─────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│ [← Prev] [Today] [Next →]     Feb 3 - Feb 9, 2026               │
├──────────────────────────────────────────────────────────────────┤
│ Platforms: [IG] [Email] [Pod✓] [YT] [LI] [+Configure Platforms] │
├──────────────────────────────────────────────────────────────────┤
│                                              │ Unscheduled       │
│   Mon  Tue  Wed  Thu  Fri  Sat  Sun         │ [+ Add Content]   │
│ ┌────┬────┬────┬────┬────┬────┬────┐       │                   │
│ │ C  │ C  │ C  │ C  │ C  │ C  │ C  │       │ ○ Podcast Ep 12   │
│ ├────┼────┼────┼────┼────┼────┼────┤       │ ○ IG Reel Draft   │
│ │ P  │ P  │ P  │ P  │ P  │ P  │ P  │       │                   │
│ └────┴────┴────┴────┴────┴────┴────┘       │ Drag items to     │
│                                              │ schedule them →   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Mobile Considerations

- Quick-add opens as bottom drawer (44px touch targets)
- Platform config as full-screen modal on mobile
- Onboarding banner is scrollable if needed
- All buttons meet 44px minimum height

---

## Technical Notes

### Database
No schema changes needed - uses existing:
- `content_items` table for new content
- `user_content_platforms` table for platform preferences

### LocalStorage Keys
- `calendar-onboarding-seen`: boolean to hide onboarding banner

