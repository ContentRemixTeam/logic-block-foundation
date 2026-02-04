// Client-side Launch V2 task generator for task preview
// Mirrors the edge function logic for real-time previews

import { LaunchWizardV2Data } from '@/types/launchV2';
import { WizardTask } from '@/types/wizardTask';

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

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

export interface LaunchV2Task extends WizardTask {
  phase: 'pre_launch' | 'launch' | 'post_launch' | 'mindset';
}

export function generateLaunchV2TasksPreview(data: LaunchWizardV2Data): LaunchV2Task[] {
  const tasks: LaunchV2Task[] = [];
  const today = new Date();
  
  const cartOpens = data.cartOpensDate ? new Date(data.cartOpensDate) : addDays(today, 30);
  const cartCloses = data.cartClosesDate ? new Date(data.cartClosesDate) : addDays(cartOpens, 7);
  const preLaunchDays = Math.floor((cartOpens.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const launchDays = Math.floor((cartCloses.getTime() - cartOpens.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // ===== PRE-LAUNCH TASKS =====
  
  // Email sequence tasks
  if (data.emailSequences && data.emailSequences.length > 0) {
    data.emailSequences.forEach((sequence, index) => {
      if (sequence.status === 'needs-creation') {
        const deadline = sequence.deadline || data.cartOpensDate;
        const deadlineDate = deadline ? new Date(deadline) : cartOpens;
        const createDate = addDays(deadlineDate, -3);
        const label = sequence.customName || getSequenceLabel(sequence.type);
        
        tasks.push({
          id: `email_sequence_create_${index}`,
          task_text: `Create: ${label} Email Sequence`,
          scheduled_date: formatDate(createDate),
          phase: 'pre_launch',
          priority: 'high',
          estimated_minutes: 60,
        });
        
        tasks.push({
          id: `email_sequence_send_${index}`,
          task_text: `Send: ${label} Email Sequence`,
          scheduled_date: deadline || formatDate(cartOpens),
          phase: 'pre_launch',
          priority: 'high',
          estimated_minutes: 15,
        });
      }
    });
  }

  // Content creation based on status
  if (data.contentCreationStatus === 'from-scratch') {
    const taskCount = CONTENT_VOLUME_MAP[data.contentVolume || 'light'] || 5;
    const daysPerTask = Math.max(1, Math.floor(preLaunchDays / taskCount));
    
    for (let i = 0; i < Math.min(taskCount, 10); i++) {
      const taskDate = addDays(today, (i + 1) * daysPerTask);
      if (taskDate < cartOpens) {
        tasks.push({
          id: `content_create_${i}`,
          task_text: `Create launch content piece ${i + 1}/${taskCount}`,
          scheduled_date: formatDate(taskDate),
          phase: 'pre_launch',
          priority: i < 3 ? 'high' : 'medium',
          estimated_minutes: 60,
        });
      }
    }
  } else if (data.contentCreationStatus === 'partial') {
    for (let i = 0; i < 3; i++) {
      const taskDate = addDays(today, (i + 1) * 3);
      if (taskDate < cartOpens) {
        tasks.push({
          id: `content_finish_${i}`,
          task_text: `Finish creating content piece ${i + 1}`,
          scheduled_date: formatDate(taskDate),
          phase: 'pre_launch',
          priority: 'medium',
          estimated_minutes: 45,
        });
      }
    }
    
    for (let i = 0; i < 5; i++) {
      const taskDate = addDays(today, 7 + i * 2);
      if (taskDate < cartOpens) {
        tasks.push({
          id: `content_schedule_${i}`,
          task_text: `Schedule launch post ${i + 1}`,
          scheduled_date: formatDate(taskDate),
          phase: 'pre_launch',
          priority: 'low',
          estimated_minutes: 15,
        });
      }
    }
  }

  // Sales page task
  if (data.salesPageStatus === 'needs-creation' || data.salesPageStatus === 'in-progress') {
    const deadline = data.salesPageDeadline || formatDate(addDays(cartOpens, -7));
    tasks.push({
      id: 'sales_page',
      task_text: `${data.salesPageStatus === 'in-progress' ? 'Finish' : 'Create'} sales page`,
      scheduled_date: deadline,
      phase: 'pre_launch',
      priority: 'high',
      estimated_minutes: 180,
    });
  }

  // Testimonial gathering
  if (data.testimonialStatus === 'need-more' || data.testimonialStatus === 'none') {
    tasks.push({
      id: 'testimonials_gather',
      task_text: `Gather ${data.testimonialGoal || 5} testimonials`,
      scheduled_date: data.testimonialDeadline || formatDate(addDays(cartOpens, -7)),
      phase: 'pre_launch',
      priority: 'medium',
      estimated_minutes: 60,
    });
  }

  // Visibility strategy if unsure
  if (data.mainReachMethod === 'unsure') {
    tasks.push({
      id: 'visibility_strategy',
      task_text: '🎯 Define your visibility strategy for this launch',
      scheduled_date: formatDate(addDays(today, 1)),
      phase: 'pre_launch',
      priority: 'high',
      estimated_minutes: 30,
    });
  }

  // Email list building for small lists
  if (data.emailListStatus === 'starting-zero' || data.emailListStatus === 'small-nervous') {
    tasks.push({
      id: 'list_lead_magnet',
      task_text: '📧 Create lead magnet or free resource',
      scheduled_date: formatDate(addDays(today, 2)),
      phase: 'pre_launch',
      priority: 'high',
      estimated_minutes: 90,
    });
    tasks.push({
      id: 'list_optin_page',
      task_text: '📧 Set up email opt-in page',
      scheduled_date: formatDate(addDays(today, 4)),
      phase: 'pre_launch',
      priority: 'high',
      estimated_minutes: 45,
    });
    tasks.push({
      id: 'list_promote',
      task_text: '📧 Promote lead magnet to grow list',
      scheduled_date: formatDate(addDays(today, 7)),
      phase: 'pre_launch',
      priority: 'medium',
      estimated_minutes: 30,
    });
  }

  // Payment plan setup
  if (data.hasPaymentPlan || (data.offerPricing?.paymentPlans?.length || 0) > 0) {
    tasks.push({
      id: 'payment_plan_setup',
      task_text: '💳 Set up payment plan in checkout',
      scheduled_date: formatDate(addDays(cartOpens, -3)),
      phase: 'pre_launch',
      priority: 'high',
      estimated_minutes: 30,
    });
  }

  // Bonus stack preparation
  if (data.hasBonusStack && data.bonusStack?.length > 0) {
    data.bonusStack.forEach((bonus, index) => {
      if (bonus.status === 'needs-creation') {
        tasks.push({
          id: `bonus_create_${index}`,
          task_text: `Create bonus: ${bonus.name}`,
          scheduled_date: bonus.deadline || formatDate(addDays(cartOpens, -5)),
          phase: 'pre_launch',
          priority: 'medium',
          estimated_minutes: 60,
        });
      }
    });
  }

  // ===== LAUNCH WEEK TASKS =====
  
  const offerTasksPerDay = OFFER_FREQUENCY_MAP[data.offerFrequency || 'daily'] || 1;
  
  for (let day = 0; day < launchDays; day++) {
    const launchDate = addDays(cartOpens, day);
    
    if (offerTasksPerDay >= 1) {
      for (let t = 0; t < Math.floor(offerTasksPerDay); t++) {
        tasks.push({
          id: `offer_day_${day + 1}_${t + 1}`,
          task_text: `🎯 Make an offer (Day ${day + 1}${offerTasksPerDay > 1 ? ` - #${t + 1}` : ''})`,
          scheduled_date: formatDate(launchDate),
          phase: 'launch',
          priority: 'high',
          estimated_minutes: 15,
        });
      }
    } else if (day % 2 === 0) {
      tasks.push({
        id: `offer_day_${day + 1}`,
        task_text: `🎯 Make an offer (Day ${day + 1})`,
        scheduled_date: formatDate(launchDate),
        phase: 'launch',
        priority: 'high',
        estimated_minutes: 15,
      });
    }
  }

  // Live event tasks
  if (data.liveComponent && data.liveComponent !== 'none' && data.liveEventDetails?.length) {
    data.liveEventDetails.forEach((event, index) => {
      if (event.date) {
        const eventDate = new Date(event.date);
        
        tasks.push({
          id: `live_prep_${index}`,
          task_text: `🎬 Prep for ${event.type}${event.topic ? `: ${event.topic}` : ''}`,
          scheduled_date: formatDate(addDays(eventDate, -2)),
          phase: 'launch',
          priority: 'high',
          estimated_minutes: 60,
        });
        
        tasks.push({
          id: `live_host_${index}`,
          task_text: `🔴 Host ${event.type}${event.topic ? `: ${event.topic}` : ''}`,
          scheduled_date: formatDate(eventDate),
          phase: 'launch',
          priority: 'high',
          estimated_minutes: 90,
        });
      }
    });
  }

  // ===== POST-LAUNCH TASKS =====
  
  // Follow-up based on willingness
  if (data.followUpWillingness === 'personal-outreach') {
    for (let i = 0; i < 5; i++) {
      tasks.push({
        id: `followup_personal_${i}`,
        task_text: `📧 Personal follow-up outreach (batch ${i + 1})`,
        scheduled_date: formatDate(addDays(cartCloses, i + 1)),
        phase: 'post_launch',
        priority: i < 2 ? 'high' : 'medium',
        estimated_minutes: 30,
      });
    }
  } else if (data.followUpWillingness === 'multiple-emails') {
    tasks.push({
      id: 'followup_sequence',
      task_text: '📧 Send follow-up email sequence',
      scheduled_date: formatDate(addDays(cartCloses, 1)),
      phase: 'post_launch',
      priority: 'high',
      estimated_minutes: 30,
    });
  }

  // Debrief
  tasks.push({
    id: 'debrief',
    task_text: '📊 Complete launch debrief',
    scheduled_date: data.debriefDate || formatDate(addDays(cartCloses, 3)),
    phase: 'post_launch',
    priority: 'high',
    estimated_minutes: 45,
  });

  // ===== MINDSET TASKS =====
  
  if (data.biggestFears?.length > 0 && !data.biggestFears.includes('no-fear')) {
    tasks.push({
      id: 'mindset_fear_work',
      task_text: '🧠 Complete fear-to-fuel thought work',
      scheduled_date: formatDate(addDays(today, 1)),
      phase: 'mindset',
      priority: 'medium',
      estimated_minutes: 30,
    });
  }

  if (data.gapOverlapDetected && data.gapSupportType === 'daily-motivation') {
    for (let i = 0; i < 7; i++) {
      tasks.push({
        id: `gap_motivation_${i}`,
        task_text: '💪 Daily motivation & mindset check-in',
        scheduled_date: formatDate(addDays(cartOpens, i)),
        phase: 'mindset',
        priority: 'medium',
        estimated_minutes: 10,
      });
    }
  }

  if ((data.readinessScore || 5) <= 5) {
    tasks.push({
      id: 'mindset_confidence',
      task_text: '🧠 Confidence-building thought work',
      scheduled_date: formatDate(addDays(today, 2)),
      phase: 'mindset',
      priority: 'medium',
      estimated_minutes: 20,
    });
  }

  return tasks;
}

function getSequenceLabel(type: string): string {
  const labels: Record<string, string> = {
    warmUp: 'Warm-Up',
    launch: 'Launch',
    cartClose: 'Cart Close',
    postPurchase: 'Post-Purchase',
    custom: 'Custom',
  };
  return labels[type] || type;
}

export const LAUNCH_V2_PHASE_CONFIG = [
  { key: 'pre_launch', label: 'Pre-Launch' },
  { key: 'launch', label: 'Launch Week' },
  { key: 'post_launch', label: 'Post-Launch' },
  { key: 'mindset', label: 'Mindset Support' },
];

export function groupLaunchV2TasksByPhase(tasks: LaunchV2Task[]): Record<string, LaunchV2Task[]> {
  const grouped: Record<string, LaunchV2Task[]> = {
    pre_launch: [],
    launch: [],
    post_launch: [],
    mindset: [],
  };
  
  tasks.forEach(task => {
    if (grouped[task.phase]) {
      grouped[task.phase].push(task);
    }
  });
  
  return grouped;
}
