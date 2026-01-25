import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Secure auth helper using getClaims
async function getAuthenticatedUserId(req: Request): Promise<{ userId: string | null; error: string | null }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { userId: null, error: 'No authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  const authClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data, error } = await authClient.auth.getClaims(token);
  
  if (error || !data?.claims) {
    console.error('[create-launch-from-wizard] JWT validation failed:', error);
    return { userId: null, error: 'Invalid or expired token' };
  }

  return { userId: data.claims.sub as string, error: null };
}

// Format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Add days to a date string, returns YYYY-MM-DD
function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

// Subtract days from a date string, returns YYYY-MM-DD
function subtractDays(dateStr: string, days: number): string {
  return addDays(dateStr, -days);
}

// Generate a template key for idempotency
function generateTemplateKey(prefix: string, launchId: string, suffix?: string): string {
  return `${prefix}_${launchId}${suffix ? `_${suffix}` : ''}`;
}

interface LaunchWizardData {
  name: string;
  cartOpens: string;
  cartCloses: string;
  launchDuration?: string;
  revenueGoal: number | null;
  pricePerSale: number | null;
  salesNeeded?: number;
  selectedContentIds?: string[];
  contentGapAnalysis?: {
    reusedCount: number;
    gapsCount: number;
    estimatedTimeSavedMinutes: number;
    gaps: Array<{
      type: string;
      category: string;
      count: number;
    }>;
  };
  autoCreateGapTasks?: boolean;
  hasWaitlist: boolean;
  waitlistOpens?: string;
  waitlistIncentive?: string;
  hasLeadMagnet: boolean | 'skip';
  leadMagnetTopic?: string;
  leadMagnetDueDate?: string;
  emailSequences?: string[];
  liveEvents?: Array<{
    type: string;
    date: string;
    time?: string;
    topic: string;
  }>;
  hasAds: boolean | 'maybe' | 'yes';
  adsBudget?: number | null;
  adsPlatform?: string[];
  socialPostsPerDay?: number;
  socialStrategy?: string[];
  offerGoal?: number;
  offerBreakdown?: {
    emails: number;
    socialPosts: number;
    stories: number;
    dms: number;
    salesCalls: number;
    liveEvents: number;
  };
  belief?: string;
  limitingThought?: string;
  usefulThought?: string;
  postPurchaseFlow?: string[];
  nonBuyerFollowup?: string;
  debriefDate?: string;
}

interface TaskToCreate {
  user_id: string;
  project_id: string;
  task_text: string;
  task_description?: string;
  scheduled_date: string;
  priority: 'high' | 'medium' | 'low';
  category?: string;
  status: string;
  is_system_generated: boolean;
  system_source: string;
  template_key: string;
  context_tags?: string[];
  estimated_minutes?: number;
  content_topic_id?: string; // Link to original content item
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const { userId, error: authError } = await getAuthenticatedUserId(req);
    
