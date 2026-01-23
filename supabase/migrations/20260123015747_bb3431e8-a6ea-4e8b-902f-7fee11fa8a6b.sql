-- Smart Wizards Phase 1: New tables and schema updates

-- 1. Feature releases tracking
CREATE TABLE IF NOT EXISTS feature_releases (
  feature_name TEXT PRIMARY KEY,
  released_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT
);

INSERT INTO feature_releases (feature_name, description)
VALUES ('topic_planning', 'Content topic planning feature')
ON CONFLICT (feature_name) DO NOTHING;

-- 2. Wizard templates (read-only config)
CREATE TABLE IF NOT EXISTS wizard_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  estimated_time_minutes INTEGER,
  questions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert the 90-day cycle wizard template
INSERT INTO wizard_templates (template_name, display_name, description, icon, estimated_time_minutes, questions)
VALUES (
  'cycle-90-day',
  '90-Day Cycle Planner',
  'Create a focused 90-day business plan with goals, metrics, and weekly rhythms.',
  'Target',
  20,
  '[]'
) ON CONFLICT (template_name) DO NOTHING;

-- 3. Wizard completions (user history)
CREATE TABLE IF NOT EXISTS wizard_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  template_name TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  planning_level TEXT CHECK (planning_level IN ('detailed','simple','minimal','none')),
  created_cycle_id UUID,
  completed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Topic planning: workflows
CREATE TABLE IF NOT EXISTS user_content_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workflow_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  topic_planning_cadence TEXT CHECK (topic_planning_cadence IN ('monthly','weekly','daily','external')),
  recurrence TEXT,
  custom_schedule JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Topic planning: content topics
CREATE TABLE IF NOT EXISTS content_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workflow_id UUID REFERENCES user_content_workflows(id) ON DELETE SET NULL,
  planned_date DATE,
  topic_text TEXT,
  topic_notes TEXT,
  related_content_ids UUID[],
  status TEXT DEFAULT 'not_planned' CHECK (status IN ('not_planned','planned','in_progress','created')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Project snapshots for safe upgrades
CREATE TABLE IF NOT EXISTS project_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  snapshot_data JSONB NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Alter existing tables

-- user_profiles: add default planning level
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS default_planning_level TEXT DEFAULT 'simple';

-- Add check constraint separately to avoid issues if column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_default_planning_level_check'
  ) THEN
    ALTER TABLE user_profiles
      ADD CONSTRAINT user_profiles_default_planning_level_check
      CHECK (default_planning_level IN ('detailed','simple','minimal','none'));
  END IF;
END $$;

-- projects: add topic planning fields
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS has_topic_planning BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS topic_planning_cadence TEXT,
  ADD COLUMN IF NOT EXISTS upgrade_dismissed BOOLEAN DEFAULT false;

-- Add check constraint for topic_planning_cadence
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_topic_planning_cadence_check'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_topic_planning_cadence_check
      CHECK (topic_planning_cadence IN ('monthly','weekly','daily','external'));
  END IF;
END $$;

-- tasks: link to content topics
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS content_topic_id UUID REFERENCES content_topics(id) ON DELETE SET NULL;

-- cycles_90_day: add wizard-specific fields
ALTER TABLE cycles_90_day
  ADD COLUMN IF NOT EXISTS useful_belief TEXT,
  ADD COLUMN IF NOT EXISTS limiting_thought TEXT,
  ADD COLUMN IF NOT EXISTS useful_thought TEXT;

-- Enable RLS on all new tables
ALTER TABLE feature_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE wizard_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE wizard_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_content_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- feature_releases: public read
CREATE POLICY "feature_releases_read" ON feature_releases
  FOR SELECT TO authenticated USING (true);

-- wizard_templates: public read
CREATE POLICY "wizard_templates_read" ON wizard_templates
  FOR SELECT TO authenticated USING (true);

-- wizard_completions: own data only
CREATE POLICY "wizard_completions_select_own" ON wizard_completions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "wizard_completions_insert_own" ON wizard_completions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wizard_completions_update_own" ON wizard_completions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "wizard_completions_delete_own" ON wizard_completions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- content_topics: own data only
CREATE POLICY "content_topics_select_own" ON content_topics
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "content_topics_insert_own" ON content_topics
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "content_topics_update_own" ON content_topics
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "content_topics_delete_own" ON content_topics
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- user_content_workflows: own data only
CREATE POLICY "workflows_select_own" ON user_content_workflows
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "workflows_insert_own" ON user_content_workflows
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "workflows_update_own" ON user_content_workflows
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "workflows_delete_own" ON user_content_workflows
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- project_snapshots: view own projects only
CREATE POLICY "snapshots_select_own" ON project_snapshots
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_snapshots.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "snapshots_insert_own" ON project_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_snapshots.project_id
    AND projects.user_id = auth.uid()
  ));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wizard_completions_user_id ON wizard_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_wizard_completions_template_name ON wizard_completions(template_name);
CREATE INDEX IF NOT EXISTS idx_content_topics_user_id ON content_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_content_topics_workflow_id ON content_topics(workflow_id);
CREATE INDEX IF NOT EXISTS idx_content_topics_planned_date ON content_topics(planned_date);
CREATE INDEX IF NOT EXISTS idx_user_content_workflows_user_id ON user_content_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_project_snapshots_project_id ON project_snapshots(project_id);