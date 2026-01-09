import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getUserIdFromJWT(authHeader: string): string | null {
  try {
    const token = authHeader.replace('Bearer ', '');
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    return payload.sub || null;
  } catch (error) {
    console.error('JWT decode error:', error);
    return null;
  }
}

// Map day abbreviations to day of week numbers (0=Sun, 1=Mon, etc.)
const DAY_MAP: Record<string, number> = {
  'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
};

// Get platform display name
const PLATFORM_NAMES: Record<string, string> = {
  'instagram': 'Instagram',
  'linkedin': 'LinkedIn',
  'youtube': 'YouTube',
  'tiktok': 'TikTok',
  'facebook': 'Facebook',
  'podcast': 'Podcast',
  'blog': 'Blog/SEO',
  'pinterest': 'Pinterest',
  'email': 'Email',
  'twitter': 'Twitter/X',
  'other': 'Other',
};

// Platform colors
const PLATFORM_COLORS: Record<string, string> = {
  'instagram': '#E4405F',
  'linkedin': '#0A66C2',
  'youtube': '#FF0000',
  'tiktok': '#000000',
  'facebook': '#1877F2',
  'podcast': '#8B5CF6',
  'blog': '#10B981',
  'pinterest': '#E60023',
  'email': '#EA580C',
  'twitter': '#1DA1F2',
  'other': '#6366F1',
};