    if (authError || !userId) {
      return new Response(
        JSON.stringify({ error: authError || 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const wizardData: LaunchWizardData = await req.json();

    // Validate required fields
    if (!wizardData.name || wizardData.name.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: 'Launch name is required (min 3 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!wizardData.cartOpens || !wizardData.cartCloses) {
      return new Response(
        JSON.stringify({ error: 'Cart open and close dates are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`[create-launch-from-wizard] Creating launch "${wizardData.name}" for user ${userId}`);

    // ==================== CREATE PROJECT ====================
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        name: `🚀 ${wizardData.name}`,
        description: `Launch project: ${wizardData.name}. Cart opens ${wizardData.cartOpens}, closes ${wizardData.cartCloses}.`,
        status: 'active',
        color: '#F97316', // Orange for launches
        start_date: wizardData.cartOpens,
        end_date: wizardData.cartCloses,
        // Launch-specific columns
        is_launch: true,
        launch_start_date: wizardData.cartOpens,
        launch_end_date: wizardData.cartCloses,
        revenue_goal: wizardData.revenueGoal,
        offer_goal: wizardData.offerGoal || 50,
      })
      .select()
      .single();

    if (projectError) {
      console.error('[create-launch-from-wizard] Error creating project:', projectError);
      return new Response(
        JSON.stringify({ error: `Failed to create project: ${projectError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const projectId = project.id;
    console.log(`[create-launch-from-wizard] Created project: ${projectId}`);

    // ==================== CREATE LAUNCH RECORD ====================
    const { data: launch, error: launchError } = await supabase
      .from('launches')
      .insert({
        user_id: userId,
        name: wizardData.name,
        cart_opens: wizardData.cartOpens,
        cart_closes: wizardData.cartCloses,
        revenue_goal: wizardData.revenueGoal,
        price_per_sale: wizardData.pricePerSale,
        sales_needed: wizardData.salesNeeded || null,
        offer_goal: wizardData.offerGoal || 50,
        has_waitlist: wizardData.hasWaitlist,
        waitlist_opens: wizardData.waitlistOpens || null,
        waitlist_incentive: wizardData.waitlistIncentive || null,
        has_lead_magnet: wizardData.hasLeadMagnet === true,
        lead_magnet_topic: wizardData.leadMagnetTopic || null,
        lead_magnet_due_date: wizardData.leadMagnetDueDate || null,
        email_sequences: wizardData.emailSequences || [],
        live_events: wizardData.liveEvents || [],
        ads_budget: wizardData.adsBudget || null,
        ads_platform: wizardData.adsPlatform || [],
        social_posts_per_day: wizardData.socialPostsPerDay || 1,
        belief: wizardData.belief || null,
        limiting_thought: wizardData.limitingThought || null,
        useful_thought: wizardData.usefulThought || null,
        post_purchase_flow: wizardData.postPurchaseFlow || [],
        non_buyer_followup: wizardData.nonBuyerFollowup || null,
        debrief_date: wizardData.debriefDate || null,
        status: 'planning',
      })
      .select()
      .single();

    if (launchError) {
      console.error('[create-launch-from-wizard] Error creating launch:', launchError);
      // Don't fail entirely - project was created
    } else {
      console.log(`[create-launch-from-wizard] Created launch record: ${launch.id}`);
    }

    // ==================== GENERATE TASKS ====================
    const tasksToCreate: TaskToCreate[] = [];
    const launchId = launch?.id || projectId;

    // --- Content Repurpose Tasks (from selected content) ---
    if (wizardData.selectedContentIds && wizardData.selectedContentIds.length > 0) {
      // Fetch content details
      const { data: contentItems } = await supabase
        .from('content_items')
        .select('id, title, type')
        .in('id', wizardData.selectedContentIds);

      if (contentItems && contentItems.length > 0) {
        for (let i = 0; i < contentItems.length; i++) {
          const content = contentItems[i];
          tasksToCreate.push({
            user_id: userId,
            project_id: projectId,
            task_text: `♻️ Repurpose: ${content.title}`,
            task_description: `Adapt this existing ${content.type} for your ${wizardData.name} launch.\n\nReview the original content and update it for your current offer messaging.`,
            scheduled_date: subtractDays(wizardData.cartOpens, 14 - (i % 7)),
            priority: 'medium',
            category: 'Content Repurpose',
            status: 'todo',
            is_system_generated: true,
            system_source: 'launch_wizard',
            template_key: generateTemplateKey(`repurpose_${content.id}`, launchId),
            context_tags: ['launch', 'content', 'repurpose'],
            estimated_minutes: 30,
            content_topic_id: content.id,
          });
        }
        console.log(`[create-launch-from-wizard] Added ${contentItems.length} repurpose tasks`);
      }
    }

    // --- Content Gap Tasks (if auto-create is enabled) ---
    if (wizardData.autoCreateGapTasks && wizardData.contentGapAnalysis?.gaps) {
      const timeEstimates: Record<string, number> = {
        email: 60,
        social: 15,
        video: 120,
        blog: 90,
        podcast: 60,
        leadMagnet: 180,
        salesPage: 240,
        webinar: 120,
      };

      for (const gap of wizardData.contentGapAnalysis.gaps) {
        for (let i = 1; i <= gap.count; i++) {
          tasksToCreate.push({
            user_id: userId,
            project_id: projectId,
            task_text: `✍️ Create ${gap.category} #${i}`,
            task_description: `Create new ${gap.type} content for your launch.\n\nThis is part of filling the content gaps identified in your launch plan.`,
            scheduled_date: subtractDays(wizardData.cartOpens, 21 - (i % 14)),
            priority: gap.type === 'email' || gap.type === 'salesPage' ? 'high' : 'medium',
            category: 'Content Creation',
            status: 'todo',
            is_system_generated: true,
            system_source: 'launch_wizard',
            template_key: generateTemplateKey(`gap_${gap.type}_${i}`, launchId),
            context_tags: ['launch', 'content', 'creation'],
            estimated_minutes: timeEstimates[gap.type] || 60,
          });
        }
      }
      console.log(`[create-launch-from-wizard] Added ${wizardData.contentGapAnalysis.gapsCount} gap tasks`);
    }

    // --- Waitlist Task ---
    if (wizardData.hasWaitlist && wizardData.waitlistOpens) {
      tasksToCreate.push({
        user_id: userId,
        project_id: projectId,
        task_text: `🔔 Open waitlist for ${wizardData.name}`,
        task_description: wizardData.waitlistIncentive 
          ? `Launch your waitlist!\n\nIncentive: ${wizardData.waitlistIncentive}`
          : 'Launch your waitlist and start collecting interest.',
        scheduled_date: wizardData.waitlistOpens,
        priority: 'high',
        category: 'Pre-Launch',
        status: 'todo',
        is_system_generated: true,
        system_source: 'launch_wizard',
        template_key: generateTemplateKey('waitlist_open', launchId),
        context_tags: ['launch', 'waitlist'],
        estimated_minutes: 30,
      });
    }

    // --- Lead Magnet Task ---
    if (wizardData.hasLeadMagnet === true) {
      const leadMagnetDate = wizardData.leadMagnetDueDate || subtractDays(wizardData.cartOpens, 14);
      tasksToCreate.push({
        user_id: userId,
        project_id: projectId,
        task_text: `🧲 Create lead magnet: ${wizardData.leadMagnetTopic || 'for launch'}`,
        task_description: `Create your lead magnet to attract leads before the launch.\n\nTopic: ${wizardData.leadMagnetTopic || 'Not specified'}\n\nThis should be ready before cart opens on ${wizardData.cartOpens}.`,
        scheduled_date: leadMagnetDate,
        priority: 'high',
        category: 'Pre-Launch',
        status: 'todo',
        is_system_generated: true,
        system_source: 'launch_wizard',
        template_key: generateTemplateKey('lead_magnet', launchId),
        context_tags: ['launch', 'lead-magnet'],
        estimated_minutes: 180,
      });
    }

    // --- Email Sequence Tasks ---
    if (wizardData.emailSequences && wizardData.emailSequences.length > 0) {
      const emailSchedule: Record<string, { days: number; label: string }> = {
        'pre-launch': { days: -7, label: 'Pre-launch email sequence' },
        'launch': { days: 0, label: 'Launch week emails' },
        'mid-launch': { days: 3, label: 'Mid-launch nudge emails' },
        'urgency': { days: -1, label: 'Final urgency emails (last 24h)' },
        'post-launch': { days: 1, label: 'Post-launch follow-up emails' },
      };

      for (const seq of wizardData.emailSequences) {
        const schedule = emailSchedule[seq];
        if (schedule) {
          // Calculate date relative to cart opens/closes
          const baseDate = seq === 'post-launch' ? wizardData.cartCloses : wizardData.cartOpens;
          const taskDate = addDays(baseDate, schedule.days);

          tasksToCreate.push({
            user_id: userId,
            project_id: projectId,
            task_text: `✉️ Write ${schedule.label}`,
            task_description: `Draft and schedule your ${schedule.label.toLowerCase()} for the launch.`,
            scheduled_date: taskDate,
            priority: seq === 'urgency' || seq === 'launch' ? 'high' : 'medium',
            category: 'Email Campaign',
            status: 'todo',
            is_system_generated: true,
            system_source: 'launch_wizard',
            template_key: generateTemplateKey(`email_${seq}`, launchId),
            context_tags: ['launch', 'email'],
            estimated_minutes: 60,
          });
        }
      }
    }

    // --- Live Event Tasks ---
    if (wizardData.liveEvents && wizardData.liveEvents.length > 0) {
      for (let i = 0; i < wizardData.liveEvents.length; i++) {
        const event = wizardData.liveEvents[i];
        if (!event.date) continue;

        const eventTypeLabels: Record<string, string> = {
          'webinar': 'Webinar',
          'qa': 'Q&A Session',
          'workshop': 'Workshop',
          'challenge': 'Challenge Day',
          'masterclass': 'Masterclass',
        };

        const eventLabel = eventTypeLabels[event.type] || event.type;

        // Prep task (2 days before)
        const prepDate = subtractDays(event.date, 2);
        tasksToCreate.push({
          user_id: userId,
          project_id: projectId,
          task_text: `📋 Prep for ${eventLabel}: ${event.topic}`,
          task_description: `Prepare slides, talking points, and tech setup for your ${eventLabel.toLowerCase()}.\n\nTopic: ${event.topic}\nEvent Date: ${event.date}${event.time ? `\nTime: ${event.time}` : ''}`,
          scheduled_date: prepDate,
          priority: 'medium',
          category: 'Live Events',
          status: 'todo',
          is_system_generated: true,
          system_source: 'launch_wizard',
          template_key: generateTemplateKey(`event_prep_${i}`, launchId),
          context_tags: ['launch', 'live-event', 'prep'],
          estimated_minutes: 90,
        });

        // Event task (on the day)
        tasksToCreate.push({
          user_id: userId,
          project_id: projectId,
          task_text: `🎤 Host ${eventLabel}: ${event.topic}`,
          task_description: `Go live!\n\nTopic: ${event.topic}${event.time ? `\nTime: ${event.time}` : ''}\n\nRemember to:\n• Make your offer\n• Engage with audience\n• Follow up afterwards`,
          scheduled_date: event.date,
          priority: 'high',
          category: 'Live Events',
          status: 'todo',
          is_system_generated: true,
          system_source: 'launch_wizard',
          template_key: generateTemplateKey(`event_live_${i}`, launchId),
          context_tags: ['launch', 'live-event'],
          estimated_minutes: 60,
        });
      }
    }

    // --- Ads Task ---
    if (wizardData.hasAds === true || wizardData.hasAds === 'yes') {
      const adsPlatformList = wizardData.adsPlatform?.join(', ') || 'selected platforms';
      tasksToCreate.push({
        user_id: userId,
        project_id: projectId,
        task_text: `📢 Launch ads on ${adsPlatformList}`,
        task_description: `Turn on your ad campaigns for the launch.\n\nPlatforms: ${adsPlatformList}\nBudget: ${wizardData.adsBudget ? `$${wizardData.adsBudget}` : 'Not set'}\n\nMake sure tracking is set up!`,
        scheduled_date: wizardData.cartOpens,
        priority: 'high',
        category: 'Ads',
        status: 'todo',
        is_system_generated: true,
        system_source: 'launch_wizard',
        template_key: generateTemplateKey('ads_launch', launchId),
        context_tags: ['launch', 'ads'],
        estimated_minutes: 45,
      });
    }

    // --- Cart Open Task ---
    tasksToCreate.push({
      user_id: userId,
      project_id: projectId,
      task_text: `🚀 CART OPENS: ${wizardData.name}`,
      task_description: `Your launch is LIVE!\n\n🎯 Revenue Goal: ${wizardData.revenueGoal ? `$${wizardData.revenueGoal.toLocaleString()}` : 'Not set'}\n📊 Sales Needed: ${wizardData.salesNeeded || 'Calculate based on price'}\n💰 Price Per Sale: ${wizardData.pricePerSale ? `$${wizardData.pricePerSale}` : 'Not set'}\n\nGo make those offers!`,
      scheduled_date: wizardData.cartOpens,
      priority: 'high',
      category: 'Launch',
      status: 'todo',
      is_system_generated: true,
      system_source: 'launch_wizard',
      template_key: generateTemplateKey('cart_open', launchId),
      context_tags: ['launch', 'milestone'],
      estimated_minutes: 15,
    });

    // --- Cart Close Task ---
    tasksToCreate.push({
      user_id: userId,
      project_id: projectId,
      task_text: `🔒 CART CLOSES: ${wizardData.name}`,
      task_description: `Your launch is ending!\n\nLast chance to:\n• Send final emails\n• Post last-minute reminders\n• Personal outreach to warm leads\n\nYou've got this! 💪`,
      scheduled_date: wizardData.cartCloses,
      priority: 'high',
      category: 'Launch',
      status: 'todo',
      is_system_generated: true,
      system_source: 'launch_wizard',
      template_key: generateTemplateKey('cart_close', launchId),
      context_tags: ['launch', 'milestone'],
      estimated_minutes: 30,
    });

    // --- Debrief Task ---
    if (wizardData.debriefDate) {
      tasksToCreate.push({
        user_id: userId,
        project_id: projectId,
        task_text: `📊 Launch debrief: ${wizardData.name}`,
        task_description: `Time to review your launch!\n\nReflect on:\n• What worked well?\n• What would you do differently?\n• Revenue vs goal\n• Key learnings for next time\n\nCelebrate your wins, no matter the outcome! 🎉`,
        scheduled_date: wizardData.debriefDate,
        priority: 'medium',
        category: 'Post-Launch',
        status: 'todo',
        is_system_generated: true,
        system_source: 'launch_wizard',
        template_key: generateTemplateKey('debrief', launchId),
        context_tags: ['launch', 'review'],
        estimated_minutes: 45,
      });
    }

    // ==================== INSERT ALL TASKS ====================
    let tasksCreated = 0;
    if (tasksToCreate.length > 0) {
      const { data: createdTasks, error: tasksError } = await supabase
        .from('tasks')
        .insert(tasksToCreate)
        .select();

      if (tasksError) {
        console.error('[create-launch-from-wizard] Error creating tasks:', tasksError);
        // Don't fail - project and launch were created
      } else {
        tasksCreated = createdTasks?.length || 0;
        console.log(`[create-launch-from-wizard] Created ${tasksCreated} tasks`);
      }
    }

    // ==================== SAVE WIZARD COMPLETION ====================
    try {
      await supabase
        .from('wizard_completions')
        .insert({
          user_id: userId,
          template_name: 'launch-planner',
          completed_data: wizardData,
          is_final: true,
          content_reused_count: wizardData.selectedContentIds?.length || 0,
          content_gaps_count: wizardData.contentGapAnalysis?.gapsCount || 0,
          estimated_time_saved_minutes: wizardData.contentGapAnalysis?.estimatedTimeSavedMinutes || 0,
        });
    } catch (e) {
      console.warn('[create-launch-from-wizard] Could not save wizard completion:', e);
    }

    // ==================== RETURN SUCCESS ====================
    return new Response(
      JSON.stringify({
        success: true,
        project_id: projectId,
        launch_id: launch?.id || null,
        tasks_created: tasksCreated,
        message: `Created launch "${wizardData.name}" with ${tasksCreated} tasks`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[create-launch-from-wizard] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
