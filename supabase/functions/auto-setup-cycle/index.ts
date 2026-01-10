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

// Get cycle quarter name from dates
function getCycleQuarterName(startDate: string): string {
  const date = new Date(startDate);
  const month = date.getMonth();
  const year = date.getFullYear();
  
  // Determine quarter based on start month
  if (month >= 0 && month <= 2) return `Q1 ${year}`;
  if (month >= 3 && month <= 5) return `Q2 ${year}`;
  if (month >= 6 && month <= 8) return `Q3 ${year}`;
  return `Q4 ${year}`;
}

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

// Get occurrences based on frequency
function getOccurrencesByFrequency(
  startDate: Date,
  endDate: Date,
  frequency: string
): Date[] {
  const occurrences: Date[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  
  switch (frequency) {
    case 'daily':
      while (current <= endDate) {
        if (current.getDay() !== 0 && current.getDay() !== 6) { // Skip weekends
          occurrences.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
      }
      break;
    case '3x_week':
      // Tue, Thu, Sat
      return getNextOccurrences(startDate, endDate, [2, 4, 6]);
    case 'weekly':
      // Wednesday
      return getNextOccurrences(startDate, endDate, [3]);
    case 'biweekly':
      // Every other Wednesday
      let weekCount = 0;
      while (current <= endDate) {
        if (current.getDay() === 3) { // Wednesday
          if (weekCount % 2 === 0) {
            occurrences.push(new Date(current));
          }
          weekCount++;
        }
        current.setDate(current.getDate() + 1);
      }
      break;
    case 'monthly':
      // First Wednesday of each month
      while (current <= endDate) {
        if (current.getDay() === 3 && current.getDate() <= 7) {
          occurrences.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
      }
      break;
    default:
      return getNextOccurrences(startDate, endDate, [3]); // Default weekly Wed
  }
  
  return occurrences;
}

// Format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper to add minutes to a time string
function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const totalMins = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMins / 60) % 24;
  const newMins = totalMins % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
}

// Generate template key for duplicate prevention
function generateTemplateKey(prefix: string, cycleId: string, suffix?: string): string {
  return `${prefix}_${cycleId}${suffix ? `_${suffix}` : ''}`;
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
      free_transformation,
      offers = [],
      metrics = {},
      // Audience & messaging context for content tasks
      audience_target,
      audience_frustration,
      signature_message,
    } = body;
    
    // Build audience context string for content tasks
    const audienceContext = [
      audience_target ? `🎯 Audience: ${audience_target}` : null,
      audience_frustration ? `😫 Their Pain Point: ${audience_frustration}` : null,
      signature_message ? `💬 Your Message: "${signature_message}"` : null,
    ].filter(Boolean).join('\n');

    if (!cycle_id) {
      return new Response(JSON.stringify({ error: 'cycle_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cycleQuarter = getCycleQuarterName(start_date);
    
    const results: {
      projects: any[];
      tasks: any[];
      errors: string[];
    } = { projects: [], tasks: [], errors: [] };

    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const effectiveStart = startDateObj > today ? startDateObj : today;

    // ==================== CONTENT ENGINE PROJECT + TASKS ====================
    if (create_content_engine && platform) {
      const platformName = PLATFORM_NAMES[platform] || platform;
      const platformColor = PLATFORM_COLORS[platform] || '#6366F1';
      const projectTemplateKey = generateTemplateKey('content_engine_project', cycle_id);

      // Check for existing Content Engine project (idempotency)
      const { data: existingProject } = await supabase
        .from('projects')
        .select('id, name')
        .eq('cycle_id', cycle_id)
        .eq('user_id', userId)
        .ilike('name', '%Content Engine%')
        .maybeSingle();

      let projectId: string;

      if (existingProject) {
        projectId = existingProject.id;
        results.projects.push(existingProject);
        console.log(`[AutoSetup] Using existing Content Engine project: ${projectId}`);
      } else {
        // Create new Content Engine project
        const { data: newProject, error: projectError } = await supabase
          .from('projects')
          .insert({
            user_id: userId,
            cycle_id: cycle_id,
            name: `📣 Content Engine — ${platformName} (${cycleQuarter})`,
            description: `Auto-generated content production project for ${platformName}. Platform: ${platformName}, Content Type: ${content_type || 'Not specified'}`,
            status: 'active',
            color: platformColor,
            start_date: start_date,
            end_date: end_date,
          })
          .select()
          .single();

        if (projectError) {
          console.error('[AutoSetup] Error creating project:', projectError);
          results.errors.push(`Failed to create Content Engine project: ${projectError.message}`);
        } else {
          projectId = newProject.id;
          results.projects.push(newProject);
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

          const { error: sectionsError } = await supabase
            .from('project_sections')
            .insert(sectionsToInsert);

          if (sectionsError) {
            console.error('[AutoSetup] Error creating sections:', sectionsError);
            results.errors.push(`Failed to create sections: ${sectionsError.message}`);
          }
        }
      }

      // Create posting tasks if posting_days are set
      if (posting_days && posting_days.length > 0 && projectId!) {
        const dayNumbers = posting_days
          .map((d: string) => DAY_MAP[d])
          .filter((n: number | undefined) => n !== undefined);

        const postingDates = getNextOccurrences(effectiveStart, endDateObj, dayNumbers);

        // Check for existing tasks by template_key
        const { data: existingTasks } = await supabase
          .from('tasks')
          .select('task_id, template_key')
          .eq('cycle_id', cycle_id)
          .eq('user_id', userId)
          .like('template_key', 'content_post_%');

        const existingKeys = new Set(existingTasks?.map(t => t.template_key) || []);

        const tasksToCreate = postingDates
          .map(date => {
            const dayName = Object.keys(DAY_MAP).find(k => DAY_MAP[k] === date.getDay()) || '';
            const templateKey = generateTemplateKey('content_post', cycle_id, formatDate(date));
            
            if (existingKeys.has(templateKey)) return null;
            
            // Build task description with audience context
            const taskDescription = audienceContext 
              ? `Create and post content for ${platformName}.\n\n📋 YOUR AUDIENCE & MESSAGE:\n${audienceContext}`
              : `Create and post content for ${platformName}.`;
            
            return {
              user_id: userId,
              cycle_id: cycle_id,
              project_id: projectId,
              task_text: `📣 Post on ${platformName} (${dayName})`,
              task_description: taskDescription,
              scheduled_date: formatDate(date),
              time_block_start: posting_time || null,
              time_block_end: posting_time ? addMinutes(posting_time, 30) : null,
              estimated_minutes: 30,
              status: 'todo',
              category: 'content',
              source: 'auto-content-engine',
              is_system_generated: true,
              system_source: 'cycle_autopilot',
              template_key: templateKey,
              context_tags: ['content', platform],
            };
          })
          .filter(Boolean);

        if (tasksToCreate.length > 0) {
          const { data: createdTasks, error: tasksError } = await supabase
            .from('tasks')
            .insert(tasksToCreate)
            .select();

          if (tasksError) {
            console.error('[AutoSetup] Error creating posting tasks:', tasksError);
            results.errors.push(`Failed to create posting tasks: ${tasksError.message}`);
          } else {
            results.tasks.push(...createdTasks);
            console.log(`[AutoSetup] Created ${createdTasks.length} posting tasks`);
          }
        }

        // Create batch day tasks
        if (batch_day && batch_day !== 'none') {
          const batchDayNum = DAY_MAP[batch_day];
          if (batchDayNum !== undefined) {
            const batchDates = getNextOccurrences(effectiveStart, endDateObj, [batchDayNum]);
            
            const batchTasksToCreate: any[] = [];
            
            for (const date of batchDates) {
              const dateStr = formatDate(date);
              const batchTemplateKey = generateTemplateKey('content_batch', cycle_id, dateStr);
              const scheduleTemplateKey = generateTemplateKey('content_schedule', cycle_id, dateStr);
              
              // Check if already exists
              const { data: existing } = await supabase
                .from('tasks')
                .select('task_id')
                .eq('template_key', batchTemplateKey)
                .maybeSingle();
              
              if (!existing) {
                // Build batch task description with audience context
                const batchDescription = audienceContext 
                  ? `Plan and create content for next week's posts.\n\n📋 YOUR AUDIENCE & MESSAGE:\n${audienceContext}\n\n💡 Tips:\n• Batch 3-5 pieces of content\n• Focus on their pain points\n• Lead with your signature message`
                  : `Plan and create content for next week's posts.\n\n💡 Tips:\n• Batch 3-5 pieces of content`;
                
                batchTasksToCreate.push({
                  user_id: userId,
                  cycle_id: cycle_id,
                  project_id: projectId,
                  task_text: `📝 Batch content for next week`,
                  task_description: batchDescription,
                  scheduled_date: dateStr,
                  time_block_start: '09:00',
                  time_block_end: '10:30',
                  estimated_minutes: 90,
                  status: 'todo',
                  source: 'auto-batch-day',
                  is_system_generated: true,
                  system_source: 'cycle_autopilot',
                  template_key: batchTemplateKey,
                  context_tags: ['content', 'batch'],
                });
                
                batchTasksToCreate.push({
                  user_id: userId,
                  cycle_id: cycle_id,
                  project_id: projectId,
                  task_text: `📅 Schedule posts for the week`,
                  scheduled_date: dateStr,
                  time_block_start: '10:30',
                  time_block_end: '11:00',
                  estimated_minutes: 30,
                  status: 'todo',
                  source: 'auto-batch-day',
                  is_system_generated: true,
                  system_source: 'cycle_autopilot',
                  template_key: scheduleTemplateKey,
                  context_tags: ['content', 'scheduling'],
                });
              }
            }

            if (batchTasksToCreate.length > 0) {
              const { data: batchTasks, error: batchError } = await supabase
                .from('tasks')
                .insert(batchTasksToCreate)
                .select();

              if (batchError) {
                console.error('[AutoSetup] Error creating batch tasks:', batchError);
                results.errors.push(`Failed to create batch tasks: ${batchError.message}`);
              } else {
                results.tasks.push(...batchTasks);
                console.log(`[AutoSetup] Created ${batchTasks.length} batch tasks`);
              }
            }
          }
        }
      }
    }

    // ==================== METRICS CHECK-IN TASKS ====================
    if (create_metrics_checkin && (metrics?.metric1 || metrics?.metric2 || metrics?.metric3)) {
      const mondays = getNextOccurrences(effectiveStart, endDateObj, [1]); // 1 = Monday

      const metricsTasksToCreate: any[] = [];
      
      for (const date of mondays) {
        const templateKey = generateTemplateKey('metrics_checkin', cycle_id, formatDate(date));
        
        // Check if already exists
        const { data: existing } = await supabase
          .from('tasks')
          .select('task_id')
          .eq('template_key', templateKey)
          .maybeSingle();
        
        if (!existing) {
          metricsTasksToCreate.push({
            user_id: userId,
            cycle_id: cycle_id,
            task_text: `📊 Update weekly metrics (90-Day Cycle)`,
            task_description: `Review and update your 3 key metrics:\n• ${metrics.metric1 || 'Metric 1'}\n• ${metrics.metric2 || 'Metric 2'}\n• ${metrics.metric3 || 'Metric 3'}`,
            scheduled_date: formatDate(date),
            time_block_start: '09:00',
            time_block_end: '09:30',
            estimated_minutes: 30,
            status: 'todo',
            source: 'auto-metrics-checkin',
            is_system_generated: true,
            system_source: 'cycle_autopilot',
            template_key: templateKey,
            context_tags: ['metrics', 'weekly'],
            priority: 'high',
          });
        }
      }

      if (metricsTasksToCreate.length > 0) {
        const { data: metricsTasks, error: metricsError } = await supabase
          .from('tasks')
          .insert(metricsTasksToCreate)
          .select();

        if (metricsError) {
          console.error('[AutoSetup] Error creating metrics tasks:', metricsError);
          results.errors.push(`Failed to create metrics tasks: ${metricsError.message}`);
        } else {
          results.tasks.push(...metricsTasks);
          console.log(`[AutoSetup] Created ${metricsTasks.length} metrics check-in tasks`);
        }
      }
    }

    // ==================== NURTURE PROJECT + TASKS ====================
    if (create_nurture_tasks && nurture_method) {
      // Create Nurture Engine project
      const nurtureProjectTemplateKey = generateTemplateKey('nurture_project', cycle_id);
      
      const { data: existingNurtureProject } = await supabase
        .from('projects')
        .select('id, name')
        .eq('cycle_id', cycle_id)
        .eq('user_id', userId)
        .ilike('name', '%Nurture Engine%')
        .maybeSingle();

      let nurtureProjectId: string | null = null;

      if (existingNurtureProject) {
        nurtureProjectId = existingNurtureProject.id;
        console.log(`[AutoSetup] Using existing Nurture Engine project: ${nurtureProjectId}`);
      } else {
        const nurtureMethodLabels: Record<string, string> = {
          'email': 'Email Marketing',
          'podcast': 'Podcast',
          'community': 'Free Community',
          'dm': 'DMs & Stories',
          'webinar': 'Weekly Webinars',
          'challenge': 'Challenges',
        };

        const { data: newNurtureProject, error: nurtureProjectError } = await supabase
          .from('projects')
          .insert({
            user_id: userId,
            cycle_id: cycle_id,
            name: `💗 Nurture Engine (${cycleQuarter})`,
            description: `Method: ${nurtureMethodLabels[nurture_method] || nurture_method}\nFrequency: ${nurture_frequency || 'Weekly'}\nFree Transformation: ${free_transformation || 'Not specified'}`,
            status: 'active',
            color: '#EC4899',
            start_date: start_date,
            end_date: end_date,
          })
          .select()
          .single();

        if (nurtureProjectError) {
          console.error('[AutoSetup] Error creating Nurture project:', nurtureProjectError);
          results.errors.push(`Failed to create Nurture project: ${nurtureProjectError.message}`);
        } else {
          nurtureProjectId = newNurtureProject.id;
          results.projects.push(newNurtureProject);
          console.log(`[AutoSetup] Created Nurture Engine project: ${nurtureProjectId}`);
        }
      }

      // Create nurture tasks based on method and frequency
      if (nurtureProjectId) {
        const nurtureDates = getOccurrencesByFrequency(effectiveStart, endDateObj, nurture_frequency || 'weekly');
        
        const nurtureTaskTemplates: { text: string; minutes: number }[] = [];
        
        switch (nurture_method) {
          case 'email':
            nurtureTaskTemplates.push({ text: '💌 Write nurture email', minutes: 45 });
            nurtureTaskTemplates.push({ text: '💌 Send nurture email', minutes: 15 });
            break;
          case 'podcast':
            nurtureTaskTemplates.push({ text: '🎙️ Record podcast episode', minutes: 60 });
            nurtureTaskTemplates.push({ text: '✂️ Publish episode + share', minutes: 30 });
            break;
          case 'community':
            nurtureTaskTemplates.push({ text: '👥 Community nurture post', minutes: 20 });
            nurtureTaskTemplates.push({ text: '💬 Engage & reply block', minutes: 30 });
            break;
          case 'dm':
            nurtureTaskTemplates.push({ text: '📲 Story nurture (teach + connect)', minutes: 15 });
            nurtureTaskTemplates.push({ text: '💬 DM outreach / replies block', minutes: 20 });
            break;
          case 'webinar':
            nurtureTaskTemplates.push({ text: '🎥 Plan livestream topic', minutes: 20 });
            nurtureTaskTemplates.push({ text: '🎥 Go live', minutes: 60 });
            nurtureTaskTemplates.push({ text: '📌 Post replay/recap', minutes: 15 });
            break;
          case 'challenge':
            nurtureTaskTemplates.push({ text: '🏆 Prepare challenge content', minutes: 45 });
            nurtureTaskTemplates.push({ text: '🏆 Deliver challenge + engage', minutes: 30 });
            break;
          default:
            nurtureTaskTemplates.push({ text: `💗 Nurture: ${nurture_method}`, minutes: 30 });
        }

        const nurtureTasksToCreate: any[] = [];

        for (const date of nurtureDates) {
          for (let i = 0; i < nurtureTaskTemplates.length; i++) {
            const template = nurtureTaskTemplates[i];
            const templateKey = generateTemplateKey('nurture_task', cycle_id, `${formatDate(date)}_${i}`);
            
            // Check if already exists
            const { data: existing } = await supabase
              .from('tasks')
              .select('task_id')
              .eq('template_key', templateKey)
              .maybeSingle();
            
              if (!existing) {
                nurtureTasksToCreate.push({
                  user_id: userId,
                  cycle_id: cycle_id,
                  project_id: nurtureProjectId,
                  task_text: template.text,
                  scheduled_date: formatDate(date),
                  estimated_minutes: template.minutes,
                  status: 'todo',
                  category: 'nurture',
                  source: 'auto-nurture',
                  is_system_generated: true,
                  system_source: 'cycle_autopilot',
                  template_key: templateKey,
                  context_tags: ['nurture', nurture_method],
                });
              }
          }
        }

        if (nurtureTasksToCreate.length > 0) {
          const { data: nurtureTasks, error: nurtureError } = await supabase
            .from('tasks')
            .insert(nurtureTasksToCreate)
            .select();

          if (nurtureError) {
            console.error('[AutoSetup] Error creating nurture tasks:', nurtureError);
            results.errors.push(`Failed to create nurture tasks: ${nurtureError.message}`);
          } else {
            results.tasks.push(...nurtureTasks);
            console.log(`[AutoSetup] Created ${nurtureTasks.length} nurture tasks`);
          }
        }
      }
    }

    // ==================== OFFER PROJECTS + TASKS ====================
    if (create_offer_tasks && offers && offers.length > 0) {
      for (const offer of offers) {
        if (!offer.name) continue;

        const offerId = offer.id || offer.name.toLowerCase().replace(/\s+/g, '_').slice(0, 20);
        const offerProjectTemplateKey = generateTemplateKey('offer_project', cycle_id, offerId);

        // Check for existing offer project
        const { data: existingOfferProject } = await supabase
          .from('projects')
          .select('id, name')
          .eq('cycle_id', cycle_id)
          .eq('user_id', userId)
          .ilike('name', `%${offer.name}%`)
          .maybeSingle();

        let offerProjectId: string | null = null;

        if (existingOfferProject) {
          offerProjectId = existingOfferProject.id;
          console.log(`[AutoSetup] Using existing Offer project: ${offerProjectId}`);
        } else {
          const { data: newOfferProject, error: offerProjectError } = await supabase
            .from('projects')
            .insert({
              user_id: userId,
              cycle_id: cycle_id,
              name: `💚 Sell: ${offer.name}`,
              description: `Price: ${offer.price ? `$${offer.price}` : 'Not set'}\nSales Frequency: ${offer.salesFrequency || 'Evergreen'}\nTransformation: ${offer.transformation || 'Not specified'}`,
              status: 'active',
              color: '#10B981',
              start_date: start_date,
              end_date: end_date,
            })
            .select()
            .single();

          if (offerProjectError) {
            console.error('[AutoSetup] Error creating Offer project:', offerProjectError);
            results.errors.push(`Failed to create Offer project for ${offer.name}: ${offerProjectError.message}`);
          } else {
            offerProjectId = newOfferProject.id;
            results.projects.push(newOfferProject);
            console.log(`[AutoSetup] Created Offer project: ${offerProjectId}`);
          }
        }

        // Create offer tasks based on sales frequency
        if (offerProjectId) {
          const salesFrequency = offer.salesFrequency || 'evergreen';
          const offerTasksToCreate: any[] = [];

          if (salesFrequency === 'evergreen' || salesFrequency === 'weekly') {
            // Weekly promotion and follow-up
            const promoDay = salesFrequency === 'weekly' ? 4 : 5; // Thu for weekly, Fri for evergreen
            const followUpDay = 1; // Monday

            const promoDates = getNextOccurrences(effectiveStart, endDateObj, [promoDay]);
            const followUpDates = getNextOccurrences(effectiveStart, endDateObj, [followUpDay]);

            for (const date of promoDates.slice(0, 13)) { // ~13 weeks
              const templateKey = generateTemplateKey('offer_promo', cycle_id, `${offerId}_${formatDate(date)}`);
              
              const { data: existing } = await supabase
                .from('tasks')
                .select('task_id')
                .eq('template_key', templateKey)
                .maybeSingle();
              
              if (!existing) {
                offerTasksToCreate.push({
                  user_id: userId,
                  cycle_id: cycle_id,
                  project_id: offerProjectId,
                  task_text: `💚 Promote: ${offer.name} (primary CTA)`,
                  scheduled_date: formatDate(date),
                  estimated_minutes: 15,
                  status: 'todo',
                  category: 'offer',
                  source: 'auto-offer',
                  is_system_generated: true,
                  system_source: 'cycle_autopilot',
                  template_key: templateKey,
                  context_tags: ['sales', 'offer'],
                  priority: offer.isPrimary ? 'high' : 'medium',
                });
              }
            }

            for (const date of followUpDates.slice(0, 13)) {
              const templateKey = generateTemplateKey('offer_followup', cycle_id, `${offerId}_${formatDate(date)}`);
              
              const { data: existing } = await supabase
                .from('tasks')
                .select('task_id')
                .eq('template_key', templateKey)
                .maybeSingle();
              
              if (!existing) {
                offerTasksToCreate.push({
                  user_id: userId,
                  cycle_id: cycle_id,
                  project_id: offerProjectId,
                  task_text: `💬 Sales follow-up block: ${offer.name}`,
                  scheduled_date: formatDate(date),
                  estimated_minutes: 20,
                  status: 'todo',
                  source: 'auto-offer',
                  is_system_generated: true,
                  system_source: 'cycle_autopilot',
                  template_key: templateKey,
                  context_tags: ['sales', 'follow-up'],
                  priority: 'medium',
                });
              }
            }
          } else if (salesFrequency === 'monthly') {
            // Monthly mini-campaigns
            const months = getOccurrencesByFrequency(effectiveStart, endDateObj, 'monthly');
            
            for (const monthStart of months.slice(0, 3)) { // Up to 3 months in cycle
              const week1 = new Date(monthStart);
              const week2 = new Date(monthStart);
              week2.setDate(week2.getDate() + 7);
              const week3 = new Date(monthStart);
              week3.setDate(week3.getDate() + 14);

              const campaignTasks = [
                { date: week1, text: `🛠️ Prep monthly promo: ${offer.name}`, minutes: 60 },
                { date: week2, text: `📧 Promo email 1: ${offer.name}`, minutes: 30 },
                { date: new Date(week2.getTime() + 2 * 24 * 60 * 60 * 1000), text: `📧 Promo email 2: ${offer.name}`, minutes: 30 },
                { date: week3, text: `💚 Final call: ${offer.name}`, minutes: 20 },
              ];

              for (const task of campaignTasks) {
                if (task.date > endDateObj) continue;
                
                const templateKey = generateTemplateKey('offer_monthly', cycle_id, `${offerId}_${formatDate(task.date)}`);
                
                const { data: existing } = await supabase
                  .from('tasks')
                  .select('task_id')
                  .eq('template_key', templateKey)
                  .maybeSingle();
                
                if (!existing) {
                  offerTasksToCreate.push({
                    user_id: userId,
                    cycle_id: cycle_id,
                    project_id: offerProjectId,
                    task_text: task.text,
                    scheduled_date: formatDate(task.date),
                    estimated_minutes: task.minutes,
                    status: 'todo',
                    source: 'auto-offer',
                    is_system_generated: true,
                    system_source: 'cycle_autopilot',
                    template_key: templateKey,
                    context_tags: ['sales', 'campaign'],
                    priority: 'high',
                  });
                }
              }
            }
          } else if (salesFrequency === 'quarterly') {
            // Quarterly launch sprint - place in Month 2
            const launchStart = new Date(startDateObj);
            launchStart.setDate(launchStart.getDate() + 30); // ~Month 2

            const launchTasks = [
              { dayOffset: 0, text: `🛠️ Launch prep checklist: ${offer.name}`, minutes: 120 },
              { dayOffset: 7, text: `📧 Launch email sequence: ${offer.name}`, minutes: 90 },
              { dayOffset: 10, text: `🎥 Live event / webinar: ${offer.name}`, minutes: 90 },
              { dayOffset: 14, text: `💚 Close cart / final call: ${offer.name}`, minutes: 30 },
            ];

            for (const task of launchTasks) {
              const taskDate = new Date(launchStart);
              taskDate.setDate(taskDate.getDate() + task.dayOffset);
              
              if (taskDate > endDateObj) continue;
              
              const templateKey = generateTemplateKey('offer_launch', cycle_id, `${offerId}_${task.dayOffset}`);
              
              const { data: existing } = await supabase
                .from('tasks')
                .select('task_id')
                .eq('template_key', templateKey)
                .maybeSingle();
              
              if (!existing) {
                offerTasksToCreate.push({
                  user_id: userId,
                  cycle_id: cycle_id,
                  project_id: offerProjectId,
                  task_text: task.text,
                  scheduled_date: formatDate(taskDate),
                  estimated_minutes: task.minutes,
                  status: 'todo',
                  source: 'auto-offer',
                  is_system_generated: true,
                  system_source: 'cycle_autopilot',
                  template_key: templateKey,
                  context_tags: ['sales', 'launch'],
                  priority: 'high',
                });
              }
            }
          }

          if (offerTasksToCreate.length > 0) {
            const { data: offerTasks, error: offerError } = await supabase
              .from('tasks')
              .insert(offerTasksToCreate)
              .select();

            if (offerError) {
              console.error('[AutoSetup] Error creating offer tasks:', offerError);
              results.errors.push(`Failed to create offer tasks for ${offer.name}: ${offerError.message}`);
            } else {
              results.tasks.push(...offerTasks);
              console.log(`[AutoSetup] Created ${offerTasks.length} offer tasks for ${offer.name}`);
            }
          }
        }
      }
    }

    // ==================== WEEKLY BLOCKS (Future enhancement) ====================
    if (create_weekly_blocks) {
      // TODO: Create recommended weekly time blocks based on focus area
      console.log('[AutoSetup] Weekly blocks creation - placeholder for future implementation');
    }

    const successMessage = `Created ${results.projects.length} projects and ${results.tasks.length} tasks`;
    console.log(`[AutoSetup] Complete: ${successMessage}`);

    return new Response(JSON.stringify({ 
      success: results.errors.length === 0,
      message: successMessage,
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
