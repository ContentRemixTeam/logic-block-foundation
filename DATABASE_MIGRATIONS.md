# Database Migrations Guide

> Comprehensive guide for managing database migrations in this Lovable Cloud project.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Migration Best Practices](#2-migration-best-practices)
3. [Migration Test Script](#3-migration-test-script)
4. [Rollback Templates](#4-rollback-templates)
5. [Staging Environment Process](#5-staging-environment-process)
6. [Common Migration Patterns](#6-common-migration-patterns)
7. [Troubleshooting](#7-troubleshooting)
8. [Related Documentation](#8-related-documentation)

---

## 1. Introduction

### Overview

This project uses Lovable Cloud (powered by Supabase) for database management. All schema changes are applied via SQL migrations stored in `supabase/migrations/`.

### Migration Naming Convention

Migrations follow the format: `YYYYMMDDHHMMSS_uuid.sql`

Example: `20260111223226_ecedfda7-feb2-4706-ad18-6151fd33b73d.sql`

- **Timestamp**: When the migration was created
- **UUID**: Unique identifier for the migration

### Current State

- **75+ migrations** applied to this project
- Located in: `supabase/migrations/`
- Applied automatically via Lovable's migration tool

---

## 2. Migration Best Practices

### 2.1 General Principles

| Principle | Description |
|-----------|-------------|
| **Idempotency** | Always use `IF NOT EXISTS` / `IF EXISTS` clauses |
| **Atomicity** | One logical change per migration file |
| **Documentation** | Add comments explaining the purpose |
| **Reserved Schemas** | Never modify `auth`, `storage`, `realtime`, `supabase_functions`, `vault` |
| **Validation** | Use triggers instead of CHECK constraints for time-based validations |
| **Security** | Always add RLS policies for user-facing tables |

### 2.2 Column Addition Template

```sql
-- Migration: Add [column_name] to [table_name]
-- Purpose: [Brief explanation of why this column is needed]

ALTER TABLE public.table_name 
ADD COLUMN IF NOT EXISTS column_name DATA_TYPE DEFAULT default_value;

-- Add index if frequently queried
CREATE INDEX IF NOT EXISTS idx_table_column 
ON public.table_name(column_name);
```

### 2.3 Table Creation Template

```sql
-- Migration: Create [table_name] table
-- Purpose: [Brief explanation]

-- Create table
CREATE TABLE IF NOT EXISTS public.new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own data" 
ON public.new_table 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own data" 
ON public.new_table 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data" 
ON public.new_table 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data" 
ON public.new_table 
FOR DELETE 
USING (auth.uid() = user_id);

-- Updated_at trigger (uses existing function)
CREATE TRIGGER update_new_table_updated_at
  BEFORE UPDATE ON public.new_table
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add to realtime if needed
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.new_table;
```

### 2.4 RLS Policy Guidelines

```sql
-- ✅ GOOD: Explicit user ownership check
CREATE POLICY "policy_name" ON public.table_name
  FOR SELECT USING (auth.uid() = user_id);

-- ✅ GOOD: Admin access via security definer function
CREATE POLICY "Admins can view all" ON public.table_name
  FOR SELECT USING (public.is_admin(auth.uid()));

-- ❌ BAD: Avoid self-referencing policies (causes infinite recursion)
CREATE POLICY "bad_policy" ON public.profiles
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- ✅ FIX: Use security definer function instead
CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, role_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND role = role_name);
$$;
```

### 2.5 Function Creation Template

```sql
-- Migration: Create [function_name] function
-- Purpose: [Brief explanation]

CREATE OR REPLACE FUNCTION public.function_name(param1 UUID, param2 TEXT)
RETURNS TABLE(column1 UUID, column2 TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name
  FROM public.some_table t
  WHERE t.user_id = param1
    AND t.status = param2;
END;
$$;
```

---

## 3. Migration Test Script

### 3.1 Pre-Deployment Checklist

Run these queries to validate your migration before deploying:

```sql
-- ===========================================
-- PRE-DEPLOYMENT VALIDATION SCRIPT
-- ===========================================

-- 1. VERIFY TABLE EXISTS
SELECT EXISTS (
  SELECT FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename = 'your_table_name'
) AS table_exists;

-- 2. VERIFY COLUMN STRUCTURE
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'your_table_name' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. VERIFY RLS IS ENABLED
SELECT 
  relname AS table_name, 
  relrowsecurity AS rls_enabled
FROM pg_class 
WHERE relname = 'your_table_name';

-- 4. VERIFY POLICIES EXIST
SELECT 
  policyname, 
  cmd AS operation, 
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies 
WHERE tablename = 'your_table_name';

-- 5. VERIFY INDEXES
SELECT 
  indexname, 
  indexdef
FROM pg_indexes 
WHERE tablename = 'your_table_name';

-- 6. VERIFY TRIGGERS
SELECT 
  trigger_name, 
  event_manipulation, 
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'your_table_name';
```

### 3.2 Post-Deployment Verification

```sql
-- ===========================================
-- POST-DEPLOYMENT VERIFICATION SCRIPT
-- ===========================================

-- 1. Count rows (sanity check)
SELECT COUNT(*) FROM public.your_table_name;

-- 2. Test INSERT (replace with test data)
INSERT INTO public.your_table_name (user_id, name)
VALUES ('00000000-0000-0000-0000-000000000000', 'Test Entry')
RETURNING *;

-- 3. Test SELECT
SELECT * FROM public.your_table_name 
WHERE user_id = '00000000-0000-0000-0000-000000000000';

-- 4. Test UPDATE
UPDATE public.your_table_name 
SET name = 'Updated Test'
WHERE user_id = '00000000-0000-0000-0000-000000000000'
RETURNING *;

-- 5. Test DELETE (cleanup)
DELETE FROM public.your_table_name 
WHERE user_id = '00000000-0000-0000-0000-000000000000';

-- 6. Verify foreign key relationships
SELECT
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'your_table_name';
```

### 3.3 Edge Function Connectivity Test

After schema changes, verify edge functions still work:

```bash
# Test via Lovable's curl_edge_functions tool
# Or manually test affected endpoints in the app
```

---

## 4. Rollback Templates

### 4.1 Column Removal Rollback

```sql
-- ===========================================
-- ROLLBACK: Remove column from table
-- Original Migration: [migration_filename]
-- ===========================================

-- Remove index first (if exists)
DROP INDEX IF EXISTS idx_table_column;

-- Remove the column
ALTER TABLE public.table_name 
DROP COLUMN IF EXISTS column_name;
```

### 4.2 Table Removal Rollback

```sql
-- ===========================================
-- ROLLBACK: Drop table (⚠️ DESTRUCTIVE - DATA LOSS)
-- Original Migration: [migration_filename]
-- ===========================================

-- Step 1: Remove from realtime publication (if added)
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.table_name;

-- Step 2: Remove all policies
DROP POLICY IF EXISTS "Users can view own data" ON public.table_name;
DROP POLICY IF EXISTS "Users can create own data" ON public.table_name;
DROP POLICY IF EXISTS "Users can update own data" ON public.table_name;
DROP POLICY IF EXISTS "Users can delete own data" ON public.table_name;

-- Step 3: Remove triggers
DROP TRIGGER IF EXISTS update_table_name_updated_at ON public.table_name;

-- Step 4: Drop table
DROP TABLE IF EXISTS public.table_name;
```

### 4.3 Policy Rollback

```sql
-- ===========================================
-- ROLLBACK: Remove RLS policy
-- Original Migration: [migration_filename]
-- ===========================================

DROP POLICY IF EXISTS "policy_name" ON public.table_name;
```

### 4.4 Function Rollback

```sql
-- ===========================================
-- ROLLBACK: Remove function
-- Original Migration: [migration_filename]
-- ===========================================

DROP FUNCTION IF EXISTS public.function_name(UUID, TEXT);
```

### 4.5 Safe Rollback Procedure

```markdown
## Pre-Rollback Checklist

1. [ ] Document current state of affected tables
2. [ ] Export affected data if needed:
   ```sql
   COPY (SELECT * FROM public.table_name) TO '/tmp/backup.csv' CSV HEADER;
   ```
3. [ ] Identify all dependent objects (views, functions, triggers)
4. [ ] Notify team of planned rollback
5. [ ] Test rollback in staging first (if available)

## Rollback Steps

1. [ ] Apply rollback SQL via migration tool
2. [ ] Verify rollback success with validation queries
3. [ ] Update related edge functions if needed
4. [ ] Test frontend functionality
5. [ ] Monitor for errors in logs

## Post-Rollback

1. [ ] Document what was rolled back and why
2. [ ] Update related documentation
3. [ ] Create follow-up task if needed
```

---

## 5. Staging Environment Process

### 5.1 Lovable Cloud Context

> **Note**: Lovable Cloud projects don't have built-in staging environments. Use these alternative approaches.

### 5.2 Option A: Local Testing with Supabase CLI

```bash
# 1. Install Supabase CLI
npm install -g supabase

# 2. Initialize local Supabase
supabase init

# 3. Start local instance
supabase start

# 4. Apply migration locally
supabase db reset

# 5. Test your changes
# Connect to local DB at localhost:54322
```

### 5.3 Option B: Separate Test Project

1. Create a new Lovable project for testing
2. Copy migration files to test project
3. Apply and verify migrations
4. If successful, apply to production

### 5.4 Pre-Production Testing Workflow

```markdown
## Migration Testing Workflow

### Step 1: Review
- [ ] SQL syntax is correct
- [ ] Uses `IF NOT EXISTS` / `IF EXISTS` clauses
- [ ] RLS policies are included for new tables
- [ ] No reserved schema modifications

### Step 2: Validate
- [ ] Run pre-deployment validation script
- [ ] Check for potential conflicts with existing data
- [ ] Verify column defaults won't break existing queries

### Step 3: Apply
- [ ] Use Lovable migration tool to apply
- [ ] Monitor for any errors during application

### Step 4: Verify
- [ ] Run post-deployment verification script
- [ ] Test affected edge functions
- [ ] Test frontend data flows

### Step 5: Monitor
- [ ] Check Lovable Cloud logs for errors
- [ ] Monitor for RLS policy violations
- [ ] Watch for performance issues
```

### 5.5 Data Safety Guidelines

| Guideline | Implementation |
|-----------|----------------|
| **Backups** | Export data before destructive operations |
| **Transactions** | Use `BEGIN/COMMIT` for multi-step migrations |
| **Defaults** | Always provide sensible defaults for new columns |
| **Nullable** | Consider if new columns should be nullable initially |
| **Indexes** | Add indexes for frequently queried columns |

---

## 6. Common Migration Patterns

### 6.1 Adding a Boolean Flag

```sql
-- Pattern: Add boolean flag with default
-- Used for: Feature flags, status indicators, user preferences

ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS has_seen_tour BOOLEAN DEFAULT false;
```

### 6.2 Adding a JSONB Column

```sql
-- Pattern: Add flexible JSONB storage
-- Used for: Metadata, settings, dynamic fields

ALTER TABLE public.daily_plans
ADD COLUMN IF NOT EXISTS custom_reflections JSONB DEFAULT '[]'::jsonb;

-- Optional: Add GIN index for queries inside JSONB
CREATE INDEX IF NOT EXISTS idx_daily_plans_custom_reflections 
ON public.daily_plans USING GIN (custom_reflections);
```

### 6.3 Adding Enum-like Text Column

```sql
-- Pattern: Text column with CHECK constraint
-- Used for: Status fields, type indicators

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' 
CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
```

### 6.4 Adding Timestamp Columns

```sql
-- Pattern: Add tracking timestamps
-- Used for: Audit trails, soft deletes

ALTER TABLE public.table_name
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ DEFAULT NULL;
```

### 6.5 Adding Foreign Key Reference

```sql
-- Pattern: Add foreign key to existing table
-- Used for: Relationships between tables

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_tasks_project_id 
ON public.tasks(project_id);
```

### 6.6 Creating a Junction Table

```sql
-- Pattern: Many-to-many relationship
-- Used for: Tags, categories, shared resources

CREATE TABLE IF NOT EXISTS public.task_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(task_id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, tag_id)
);

ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;

-- Policy inherits from parent table
CREATE POLICY "Users can manage own task tags" ON public.task_tags
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.tasks t 
    WHERE t.task_id = task_tags.task_id 
    AND t.user_id = auth.uid()
  )
);
```

---

## 7. Troubleshooting

### 7.1 Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `relation "table" already exists` | Missing `IF NOT EXISTS` | Add `IF NOT EXISTS` clause |
| `column "col" of relation "table" already exists` | Duplicate column add | Add `IF NOT EXISTS` or check if already applied |
| `infinite recursion detected in policy` | Self-referencing RLS policy | Use security definer function instead |
| `new row violates row-level security policy` | RLS blocking insert | Check `WITH CHECK` clause matches use case |
| `null value in column violates not-null constraint` | Missing default for new required column | Add `DEFAULT` value or make nullable |
| `foreign key constraint violation` | Referenced row doesn't exist | Use `ON DELETE SET NULL` or `CASCADE` |

### 7.2 RLS Policy Debugging

```sql
-- Check what policies exist
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- Test as specific user (run in SQL editor)
SET request.jwt.claims = '{"sub": "user-uuid-here"}';
SELECT * FROM public.your_table;
RESET request.jwt.claims;

-- Temporarily disable RLS for debugging (⚠️ DANGER)
-- ALTER TABLE public.your_table DISABLE ROW LEVEL SECURITY;
-- Don't forget to re-enable!
-- ALTER TABLE public.your_table ENABLE ROW LEVEL SECURITY;
```

### 7.3 Query Limit Issues

```sql
-- Supabase default limit is 1000 rows
-- If missing data, check if hitting this limit

-- Count total rows
SELECT COUNT(*) FROM public.large_table;

-- If > 1000, implement pagination in your queries
-- Or explicitly set higher limit (up to 1000000)
```

### 7.4 Performance Debugging

```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM public.your_table WHERE column = 'value';

-- Check for missing indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'your_table';

-- Add index if needed
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_table_column 
ON public.your_table(column);
```

---

## 8. Related Documentation

### Internal Documentation

- [STABILITY_AUDIT_REPORT.md](./STABILITY_AUDIT_REPORT.md) - Production readiness review
- [README.md](./README.md) - Project overview

### External Resources

- [Lovable Documentation](https://docs.lovable.dev) - Platform documentation
- [Supabase SQL Editor](https://supabase.com/docs/guides/database) - SQL reference
- [PostgreSQL Documentation](https://www.postgresql.org/docs/) - Database reference

### Edge Function Updates

After schema changes, update related edge functions:

```typescript
// Example: Update TypeScript types after adding column
// The types in src/integrations/supabase/types.ts are auto-generated
// Just update your edge function to use the new column

const { data } = await supabaseClient
  .from('table_name')
  .select('*, new_column') // Add new column to select
  .eq('user_id', userId);
```

---

## Appendix: Quick Reference

### Migration File Template

```sql
-- ===========================================
-- Migration: [Brief description]
-- Created: [Date]
-- Purpose: [Why this change is needed]
-- ===========================================

-- Your SQL here

-- ===========================================
-- Rollback (if needed):
-- [Rollback SQL as comment]
-- ===========================================
```

### Checklist for Every Migration

- [ ] Uses `IF NOT EXISTS` / `IF EXISTS`
- [ ] Has clear comment header
- [ ] Includes RLS policies for new tables
- [ ] Adds appropriate indexes
- [ ] Tested with validation script
- [ ] Rollback plan documented
- [ ] Related edge functions updated

---

*Last updated: January 2026*
