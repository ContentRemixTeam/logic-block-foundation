import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { addDays, format, differenceInDays, parseISO, subDays } from 'https://esm.sh/date-fns@3.6.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Fear to CTFAR thought mapping
const FEAR_THOUGHT_MAP: Record<string, string> = {
  'zero-sales': "Nobody is going to buy and I'll embarrass myself",
  'waste-time': "I'll spend all this time and have nothing to show for it",
  'judgment': "People will think my price is too high or my offer is bad",
  'not-ready': "I'm missing something important and I'll fail because of it",
  'audience-small': "My audience is too small to make any meaningful sales",
  'too-salesy': "I'll annoy people and they'll unsubscribe or unfollow me",
  'too-much-demand': "I won't be able to keep up if too many people buy",
};

const FEAR_FEELING_MAP: Record<string, string> = {
  'zero-sales': 'anxious',
  'waste-time': 'worried',
  'judgment': 'vulnerable',
  'not-ready': 'uncertain',
  'audience-small': 'discouraged',
  'too-salesy': 'uncomfortable',
  'too-much-demand': 'overwhelmed',
};

// Content volume to task count mapping
const CONTENT_VOLUME_MAP: Record<string, number> = {
  light: 5,
  medium: 8,
  heavy: 12,
};

// Offer frequency to daily tasks
const OFFER_FREQUENCY_MAP: Record<string, number> = {
  once: 0,
  daily: 1,
  'multiple-daily': 3,
  'every-other-day': 0.5,
  unsure: 1,
};

// Email sequence type labels
const EMAIL_SEQUENCE_LABELS: Record<string, string> = {
  warmUp: 'Warm-Up',
  launch: 'Launch',
  cartClose: 'Cart Close',
  postPurchase: 'Post-Purchase',
  custom: 'Custom',
};

function getSequenceLabel(type: string): string {
  return EMAIL_SEQUENCE_LABELS[type] || type;
}

interface EmailSequenceItem {
  type: string;
  customName?: string;
  status: 'existing' | 'needs-creation';
  deadline?: string;
}

interface LaunchV2Data {
  name: string;
  launchExperience?: string;
  previousLaunchLearnings?: string;
  whatWentWell?: string;
  whatToImprove?: string;
  offerType?: string;
  otherOfferType?: string;
  emailListStatus?: string;
  launchTimeline?: string;
  cartOpensDate: string;
  cartClosesDate: string;
  revenueGoalTier?: string;
  customRevenueGoal?: number;
  pricePoint?: number;
  hasPaymentPlan?: boolean;
  paymentPlanDetails?: string;
  idealCustomer?: string;
  mainBonus?: string;
  hasLimitations?: string;
  limitationDetails?: string;
  spotLimit?: number;
  mainReachMethod?: string;
  socialPlatform?: string;
  combinationDetails?: string;
  contentCreationStatus?: string;
  contentVolume?: string;
  launchMethod?: string;
  offerFrequency?: string;
  liveComponent?: string;
  liveEvents?: Array<{ date: string; type: string; platform: string }>;
  promotionDuration?: string;
  followUpWillingness?: string;
  biggestFears?: string[];
  zeroSalesMeaning?: string;
  zeroSalesPlan?: string;
  gapAcknowledged?: boolean;
  gapSupportType?: string;
  gapOverlapDetected?: boolean;
  readinessScore?: number;
  whatYouNeed?: string;
  // Email sequences with status tracking
  emailSequences?: EmailSequenceItem[];
}

interface TaskToCreate {
  task_text: string;
  scheduled_date: string;
  task_type: string;
  phase: string;
  estimated_minutes?: number;
  is_system_generated: boolean;
  content_item_id?: string;
  content_type?: string;
  content_channel?: string;
  content_creation_date?: string;
  content_publish_date?: string;
}

interface ContentItemToCreate {
  user_id: string;
  title: string;
  type: string;
  channel: string;
  status: string;
  project_id: string;
  planned_creation_date: string;
  planned_publish_date: string;
  tags: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;
    const data: LaunchV2Data = await req.json();

    if (!data.name || !data.cartOpensDate || !data.cartClosesDate) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Calculate dates
    const cartOpens = parseISO(data.cartOpensDate);
    const cartCloses = parseISO(data.cartClosesDate);
    const today = new Date();
    const preLaunchDays = differenceInDays(cartOpens, today);
    const launchDays = differenceInDays(cartCloses, cartOpens) + 1;

