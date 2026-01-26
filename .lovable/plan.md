

## Weekly Planning Worksheet Redesign

### Vision
Transform the Weekly Worksheet from a simple form into a comprehensive **weekly command center** that keeps users connected to their 90-day goals while enabling effective weekly planning.

---

### New Layout Structure

```
+------------------------------------------+
| CycleProgressBanner (compact)            |
+------------------------------------------+
| [Planner] [Worksheet] tabs               |
+==========================================+
|                                          |
| +----------------+  +------------------+ |
| | WEEKLY         |  | 90-DAY GOAL      | |
| | SCRATCH PAD    |  | CHECK-IN         | |
| | (Brain dump)   |  | (Goal + Why +    | |
| |                |  |  Identity)       | |
| | #task #idea    |  +------------------+ |
| | #thought #win  |  | CYCLE ANALYTICS  | |
| |                |  | (Week X of 13)   | |
| | [Process Tags] |  | (Days remaining) | |
| +----------------+  | (Metric trends)  | |
|                     +------------------+ |
| +--------------------------------------+ |
| | THIS WEEK'S FOCUS                    | |
| | (Top 3 Priorities + Metric Targets)  | |
| +--------------------------------------+ |
| +--------------------------------------+ |
| | WEEKLY REFLECTION                    | |
| | (Thought, Feeling, Challenges)       | |
| +--------------------------------------+ |
| +--------------------------------------+ |
| | 90-DAY ALIGNMENT CHECK               | |
| | "How did my actions this week        | |
| |  support my quarterly goal?"         | |
| +--------------------------------------+ |
|                                          |
+==========================================+
```

---

### Component Breakdown

#### 1. Weekly Scratch Pad (New)
Reuse the existing `SmartScratchPad` component from Daily Plan, adapted for weekly context.

**Features:**
- Brain dump area with #task, #idea, #thought, #win tag support
- Weekly-scoped storage (saved per week_id)
- "Process Tags" button to convert entries to tasks/ideas
- Auto-save with data protection (localStorage + server sync)

**Implementation:**
- Add `weekly_scratch_pad` TEXT column to `weekly_plans` table
- Use existing `SmartScratchPad` component
- Add tag processing that creates tasks with appropriate scheduled dates

---

#### 2. 90-Day Goal Check-In Card (New)
An enhanced version of `CycleSnapshotCard` with weekly check-in prompts.

**Features:**
- Display current 90-day goal prominently
- Show "Why" and "Identity" statements
- Focus area badge (Discover/Nurture/Convert)
- Weekly reflection prompt: "How are you progressing toward this goal?"
- Input field for weekly goal check-in notes

**Implementation:**
- Create `WeeklyCycleCheckIn` component
- Add `goal_checkin_notes` TEXT column to `weekly_plans` table
- Fetch cycle data (already available in get-weekly-plan response)

---

#### 3. Cycle Analytics Card (New)
Visual progress tracking for the 90-day cycle.

**Features:**
- Circular or linear progress indicator (Week X of 13)
- Days remaining countdown
- Metric summary cards showing:
  - Metric name
  - Starting value vs. current value
  - Trend indicator (up/down/flat)
  - Mini sparkline or progress bar
- Link to full Progress page

**Implementation:**
- Create `WeeklyCycleAnalytics` component
- Extend `get-weekly-plan` to include metric actuals from weekly reviews
- Reuse chart patterns from Progress.tsx

---

#### 4. This Week's Focus (Enhanced)
Consolidate priorities and metric targets.

**Features:**
- Top 3 Weekly Priorities (existing)
- Weekly Metric Targets (existing, make more prominent)
- Last week carry-over section (existing)

**Changes:**
- Better visual hierarchy
- Inline editing with auto-save

---

#### 5. 90-Day Alignment Check (New)
A dedicated weekly reflection section focused on quarterly alignment.

**Features:**
- Prompt: "How did your actions this week support your 90-day goal?"
- Textarea for reflection
- Optional: Quick rating (1-5) on goal alignment
- Shows focus area reminder

**Implementation:**
- Add `alignment_reflection` TEXT and `alignment_rating` INTEGER columns to `weekly_plans` table

---

### Database Changes

```sql
-- Add new fields to weekly_plans table
ALTER TABLE weekly_plans 
ADD COLUMN weekly_scratch_pad TEXT,
ADD COLUMN goal_checkin_notes TEXT,
ADD COLUMN alignment_reflection TEXT,
ADD COLUMN alignment_rating INTEGER;

-- Add constraint for rating
ALTER TABLE weekly_plans 
ADD CONSTRAINT valid_alignment_rating 
CHECK (alignment_rating IS NULL OR (alignment_rating >= 1 AND alignment_rating <= 5));
```

---

### Edge Function Updates

**get-weekly-plan:**
- Already returns full cycle data
- Add: Fetch metric actuals from the last 4 weekly reviews for trend calculation
- Add: Include new fields (scratch pad, goal checkin, alignment)

**save-weekly-plan:**
- Accept and persist new fields

---

### New Components to Create

1. `src/components/weekly-plan/WeeklyScratchPad.tsx`
   - Wrapper around SmartScratchPad with weekly context
   - Handles weekly-scoped tag processing

2. `src/components/weekly-plan/WeeklyCycleCheckIn.tsx`
   - 90-day goal display with check-in prompt
   - Collapsible for space efficiency

3. `src/components/weekly-plan/WeeklyCycleAnalytics.tsx`
   - Progress visualization with metric trends
   - Mini charts for quick insight

4. `src/components/weekly-plan/AlignmentCheckSection.tsx`
   - Weekly 90-day alignment reflection
   - Rating component

---

### Mobile Considerations

- Stack cards vertically on mobile
- Scratch pad uses full-width
- Analytics card collapses to summary stats
- Goal check-in uses bottom drawer for notes

---

### Data Flow

```
User opens Weekly Plan -> Planner tab (default)
User clicks Worksheet tab ->
  -> Fetches weekly plan data (includes cycle, metrics, scratch pad)
  -> Displays all sections
  -> Auto-saves on change (1s debounce to server, instant localStorage)
  -> Tag processing creates tasks/ideas via existing flows
```

---

### Implementation Order

1. **Database migration** - Add new columns to weekly_plans
2. **Edge function updates** - Extend get-weekly-plan and save-weekly-plan
3. **WeeklyScratchPad** - Reuse SmartScratchPad with weekly storage
4. **WeeklyCycleCheckIn** - Goal display with notes input
5. **WeeklyCycleAnalytics** - Progress and metric visualization
6. **AlignmentCheckSection** - Weekly reflection on 90-day goal
7. **Layout refactor** - Two-column layout on desktop, stacked on mobile
8. **Data protection** - Ensure all new fields use existing protection hooks

