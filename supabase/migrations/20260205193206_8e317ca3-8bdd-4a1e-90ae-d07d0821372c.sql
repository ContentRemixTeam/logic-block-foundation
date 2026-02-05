-- Sprint 1 Phase 2: Data Integrity Constraints
-- Add CHECK constraints and Foreign Keys

-- Status constraint for tasks (including existing values: backlog, waiting)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tasks_status_check' AND table_name = 'tasks'
  ) THEN
    ALTER TABLE public.tasks 
    ADD CONSTRAINT tasks_status_check 
    CHECK (status IS NULL OR status IN ('todo', 'in_progress', 'done', 'blocked', 'someday', 'scheduled', 'backlog', 'waiting'));
  END IF;
END $$;

-- Foreign key: tasks.project_id → projects.id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_tasks_project' AND table_name = 'tasks'
  ) THEN
    ALTER TABLE public.tasks
    ADD CONSTRAINT fk_tasks_project
    FOREIGN KEY (project_id) REFERENCES public.projects(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Foreign key: tasks.section_id → project_sections.id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_tasks_section' AND table_name = 'tasks'
  ) THEN
    ALTER TABLE public.tasks
    ADD CONSTRAINT fk_tasks_section
    FOREIGN KEY (section_id) REFERENCES public.project_sections(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Foreign key: tasks.cycle_id → cycles_90_day.cycle_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_tasks_cycle' AND table_name = 'tasks'
  ) THEN
    ALTER TABLE public.tasks
    ADD CONSTRAINT fk_tasks_cycle
    FOREIGN KEY (cycle_id) REFERENCES public.cycles_90_day(cycle_id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Foreign key: daily_plans.cycle_id → cycles_90_day.cycle_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_daily_plans_cycle_new' AND table_name = 'daily_plans'
  ) THEN
    -- Check if another FK exists with different name
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.referential_constraints rc
      JOIN information_schema.key_column_usage kcu ON rc.constraint_name = kcu.constraint_name
      WHERE kcu.table_name = 'daily_plans' AND kcu.column_name = 'cycle_id'
    ) THEN
      ALTER TABLE public.daily_plans
      ADD CONSTRAINT fk_daily_plans_cycle_new
      FOREIGN KEY (cycle_id) REFERENCES public.cycles_90_day(cycle_id)
      ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Foreign key: daily_plans.week_id → weekly_plans.week_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_daily_plans_week_new' AND table_name = 'daily_plans'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.referential_constraints rc
      JOIN information_schema.key_column_usage kcu ON rc.constraint_name = kcu.constraint_name
      WHERE kcu.table_name = 'daily_plans' AND kcu.column_name = 'week_id'
    ) THEN
      ALTER TABLE public.daily_plans
      ADD CONSTRAINT fk_daily_plans_week_new
      FOREIGN KEY (week_id) REFERENCES public.weekly_plans(week_id)
      ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Foreign key: project_sections.project_id → projects.id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_sections_project' AND table_name = 'project_sections'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.referential_constraints rc
      JOIN information_schema.key_column_usage kcu ON rc.constraint_name = kcu.constraint_name
      WHERE kcu.table_name = 'project_sections' AND kcu.column_name = 'project_id'
    ) THEN
      ALTER TABLE public.project_sections
      ADD CONSTRAINT fk_sections_project
      FOREIGN KEY (project_id) REFERENCES public.projects(id)
      ON DELETE CASCADE;
    END IF;
  END IF;
END $$;