    // 1. Create project with launch metadata
    const { data: project, error: projectError } = await serviceClient
      .from('projects')
      .insert({
        user_id: userId,
        name: `🚀 ${data.name}`,
        description: `Launch: ${data.offerType || 'Offer'} - ${data.idealCustomer || 'Target Audience'}`,
        status: 'active',
        is_launch: true,
        launch_start_date: data.cartOpensDate,
        launch_end_date: data.cartClosesDate,
        revenue_goal: data.customRevenueGoal || null,
      })
      .select('id')
      .single();

    if (projectError) throw projectError;

    // 2. Create launch record with V2 columns
    const { error: launchError } = await serviceClient
      .from('launches')
      .insert({
        user_id: userId,
        project_id: project.id,
        name: data.name,
        cart_opens: data.cartOpensDate,
        cart_closes: data.cartClosesDate,
        launch_experience: data.launchExperience,
        previous_launch_learnings: data.previousLaunchLearnings,
        what_went_well: data.whatWentWell,
        what_to_improve: data.whatToImprove,
        email_list_status: data.emailListStatus,
        ideal_customer: data.idealCustomer,
        main_bonus: data.mainBonus,
        has_limitations: data.hasLimitations,
        limitation_details: data.limitationDetails,
        spot_limit: data.spotLimit,
        has_payment_plan: data.hasPaymentPlan,
        payment_plan_details: data.paymentPlanDetails,
        main_reach_method: data.mainReachMethod,
        content_creation_status: data.contentCreationStatus,
        content_volume: data.contentVolume,
        launch_method: data.launchMethod,
        offer_frequency: data.offerFrequency,
        live_component: data.liveComponent,
        promotion_duration: data.promotionDuration,
        follow_up_willingness: data.followUpWillingness,
        biggest_fears: data.biggestFears,
        zero_sales_meaning: data.zeroSalesMeaning,
        zero_sales_plan: data.zeroSalesPlan,
        gap_overlap_detected: data.gapOverlapDetected,
        gap_acknowledged: data.gapAcknowledged,
        gap_support_type: data.gapSupportType || null,
        readiness_score: data.readinessScore,
        what_they_need: data.whatYouNeed,
        price_per_sale: data.pricePoint,
        revenue_goal: data.customRevenueGoal,
      });

    if (launchError) throw launchError;

    // 3. Create content items for email sequences (NEW)
    const contentItems: ContentItemToCreate[] = [];
    const contentItemMap = new Map<string, string>(); // sequence key -> content_item_id
    
    if (data.emailSequences && data.emailSequences.length > 0) {
      for (const sequence of data.emailSequences) {
        if (sequence.status === 'needs-creation') {
          const publishDateStr = sequence.deadline || data.cartOpensDate;
          const publishDate = parseISO(publishDateStr);
          const createDate = subDays(publishDate, 3);
          const sequenceLabel = sequence.customName || getSequenceLabel(sequence.type);
          
          contentItems.push({
            user_id: userId,
            title: `${sequenceLabel} Email Sequence`,
            type: 'Newsletter',
            channel: 'Email',
            status: 'Draft',
            project_id: project.id,
            planned_creation_date: format(createDate, 'yyyy-MM-dd'),
            planned_publish_date: publishDateStr,
            tags: ['launch', 'email', data.name],
          });
        }
      }
      
      // Insert content items and get their IDs
      if (contentItems.length > 0) {
        const { data: createdContent, error: contentError } = await serviceClient
          .from('content_items')
          .insert(contentItems)
          .select('id, title');
        
        if (contentError) {
          console.error('Content items error:', contentError);
        } else if (createdContent) {
          // Map content items back to sequences for task linking
          createdContent.forEach((item, index) => {
            const sequence = data.emailSequences!.filter(s => s.status === 'needs-creation')[index];
            if (sequence) {
              contentItemMap.set(sequence.type, item.id);
            }
          });
        }
      }
    }

    // 4. Generate tasks
    const tasks: TaskToCreate[] = [];

