
# Quick Launch Reflections: Multi-Location with Debrief Compilation

## Overview

The user wants launch-specific reflections that are:
1. **Quick and fast** - Simple "What worked / What didn't" format
2. **Available in multiple places** - Not buried in the end-of-day section (which many skip)
3. **Expandable** - Users can add additional lines
4. **Auto-compiled** - Feed into the final launch debrief

---

## Design: The Quick Launch Reflection

A compact, focused reflection card with two simple lists:

```
┌────────────────────────────────────────────────────────────────┐
│ 🚀 Launch Pulse: [Course Launch 2024] — Day 5 of 7           │
│ ────────────────────────────────────────────────────────────── │
│                                                                │
│ ✅ What worked today?                                         │
│ ┌──────────────────────────────────────────────────────┐      │
│ │ Email sequence got 15% open rate                     │ [x]  │
│ └──────────────────────────────────────────────────────┘      │
│ ┌──────────────────────────────────────────────────────┐      │
│ │ Instagram story drove 3 sales                        │ [x]  │
│ └──────────────────────────────────────────────────────┘      │
│ [+ Add another]                                                │
│                                                                │
│ ❌ What didn't work?                                          │
│ ┌──────────────────────────────────────────────────────┐      │
│ │ Facebook ads underperformed                          │ [x]  │
│ └──────────────────────────────────────────────────────┘      │
│ [+ Add another]                                                │
│                                                                │
│ 💡 Quick note (optional)                                      │
│ ┌──────────────────────────────────────────────────────┐      │
│ │ Need to adjust targeting tomorrow...                 │      │
│ └──────────────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────────────┘
```

---

## Where It Appears (Multiple Locations)

### 1. **Launch Mode Section** (Morning - near top of Daily Plan)
- Shows during active launches
- Appears in the "Morning Zone" after habits or identity anchor
- Compact version: Phase banner + today's tasks + quick reflection toggle

### 2. **Standalone Card** (Available all day)
- New section ID: `launch_reflection`
- Can be positioned anywhere in the user's daily layout
- Collapsible but visible

### 3. **End of Day Section** (Enhanced)
- If launch is active, show the same reflection card
- Pre-filled if they already entered data earlier
- Adds energy rating for that day

---

## Database Changes

**New table: `daily_launch_reflections`**

Stores daily quick reflections that compile into the final debrief:

```sql
CREATE TABLE daily_launch_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  launch_id UUID NOT NULL REFERENCES launches(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  phase TEXT NOT NULL, -- 'runway', 'pre-launch', 'live', 'post-launch'
  -- Quick reflection lists
  what_worked JSONB DEFAULT '[]'::jsonb, -- Array of strings
  what_didnt_work JSONB DEFAULT '[]'::jsonb, -- Array of strings
  quick_note TEXT,
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),
  -- Metrics (live phase only)
  offers_made INTEGER DEFAULT 0,
  sales_today INTEGER DEFAULT 0,
  revenue_today NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, launch_id, date)
);

-- RLS policies
ALTER TABLE daily_launch_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own launch reflections"
  ON daily_launch_reflections FOR ALL
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_daily_launch_reflections_lookup 
  ON daily_launch_reflections(user_id, launch_id, date);
```

---

## New Components

### 1. `QuickLaunchReflectionCard.tsx`

The main reflection component with:
- Launch name and phase context
- "What worked" list (ReflectionList style - add/remove items)
- "What didn't work" list
- Optional quick note
- Auto-saves on change

```typescript
interface QuickLaunchReflectionCardProps {
  launch: ActiveLaunch;
  compact?: boolean; // For different placement contexts
  showMetrics?: boolean; // Show offers/sales inputs during live phase
}
```

### 2. `useDailyLaunchReflection.ts`

Hook to manage daily launch reflections:
- Fetches/creates today's reflection for active launch
- Auto-saves with debounce
- Provides compiled data for debrief

```typescript
interface UseDailyLaunchReflectionReturn {
  reflection: DailyLaunchReflection | null;
  activeLaunch: ActiveLaunch | null;
  isLoading: boolean;
  updateReflection: (data: Partial<DailyLaunchReflection>) => void;
  addWhatWorked: (item: string) => void;
  addWhatDidntWork: (item: string) => void;
  removeWhatWorked: (index: number) => void;
  removeWhatDidntWork: (index: number) => void;
}
```

---

## Daily Plan Integration

### File: `src/pages/DailyPlan.tsx`

Add to the section components map:

```typescript
launch_reflection: () => {
  if (!activeLaunch) return null;
  return <QuickLaunchReflectionCard launch={activeLaunch} />;
}
```

Update the end_of_day_reflection section to include launch reflection if active:

```typescript
end_of_day_reflection: () => {
  const currentHour = new Date().getHours();
  if (currentHour < 17) return null;
  
  return (
    <Card>
      {/* Existing end of day reflection */}
      
      {/* Launch reflection if active */}
      {activeLaunch && (
        <QuickLaunchReflectionCard 
          launch={activeLaunch} 
          showMetrics={activeLaunch.isLive}
        />
      )}
    </Card>
  );
}
```

