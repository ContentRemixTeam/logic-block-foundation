import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SummitWizardData {
  name: string;
  experienceLevel: string;
  primaryGoal: string;
  numDays: number;
  customDays: number | null;
  sessionsPerDay: number;
  sessionFormat: string;
  sessionLength: string;
  targetSpeakerCount: number;
  speakerRecruitmentDeadline: string;
  speakersAreAffiliates: string;
  affiliateCommission: number;
  customCommission: number | null;
  hasAllAccessPass: string;
  allAccessPrice: number | null;
  allAccessHasPaymentPlan: boolean;
  allAccessPaymentPlanDetails: string;
  allAccessIncludes: string[];
  hasVipTier: boolean;
  vipPrice: number | null;
  vipIncludes: string;
  registrationOpens: string;
  summitStartDate: string;
  summitEndDate: string;
  cartCloses: string;
  replayPeriod: string;
  hostingPlatform: string;
  hostingPlatformOther: string;
  emailPlatform: string;
  emailPlatformOther: string;
  checkoutPlatform: string;
  checkoutPlatformOther: string;
  hasLiveSessions: boolean;
  streamingPlatform: string;
  streamingPlatformOther: string;
  promotionMethods: string[];
  registrationGoal: number | null;
  speakerEmailRequirement: string;
  swipeEmailsCount: number;
  hasSocialKit: boolean;
  communityType: string;
  engagementActivities: string[];
  hasPostSummitOffer: boolean;
  postSummitOfferDetails: string;
  postSummitNurture: string;
  // Live panels
  hasLivePanels: boolean;
  livePanelCount: number | null;
  livePanelTopics: string[];
  // Task exclusions
  excludedTasks: string[];
}

interface ContentMapping {
  type: string;
  channel: string;
}

// Check if a task should also create a content_items record
function getContentMappingForSummit(taskId: string, taskText: string): ContentMapping | null {
  const lower = taskText.toLowerCase();
  
  // Email-related tasks
  if (taskId.includes('email') || lower.includes('email')) {
    return { type: 'email', channel: 'email' };
  }
  
  // Social content tasks  
  if (taskId.includes('social') || lower.includes('social')) {
    return { type: 'post', channel: 'social' };
  }
  
  // Swipe copy (promotional emails for speakers)
  if (taskId.includes('swipe')) {
    return { type: 'email', channel: 'email' };
  }
  
  return null;
}

interface Task {
  id: string;
  task_text: string;
  scheduled_date: string | null;
  status: string;
  priority: string;
  estimated_minutes: number | null;
  tags: string[];
  isContent?: boolean;
  contentType?: string;
  contentChannel?: string;
}

