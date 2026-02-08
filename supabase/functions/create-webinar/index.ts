// Create Webinar Edge Function
// Creates project, tasks, and webinar record from wizard data

import { Hono } from 'https://deno.land/x/hono@v3.12.11/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebinarData {
  name: string;
  eventType: string;
  topic: string;
  description: string;
  eventDate: string;
  eventTime: string;
  timezone: string;
  durationMinutes: number;
  isLive: boolean;
  hasReplay: boolean;
  replayDurationHours: number;
  idealAttendee: string;
  mainProblem: string;
  transformation: string;
  experienceLevel: string;
  contentOutline: Array<{ id: string; title: string; duration: number; type: string }>;
  offerTiming: string;
  contentStyle: string;
  includeQa: boolean;
  qaDurationMinutes: number;
  platform: string;
  registrationPlatform: string;
  registrationUrl: string;
  hasPracticeRun: boolean;
  practiceDate: string;
  registrationOpenDate: string;
  registrationHeadline: string;
  registrationBullets: string[];
  confirmationEmailStatus: string;
  reminderSequenceCount: number;
  offerName: string;
  offerPrice: number;
  offerDescription: string;
  hasAttendeeBonus: boolean;
  attendeeBonusDescription: string;
  attendeeBonusDeadline: string;
  hasPaymentPlan: boolean;
  paymentPlanDetails: string;
  salesPageUrl: string;
  checkoutUrl: string;
  followupSequenceLength: number;
  replayAccessHours: number;
  cartCloseDate: string;
  followupEmailStatus: string;
  registrationGoal: number;
  showUpGoalPercent: number;
  conversionGoalPercent: number;
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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return c.json({ error: 'Unauthorized' }, 401, corsHeaders);
    }

    const data = await c.req.json() as WebinarData;
    
    if (!data.name?.trim()) {
      return c.json({ error: 'Webinar name is required' }, 400, corsHeaders);
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
    const eventTypeLabel = data.eventType.charAt(0).toUpperCase() + data.eventType.slice(1);

    // Create project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: `${eventTypeLabel}: ${data.name}`,
        description: data.description || `Planning and executing "${data.name}" ${data.eventType}`,
        status: 'active',
        cycle_id: cycleId,
      })
      .select()
      .single();

    if (projectError) {
      console.error('Project creation error:', projectError);
      throw new Error('Failed to create project');
    }

    // Create webinar record
    const { data: webinar, error: webinarError } = await supabase
      .from('webinars')
      .insert({
        user_id: user.id,
        project_id: project.id,
        cycle_id: cycleId,
        name: data.name,
        event_type: data.eventType,
        topic: data.topic,
        description: data.description,
        event_date: data.eventDate || null,
        event_time: data.eventTime || null,
        timezone: data.timezone,
        duration_minutes: data.durationMinutes,
        is_live: data.isLive,
        has_replay: data.hasReplay,
        replay_duration_hours: data.replayDurationHours,
        ideal_attendee: data.idealAttendee,
        main_problem: data.mainProblem,
        transformation: data.transformation,
        experience_level: data.experienceLevel,
        content_outline: data.contentOutline,
        offer_timing: data.offerTiming,
        content_style: data.contentStyle,
        include_qa: data.includeQa,
        qa_duration_minutes: data.qaDurationMinutes,
        platform: data.platform,
        registration_platform: data.registrationPlatform,
        registration_url: data.registrationUrl,
        has_practice_run: data.hasPracticeRun,
        practice_date: data.practiceDate || null,
        registration_open_date: data.registrationOpenDate || null,
        registration_headline: data.registrationHeadline,
        registration_bullets: data.registrationBullets,
        confirmation_email_status: data.confirmationEmailStatus,
        reminder_sequence_count: data.reminderSequenceCount,
        offer_name: data.offerName,
        offer_price: data.offerPrice || null,
        offer_description: data.offerDescription,
        has_attendee_bonus: data.hasAttendeeBonus,
        attendee_bonus_description: data.attendeeBonusDescription,
        attendee_bonus_deadline: data.attendeeBonusDeadline,
        has_payment_plan: data.hasPaymentPlan,
        payment_plan_details: data.paymentPlanDetails,
        sales_page_url: data.salesPageUrl,
        checkout_url: data.checkoutUrl,
        followup_sequence_length: data.followupSequenceLength,
        replay_access_hours: data.replayAccessHours,
        cart_close_date: data.cartCloseDate || null,
        followup_email_status: data.followupEmailStatus,
        registration_goal: data.registrationGoal || null,
        show_up_goal_percent: data.showUpGoalPercent,
        conversion_goal_percent: data.conversionGoalPercent,
        status: 'planning',
      })
      .select()
      .single();

    if (webinarError) {
      console.error('Webinar creation error:', webinarError);
    }

    // Generate tasks
    const eventDate = data.eventDate ? new Date(data.eventDate) : new Date();
    const tasks = generateTasks(data, user.id, project.id, cycleId, eventDate);
    
    // Filter out deselected tasks
    const selectedTasks = tasks.filter(task => {
      const isSelected = data.selectedTasks[task.template_key];
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
      message: `${eventTypeLabel} "${data.name}" created with ${tasksCreated} tasks!`,
      project_id: project.id,
      webinar_id: webinar?.id,
      tasks_created: tasksCreated,
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Create webinar error:', error);
    return c.json(
      { error: error.message || 'Failed to create webinar' },
      500,
      corsHeaders
    );
  }
});

