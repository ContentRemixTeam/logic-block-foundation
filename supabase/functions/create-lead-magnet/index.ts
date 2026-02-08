// Create Lead Magnet Edge Function
// Creates project, tasks, and lead_magnet record from wizard data

import { Hono } from 'https://deno.land/x/hono@v3.12.11/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeadMagnetData {
  name: string;
  description: string;
  format: string;
  idealSubscriber: string;
  mainProblem: string;
  transformation: string;
  platforms: string[];
  deliverables: string[];
  estimatedLength: string;
  hasBonus: boolean;
  bonusDescription: string;
  headline: string;
  subheadline: string;
  bullets: string[];
  resultPromise: string;
  landingPagePlatform: string;
  landingPageStatus: string;
  emailProvider: string;
  deliveryMethod: string;
  landingPageUrl: string;
  emailSequenceLength: number;
  emailSequencePurpose: string;
  emailSequenceStatus: string;
  emailSequenceDeadline: string;
  promotionMethod: string;
  promotionPlatforms: string[];
  promotionStartDate: string;
  promotionDuration: string;
  weeklyCommitment: number;
  selectedTasks: Record<string, boolean>;
}

const app = new Hono();

app.options('*', (c) => {
  return new Response(null, { headers: corsHeaders });
});

app.post('/', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'No authorization header' }, 401, corsHeaders);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return c.json({ error: 'Unauthorized' }, 401, corsHeaders);
    }

    const data = await c.req.json() as LeadMagnetData;
    
    if (!data.name?.trim()) {
      return c.json({ error: 'Lead magnet name is required' }, 400, corsHeaders);
    }

    // Get current active cycle (optional)
    const { data: cycle } = await supabase
      .from('cycles_90_day')
      .select('cycle_id')
      .eq('user_id', user.id)
      .lte('start_date', new Date().toISOString().split('T')[0])
      .gte('end_date', new Date().toISOString().split('T')[0])
      .limit(1)
      .maybeSingle();

    const cycleId = cycle?.cycle_id || null;

    // Create project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: `Lead Magnet: ${data.name}`,
        description: data.description || `Creating and launching "${data.name}" lead magnet`,
        status: 'active',
        cycle_id: cycleId,
      })
      .select()
      .single();

    if (projectError) {
      console.error('Project creation error:', projectError);
      throw new Error('Failed to create project');
    }

    // Create lead_magnet record
    const { data: leadMagnet, error: lmError } = await supabase
      .from('lead_magnets')
      .insert({
        user_id: user.id,
        project_id: project.id,
        cycle_id: cycleId,
        name: data.name,
        description: data.description,
        format: data.format,
        ideal_subscriber: data.idealSubscriber,
        main_problem: data.mainProblem,
        transformation: data.transformation,
        platforms: data.platforms,
        deliverables: data.deliverables,
        estimated_length: data.estimatedLength,
        has_bonus: data.hasBonus,
        bonus_description: data.bonusDescription,
        headline: data.headline,
        subheadline: data.subheadline,
        bullets: data.bullets,
        result_promise: data.resultPromise,
        landing_page_platform: data.landingPagePlatform,
        landing_page_status: data.landingPageStatus,
        email_provider: data.emailProvider,
        delivery_method: data.deliveryMethod,
        landing_page_url: data.landingPageUrl,
        email_sequence_length: data.emailSequenceLength,
        email_sequence_purpose: data.emailSequencePurpose,
        email_sequence_status: data.emailSequenceStatus,
        email_sequence_deadline: data.emailSequenceDeadline || null,
        promotion_method: data.promotionMethod,
        promotion_platforms: data.promotionPlatforms,
        promotion_start_date: data.promotionStartDate || null,
        promotion_duration: data.promotionDuration,
        weekly_commitment: data.weeklyCommitment,
        status: 'planning',
      })
      .select()
      .single();

    if (lmError) {
      console.error('Lead magnet creation error:', lmError);
      // Don't fail completely, project is already created
    }

    // Generate tasks
    const baseDate = new Date();
    const tasks = generateTasks(data, user.id, project.id, cycleId, baseDate);
    
    // Filter out deselected tasks
    const selectedTasks = tasks.filter(task => {
      const isSelected = data.selectedTasks[task.template_key];
      // Default to true if not explicitly set to false
      return isSelected !== false;
    });

    // Insert tasks
    let tasksCreated = 0;
    if (selectedTasks.length > 0) {
      const { data: insertedTasks, error: tasksError } = await supabase
        .from('tasks')
        .insert(selectedTasks)
        .select();

      if (tasksError) {
        console.error('Tasks creation error:', tasksError);
      } else {
        tasksCreated = insertedTasks?.length || 0;
      }
    }

    return c.json({
      success: true,
      message: `Lead magnet "${data.name}" created with ${tasksCreated} tasks!`,
      project_id: project.id,
      lead_magnet_id: leadMagnet?.id,
      tasks_created: tasksCreated,
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Create lead magnet error:', error);
    return c.json(
      { error: error.message || 'Failed to create lead magnet' },
      500,
      corsHeaders
    );
  }
});