interface ContentItemToCreate {
  user_id: string;
  title: string;
  body?: string;
  type: string;
  channel: string;
  status: string;
  project_id: string;
  summit_id?: string;
  planned_creation_date?: string;
  planned_publish_date?: string;
  show_in_vault: boolean;
  tags: string[];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function generateSummitTasks(data: SummitWizardData): Task[] {
  const tasks: Task[] = [];
  const today = new Date();
  
  const effectiveDays = data.numDays === 0 ? (data.customDays || 5) : data.numDays;
  const summitStart = data.summitStartDate ? new Date(data.summitStartDate) : addDays(today, 90);
  const summitEnd = data.summitEndDate ? new Date(data.summitEndDate) : addDays(summitStart, effectiveDays - 1);
  const regOpens = data.registrationOpens ? new Date(data.registrationOpens) : addDays(summitStart, -21);
  const speakerDeadline = data.speakerRecruitmentDeadline ? new Date(data.speakerRecruitmentDeadline) : addDays(summitStart, -42);
  const cartClose = data.cartCloses ? new Date(data.cartCloses) : addDays(summitEnd, 7);

  // Phase 1: Speaker Recruitment
  const recruitStart = addDays(speakerDeadline, -35);
  
  tasks.push({
    id: 'recruitment_pitch_email',
    task_text: 'Create speaker pitch email template',
    scheduled_date: formatDate(recruitStart),
    status: 'scheduled',
    priority: 'high',
    estimated_minutes: 60,
    tags: ['summit', 'speakers', 'recruitment'],
    isContent: true,
    contentType: 'email',
    contentChannel: 'email',
  });

  tasks.push({
    id: 'recruitment_research_1',
    task_text: 'Research and list potential speakers (batch 1)',
    scheduled_date: formatDate(addDays(recruitStart, 2)),
    status: 'scheduled',
    priority: 'high',
    estimated_minutes: 90,
    tags: ['summit', 'speakers', 'research'],
  });

  tasks.push({
    id: 'recruitment_research_2',
    task_text: 'Research and list potential speakers (batch 2)',
    scheduled_date: formatDate(addDays(recruitStart, 5)),
    status: 'scheduled',
    priority: 'high',
    estimated_minutes: 90,
    tags: ['summit', 'speakers', 'research'],
  });

  tasks.push({
    id: 'recruitment_invite_1',
    task_text: 'Send speaker invitation emails (batch 1)',
    scheduled_date: formatDate(addDays(recruitStart, 7)),
    status: 'scheduled',
    priority: 'high',
    estimated_minutes: 45,
    tags: ['summit', 'speakers', 'outreach'],
  });

  tasks.push({
    id: 'recruitment_invite_2',
    task_text: 'Send speaker invitation emails (batch 2)',
    scheduled_date: formatDate(addDays(recruitStart, 14)),
    status: 'scheduled',
    priority: 'high',
    estimated_minutes: 45,
    tags: ['summit', 'speakers', 'outreach'],
  });

  tasks.push({
    id: 'recruitment_followup',
    task_text: 'Follow up with pending speaker invitations',
    scheduled_date: formatDate(addDays(recruitStart, 21)),
    status: 'scheduled',
    priority: 'medium',
    estimated_minutes: 30,
    tags: ['summit', 'speakers', 'follow-up'],
  });

  if (data.speakersAreAffiliates !== 'none') {
    tasks.push({
      id: 'recruitment_affiliate_setup',
      task_text: 'Set up affiliate tracking system for speakers',
      scheduled_date: formatDate(addDays(recruitStart, 10)),
      status: 'scheduled',
      priority: 'high',
      estimated_minutes: 60,
      tags: ['summit', 'affiliates', 'tech'],
    });

    tasks.push({
      id: 'recruitment_affiliate_guide',
      task_text: 'Create affiliate onboarding guide for speakers',
      scheduled_date: formatDate(addDays(recruitStart, 14)),
      status: 'scheduled',
      priority: 'medium',
      estimated_minutes: 45,
      tags: ['summit', 'affiliates', 'docs'],
    });
  }

  // Phase 2: Content Creation
  const contentStart = addDays(regOpens, -21);

  if (data.sessionFormat === 'pre-recorded' || data.sessionFormat === 'mixed') {
    tasks.push({
      id: 'content_interview_guide',
      task_text: 'Create speaker interview guide/questions',
      scheduled_date: formatDate(contentStart),
      status: 'scheduled',
      priority: 'high',
      estimated_minutes: 60,
      tags: ['summit', 'content', 'speakers'],
    });

    tasks.push({
      id: 'content_recording_1',
      task_text: 'Schedule speaker recording sessions (week 1)',
      scheduled_date: formatDate(addDays(contentStart, 7)),
      status: 'scheduled',
      priority: 'high',
      estimated_minutes: 120,
      tags: ['summit', 'content', 'recording'],
    });

    tasks.push({
      id: 'content_recording_2',
      task_text: 'Schedule speaker recording sessions (week 2)',
      scheduled_date: formatDate(addDays(contentStart, 14)),
      status: 'scheduled',
      priority: 'high',
      estimated_minutes: 120,
      tags: ['summit', 'content', 'recording'],
    });
  }

  tasks.push({
    id: 'content_bios_headshots',
    task_text: 'Collect speaker bios and headshots',
    scheduled_date: formatDate(speakerDeadline),
    status: 'scheduled',
    priority: 'high',
    estimated_minutes: 30,
    tags: ['summit', 'speakers', 'assets'],
  });

  if (data.speakerEmailRequirement !== 'none') {
    tasks.push({
      id: 'content_swipe_emails',
      task_text: `Write ${data.swipeEmailsCount} speaker swipe copy emails`,
      scheduled_date: formatDate(addDays(regOpens, -14)),
      status: 'scheduled',
      priority: 'high',
      estimated_minutes: 90,
      tags: ['summit', 'marketing', 'swipe'],
      isContent: true,
      contentType: 'email',
      contentChannel: 'email',
    });

    tasks.push({
      id: 'content_send_swipe',
      task_text: 'Send swipe copy kit to confirmed speakers',
      scheduled_date: formatDate(addDays(regOpens, -7)),
      status: 'scheduled',
      priority: 'high',
      estimated_minutes: 30,
      tags: ['summit', 'marketing', 'speakers'],
    });
  }

  if (data.hasSocialKit) {
    tasks.push({
      id: 'content_social_graphics',
      task_text: 'Design speaker social media promo graphics',
      scheduled_date: formatDate(addDays(regOpens, -14)),
      status: 'scheduled',
      priority: 'medium',
      estimated_minutes: 120,
      tags: ['summit', 'marketing', 'design'],
      isContent: true,
      contentType: 'visual',
      contentChannel: 'social',
    });
  }

  tasks.push({
    id: 'content_reg_page',
    task_text: 'Build summit registration page',
    scheduled_date: formatDate(addDays(regOpens, -10)),
    status: 'scheduled',
    priority: 'high',
    estimated_minutes: 180,
    tags: ['summit', 'tech', 'landing-page'],
  });

  tasks.push({
    id: 'content_email_sequence',
    task_text: 'Set up registration email sequence',
    scheduled_date: formatDate(addDays(regOpens, -7)),
    status: 'scheduled',
    priority: 'high',
    estimated_minutes: 90,
    tags: ['summit', 'email', 'automation'],
    isContent: true,
    contentType: 'email',
    contentChannel: 'email',
  });

  if (data.hasAllAccessPass !== 'no') {
    tasks.push({
      id: 'content_aap_page',
      task_text: 'Create all-access pass sales page',
      scheduled_date: formatDate(addDays(regOpens, -5)),
      status: 'scheduled',
      priority: 'high',
      estimated_minutes: 180,
      tags: ['summit', 'sales', 'landing-page'],
    });

    tasks.push({
      id: 'content_checkout',
      task_text: 'Set up checkout and payment processing',
      scheduled_date: formatDate(addDays(regOpens, -3)),
      status: 'scheduled',
      priority: 'high',
      estimated_minutes: 60,
      tags: ['summit', 'sales', 'tech'],
    });
  }

  // Live Panels
  if (data.hasLivePanels) {
    const panelCount = data.livePanelCount || 1;
    
    tasks.push({
      id: 'live_panel_prep',
      task_text: 'Prepare panel discussion questions',
      scheduled_date: formatDate(addDays(summitStart, -3)),
      status: 'scheduled',
      priority: 'high',
      estimated_minutes: 60,
      tags: ['summit', 'content', 'panels'],
    });

    tasks.push({
      id: 'live_panel_tech_test',
      task_text: 'Test live streaming setup for panels',
      scheduled_date: formatDate(addDays(summitStart, -2)),
      status: 'scheduled',
      priority: 'high',
      estimated_minutes: 45,
      tags: ['summit', 'tech', 'panels'],
    });

    for (let i = 0; i < panelCount; i++) {
      const topicName = data.livePanelTopics?.[i] || `Panel ${i + 1}`;
      
      tasks.push({
        id: `live_panel_invite_${i + 1}`,
        task_text: `Invite panelists for: ${topicName}`,
        scheduled_date: formatDate(addDays(recruitStart, 25)),
        status: 'scheduled',
        priority: 'high',
        estimated_minutes: 30,
        tags: ['summit', 'speakers', 'panels'],
      });

      tasks.push({
        id: `live_panel_host_${i + 1}`,
        task_text: `Host live panel: ${topicName}`,
        scheduled_date: formatDate(addDays(summitStart, Math.min(i, effectiveDays - 1))),
        status: 'scheduled',
        priority: 'high',
        estimated_minutes: 60,
        tags: ['summit', 'live', 'panels'],
      });
    }
  }

  // Phase 3: Pre-Summit Promotion
  tasks.push({
    id: 'promo_launch',
    task_text: 'Launch summit registration',
    scheduled_date: formatDate(regOpens),
    status: 'scheduled',
    priority: 'high',
    estimated_minutes: 30,
    tags: ['summit', 'launch', 'marketing'],
  });

  tasks.push({
    id: 'promo_launch_email',
    task_text: 'Send registration launch email to list',
    scheduled_date: formatDate(regOpens),
    status: 'scheduled',
    priority: 'high',
    estimated_minutes: 30,
    tags: ['summit', 'email', 'marketing'],
    isContent: true,
    contentType: 'email',
    contentChannel: 'email',
  });

  if (data.promotionMethods.includes('social-media')) {
    tasks.push({
      id: 'promo_social_announce',
      task_text: 'Post summit announcement on social media',
      scheduled_date: formatDate(regOpens),
      status: 'scheduled',
      priority: 'medium',
      estimated_minutes: 30,
      tags: ['summit', 'social', 'marketing'],
      isContent: true,
      contentType: 'post',
      contentChannel: 'social',
    });
  }

  const regDays = Math.floor((summitStart.getTime() - regOpens.getTime()) / (1000 * 60 * 60 * 24));
  if (regDays > 7) {
    tasks.push({
      id: 'promo_mid_reminder',
      task_text: 'Send mid-registration reminder email',
      scheduled_date: formatDate(addDays(regOpens, Math.floor(regDays / 2))),
      status: 'scheduled',
      priority: 'medium',
      estimated_minutes: 20,
      tags: ['summit', 'email', 'marketing'],
    });
  }

  tasks.push({
    id: 'promo_speaker_remind',
    task_text: 'Remind speakers to promote the summit',
    scheduled_date: formatDate(addDays(summitStart, -7)),
    status: 'scheduled',
    priority: 'medium',
    estimated_minutes: 20,
    tags: ['summit', 'speakers', 'promotion'],
  });

  tasks.push({
    id: 'promo_tomorrow_email',
    task_text: 'Send "summit starts tomorrow" email',
    scheduled_date: formatDate(addDays(summitStart, -1)),
    status: 'scheduled',
    priority: 'high',
    estimated_minutes: 20,
    tags: ['summit', 'email', 'reminder'],
    isContent: true,
    contentType: 'email',
    contentChannel: 'email',
  });

  // Phase 4: Summit Live
  for (let day = 0; day < effectiveDays; day++) {
    const summitDay = addDays(summitStart, day);
    
    tasks.push({
      id: `live_host_day_${day + 1}`,
      task_text: `Summit Day ${day + 1}: Host sessions and engage`,
      scheduled_date: formatDate(summitDay),
      status: 'scheduled',
      priority: 'high',
      estimated_minutes: 240,
      tags: ['summit', 'live', 'hosting'],
    });

    if (data.communityType !== 'none') {
      tasks.push({
        id: `live_community_day_${day + 1}`,
        task_text: `Summit Day ${day + 1}: Community engagement`,
        scheduled_date: formatDate(summitDay),
        status: 'scheduled',
        priority: 'medium',
        estimated_minutes: 60,
        tags: ['summit', 'live', 'community'],
      });
    }

    tasks.push({
      id: `live_recap_day_${day + 1}`,
      task_text: `Summit Day ${day + 1}: Send daily recap email`,
      scheduled_date: formatDate(summitDay),
      status: 'scheduled',
      priority: 'high',
      estimated_minutes: 30,
      tags: ['summit', 'email', 'live'],
      isContent: true,
      contentType: 'email',
      contentChannel: 'email',
    });
  }

  // Phase 5: Post-Summit
  tasks.push({
    id: 'post_replay_reminder',
    task_text: 'Send replay reminder email (24hr)',
    scheduled_date: formatDate(addDays(summitEnd, 1)),
    status: 'scheduled',
    priority: 'high',
    estimated_minutes: 20,
    tags: ['summit', 'email', 'post-summit'],
    isContent: true,
    contentType: 'email',
    contentChannel: 'email',
  });

  if (data.hasAllAccessPass !== 'no') {
    tasks.push({
      id: 'post_cart_48hr',
      task_text: 'Send cart closing reminder (48hr warning)',
      scheduled_date: formatDate(addDays(cartClose, -2)),
      status: 'scheduled',
      priority: 'high',
      estimated_minutes: 20,
      tags: ['summit', 'email', 'sales'],
      isContent: true,
      contentType: 'email',
      contentChannel: 'email',
    });

    tasks.push({
      id: 'post_cart_final',
      task_text: 'Send final cart closing email',
      scheduled_date: formatDate(cartClose),
      status: 'scheduled',
      priority: 'high',
      estimated_minutes: 20,
      tags: ['summit', 'email', 'sales'],
      isContent: true,
      contentType: 'email',
      contentChannel: 'email',
    });
  }

  tasks.push({
    id: 'post_speaker_thanks',
    task_text: 'Send thank you emails to all speakers',
    scheduled_date: formatDate(addDays(summitEnd, 2)),
    status: 'scheduled',
    priority: 'high',
    estimated_minutes: 45,
    tags: ['summit', 'speakers', 'post-summit'],
  });

  if (data.speakersAreAffiliates !== 'none') {
    tasks.push({
      id: 'post_affiliate_payments',
      task_text: 'Calculate and send affiliate commission payments',
      scheduled_date: formatDate(addDays(cartClose, 7)),
      status: 'scheduled',
      priority: 'high',
      estimated_minutes: 60,
      tags: ['summit', 'affiliates', 'finance'],
    });
  }

  tasks.push({
    id: 'post_debrief',
    task_text: 'Complete summit debrief and lessons learned',
    scheduled_date: formatDate(addDays(cartClose, 3)),
    status: 'scheduled',
    priority: 'medium',
    estimated_minutes: 60,
    tags: ['summit', 'review', 'post-summit'],
  });

  if (data.hasPostSummitOffer) {
    tasks.push({
      id: 'post_offer_launch',
      task_text: 'Launch post-summit offer sequence',
      scheduled_date: formatDate(addDays(summitEnd, 3)),
      status: 'scheduled',
      priority: 'high',
      estimated_minutes: 30,
      tags: ['summit', 'sales', 'post-summit'],
    });
  }

  if (data.postSummitNurture !== 'none') {
    tasks.push({
      id: 'post_nurture_sequence',
      task_text: 'Set up post-summit nurture email sequence',
      scheduled_date: formatDate(addDays(cartClose, 1)),
      status: 'scheduled',
      priority: 'medium',
      estimated_minutes: 60,
      tags: ['summit', 'email', 'nurture'],
    });
  }

  return tasks;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { wizardData } = await req.json() as { wizardData: SummitWizardData };

    if (!wizardData.name || !wizardData.summitStartDate) {
      throw new Error('Summit name and start date are required');
    }

    // Create project first
    const effectiveDays = wizardData.numDays === 0 ? (wizardData.customDays || 5) : wizardData.numDays;
    
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: wizardData.name,
        description: `Virtual Summit: ${effectiveDays} days, ${wizardData.targetSpeakerCount} speakers`,
        status: 'active',
        is_summit: true,
        start_date: wizardData.registrationOpens || wizardData.summitStartDate,
        end_date: wizardData.cartCloses || wizardData.summitEndDate,
      })
      .select()
      .single();

    if (projectError) {
      throw new Error(`Failed to create project: ${projectError.message}`);
    }

    // Create summit record
    const effectiveCommission = wizardData.affiliateCommission === 0 
      ? wizardData.customCommission 
      : wizardData.affiliateCommission;

    const { data: summit, error: summitError } = await supabase
      .from('summits')
      .insert({
        user_id: user.id,
        project_id: project.id,
        name: wizardData.name,
        experience_level: wizardData.experienceLevel,
        primary_goal: wizardData.primaryGoal,
        num_days: effectiveDays,
        sessions_per_day: wizardData.sessionsPerDay,
        session_format: wizardData.sessionFormat,
        session_length: wizardData.sessionLength,
        target_speaker_count: wizardData.targetSpeakerCount,
        speaker_recruitment_deadline: wizardData.speakerRecruitmentDeadline || null,
        speakers_are_affiliates: wizardData.speakersAreAffiliates,
        affiliate_commission: effectiveCommission,
        has_all_access_pass: wizardData.hasAllAccessPass !== 'no',
        all_access_price: wizardData.allAccessPrice,
        all_access_has_payment_plan: wizardData.allAccessHasPaymentPlan,
        all_access_payment_plan_details: wizardData.allAccessPaymentPlanDetails,
        all_access_includes: wizardData.allAccessIncludes,
        has_vip_tier: wizardData.hasVipTier,
        vip_price: wizardData.vipPrice,
        vip_includes: wizardData.vipIncludes,
        registration_opens: wizardData.registrationOpens || null,
        summit_start_date: wizardData.summitStartDate,
        summit_end_date: wizardData.summitEndDate,
        cart_closes: wizardData.cartCloses || null,
        replay_period: wizardData.replayPeriod,
        hosting_platform: wizardData.hostingPlatform === 'other' 
          ? wizardData.hostingPlatformOther 
          : wizardData.hostingPlatform,
        email_platform: wizardData.emailPlatform === 'other' 
          ? wizardData.emailPlatformOther 
          : wizardData.emailPlatform,
        checkout_platform: wizardData.checkoutPlatform === 'other' 
          ? wizardData.checkoutPlatformOther 
          : wizardData.checkoutPlatform,
        streaming_platform: wizardData.hasLiveSessions 
          ? (wizardData.streamingPlatform === 'other' 
              ? wizardData.streamingPlatformOther 
              : wizardData.streamingPlatform)
          : null,
        promotion_methods: wizardData.promotionMethods,
        registration_goal: wizardData.registrationGoal,
        speaker_email_requirement: wizardData.speakerEmailRequirement,
        swipe_emails_count: wizardData.swipeEmailsCount,
        has_social_kit: wizardData.hasSocialKit,
        community_type: wizardData.communityType,
        engagement_activities: wizardData.engagementActivities,
        has_post_summit_offer: wizardData.hasPostSummitOffer,
        post_summit_offer_details: wizardData.postSummitOfferDetails,
        post_summit_nurture: wizardData.postSummitNurture,
        has_live_panels: wizardData.hasLivePanels || false,
        live_panel_count: wizardData.livePanelCount,
        live_panel_topics: wizardData.livePanelTopics || [],
        status: 'planning',
      })
      .select()
      .single();

    if (summitError) {
      // Cleanup project if summit creation fails
      await supabase.from('projects').delete().eq('id', project.id);
      throw new Error(`Failed to create summit: ${summitError.message}`);
    }

    // Update project with summit_id
    await supabase
      .from('projects')
      .update({ summit_id: summit.id })
      .eq('id', project.id);

    // Generate and create tasks (filtering out excluded tasks)
    const allTasks = generateSummitTasks(wizardData);
    const excludedTasks = wizardData.excludedTasks || [];
    const filteredTasks = allTasks.filter(task => !excludedTasks.includes(task.id));
    
    // Helper to calculate creation date
    const calculateCreationDate = (publishDate: string): string => {
      const date = new Date(publishDate);
      date.setDate(date.getDate() - 3);
      return date.toISOString().split('T')[0];
    };
    
    // Create content items for content-related tasks
    const contentItemsToCreate: ContentItemToCreate[] = [];
    for (const task of filteredTasks) {
      if (task.isContent && task.contentType && task.contentChannel && task.scheduled_date) {
        contentItemsToCreate.push({
          user_id: user.id,
          title: task.task_text,
          type: task.contentType,
          channel: task.contentChannel,
          status: 'Draft',
          project_id: project.id,
          summit_id: summit.id,
          planned_creation_date: calculateCreationDate(task.scheduled_date),
          planned_publish_date: task.scheduled_date,
          show_in_vault: true,
          tags: ['summit', 'wizard-generated'],
        });
      }
    }
    
    // Insert content items first
    let contentItemsCreated = 0;
    const contentItemIdMap: Map<string, string> = new Map();
    
    if (contentItemsToCreate.length > 0) {
      const { data: createdContentItems, error: contentError } = await supabase
        .from('content_items')
        .insert(contentItemsToCreate)
        .select();

      if (contentError) {
        console.error('Error creating content items:', contentError);
      } else {
        contentItemsCreated = createdContentItems?.length || 0;
        createdContentItems?.forEach((item) => {
          contentItemIdMap.set(item.title, item.id);
        });
      }
    }
    
    // Build task records with content item links
    const taskRecords = filteredTasks.map(task => {
      const contentItemId = contentItemIdMap.get(task.task_text);
      
      return {
        user_id: user.id,
        project_id: project.id,
        task_text: task.task_text,
        scheduled_date: task.scheduled_date,
        status: task.status,
        priority: task.priority,
        estimated_minutes: task.estimated_minutes,
        is_system_generated: true,
        system_source: 'summit_wizard',
        content_item_id: contentItemId || null,
        content_type: task.isContent ? task.contentType : null,
        content_channel: task.isContent ? task.contentChannel : null,
        content_creation_date: task.isContent && task.scheduled_date ? calculateCreationDate(task.scheduled_date) : null,
        content_publish_date: task.isContent ? task.scheduled_date : null,
      };
    });

    const { error: tasksError } = await supabase
      .from('tasks')
      .insert(taskRecords);

    if (tasksError) {
      console.error('Error creating tasks:', tasksError);
      // Don't fail the whole operation for tasks
    }

    return new Response(
      JSON.stringify({
        success: true,
        projectId: project.id,
        summitId: summit.id,
        tasksCreated: taskRecords.length,
        tasksExcluded: excludedTasks.length,
        contentItemsCreated: contentItemsCreated,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in create-summit:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
