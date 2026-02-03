// Wizard Content Helpers
// Shared utilities for generating content items and linked tasks from wizards

import { format, parseISO, subDays } from 'date-fns';

// Email sequence type labels
const EMAIL_SEQUENCE_LABELS: Record<string, string> = {
  warmUp: 'Warm-Up',
  launch: 'Launch',
  cartClose: 'Cart Close',
  postPurchase: 'Post-Purchase',
  custom: 'Custom',
};

export function getSequenceLabel(type: string): string {
  return EMAIL_SEQUENCE_LABELS[type] || type;
}

// Content type mapping for tasks
export const CONTENT_TYPE_MAP: Record<string, string> = {
  email: 'Newsletter',
  'email-sequence': 'Newsletter',
  'email-single': 'Newsletter',
  newsletter: 'Newsletter',
  'blog-post': 'Blog Post',
  'linkedin-post': 'Social Post',
  'twitter-thread': 'Social Post',
  'instagram-post': 'Social Post',
  'instagram-reel': 'Video',
  'facebook-post': 'Social Post',
  'youtube-video': 'Video',
  'youtube-short': 'Video',
  'tiktok': 'Video',
  'live-stream': 'Video',
  'sales-video': 'Video',
  'testimonial-video': 'Video',
  'tutorial-video': 'Video',
  'podcast-episode': 'Podcast',
  'podcast-guest': 'Podcast',
  'audio-course': 'Podcast',
  'webinar': 'Webinar',
  'workshop': 'Workshop',
  'challenge': 'Challenge',
  'masterclass': 'Masterclass',
  'group-call': 'Event',
  'case-study': 'Document',
  'pdf-guide': 'Document',
  'workbook': 'Document',
  'checklist': 'Document',
  'infographic': 'Visual',
  'carousel': 'Visual',
  'quote-graphic': 'Visual',
  'community-post': 'Social Post',
};

// Channel mapping for content
export const CHANNEL_MAP: Record<string, string> = {
  email: 'Email',
  'email-sequence': 'Email',
  'email-single': 'Email',
  newsletter: 'Email',
  'blog-post': 'Blog',
  'linkedin-post': 'LinkedIn',
  'twitter-thread': 'Twitter/X',
  'instagram-post': 'Instagram',
  'instagram-reel': 'Instagram',
  'facebook-post': 'Facebook',
  'youtube-video': 'YouTube',
  'youtube-short': 'YouTube',
  'tiktok': 'TikTok',
  'live-stream': 'Live',
  'podcast-episode': 'Podcast',
  'podcast-guest': 'Podcast',
  'webinar': 'Webinar',
  'workshop': 'Workshop',
  'community-post': 'Community',
};

export interface ContentItemToCreate {
  user_id: string;
  title: string;
  type: string;
  channel: string;
  status: string;
  project_id: string | null;
  planned_creation_date: string | null;
  planned_publish_date: string | null;
  tags?: string[];
}

export interface TaskToCreate {
  user_id: string;
  task_text: string;
  scheduled_date: string;
  task_type: string;
  phase?: string;
  project_id: string | null;
  estimated_minutes?: number;
  is_system_generated: boolean;
  system_source: string;
  content_item_id?: string;
  content_type?: string;
  content_channel?: string;
  content_creation_date?: string | null;
  content_publish_date?: string | null;
}

export interface ContentTaskPair {
  contentItem: ContentItemToCreate;
  createTask: TaskToCreate;
  publishTask?: TaskToCreate;
}

/**
 * Generate content item and linked tasks for an email sequence
 */
export function generateEmailSequenceContent(
  sequence: { type: string; status: string; deadline?: string; customName?: string },
  launchName: string,
  projectId: string,
  userId: string,
  cartOpensDate: string,
  phase: string = 'pre_launch'
): ContentTaskPair {
  const publishDateStr = sequence.deadline || cartOpensDate;
  const publishDate = parseISO(publishDateStr);
  const createDate = subDays(publishDate, 3);
  
  const sequenceLabel = sequence.customName || getSequenceLabel(sequence.type);
  const title = `${sequenceLabel} Email Sequence`;
  
  return {
    contentItem: {
      user_id: userId,
      title,
      type: 'Newsletter',
      channel: 'Email',
      status: 'Draft',
      project_id: projectId,
      planned_creation_date: format(createDate, 'yyyy-MM-dd'),
      planned_publish_date: publishDateStr,
      tags: ['launch', 'email', launchName],
    },
    createTask: {
      user_id: userId,
      task_text: `Create: ${title}`,
      scheduled_date: format(createDate, 'yyyy-MM-dd'),
      task_type: 'content_creation',
      phase,
      project_id: projectId,
      estimated_minutes: 60,
      is_system_generated: true,
      system_source: 'launch_wizard_v2',
      content_type: 'Newsletter',
      content_channel: 'Email',
      content_creation_date: format(createDate, 'yyyy-MM-dd'),
      content_publish_date: publishDateStr,
    },
    publishTask: {
      user_id: userId,
      task_text: `Send: ${title}`,
      scheduled_date: publishDateStr,
      task_type: 'content_publish',
      phase,
      project_id: projectId,
      estimated_minutes: 15,
      is_system_generated: true,
      system_source: 'launch_wizard_v2',
      content_type: 'Newsletter',
      content_channel: 'Email',
      content_creation_date: format(createDate, 'yyyy-MM-dd'),
      content_publish_date: publishDateStr,
    },
  };
}

/**
 * Generate content item and linked tasks for a general content piece
 */
export function generateContentPiece(
  title: string,
  contentType: string,
  channel: string,
  createDate: string | null,
  publishDate: string | null,
  projectId: string | null,
  userId: string,
  systemSource: string = 'content_planner'
): ContentTaskPair {
  const mappedType = CONTENT_TYPE_MAP[contentType] || contentType;
  const mappedChannel = CHANNEL_MAP[contentType] || channel || 'Other';
  
  return {
    contentItem: {
      user_id: userId,
      title,
      type: mappedType,
      channel: mappedChannel,
      status: 'Draft',
      project_id: projectId,
      planned_creation_date: createDate,
      planned_publish_date: publishDate,
    },
    createTask: {
      user_id: userId,
      task_text: `Create: ${title}`,
      scheduled_date: createDate || publishDate || format(new Date(), 'yyyy-MM-dd'),
      task_type: 'content_creation',
      project_id: projectId,
      estimated_minutes: 45,
      is_system_generated: true,
      system_source: systemSource,
      content_type: mappedType,
      content_channel: mappedChannel,
      content_creation_date: createDate,
      content_publish_date: publishDate,
    },
    publishTask: publishDate ? {
      user_id: userId,
      task_text: `Publish: ${title}`,
      scheduled_date: publishDate,
      task_type: 'content_publish',
      project_id: projectId,
      estimated_minutes: 15,
      is_system_generated: true,
      system_source: systemSource,
      content_type: mappedType,
      content_channel: mappedChannel,
      content_creation_date: createDate,
      content_publish_date: publishDate,
    } : undefined,
  };
}