function generateTasks(
  data: LeadMagnetData,
  userId: string,
  projectId: string,
  cycleId: string | null,
  baseDate: Date
) {
  const tasks: any[] = [];

  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result.toISOString().split('T')[0];
  };

  // Setup Phase
  tasks.push({
    user_id: userId,
    project_id: projectId,
    cycle_id: cycleId,
    task_text: 'Define target audience and problem',
    scheduled_date: addDays(baseDate, 0),
    status: 'scheduled',
    template_key: 'define-audience',
    is_system_generated: true,
    system_source: 'lead-magnet-wizard',
  });

  tasks.push({
    user_id: userId,
    project_id: projectId,
    cycle_id: cycleId,
    task_text: 'Outline freebie content',
    scheduled_date: addDays(baseDate, 1),
    status: 'scheduled',
    template_key: 'outline-content',
    is_system_generated: true,
    system_source: 'lead-magnet-wizard',
  });

  tasks.push({
    user_id: userId,
    project_id: projectId,
    cycle_id: cycleId,
    task_text: `Create ${data.name || 'lead magnet'} deliverable`,
    scheduled_date: addDays(baseDate, 3),
    status: 'scheduled',
    template_key: 'create-deliverable',
    is_system_generated: true,
    system_source: 'lead-magnet-wizard',
  });

  tasks.push({
    user_id: userId,
    project_id: projectId,
    cycle_id: cycleId,
    task_text: 'Design cover/thumbnail',
    scheduled_date: addDays(baseDate, 5),
    status: 'scheduled',
    template_key: 'design-cover',
    is_system_generated: true,
    system_source: 'lead-magnet-wizard',
  });

  // Tech Phase
  tasks.push({
    user_id: userId,
    project_id: projectId,
    cycle_id: cycleId,
    task_text: 'Set up landing page',
    scheduled_date: addDays(baseDate, 6),
    status: 'scheduled',
    template_key: 'setup-landing',
    is_system_generated: true,
    system_source: 'lead-magnet-wizard',
  });

  tasks.push({
    user_id: userId,
    project_id: projectId,
    cycle_id: cycleId,
    task_text: 'Connect email automation',
    scheduled_date: addDays(baseDate, 7),
    status: 'scheduled',
    template_key: 'connect-email',
    is_system_generated: true,
    system_source: 'lead-magnet-wizard',
  });

  tasks.push({
    user_id: userId,
    project_id: projectId,
    cycle_id: cycleId,
    task_text: 'Test opt-in flow',
    scheduled_date: addDays(baseDate, 8),
    status: 'scheduled',
    template_key: 'test-optin',
    is_system_generated: true,
    system_source: 'lead-magnet-wizard',
  });

  // Copy Phase
  tasks.push({
    user_id: userId,
    project_id: projectId,
    cycle_id: cycleId,
    task_text: 'Write landing page copy',
    scheduled_date: addDays(baseDate, 4),
    status: 'scheduled',
    template_key: 'write-landing',
    is_system_generated: true,
    system_source: 'lead-magnet-wizard',
    content_type: 'landing-page',
  });

  tasks.push({
    user_id: userId,
    project_id: projectId,
    cycle_id: cycleId,
    task_text: 'Write welcome email',
    scheduled_date: addDays(baseDate, 6),
    status: 'scheduled',
    template_key: 'write-welcome',
    is_system_generated: true,
    system_source: 'lead-magnet-wizard',
    content_type: 'email',
  });

  // Nurture emails
  for (let i = 1; i <= data.emailSequenceLength; i++) {
    tasks.push({
      user_id: userId,
      project_id: projectId,
      cycle_id: cycleId,
      task_text: `Write nurture email ${i}`,
      scheduled_date: addDays(baseDate, 6 + i),
      status: 'scheduled',
      template_key: `write-nurture-${i}`,
      is_system_generated: true,
      system_source: 'lead-magnet-wizard',
      content_type: 'email',
    });
  }

  // Promotion Phase
  tasks.push({
    user_id: userId,
    project_id: projectId,
    cycle_id: cycleId,
    task_text: 'Create promo graphics',
    scheduled_date: addDays(baseDate, 9),
    status: 'scheduled',
    template_key: 'create-promo-graphics',
    is_system_generated: true,
    system_source: 'lead-magnet-wizard',
  });

  tasks.push({
    user_id: userId,
    project_id: projectId,
    cycle_id: cycleId,
    task_text: 'Write promo post #1',
    scheduled_date: addDays(baseDate, 10),
    status: 'scheduled',
    template_key: 'write-promo-1',
    is_system_generated: true,
    system_source: 'lead-magnet-wizard',
    content_type: 'social',
  });

  tasks.push({
    user_id: userId,
    project_id: projectId,
    cycle_id: cycleId,
    task_text: 'Write promo post #2',
    scheduled_date: addDays(baseDate, 12),
    status: 'scheduled',
    template_key: 'write-promo-2',
    is_system_generated: true,
    system_source: 'lead-magnet-wizard',
    content_type: 'social',
  });

  tasks.push({
    user_id: userId,
    project_id: projectId,
    cycle_id: cycleId,
    task_text: 'Write promo post #3',
    scheduled_date: addDays(baseDate, 14),
    status: 'scheduled',
    template_key: 'write-promo-3',
    is_system_generated: true,
    system_source: 'lead-magnet-wizard',
    content_type: 'social',
  });

  return tasks;
}

Deno.serve(app.fetch);
