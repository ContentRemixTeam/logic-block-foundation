
# Sprint 1: "Stop the Bleeding" - Security & Performance Fixes

## Current State Analysis

After thoroughly reviewing your database, I found that **your foundation is stronger than expected**:

### ✅ Already In Place
| Area | Status | Details |
|------|--------|---------|
| **RLS Enabled** | ✅ Complete | All 18 core user tables have RLS enabled with 4-6 policies each |
| **user_id NOT NULL** | ✅ Complete | All core tables (tasks, daily_plans, projects, etc.) have `user_id NOT NULL` |
| **Core Indexes** | ✅ Mostly done | `idx_tasks_user_status`, `idx_daily_plans_user_date`, `idx_cycles_user_id`, etc. exist |
| **Smart Filtering** | ✅ Complete | `get-all-tasks` already uses 90-day + incomplete filter |
| **Pagination Support** | ✅ Partial | Edge function supports pagination via limit/offset |

### ⚠️ Gaps That Need Fixing
| Area | Risk Level | Issue |
|------|------------|-------|
| **Security Findings** | 🔴 CRITICAL | 5 error-level issues from security scan (OAuth tokens, API keys, entitlements) |
| **Missing Status Constraint** | 🟡 Medium | No CHECK constraint on `tasks.status` column |
| **Missing Foreign Keys** | 🟡 Medium | No FK constraints on `project_id`, `section_id`, `cycle_id` references |
| **Missing Compound Index** | 🟡 Low | No `idx_tasks_user_created_desc` for recent tasks query |
| **Query Limit Enforcement** | 🟡 Medium | Frontend hooks don't enforce explicit limits or show warnings |
| **RLS Test Suite** | 🟡 Medium | No automated test to verify RLS can't be bypassed |

---

## Implementation Plan

### Phase 1: Add Missing Database Indexes (15 min)

Add these performance-critical indexes that are missing:

```sql
-- Task queries: user + created_at for smart filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_user_created_at 
  ON public.tasks(user_id, created_at DESC);

-- Task queries: user + is_completed for incomplete filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_user_incomplete
  ON public.tasks(user_id) WHERE is_completed = false;

-- Journal pages: user_id (if missing)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journal_pages_user_id 
  ON public.journal_pages(user_id);

-- Journal pages: compound for date queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journal_pages_user_date
  ON public.journal_pages(user_id, page_date DESC);

-- Ideas: GIN index for tags search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ideas_db_tags 
  ON public.ideas_db USING GIN (tags) WHERE tags IS NOT NULL;

-- Weekly plans: user + cycle for hierarchy queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_weekly_plans_user_cycle 
  ON public.weekly_plans(user_id, cycle_id);
```

### Phase 2: Add Data Integrity Constraints (20 min)

Add CHECK constraints and foreign keys for data integrity:

```sql
-- Status constraint for tasks (with safe values)
ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_status_check 
CHECK (status IS NULL OR status IN ('todo', 'in_progress', 'done', 'blocked', 'someday', 'scheduled'));

-- Foreign key: tasks.project_id → projects.id
ALTER TABLE public.tasks
ADD CONSTRAINT fk_tasks_project
FOREIGN KEY (project_id) REFERENCES public.projects(id)
ON DELETE SET NULL;

-- Foreign key: tasks.section_id → project_sections.id
ALTER TABLE public.tasks
ADD CONSTRAINT fk_tasks_section
FOREIGN KEY (section_id) REFERENCES public.project_sections(id)
ON DELETE SET NULL;

-- Foreign key: tasks.cycle_id → cycles_90_day.cycle_id
ALTER TABLE public.tasks
ADD CONSTRAINT fk_tasks_cycle
FOREIGN KEY (cycle_id) REFERENCES public.cycles_90_day(cycle_id)
ON DELETE SET NULL;

-- Foreign key: daily_plans.cycle_id → cycles_90_day.cycle_id
ALTER TABLE public.daily_plans
ADD CONSTRAINT fk_daily_plans_cycle
FOREIGN KEY (cycle_id) REFERENCES public.cycles_90_day(cycle_id)
ON DELETE SET NULL;

-- Foreign key: daily_plans.week_id → weekly_plans.week_id
ALTER TABLE public.daily_plans
ADD CONSTRAINT fk_daily_plans_week
FOREIGN KEY (week_id) REFERENCES public.weekly_plans(week_id)
ON DELETE SET NULL;

-- Foreign key: project_sections.project_id → projects.id
ALTER TABLE public.project_sections
ADD CONSTRAINT fk_sections_project
FOREIGN KEY (project_id) REFERENCES public.projects(id)
ON DELETE CASCADE;
```

### Phase 3: Fix Critical Security Findings (45 min)

The security scan found 5 error-level issues. Here's the fix approach:

#### 3a. User Profiles RLS (Currently accessible without auth)
```sql
-- Drop existing policies and recreate with proper auth check
DROP POLICY IF EXISTS "user_profiles_select" ON public.user_profiles;

CREATE POLICY "Users can only view own profile"
ON public.user_profiles FOR SELECT
USING (auth.uid() = id);
```

#### 3b. Google Calendar Secrets (Should never be client-accessible)
```sql
-- Restrict to service role only - no client access ever
DROP POLICY IF EXISTS "Users can manage their own secrets" ON public.google_calendar_secrets;

-- No SELECT policy = no client read access
CREATE POLICY "Service role only"
ON public.google_calendar_secrets 
USING (false) 
WITH CHECK (false);
```

#### 3c. Google Calendar Connection (Tokens shouldn't be client-readable)
```sql
-- Remove token columns from client reads
CREATE OR REPLACE VIEW public.google_calendar_connection_safe AS
SELECT 
  user_id,
  email,
  calendar_id,
  is_active,
  created_at
FROM public.google_calendar_connection;
-- Grant access to the view instead of the table
```

#### 3d. Entitlements Table (Admin-only access)
```sql
-- Verify admin check is secure
DROP POLICY IF EXISTS "Admin can view all entitlements" ON public.entitlements;

CREATE POLICY "Admins only can view entitlements"
ON public.entitlements FOR SELECT
USING (public.is_admin(auth.uid()));
```

#### 3e. User Settings AI API Key (Should be encrypted/hidden)
The `ai_api_key` column should never be returned to the client. Two options:
1. Create a view that excludes this column
2. Use column-level security with a security definer function

### Phase 4: Add Query Safety & Performance Monitoring (30 min)

#### 4a. Create useQueryPerformance hook
```typescript
// src/hooks/useQueryPerformance.ts
export function useQueryPerformance(query, options) {
  // Log warnings when queries take > 1 second
  // Log errors when queries take > 3 seconds
  // Emit custom events for UI warnings
}
```

#### 4b. Update useTasks to use explicit limits
The current `useTasks` hook doesn't warn when hitting limits. Add:
- Explicit limit parameter (default 500)
- Console warning when approaching limit
- Performance tracking

#### 4c. Create QueryPerformanceWarning component
A toast/alert that appears when slow queries are detected, helping you identify performance issues before users complain.

### Phase 5: Create RLS Bypass Test Suite (20 min)

Create a migration that:
1. Creates two test users with known UUIDs
2. Inserts test data for user 1 across all core tables
3. Switches to user 2 context and verifies they CANNOT see user 1's data
4. Tests INSERT/UPDATE/DELETE protection
5. Cleans up all test data
6. Fails the migration if any test fails

This runs on every deployment to ensure RLS is never accidentally broken.

---

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `supabase/migrations/[timestamp]_sprint1_indexes.sql` | Add missing indexes |
| `supabase/migrations/[timestamp]_sprint1_constraints.sql` | Add FK and CHECK constraints |
| `supabase/migrations/[timestamp]_sprint1_security_fixes.sql` | Fix critical RLS issues |
| `supabase/migrations/[timestamp]_sprint1_rls_test.sql` | RLS bypass test suite |
| `src/hooks/useQueryPerformance.ts` | Query performance monitoring |
| `src/components/system/QueryPerformanceWarning.tsx` | UI warning for slow queries |

### Modified Files
| File | Changes |
|------|---------|
| `src/hooks/useTasks.tsx` | Add explicit limits and performance tracking |
| `src/components/Layout.tsx` | Include QueryPerformanceWarning component |

---

## Risk Assessment

| Change | Risk | Mitigation |
|--------|------|------------|
| Adding indexes | 🟢 Low | CONCURRENTLY prevents locks |
| Adding constraints | 🟡 Medium | Validate existing data first with DO blocks |
| RLS policy changes | 🔴 High | Test each policy change individually, verify user can still access own data |
| Query limit changes | 🟢 Low | Backwards compatible, just adds warnings |

---

## Pre-Flight Validation Queries

Before running migrations, verify existing data won't violate new constraints:

```sql
-- Check for invalid status values
SELECT DISTINCT status, COUNT(*) FROM tasks GROUP BY status;

-- Check for orphaned project_id references
SELECT COUNT(*) FROM tasks t 
WHERE t.project_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = t.project_id);

-- Check for orphaned section_id references
SELECT COUNT(*) FROM tasks t 
WHERE t.section_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM project_sections s WHERE s.id = t.section_id);
```

---

## Expected Outcomes

After Sprint 1:
- ✅ All queries use indexed lookups (no full table scans)
- ✅ RLS verified working with automated test
- ✅ Critical security vulnerabilities fixed
- ✅ Data integrity enforced at database level
- ✅ Query performance monitored with warnings
- ✅ Explicit limits prevent runaway queries

Ready to implement when you approve!