    // Email sequence tasks (with content linking)
    if (data.emailSequences && data.emailSequences.length > 0) {
      for (const sequence of data.emailSequences) {
        if (sequence.status === 'needs-creation') {
          const publishDateStr = sequence.deadline || data.cartOpensDate;
          const publishDate = parseISO(publishDateStr);
          const createDate = subDays(publishDate, 3);
          const sequenceLabel = sequence.customName || getSequenceLabel(sequence.type);
          const contentItemId = contentItemMap.get(sequence.type);
          
          // Create task
          tasks.push({
            task_text: `Create: ${sequenceLabel} Email Sequence`,
            scheduled_date: format(createDate, 'yyyy-MM-dd'),
            task_type: 'content_creation',
            phase: 'pre_launch',
            estimated_minutes: 60,
            is_system_generated: true,
            content_item_id: contentItemId,
            content_type: 'Newsletter',
            content_channel: 'Email',
            content_creation_date: format(createDate, 'yyyy-MM-dd'),
            content_publish_date: publishDateStr,
          });
          
          // Publish/Send task
          tasks.push({
            task_text: `Send: ${sequenceLabel} Email Sequence`,
            scheduled_date: publishDateStr,
            task_type: 'content_publish',
            phase: 'pre_launch',
            estimated_minutes: 15,
            is_system_generated: true,
            content_item_id: contentItemId,
            content_type: 'Newsletter',
            content_channel: 'Email',
            content_creation_date: format(createDate, 'yyyy-MM-dd'),
            content_publish_date: publishDateStr,
          });
        }
      }
    }

    // PRE-LAUNCH TASKS
    // ----------------
    
    // Content creation tasks based on status and volume
    if (data.contentCreationStatus === 'from-scratch') {
      const taskCount = CONTENT_VOLUME_MAP[data.contentVolume || 'light'] || 5;
      const daysPerTask = Math.floor(preLaunchDays / taskCount);
      
      for (let i = 0; i < taskCount; i++) {
        const taskDate = addDays(today, (i + 1) * daysPerTask);
        if (taskDate < cartOpens) {
          tasks.push({
            task_text: `Create launch content piece ${i + 1}/${taskCount}`,
            scheduled_date: format(taskDate, 'yyyy-MM-dd'),
            task_type: 'content_creation',
            phase: 'pre_launch',
            estimated_minutes: 60,
            is_system_generated: true,
          });
        }
      }
    } else if (data.contentCreationStatus === 'partial') {
      // Fewer creation tasks, more scheduling
      const createCount = 3;
      const scheduleCount = 5;
      
      for (let i = 0; i < createCount; i++) {
        const taskDate = addDays(today, (i + 1) * 3);
        if (taskDate < cartOpens) {
          tasks.push({
            task_text: `Finish creating content piece ${i + 1}`,
            scheduled_date: format(taskDate, 'yyyy-MM-dd'),
            task_type: 'content_creation',
            phase: 'pre_launch',
            estimated_minutes: 45,
            is_system_generated: true,
          });
        }
      }
      
      for (let i = 0; i < scheduleCount; i++) {
        const taskDate = addDays(today, 7 + i * 2);
        if (taskDate < cartOpens) {
          tasks.push({
            task_text: `Schedule launch post ${i + 1}`,
            scheduled_date: format(taskDate, 'yyyy-MM-dd'),
            task_type: 'content_scheduling',
            phase: 'pre_launch',
            estimated_minutes: 15,
            is_system_generated: true,
          });
        }
      }
    }

    // Visibility strategy task if unsure
    if (data.mainReachMethod === 'unsure') {
      tasks.push({
        task_text: '🎯 Define your visibility strategy for this launch',
        scheduled_date: format(addDays(today, 1), 'yyyy-MM-dd'),
        task_type: 'strategy',
        phase: 'pre_launch',
        estimated_minutes: 30,
        is_system_generated: true,
      });
    }

    // Email list building tasks for small lists
    if (data.emailListStatus === 'starting-zero' || data.emailListStatus === 'small-nervous') {
      tasks.push({
        task_text: '📧 Create lead magnet or free resource',
        scheduled_date: format(addDays(today, 2), 'yyyy-MM-dd'),
        task_type: 'list_building',
        phase: 'pre_launch',
        estimated_minutes: 90,
        is_system_generated: true,
      });
      tasks.push({
        task_text: '📧 Set up email opt-in page',
        scheduled_date: format(addDays(today, 4), 'yyyy-MM-dd'),
        task_type: 'list_building',
        phase: 'pre_launch',
        estimated_minutes: 45,
        is_system_generated: true,
      });
      tasks.push({
        task_text: '📧 Promote lead magnet to grow list',
        scheduled_date: format(addDays(today, 7), 'yyyy-MM-dd'),
        task_type: 'list_building',
        phase: 'pre_launch',
        estimated_minutes: 30,
        is_system_generated: true,
      });
    }

    // Payment plan setup
    if (data.hasPaymentPlan) {
      tasks.push({
        task_text: '💳 Set up payment plan in checkout',
        scheduled_date: format(addDays(cartOpens, -3), 'yyyy-MM-dd'),
        task_type: 'setup',
        phase: 'pre_launch',
        estimated_minutes: 30,
        is_system_generated: true,
      });
    }