function generateTasks(
  data: WebinarData,
  userId: string,
  projectId: string,
  cycleId: string | null,
  eventDate: Date
) {
  const tasks: any[] = [];
  const eventTypeLabel = data.eventType.charAt(0).toUpperCase() + data.eventType.slice(1);

  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result.toISOString().split('T')[0];
  };

  // Planning Phase
  tasks.push(
    {
      user_id: userId,
      project_id: projectId,
      cycle_id: cycleId,
      task_text: `Define ${data.eventType} topic and outcomes`,
      scheduled_date: addDays(eventDate, -14),
      status: 'scheduled',
      template_key: 'define-topic',
      is_system_generated: true,
      system_source: 'webinar-wizard',
    },
    {
      user_id: userId,
      project_id: projectId,
      cycle_id: cycleId,
      task_text: 'Create content outline',
      scheduled_date: addDays(eventDate, -13),
      status: 'scheduled',
      template_key: 'create-outline',
      is_system_generated: true,
      system_source: 'webinar-wizard',
    },
    {
      user_id: userId,
      project_id: projectId,
      cycle_id: cycleId,
      task_text: 'Define offer and bonuses',
      scheduled_date: addDays(eventDate, -12),
      status: 'scheduled',
      template_key: 'define-offer',
      is_system_generated: true,
      system_source: 'webinar-wizard',
    }
  );

  // Content Creation Phase
  tasks.push(
    {
      user_id: userId,
      project_id: projectId,
      cycle_id: cycleId,
      task_text: 'Create presentation slides',
      scheduled_date: addDays(eventDate, -10),
      status: 'scheduled',
      template_key: 'create-slides',
      is_system_generated: true,
      system_source: 'webinar-wizard',
    },
    {
      user_id: userId,
      project_id: projectId,
      cycle_id: cycleId,
      task_text: 'Write presentation script/notes',
      scheduled_date: addDays(eventDate, -9),
      status: 'scheduled',
      template_key: 'write-script',
      is_system_generated: true,
      system_source: 'webinar-wizard',
    },
    {
      user_id: userId,
      project_id: projectId,
      cycle_id: cycleId,
      task_text: 'Create pitch/offer slides',
      scheduled_date: addDays(eventDate, -8),
      status: 'scheduled',
      template_key: 'create-pitch',
      is_system_generated: true,
      system_source: 'webinar-wizard',
      content_type: 'sales-page',
    }
  );

  // Tech Setup Phase
  tasks.push(
    {
      user_id: userId,
      project_id: projectId,
      cycle_id: cycleId,
      task_text: `Set up ${data.platform || 'webinar'} room`,
      scheduled_date: addDays(eventDate, -7),
      status: 'scheduled',
      template_key: 'setup-platform',
      is_system_generated: true,
      system_source: 'webinar-wizard',
    },
    {
      user_id: userId,
      project_id: projectId,
      cycle_id: cycleId,
      task_text: 'Set up registration page',
      scheduled_date: addDays(eventDate, -7),
      status: 'scheduled',
      template_key: 'setup-registration',
      is_system_generated: true,
      system_source: 'webinar-wizard',
    },
    {
      user_id: userId,
      project_id: projectId,
      cycle_id: cycleId,
      task_text: 'Connect email automation',
      scheduled_date: addDays(eventDate, -6),
      status: 'scheduled',
      template_key: 'connect-email',
      is_system_generated: true,
      system_source: 'webinar-wizard',
    },
    {
      user_id: userId,
      project_id: projectId,
      cycle_id: cycleId,
      task_text: 'Test all tech and links',
      scheduled_date: addDays(eventDate, -5),
      status: 'scheduled',
      template_key: 'test-tech',
      is_system_generated: true,
      system_source: 'webinar-wizard',
    }
  );

  if (data.hasPracticeRun) {
    tasks.push({
      user_id: userId,
      project_id: projectId,
      cycle_id: cycleId,
      task_text: 'Conduct practice run',
      scheduled_date: data.practiceDate || addDays(eventDate, -3),
      status: 'scheduled',
      template_key: 'practice-run',
      is_system_generated: true,
      system_source: 'webinar-wizard',
    });
  }

  // Registration Phase
  tasks.push(
    {
      user_id: userId,
      project_id: projectId,
      cycle_id: cycleId,
      task_text: 'Write registration page copy',
      scheduled_date: addDays(eventDate, -7),
      status: 'scheduled',
      template_key: 'write-reg-page',
      is_system_generated: true,
      system_source: 'webinar-wizard',
      content_type: 'landing-page',
    },
    {
      user_id: userId,
      project_id: projectId,
      cycle_id: cycleId,
      task_text: 'Write confirmation email',
      scheduled_date: addDays(eventDate, -6),
      status: 'scheduled',
      template_key: 'write-confirmation',
      is_system_generated: true,
      system_source: 'webinar-wizard',
      content_type: 'email',
    }
  );

  // Reminder emails
  for (let i = 1; i <= data.reminderSequenceCount; i++) {
    tasks.push({
      user_id: userId,
      project_id: projectId,
      cycle_id: cycleId,
      task_text: `Write reminder email ${i}`,
      scheduled_date: addDays(eventDate, -6 + i),
      status: 'scheduled',
      template_key: `write-reminder-${i}`,
      is_system_generated: true,
      system_source: 'webinar-wizard',
      content_type: 'email',
    });
  }

  // Promotion Phase
  tasks.push(
    {
      user_id: userId,
      project_id: projectId,
      cycle_id: cycleId,
      task_text: 'Create promo graphics',
      scheduled_date: addDays(eventDate, -7),
      status: 'scheduled',
      template_key: 'create-promo-graphics',
      is_system_generated: true,
      system_source: 'webinar-wizard',
    },
    {
      user_id: userId,
      project_id: projectId,
      cycle_id: cycleId,
      task_text: 'Write promo post #1 (Announcement)',
      scheduled_date: addDays(eventDate, -6),
      status: 'scheduled',
      template_key: 'write-promo-1',
      is_system_generated: true,
      system_source: 'webinar-wizard',
      content_type: 'social',
    },
    {
      user_id: userId,
      project_id: projectId,
      cycle_id: cycleId,
      task_text: 'Write promo post #2 (Problem)',
      scheduled_date: addDays(eventDate, -4),
      status: 'scheduled',
      template_key: 'write-promo-2',
      is_system_generated: true,
      system_source: 'webinar-wizard',
      content_type: 'social',
    },
    {
      user_id: userId,
      project_id: projectId,
      cycle_id: cycleId,
      task_text: 'Write promo post #3 (Last Call)',
      scheduled_date: addDays(eventDate, -1),
      status: 'scheduled',
      template_key: 'write-promo-3',
      is_system_generated: true,
      system_source: 'webinar-wizard',
      content_type: 'social',
    }
  );

  // Event Day Phase
  tasks.push(
    {
      user_id: userId,
      project_id: projectId,
      cycle_id: cycleId,
      task_text: 'Final event prep',
      scheduled_date: addDays(eventDate, 0),
      status: 'scheduled',
      template_key: 'final-prep',
      is_system_generated: true,
      system_source: 'webinar-wizard',
    },
    {
      user_id: userId,
      project_id: projectId,
      cycle_id: cycleId,
      task_text: `Go live: ${eventTypeLabel}`,
      scheduled_date: addDays(eventDate, 0),
      status: 'scheduled',
      template_key: 'go-live',
      is_system_generated: true,
      system_source: 'webinar-wizard',
    },
    {
      user_id: userId,
      project_id: projectId,
      cycle_id: cycleId,
      task_text: 'Post-event tasks',
      scheduled_date: addDays(eventDate, 0),
      status: 'scheduled',
      template_key: 'post-event',
      is_system_generated: true,
      system_source: 'webinar-wizard',
    }
  );

  // Follow-up Phase
  if (data.hasReplay) {
    tasks.push({
      user_id: userId,
      project_id: projectId,
      cycle_id: cycleId,
      task_text: 'Upload and share replay',
      scheduled_date: addDays(eventDate, 1),
      status: 'scheduled',
      template_key: 'upload-replay',
      is_system_generated: true,
      system_source: 'webinar-wizard',
    });
  }

  tasks.push({
    user_id: userId,
    project_id: projectId,
    cycle_id: cycleId,
    task_text: 'Write replay email',
    scheduled_date: addDays(eventDate, 1),
    status: 'scheduled',
    template_key: 'write-replay-email',
    is_system_generated: true,
    system_source: 'webinar-wizard',
    content_type: 'email',
  });

  // Follow-up emails
  for (let i = 1; i <= data.followupSequenceLength; i++) {
    tasks.push({
      user_id: userId,
      project_id: projectId,
      cycle_id: cycleId,
      task_text: `Write follow-up email ${i}`,
      scheduled_date: addDays(eventDate, 1 + i),
      status: 'scheduled',
      template_key: `write-followup-${i}`,
      is_system_generated: true,
      system_source: 'webinar-wizard',
      content_type: 'email',
    });
  }

  tasks.push({
    user_id: userId,
    project_id: projectId,
    cycle_id: cycleId,
    task_text: 'Cart close / bonus deadline',
    scheduled_date: addDays(eventDate, Math.ceil(data.replayAccessHours / 24) + 1),
    status: 'scheduled',
    template_key: 'cart-close',
    is_system_generated: true,
    system_source: 'webinar-wizard',
  });

  return tasks;
}

Deno.serve(app.fetch);
