// Client-side summit task generator that mirrors the edge function logic
// Used for task preview in the wizard

import { SummitWizardData } from '@/types/summit';

export interface SummitTask {
  id: string;
  task_text: string;
  scheduled_date: string | null;
  phase: 'recruitment' | 'content' | 'promotion' | 'live' | 'post-summit';
  priority: 'high' | 'medium' | 'low';
  estimated_minutes: number | null;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function generateSummitTasksPreview(data: SummitWizardData): SummitTask[] {
  const tasks: SummitTask[] = [];
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
    phase: 'recruitment',
    priority: 'high',
    estimated_minutes: 60,
  });

  tasks.push({
    id: 'recruitment_research_1',
    task_text: 'Research and list potential speakers (batch 1)',
    scheduled_date: formatDate(addDays(recruitStart, 2)),
    phase: 'recruitment',
    priority: 'high',
    estimated_minutes: 90,
  });

  tasks.push({
    id: 'recruitment_research_2',
    task_text: 'Research and list potential speakers (batch 2)',
    scheduled_date: formatDate(addDays(recruitStart, 5)),
    phase: 'recruitment',
    priority: 'high',
    estimated_minutes: 90,
  });

  tasks.push({
    id: 'recruitment_invite_1',
    task_text: 'Send speaker invitation emails (batch 1)',
    scheduled_date: formatDate(addDays(recruitStart, 7)),
    phase: 'recruitment',
    priority: 'high',
    estimated_minutes: 45,
  });

  tasks.push({
    id: 'recruitment_invite_2',
    task_text: 'Send speaker invitation emails (batch 2)',
    scheduled_date: formatDate(addDays(recruitStart, 14)),
    phase: 'recruitment',
    priority: 'high',
    estimated_minutes: 45,
  });

  tasks.push({
    id: 'recruitment_followup',
    task_text: 'Follow up with pending speaker invitations',
    scheduled_date: formatDate(addDays(recruitStart, 21)),
    phase: 'recruitment',
    priority: 'medium',
    estimated_minutes: 30,
  });

  if (data.speakersAreAffiliates !== 'none') {
    tasks.push({
      id: 'recruitment_affiliate_setup',
      task_text: 'Set up affiliate tracking system for speakers',
      scheduled_date: formatDate(addDays(recruitStart, 10)),
      phase: 'recruitment',
      priority: 'high',
      estimated_minutes: 60,
    });

    tasks.push({
      id: 'recruitment_affiliate_guide',
      task_text: 'Create affiliate onboarding guide for speakers',
      scheduled_date: formatDate(addDays(recruitStart, 14)),
      phase: 'recruitment',
      priority: 'medium',
      estimated_minutes: 45,
    });
  }

  // Phase 2: Content Creation
  const contentStart = addDays(regOpens, -21);

  if (data.sessionFormat === 'pre-recorded' || data.sessionFormat === 'mixed') {
    tasks.push({
      id: 'content_interview_guide',
      task_text: 'Create speaker interview guide/questions',
      scheduled_date: formatDate(contentStart),
      phase: 'content',
      priority: 'high',
      estimated_minutes: 60,
    });

    tasks.push({
      id: 'content_recording_1',
      task_text: 'Schedule speaker recording sessions (week 1)',
      scheduled_date: formatDate(addDays(contentStart, 7)),
      phase: 'content',
      priority: 'high',
      estimated_minutes: 120,
    });

    tasks.push({
      id: 'content_recording_2',
      task_text: 'Schedule speaker recording sessions (week 2)',
      scheduled_date: formatDate(addDays(contentStart, 14)),
      phase: 'content',
      priority: 'high',
      estimated_minutes: 120,
    });
  }

  tasks.push({
    id: 'content_bios_headshots',
    task_text: 'Collect speaker bios and headshots',
    scheduled_date: formatDate(speakerDeadline),
    phase: 'content',
    priority: 'high',
    estimated_minutes: 30,
  });

  if (data.speakerEmailRequirement !== 'none') {
    tasks.push({
      id: 'content_swipe_emails',
      task_text: `Write ${data.swipeEmailsCount} speaker swipe copy emails`,
      scheduled_date: formatDate(addDays(regOpens, -14)),
      phase: 'content',
      priority: 'high',
      estimated_minutes: 90,
    });

    tasks.push({
      id: 'content_send_swipe',
      task_text: 'Send swipe copy kit to confirmed speakers',
      scheduled_date: formatDate(addDays(regOpens, -7)),
      phase: 'content',
      priority: 'high',
      estimated_minutes: 30,
    });
  }

  if (data.hasSocialKit) {
    tasks.push({
      id: 'content_social_graphics',
      task_text: 'Design speaker social media promo graphics',
      scheduled_date: formatDate(addDays(regOpens, -14)),
      phase: 'content',
      priority: 'medium',
      estimated_minutes: 120,
    });
  }

  tasks.push({
    id: 'content_reg_page',
    task_text: 'Build summit registration page',
    scheduled_date: formatDate(addDays(regOpens, -10)),
    phase: 'content',
    priority: 'high',
    estimated_minutes: 180,
  });

  tasks.push({
    id: 'content_email_sequence',
    task_text: 'Set up registration email sequence',
    scheduled_date: formatDate(addDays(regOpens, -7)),
    phase: 'content',
    priority: 'high',
    estimated_minutes: 90,
  });

  if (data.hasAllAccessPass !== 'no') {
    tasks.push({
      id: 'content_aap_page',
      task_text: 'Create all-access pass sales page',
      scheduled_date: formatDate(addDays(regOpens, -5)),
      phase: 'content',
      priority: 'high',
      estimated_minutes: 180,
    });

    tasks.push({
      id: 'content_checkout',
      task_text: 'Set up checkout and payment processing',
      scheduled_date: formatDate(addDays(regOpens, -3)),
      phase: 'content',
      priority: 'high',
      estimated_minutes: 60,
    });
  }

  // Phase 3: Pre-Summit Promotion
  tasks.push({
    id: 'promo_launch',
    task_text: 'Launch summit registration',
    scheduled_date: formatDate(regOpens),
    phase: 'promotion',
    priority: 'high',
    estimated_minutes: 30,
  });

  tasks.push({
    id: 'promo_launch_email',
    task_text: 'Send registration launch email to list',
    scheduled_date: formatDate(regOpens),
    phase: 'promotion',
    priority: 'high',
    estimated_minutes: 30,
  });

  if (data.promotionMethods.includes('social-media')) {
    tasks.push({
      id: 'promo_social_announce',
      task_text: 'Post summit announcement on social media',
      scheduled_date: formatDate(regOpens),
      phase: 'promotion',
      priority: 'medium',
      estimated_minutes: 30,
    });
  }

  const regDays = Math.floor((summitStart.getTime() - regOpens.getTime()) / (1000 * 60 * 60 * 24));
  if (regDays > 7) {
    tasks.push({
      id: 'promo_mid_reminder',
      task_text: 'Send mid-registration reminder email',
      scheduled_date: formatDate(addDays(regOpens, Math.floor(regDays / 2))),
      phase: 'promotion',
      priority: 'medium',
      estimated_minutes: 20,
    });
  }

  tasks.push({
    id: 'promo_speaker_remind',
    task_text: 'Remind speakers to promote the summit',
    scheduled_date: formatDate(addDays(summitStart, -7)),
    phase: 'promotion',
    priority: 'medium',
    estimated_minutes: 20,
  });

  tasks.push({
    id: 'promo_tomorrow_email',
    task_text: 'Send "summit starts tomorrow" email',
    scheduled_date: formatDate(addDays(summitStart, -1)),
    phase: 'promotion',
    priority: 'high',
    estimated_minutes: 20,
  });

  // Phase 4: Summit Live
  for (let day = 0; day < effectiveDays; day++) {
    const summitDay = addDays(summitStart, day);
    
    tasks.push({
      id: `live_host_day_${day + 1}`,
      task_text: `Summit Day ${day + 1}: Host sessions and engage`,
      scheduled_date: formatDate(summitDay),
      phase: 'live',
      priority: 'high',
      estimated_minutes: 240,
    });

    if (data.communityType !== 'none') {
      tasks.push({
        id: `live_community_day_${day + 1}`,
        task_text: `Summit Day ${day + 1}: Community engagement`,
        scheduled_date: formatDate(summitDay),
        phase: 'live',
        priority: 'medium',
        estimated_minutes: 60,
      });
    }

    tasks.push({
      id: `live_recap_day_${day + 1}`,
      task_text: `Summit Day ${day + 1}: Send daily recap email`,
      scheduled_date: formatDate(summitDay),
      phase: 'live',
      priority: 'high',
      estimated_minutes: 30,
    });
  }

  // Live Panels (NEW)
  if (data.hasLivePanels) {
    const panelCount = data.livePanelCount || 1;
    
    tasks.push({
      id: 'live_panel_prep',
      task_text: 'Prepare panel discussion questions',
      scheduled_date: formatDate(addDays(summitStart, -3)),
      phase: 'content',
      priority: 'high',
      estimated_minutes: 60,
    });

    tasks.push({
      id: 'live_panel_tech_test',
      task_text: 'Test live streaming setup for panels',
      scheduled_date: formatDate(addDays(summitStart, -2)),
      phase: 'content',
      priority: 'high',
      estimated_minutes: 45,
    });

    for (let i = 0; i < panelCount; i++) {
      const topicName = data.livePanelTopics[i] || `Panel ${i + 1}`;
      
      tasks.push({
        id: `live_panel_invite_${i + 1}`,
        task_text: `Invite panelists for: ${topicName}`,
        scheduled_date: formatDate(addDays(recruitStart, 25)),
        phase: 'recruitment',
        priority: 'high',
        estimated_minutes: 30,
      });

      tasks.push({
        id: `live_panel_host_${i + 1}`,
        task_text: `Host live panel: ${topicName}`,
        scheduled_date: formatDate(addDays(summitStart, Math.min(i, effectiveDays - 1))),
        phase: 'live',
        priority: 'high',
        estimated_minutes: 60,
      });
    }
  }

  // Phase 5: Post-Summit
  tasks.push({
    id: 'post_replay_reminder',
    task_text: 'Send replay reminder email (24hr)',
    scheduled_date: formatDate(addDays(summitEnd, 1)),
    phase: 'post-summit',
    priority: 'high',
    estimated_minutes: 20,
  });

  if (data.hasAllAccessPass !== 'no') {
    tasks.push({
      id: 'post_cart_48hr',
      task_text: 'Send cart closing reminder (48hr warning)',
      scheduled_date: formatDate(addDays(cartClose, -2)),
      phase: 'post-summit',
      priority: 'high',
      estimated_minutes: 20,
    });

    tasks.push({
      id: 'post_cart_final',
      task_text: 'Send final cart closing email',
      scheduled_date: formatDate(cartClose),
      phase: 'post-summit',
      priority: 'high',
      estimated_minutes: 20,
    });
  }

  tasks.push({
    id: 'post_speaker_thanks',
    task_text: 'Send thank you emails to all speakers',
    scheduled_date: formatDate(addDays(summitEnd, 2)),
    phase: 'post-summit',
    priority: 'high',
    estimated_minutes: 45,
  });

  if (data.speakersAreAffiliates !== 'none') {
    tasks.push({
      id: 'post_affiliate_payments',
      task_text: 'Calculate and send affiliate commission payments',
      scheduled_date: formatDate(addDays(cartClose, 7)),
      phase: 'post-summit',
      priority: 'high',
      estimated_minutes: 60,
    });
  }

  tasks.push({
    id: 'post_debrief',
    task_text: 'Complete summit debrief and lessons learned',
    scheduled_date: formatDate(addDays(cartClose, 3)),
    phase: 'post-summit',
    priority: 'medium',
    estimated_minutes: 60,
  });

  if (data.hasPostSummitOffer) {
    tasks.push({
      id: 'post_offer_launch',
      task_text: 'Launch post-summit offer sequence',
      scheduled_date: formatDate(addDays(summitEnd, 3)),
      phase: 'post-summit',
      priority: 'high',
      estimated_minutes: 30,
    });
  }

  if (data.postSummitNurture !== 'none') {
    tasks.push({
      id: 'post_nurture_sequence',
      task_text: 'Set up post-summit nurture email sequence',
      scheduled_date: formatDate(addDays(cartClose, 1)),
      phase: 'post-summit',
      priority: 'medium',
      estimated_minutes: 60,
    });
  }

  return tasks;
}

export const PHASE_LABELS: Record<SummitTask['phase'], string> = {
  'recruitment': 'Speaker Recruitment',
  'content': 'Content Creation',
  'promotion': 'Pre-Summit Promotion',
  'live': 'Summit Live',
  'post-summit': 'Post-Summit',
};

export function groupTasksByPhase(tasks: SummitTask[]): Record<SummitTask['phase'], SummitTask[]> {
  const grouped: Record<SummitTask['phase'], SummitTask[]> = {
    'recruitment': [],
    'content': [],
    'promotion': [],
    'live': [],
    'post-summit': [],
  };
  
  tasks.forEach(task => {
    grouped[task.phase].push(task);
  });
  
  return grouped;
}