// Get next N occurrences of specific days of week starting from a date
function getNextOccurrences(
  startDate: Date,
  endDate: Date,
  daysOfWeek: number[]
): Date[] {
  const occurrences: Date[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  
  while (current <= endDate) {
    if (daysOfWeek.includes(current.getDay())) {
      occurrences.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  
  return occurrences;
}

// Format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = getUserIdFromJWT(authHeader);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { 
      cycle_id,
      platform,
      content_type,
      posting_days,
      posting_time,
      batch_day,
      start_date,
      end_date,
      // Options for what to create
      create_content_engine = true,
      create_metrics_checkin = false,
      create_nurture_tasks = false,
      create_offer_tasks = false,
      create_weekly_blocks = false,
      // Context for other automations
      focus_area,
      nurture_method,
      nurture_frequency,
      offers = [],
      metrics = {},
    } = body;

    if (!cycle_id || !platform) {
      return new Response(JSON.stringify({ error: 'cycle_id and platform are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: {
      project?: any;
      sections?: any[];
      tasks?: any[];
      errors: string[];
    } = { errors: [] };

    const platformName = PLATFORM_NAMES[platform] || platform;
    const platformColor = PLATFORM_COLORS[platform] || '#6366F1';

    // Check for existing Content Engine project for this cycle (idempotency)
    const { data: existingProject } = await supabase
      .from('projects')
      .select('id, name')
      .eq('cycle_id', cycle_id)
      .eq('user_id', userId)
      .ilike('name', '%Content Engine%')
      .maybeSingle();

    let projectId: string;

    if (existingProject) {
      // Project already exists, use it
      projectId = existingProject.id;
      results.project = existingProject;
      console.log(`[AutoSetup] Using existing Content Engine project: ${projectId}`);
    } else if (create_content_engine) {
      // Create new Content Engine project
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          cycle_id: cycle_id,
          name: `Q1 Content Engine — ${platformName}`,
          description: `Auto-generated content production project for ${platformName}`,
          status: 'active',
          color: platformColor,
          start_date: start_date,
          end_date: end_date,
        })
        .select()
        .single();

      if (projectError) {
        console.error('[AutoSetup] Error creating project:', projectError);
        results.errors.push(`Failed to create project: ${projectError.message}`);
      } else {
        projectId = newProject.id;
        results.project = newProject;
        console.log(`[AutoSetup] Created Content Engine project: ${projectId}`);

        // Create project sections
        const sections = [
          { name: 'Ideas', color: '#94A3B8', sort_order: 0 },
          { name: 'Draft / Write', color: '#F59E0B', sort_order: 1 },
          { name: 'Create / Record', color: '#8B5CF6', sort_order: 2 },
          { name: 'Edit', color: '#3B82F6', sort_order: 3 },
          { name: 'Schedule / Publish', color: '#10B981', sort_order: 4 },
          { name: 'Repurpose', color: '#EC4899', sort_order: 5 },
        ];

        const sectionsToInsert = sections.map(s => ({
          project_id: projectId,
          user_id: userId,
          name: s.name,
          color: s.color,
          sort_order: s.sort_order,
        }));

        const { data: createdSections, error: sectionsError } = await supabase
          .from('project_sections')
          .insert(sectionsToInsert)
          .select();

        if (sectionsError) {
          console.error('[AutoSetup] Error creating sections:', sectionsError);
          results.errors.push(`Failed to create sections: ${sectionsError.message}`);
        } else {
          results.sections = createdSections;
          console.log(`[AutoSetup] Created ${createdSections.length} sections`);
        }
      }
    }

    // Create posting tasks if posting_days are set
    if (posting_days && posting_days.length > 0 && projectId!) {
      const startDateObj = new Date(start_date);
      const endDateObj = new Date(end_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Use whichever is later: start_date or today
      const effectiveStart = startDateObj > today ? startDateObj : today;

      // Map day names to numbers
      const dayNumbers = posting_days
        .map((d: string) => DAY_MAP[d])
        .filter((n: number | undefined) => n !== undefined);

      // Get all future posting dates
      const postingDates = getNextOccurrences(effectiveStart, endDateObj, dayNumbers);

      // Check for existing auto-generated tasks for this cycle (idempotency)
      const { data: existingTasks } = await supabase
        .from('tasks')
        .select('task_id, scheduled_date, task_text')
        .eq('cycle_id', cycle_id)
        .eq('user_id', userId)
        .eq('source', 'auto-content-engine');

      const existingDates = new Set(existingTasks?.map(t => t.scheduled_date) || []);

      // Only create tasks for dates that don't already have them
      const tasksToCreate = postingDates
        .filter(date => !existingDates.has(formatDate(date)))
        .map(date => {
          const dayName = Object.keys(DAY_MAP).find(k => DAY_MAP[k] === date.getDay()) || '';
          return {
            user_id: userId,
            cycle_id: cycle_id,
            project_id: projectId,
            task_text: `Post on ${platformName} (${dayName})`,
            scheduled_date: formatDate(date),
            time_block_start: posting_time || null,
            time_block_end: posting_time ? addMinutes(posting_time, 30) : null,
            estimated_minutes: 30,
            status: 'todo',
            source: 'auto-content-engine',
            context_tags: ['content', platform],
          };
        });

      if (tasksToCreate.length > 0) {
        const { data: createdTasks, error: tasksError } = await supabase
          .from('tasks')
          .insert(tasksToCreate)
          .select();

        if (tasksError) {
          console.error('[AutoSetup] Error creating tasks:', tasksError);
          results.errors.push(`Failed to create posting tasks: ${tasksError.message}`);
        } else {
          results.tasks = createdTasks;
          console.log(`[AutoSetup] Created ${createdTasks.length} posting tasks`);
        }
      } else {
        console.log('[AutoSetup] No new tasks to create (all dates already have tasks)');
        results.tasks = [];
      }

      // Create batch day tasks if batch_day is set
      if (batch_day && batch_day !== 'none') {
        const batchDayNum = DAY_MAP[batch_day];
        if (batchDayNum !== undefined) {
          const batchDates = getNextOccurrences(effectiveStart, endDateObj, [batchDayNum]);
          
          // Check for existing batch tasks
          const { data: existingBatchTasks } = await supabase
            .from('tasks')
            .select('task_id, scheduled_date')
            .eq('cycle_id', cycle_id)
            .eq('user_id', userId)
            .eq('source', 'auto-batch-day');

          const existingBatchDates = new Set(existingBatchTasks?.map(t => t.scheduled_date) || []);

          const batchTasksToCreate: any[] = [];
          
          batchDates.forEach(date => {
            const dateStr = formatDate(date);
            if (!existingBatchDates.has(dateStr)) {
              // Batch content task
              batchTasksToCreate.push({
                user_id: userId,
                cycle_id: cycle_id,
                project_id: projectId,
                task_text: `Batch content for next week`,
                scheduled_date: dateStr,
                time_block_start: '09:00',
                time_block_end: '10:30',
                estimated_minutes: 90,
                status: 'todo',
                source: 'auto-batch-day',
                context_tags: ['content', 'batch'],
              });
              
              // Schedule posts task
              batchTasksToCreate.push({
                user_id: userId,
                cycle_id: cycle_id,
                project_id: projectId,
                task_text: `Schedule posts for the week`,
                scheduled_date: dateStr,
                time_block_start: '10:30',
                time_block_end: '11:00',
                estimated_minutes: 30,
                status: 'todo',
                source: 'auto-batch-day',
                context_tags: ['content', 'scheduling'],
              });
            }
          });

          if (batchTasksToCreate.length > 0) {
            const { data: batchTasks, error: batchError } = await supabase
              .from('tasks')
              .insert(batchTasksToCreate)
              .select();

            if (batchError) {
              console.error('[AutoSetup] Error creating batch tasks:', batchError);
              results.errors.push(`Failed to create batch tasks: ${batchError.message}`);
            } else {
              results.tasks = [...(results.tasks || []), ...batchTasks];
              console.log(`[AutoSetup] Created ${batchTasks.length} batch tasks`);
            }
          }
        }
      }
    }

    // ==================== METRICS CHECK-IN TASKS ====================
    if (create_metrics_checkin && (metrics?.metric1 || metrics?.metric2 || metrics?.metric3)) {
      const startDateObj = new Date(start_date);
      const endDateObj = new Date(end_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const effectiveStart = startDateObj > today ? startDateObj : today;

      // Get all Mondays in the cycle
      const mondays = getNextOccurrences(effectiveStart, endDateObj, [1]); // 1 = Monday

      // Check for existing metrics tasks
      const { data: existingMetricsTasks } = await supabase
        .from('tasks')
        .select('task_id, scheduled_date')
        .eq('cycle_id', cycle_id)
        .eq('user_id', userId)
        .eq('source', 'auto-metrics-checkin');

      const existingMetricsDates = new Set(existingMetricsTasks?.map(t => t.scheduled_date) || []);

      const metricsTasksToCreate = mondays
        .filter(date => !existingMetricsDates.has(formatDate(date)))
        .map(date => ({
          user_id: userId,
          cycle_id: cycle_id,
          task_text: `Update Weekly Metrics`,
          task_description: `Review and update your 3 key metrics:\n• ${metrics.metric1 || 'Metric 1'}\n• ${metrics.metric2 || 'Metric 2'}\n• ${metrics.metric3 || 'Metric 3'}`,
          scheduled_date: formatDate(date),
          time_block_start: '09:00',
          time_block_end: '09:30',
          estimated_minutes: 30,
          status: 'todo',
          source: 'auto-metrics-checkin',
          context_tags: ['metrics', 'weekly'],
          priority: 'high',
        }));

      if (metricsTasksToCreate.length > 0) {
        const { data: metricsTasks, error: metricsError } = await supabase
          .from('tasks')
          .insert(metricsTasksToCreate)
          .select();

        if (metricsError) {
          console.error('[AutoSetup] Error creating metrics tasks:', metricsError);
          results.errors.push(`Failed to create metrics tasks: ${metricsError.message}`);
        } else {
          results.tasks = [...(results.tasks || []), ...metricsTasks];
          console.log(`[AutoSetup] Created ${metricsTasks.length} metrics check-in tasks`);
        }
      }
    }

    // ==================== NURTURE TASKS ====================
    if (create_nurture_tasks && nurture_method) {
      const startDateObj = new Date(start_date);
      const endDateObj = new Date(end_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const effectiveStart = startDateObj > today ? startDateObj : today;

      // Determine frequency and days based on nurture method
      let nurtureDays: number[] = [];
      let taskText = '';
      
      switch (nurture_method) {
        case 'email':
          nurtureDays = [2, 4]; // Tue, Thu by default
          taskText = 'Write & send email newsletter';
          break;
        case 'podcast':
          nurtureDays = [3]; // Wed
          taskText = 'Record/publish podcast episode';
          break;
        case 'community':
          nurtureDays = [1, 3, 5]; // Mon, Wed, Fri
          taskText = 'Engage in community';
          break;
        case 'dm':
          nurtureDays = [1, 2, 3, 4, 5]; // Weekdays
          taskText = 'DM conversations (10 min)';
          break;
        case 'webinar':
          nurtureDays = [4]; // Thu
          taskText = 'Host weekly webinar/workshop';
          break;
        case 'challenge':
          nurtureDays = [1]; // Mon
          taskText = 'Prepare/run challenge content';
          break;
        default:
          nurtureDays = [2]; // Default to Tue
          taskText = `Nurture: ${nurture_method}`;
      }

      const nurtureDates = getNextOccurrences(effectiveStart, endDateObj, nurtureDays);

      // Check for existing nurture tasks
      const { data: existingNurtureTasks } = await supabase
        .from('tasks')
        .select('task_id, scheduled_date')
        .eq('cycle_id', cycle_id)
        .eq('user_id', userId)
        .eq('source', 'auto-nurture');

      const existingNurtureDates = new Set(existingNurtureTasks?.map(t => t.scheduled_date) || []);

      const nurtureTasksToCreate = nurtureDates
        .filter(date => !existingNurtureDates.has(formatDate(date)))
        .map(date => ({
          user_id: userId,
          cycle_id: cycle_id,
          task_text: taskText,
          scheduled_date: formatDate(date),
          estimated_minutes: nurture_method === 'dm' ? 10 : 60,
          status: 'todo',
          source: 'auto-nurture',
          context_tags: ['nurture', nurture_method],
        }));

      if (nurtureTasksToCreate.length > 0) {
        const { data: nurtureTasks, error: nurtureError } = await supabase
          .from('tasks')
          .insert(nurtureTasksToCreate)
          .select();

        if (nurtureError) {
          console.error('[AutoSetup] Error creating nurture tasks:', nurtureError);
          results.errors.push(`Failed to create nurture tasks: ${nurtureError.message}`);
        } else {
          results.tasks = [...(results.tasks || []), ...nurtureTasks];
          console.log(`[AutoSetup] Created ${nurtureTasks.length} nurture tasks`);
        }
      }
    }

    // ==================== OFFER TASKS ====================
    if (create_offer_tasks && offers && offers.length > 0) {
      const startDateObj = new Date(start_date);
      const endDateObj = new Date(end_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const effectiveStart = startDateObj > today ? startDateObj : today;

      // For each offer, create recurring tasks based on sales frequency
      for (const offer of offers) {
        if (!offer.name) continue;

        // Check for existing offer tasks
        const { data: existingOfferTasks } = await supabase
          .from('tasks')
          .select('task_id, scheduled_date')
          .eq('cycle_id', cycle_id)
          .eq('user_id', userId)
          .eq('source', 'auto-offer')
          .ilike('task_text', `%${offer.name}%`);

        const existingOfferDates = new Set(existingOfferTasks?.map(t => t.scheduled_date) || []);

        // Default to weekly offers
        const offerDays = [2, 4]; // Tue, Thu
        const offerDates = getNextOccurrences(effectiveStart, endDateObj, offerDays);

        const offerTasksToCreate = offerDates
          .filter(date => !existingOfferDates.has(formatDate(date)))
          .slice(0, 26) // Limit to ~13 weeks worth
          .map((date, idx) => ({
            user_id: userId,
            cycle_id: cycle_id,
            task_text: idx % 2 === 0 ? `Make offer: ${offer.name}` : `Follow up: ${offer.name}`,
            scheduled_date: formatDate(date),
            estimated_minutes: 15,
            status: 'todo',
            source: 'auto-offer',
            context_tags: ['sales', 'offer'],
            priority: offer.isPrimary ? 'high' : 'medium',
          }));

        if (offerTasksToCreate.length > 0) {
          const { data: offerTasks, error: offerError } = await supabase
            .from('tasks')
            .insert(offerTasksToCreate)
            .select();

          if (offerError) {
            console.error('[AutoSetup] Error creating offer tasks:', offerError);
            results.errors.push(`Failed to create offer tasks for ${offer.name}: ${offerError.message}`);
          } else {
            results.tasks = [...(results.tasks || []), ...offerTasks];
            console.log(`[AutoSetup] Created ${offerTasks.length} offer tasks for ${offer.name}`);
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: results.errors.length === 0,
      data: results,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[AutoSetup] Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper to add minutes to a time string
function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const totalMins = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMins / 60) % 24;
  const newMins = totalMins % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
}