    // LAUNCH WEEK TASKS
    // -----------------
    
    // Daily offer tasks based on frequency
    const offerTasksPerDay = OFFER_FREQUENCY_MAP[data.offerFrequency || 'daily'] || 1;
    
    for (let day = 0; day < launchDays; day++) {
      const launchDate = addDays(cartOpens, day);
      
      if (offerTasksPerDay >= 1) {
        for (let t = 0; t < Math.floor(offerTasksPerDay); t++) {
          tasks.push({
            task_text: `🎯 Make an offer (Day ${day + 1}${offerTasksPerDay > 1 ? ` - #${t + 1}` : ''})`,
            scheduled_date: format(launchDate, 'yyyy-MM-dd'),
            task_type: 'offer',
            phase: 'launch',
            estimated_minutes: 15,
            is_system_generated: true,
          });
        }
      } else if (day % 2 === 0) {
        // Every other day
        tasks.push({
          task_text: `🎯 Make an offer (Day ${day + 1})`,
          scheduled_date: format(launchDate, 'yyyy-MM-dd'),
          task_type: 'offer',
          phase: 'launch',
          estimated_minutes: 15,
          is_system_generated: true,
        });
      }
    }

    // Live event tasks
    if (data.liveComponent && data.liveComponent !== 'none' && data.liveEvents?.length) {
      for (const event of data.liveEvents) {
        const eventDate = parseISO(event.date);
        
        // Prep task 2 days before
        tasks.push({
          task_text: `🎬 Prep for ${event.type} on ${event.platform}`,
          scheduled_date: format(addDays(eventDate, -2), 'yyyy-MM-dd'),
          task_type: 'live_prep',
          phase: 'launch',
          estimated_minutes: 60,
          is_system_generated: true,
        });
        
        // Host task on event day
        tasks.push({
          task_text: `🔴 Host ${event.type} on ${event.platform}`,
          scheduled_date: format(eventDate, 'yyyy-MM-dd'),
          task_type: 'live_event',
          phase: 'launch',
          estimated_minutes: 60,
          is_system_generated: true,
        });
      }
    }

    // Personal outreach tasks
    if (data.launchMethod === 'outreach-email' || data.launchMethod === 'combination') {
      for (let day = 0; day < Math.min(launchDays, 5); day++) {
        tasks.push({
          task_text: `💬 Personal outreach to warm leads (Day ${day + 1})`,
          scheduled_date: format(addDays(cartOpens, day), 'yyyy-MM-dd'),
          task_type: 'outreach',
          phase: 'launch',
          estimated_minutes: 30,
          is_system_generated: true,
        });
      }
    }

    // POST-LAUNCH TASKS
    // -----------------
    
    // Follow-up tasks based on willingness
    if (data.followUpWillingness === 'multiple-emails') {
      for (let i = 0; i < 5; i++) {
        tasks.push({
          task_text: `📧 Send follow-up email ${i + 1}/5`,
          scheduled_date: format(addDays(cartCloses, i + 1), 'yyyy-MM-dd'),
          task_type: 'follow_up',
          phase: 'post_launch',
          estimated_minutes: 20,
          is_system_generated: true,
        });
      }
    } else if (data.followUpWillingness === 'one-email') {
      tasks.push({
        task_text: '📧 Send follow-up email to non-buyers',
        scheduled_date: format(addDays(cartCloses, 1), 'yyyy-MM-dd'),
        task_type: 'follow_up',
        phase: 'post_launch',
        estimated_minutes: 30,
        is_system_generated: true,
      });
    } else if (data.followUpWillingness === 'personal-outreach') {
      for (let i = 0; i < 5; i++) {
        tasks.push({
          task_text: `💬 Personal follow-up outreach (Day ${i + 1})`,
          scheduled_date: format(addDays(cartCloses, i + 1), 'yyyy-MM-dd'),
          task_type: 'follow_up',
          phase: 'post_launch',
          estimated_minutes: 30,
          is_system_generated: true,
        });
      }
    }

    // Debrief task (always)
    tasks.push({
      task_text: '📊 Launch Debrief: Review results and learnings',
      scheduled_date: format(addDays(cartCloses, 3), 'yyyy-MM-dd'),
      task_type: 'debrief',
      phase: 'post_launch',
      estimated_minutes: 45,
      is_system_generated: true,
    });