---

## Launch Mode Section (Top of Daily Plan)

### File: `src/components/daily-plan/LaunchModeSection.tsx`

Creates a dedicated section that shows:

1. **Phase Banner** (existing `LaunchPhaseBanner`)
2. **Today's Launch Tasks** (collapsible - tasks due today from launch project)
3. **Quick Reflection** (collapsed by default, expandable)

```typescript
export function LaunchModeSection({ launch }: { launch: ActiveLaunch }) {
  const [showReflection, setShowReflection] = useState(false);
  
  return (
    <Card className="border-accent/30">
      <CardHeader className="pb-2">
        <LaunchPhaseBanner launch={launch} />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Today's tasks from launch project */}
        <LaunchTasksToday projectId={launch.project_id} />
        
        {/* Quick reflection toggle */}
        <Collapsible open={showReflection} onOpenChange={setShowReflection}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full">
              <Sparkles className="h-4 w-4 mr-2" />
              {showReflection ? 'Hide' : 'Log'} today's wins & lessons
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <QuickLaunchReflectionCard launch={launch} compact />
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
```

---

## Debrief Compilation

### Enhanced: `src/pages/LaunchDebrief.tsx`

Add a "Compiled Insights" section that aggregates daily reflections:

```typescript
// Fetch all daily reflections for this launch
const { data: dailyReflections } = useQuery({
  queryKey: ['launch-daily-reflections', launchId],
  queryFn: async () => {
    const { data } = await supabase
      .from('daily_launch_reflections')
      .select('*')
      .eq('launch_id', launchId)
      .order('date');
    return data || [];
  }
});

// Compile insights
const compiledWhatWorked = dailyReflections
  ?.flatMap(r => r.what_worked || [])
  .filter(Boolean);

const compiledWhatDidntWork = dailyReflections
  ?.flatMap(r => r.what_didnt_work || [])
  .filter(Boolean);

const averageEnergy = dailyReflections
  ?.filter(r => r.energy_level)
  .reduce((sum, r) => sum + r.energy_level, 0) / 
  (dailyReflections?.filter(r => r.energy_level).length || 1);
```

Display as a collapsible card before the reflection inputs:

```
┌────────────────────────────────────────────────────────────────┐
│ 📊 Compiled from Your Daily Reflections                       │
│ ────────────────────────────────────────────────────────────── │
│ 12 daily entries • Avg energy: 3.5/5                          │
│                                                                │
│ ✅ What Worked (23 entries)                    [View All →]   │
│ • Email sequence got high open rates (mentioned 4x)           │
│ • Instagram stories drove sales (mentioned 3x)                │
│                                                                │
│ ❌ What Didn't Work (15 entries)               [View All →]   │
│ • Facebook ads underperformed (mentioned 3x)                  │
│ • Early morning emails low engagement (mentioned 2x)          │
└────────────────────────────────────────────────────────────────┘
```

Pre-fill the "What Worked Well" and "What Could Be Improved" textareas with the compiled lists.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/daily-plan/QuickLaunchReflectionCard.tsx` | Main quick reflection UI |
| `src/components/daily-plan/LaunchModeSection.tsx` | Top-of-daily-plan section |
| `src/components/daily-plan/LaunchTasksToday.tsx` | Shows today's launch tasks |
| `src/hooks/useDailyLaunchReflection.ts` | CRUD for daily reflections |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/DailyPlan.tsx` | Add `launch_reflection` section, integrate with useActiveLaunches |
| `src/pages/LaunchDebrief.tsx` | Add compiled insights section, pre-fill from daily reflections |
| `src/hooks/useDailyPageLayout.ts` | Add `launch_reflection` to available sections |

## Database Migration

| Migration | Description |
|-----------|-------------|
| Create `daily_launch_reflections` table | Stores daily quick reflections |

---

## Implementation Priority

1. **Database migration** - Create the `daily_launch_reflections` table
2. **Hook** - `useDailyLaunchReflection` for CRUD operations
3. **QuickLaunchReflectionCard** - The core UI component
4. **Daily Plan Integration** - Add as new section + enhance end-of-day
5. **LaunchModeSection** - Dedicated top section with tasks + reflection
6. **Debrief Compilation** - Aggregate daily insights

---

## User Experience Flow

**Morning (8am):**
1. User opens Daily Plan
2. Launch Mode Section visible near top
3. Phase banner shows "5 DAYS UNTIL LAUNCH"
4. Can expand to log quick wins/lessons from yesterday

**Midday (1pm):**
1. User makes a sale
2. Quick access via Info Cards or Launch Mode Section
3. Logs "Instagram story drove 2 sales" in "What worked"

**Evening (6pm):**
1. End of Day section appears
2. Launch reflection card shown with today's entries
3. Can add more or rate energy level

**Post-Launch:**
1. User opens Launch Debrief page
2. Sees "Compiled Insights" with all daily entries organized
3. Pre-filled suggestions based on their daily logs
4. Just needs to review and add summary thoughts