    // What's next planning
    tasks.push({
      task_text: "🗺️ Plan what's next after launch",
      scheduled_date: format(addDays(cartCloses, 7), 'yyyy-MM-dd'),
      task_type: 'planning',
      phase: 'post_launch',
      estimated_minutes: 30,
      is_system_generated: true,
    });

    // MINDSET TASKS
    // -------------
    
    // Low readiness = daily affirmation tasks
    if (data.readinessScore && data.readinessScore <= 5) {
      const affirmationDays = Math.min(preLaunchDays, 7);
      for (let i = 0; i < affirmationDays; i++) {
        tasks.push({
          task_text: '💪 Morning mindset: Review your "why" and visualize success',
          scheduled_date: format(addDays(today, i + 1), 'yyyy-MM-dd'),
          task_type: 'mindset',
          phase: 'pre_launch',
          estimated_minutes: 10,
          is_system_generated: true,
        });
      }
    }

    // Accountability check-ins if requested
    if (data.whatYouNeed === 'accountability') {
      // Mid-launch check-in
      const midLaunch = addDays(cartOpens, Math.floor(launchDays / 2));
      tasks.push({
        task_text: '✅ Mid-launch accountability check-in',
        scheduled_date: format(midLaunch, 'yyyy-MM-dd'),
        task_type: 'accountability',
        phase: 'launch',
        estimated_minutes: 15,
        is_system_generated: true,
      });
    }

    // GAP support tasks
    if (data.gapOverlapDetected && data.gapSupportType) {
      if (data.gapSupportType === 'daily-motivation') {
        // Add daily motivation during launch week
        for (let day = 0; day < launchDays; day++) {
          tasks.push({
            task_text: '🧠 GAP support: Daily mindset check-in',
            scheduled_date: format(addDays(cartOpens, day), 'yyyy-MM-dd'),
            task_type: 'gap_support',
            phase: 'launch',
            estimated_minutes: 10,
            is_system_generated: true,
          });
        }
      } else if (data.gapSupportType === 'mid-week-check') {
        tasks.push({
          task_text: '🧠 GAP support: Mid-launch check-in',
          scheduled_date: format(addDays(cartOpens, Math.floor(launchDays / 2)), 'yyyy-MM-dd'),
          task_type: 'gap_support',
          phase: 'launch',
          estimated_minutes: 15,
          is_system_generated: true,
        });
      }
    }

    // 5. Insert all tasks
    const tasksWithMeta = tasks.map((task) => ({
      ...task,
      user_id: userId,
      project_id: project.id,
      status: 'scheduled',
      system_source: 'launch_wizard_v2',
    }));

    const { error: tasksError } = await serviceClient
      .from('tasks')
      .insert(tasksWithMeta);

    if (tasksError) throw tasksError;

    // 6. Create CTFAR entries for fears (max 3)
    if (data.biggestFears && data.biggestFears.length > 0) {
      // Get active cycle for linking
      const { data: activeCycle } = await serviceClient
        .from('cycles_90_day')
        .select('cycle_id')
        .eq('user_id', userId)
        .lte('start_date', format(today, 'yyyy-MM-dd'))
        .gte('end_date', format(today, 'yyyy-MM-dd'))
        .maybeSingle();

      const topFears = data.biggestFears.slice(0, 3);
      const ctfarEntries = topFears.map((fear) => ({
        user_id: userId,
        cycle_id: activeCycle?.cycle_id || null,
        date: format(today, 'yyyy-MM-dd'),
        circumstance: `Launching ${data.name}`,
        thought: FEAR_THOUGHT_MAP[fear] || `Fear about ${fear}`,
        feeling: FEAR_FEELING_MAP[fear] || 'anxious',
        action: '',
        result: '',
        tags: JSON.stringify(['launch', 'auto-generated', data.name]),
      }));

      await serviceClient.from('ctfar').insert(ctfarEntries);
    }

    // 7. Mark wizard completion
    await serviceClient.from('wizard_completions').insert({
      user_id: userId,
      template_name: 'launch-planner-v2',
      completed_at: new Date().toISOString(),
      created_cycle_id: null,
      created_project_id: project.id,
    });

    // 8. Clear wizard draft
    await serviceClient
      .from('wizard_drafts')
      .delete()
      .eq('user_id', userId)
      .eq('wizard_name', 'launch-planner-v2');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Launch created with ${tasks.length} tasks and ${contentItems.length} content items!`,
        project_id: project.id,
        tasks_created: tasks.length,
        content_items_created: contentItems.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('create-launch-v2 error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
