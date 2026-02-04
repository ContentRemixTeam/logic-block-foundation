import { supabase } from '@/integrations/supabase/client';

// TYPES - What format you published
export type ContentType = 'Newsletter' | 'Post' | 'Reel/Short' | 'Video' | 'Carousel' | 'Story' | 'Live Session' | 'Podcast Episode' | 'Blog Article' | 'Webinar' | 'Challenge' | 'DM/Message' | 'Ad' | 'Landing Page' | 'Other';
export type ContentStatus = 'Draft' | 'Ready' | 'Published';
// CHANNELS - Where you published
export type ContentChannel = 'Email' | 'Instagram' | 'Facebook' | 'YouTube' | 'TikTok' | 'LinkedIn' | 'Twitter/X' | 'Pinterest' | 'Website/Blog' | 'Podcast Platform' | 'Community Platform' | 'DMs' | 'Other';

export interface ContentItem {
  id: string;
  user_id: string;
  title: string;
  type: ContentType;
  status: ContentStatus;
  channel: ContentChannel | null;
  topic: string | null;
  tags: string[];
  body: string | null;
  hook: string | null;
  cta: string | null;
  offer: string | null;
  subject_line: string | null;
  preview_text: string | null;
  published_at: string | null;
  link_url: string | null;
  notes: string | null;
  cycle_id: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
  // Performance stats
  open_rate: number | null;
  click_rate: number | null;
  views: number | null;
  comments: number | null;
  likes: number | null;
  shares: number | null;
  saves: number | null;
  subscribers_gained: number | null;
  revenue: number | null;
  // Task scheduling dates
  planned_creation_date: string | null;
  planned_publish_date: string | null;
  creation_task_id: string | null;
  publish_task_id: string | null;
}

export interface ContentSendLog {
  id: string;
  user_id: string;
  content_item_id: string | null;
  channel: ContentChannel;
  type: ContentType;
  topic: string | null;
  sent_at: string;
  cycle_id: string | null;
  created_at: string;
}

export interface ContentFilters {
  search?: string;
  types?: ContentType[];
  statuses?: ContentStatus[];
  channels?: ContentChannel[];
  tags?: string[];
  cycleId?: string;
  dateFrom?: string;
  dateTo?: string;
}

// TYPES - What format (clear distinction from channels)
export const CONTENT_TYPES: ContentType[] = [
  'Newsletter',
  'Post',
  'Reel/Short',
  'Video',
  'Carousel',
  'Story',
  'Live Session',
  'Podcast Episode',
  'Blog Article',
  'Webinar',
  'Challenge',
  'DM/Message',
  'Ad',
  'Landing Page',
  'Other'
];

export const CONTENT_STATUSES: ContentStatus[] = ['Draft', 'Ready', 'Published'];

// CHANNELS - Where you published (clear distinction from types)
export const CONTENT_CHANNELS: ContentChannel[] = [
  'Email',
  'Instagram',
  'Facebook',
  'YouTube',
  'TikTok',
  'LinkedIn',
  'Twitter/X',
  'Pinterest',
  'Website/Blog',
  'Podcast Platform',
  'Community Platform',
  'DMs',
  'Other'
];

// Helper to map nurture methods from 90-day plan to smart defaults
export function getDefaultsForNurtureMethod(method: string): { channel: ContentChannel; type: ContentType } {
  const mapping: Record<string, { channel: ContentChannel; type: ContentType }> = {
    'email': { channel: 'Email', type: 'Newsletter' },
    'community': { channel: 'Community Platform', type: 'Post' },
    'dm': { channel: 'DMs', type: 'DM/Message' },
    'podcast': { channel: 'Podcast Platform', type: 'Podcast Episode' },
    'webinar': { channel: 'YouTube', type: 'Webinar' },
    'challenge': { channel: 'Email', type: 'Challenge' },
    'live': { channel: 'Instagram', type: 'Live Session' },
    'youtube': { channel: 'YouTube', type: 'Video' },
    'instagram': { channel: 'Instagram', type: 'Post' },
    'facebook': { channel: 'Facebook', type: 'Post' },
    'tiktok': { channel: 'TikTok', type: 'Reel/Short' },
    'linkedin': { channel: 'LinkedIn', type: 'Post' },
    'twitter': { channel: 'Twitter/X', type: 'Post' },
    'blog': { channel: 'Website/Blog', type: 'Blog Article' },
  };
  
  return mapping[method.toLowerCase()] || { channel: 'Email', type: 'Newsletter' };
}

// Get display label for nurture method
export function getNurtureMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    'email': '📧 Email',
    'community': '👥 Community',
    'dm': '💬 DMs',
    'podcast': '🎙️ Podcast',
    'webinar': '🎓 Webinar',
    'challenge': '🎯 Challenge',
    'live': '📺 Live',
    'youtube': '📹 YouTube',
    'instagram': '📸 Instagram',
    'facebook': '👍 Facebook',
    'tiktok': '🎵 TikTok',
    'linkedin': '💼 LinkedIn',
    'twitter': '🐦 Twitter/X',
    'blog': '📝 Blog',
  };
  
  return labels[method.toLowerCase()] || method;
}

// Content Items CRUD
export async function getContentItems(filters?: ContentFilters): Promise<ContentItem[]> {
  let query = supabase
    .from('content_items')
    .select('*')
    .eq('show_in_vault', true)
    .order('updated_at', { ascending: false });

  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,body.ilike.%${filters.search}%,subject_line.ilike.%${filters.search}%,topic.ilike.%${filters.search}%`);
  }

  if (filters?.types?.length) {
    query = query.in('type', filters.types);
  }

  if (filters?.statuses?.length) {
    query = query.in('status', filters.statuses);
  }

  if (filters?.channels?.length) {
    query = query.in('channel', filters.channels);
  }

  if (filters?.cycleId) {
    query = query.eq('cycle_id', filters.cycleId);
  }

  if (filters?.dateFrom) {
    query = query.gte('published_at', filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte('published_at', filters.dateTo);
  }

  const { data, error } = await query;
  if (error) throw error;
  
  let items = (data || []) as ContentItem[];
  
  // Filter by tags client-side (Supabase array contains)
  if (filters?.tags?.length) {
    items = items.filter(item => 
      filters.tags!.some(tag => item.tags.includes(tag))
    );
  }
  
  return items;
}

export async function getContentItem(id: string): Promise<ContentItem | null> {
  const { data, error } = await supabase
    .from('content_items')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as ContentItem;
}

export async function createContentItem(item: Partial<ContentItem>): Promise<ContentItem> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const insertData = {
    title: item.title || '',
    type: item.type || 'Other',
    status: item.status || 'Draft',
    channel: item.channel,
    topic: item.topic,
    tags: item.tags || [],
    body: item.body,
    hook: item.hook,
    cta: item.cta,
    offer: item.offer,
    subject_line: item.subject_line,
    preview_text: item.preview_text,
    link_url: item.link_url,
    notes: item.notes,
    cycle_id: item.cycle_id,
    project_id: item.project_id,
    user_id: user.id,
    planned_creation_date: item.planned_creation_date || null,
    planned_publish_date: item.planned_publish_date || null,
  };

  const { data, error } = await supabase
    .from('content_items')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data as ContentItem;
}

export async function updateContentItem(id: string, updates: Partial<ContentItem>): Promise<ContentItem> {
  const { data, error } = await supabase
    .from('content_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as ContentItem;
}

export async function deleteContentItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('content_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function duplicateContentItem(id: string): Promise<ContentItem> {
  const original = await getContentItem(id);
  if (!original) throw new Error('Content not found');

  const { id: _, created_at, updated_at, published_at, ...rest } = original;
  return createContentItem({
    ...rest,
    title: `${original.title} (Copy)`,
    status: 'Draft',
  });
}

export async function markAsPublished(id: string): Promise<ContentItem> {
  return updateContentItem(id, {
    status: 'Published',
    published_at: new Date().toISOString(),
  });
}

// Send Log CRUD
export async function getSendLogs(options?: { 
  cycleId?: string; 
  from?: string; 
  to?: string;
  limit?: number;
}): Promise<ContentSendLog[]> {
  let query = supabase
    .from('content_send_log')
    .select('*')
    .order('sent_at', { ascending: false });

  if (options?.cycleId) {
    query = query.eq('cycle_id', options.cycleId);
  }

  if (options?.from) {
    query = query.gte('sent_at', options.from);
  }

  if (options?.to) {
    query = query.lte('sent_at', options.to);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as ContentSendLog[];
}

export async function createSendLog(log: Partial<ContentSendLog>): Promise<ContentSendLog> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const insertData = {
    channel: log.channel!,
    type: log.type!,
    topic: log.topic,
    content_item_id: log.content_item_id,
    cycle_id: log.cycle_id,
    user_id: user.id,
  };

  const { data, error } = await supabase
    .from('content_send_log')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data as ContentSendLog;
}

export async function deleteSendLog(id: string): Promise<void> {
  const { error } = await supabase
    .from('content_send_log')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Stats and Streaks
export async function getNurtureStats(cycleId?: string): Promise<{
  thisWeekEmails: number;
  thisWeekTotal: number;
  thisMonthEmails: number;
  thisMonthTotal: number;
  streak: number;
  lastPublished: string | null;
}> {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get logs for stats
  const logs = await getSendLogs({ 
    from: startOfMonth.toISOString(),
    cycleId 
  });

  const thisWeekLogs = logs.filter(l => new Date(l.sent_at) >= startOfWeek);
  const thisWeekEmails = thisWeekLogs.filter(l => l.type === 'Newsletter').length;
  const thisWeekTotal = thisWeekLogs.length;

  const thisMonthEmails = logs.filter(l => l.type === 'Newsletter').length;
  const thisMonthTotal = logs.length;

  // Calculate streak (weeks with at least 1 nurture log)
  const streak = await calculateNurtureStreak();

  // Get last published
  const { data: lastItem } = await supabase
    .from('content_items')
    .select('published_at')
    .eq('status', 'Published')
    .order('published_at', { ascending: false })
    .limit(1)
    .single();

  return {
    thisWeekEmails,
    thisWeekTotal,
    thisMonthEmails,
    thisMonthTotal,
    streak,
    lastPublished: lastItem?.published_at || null,
  };
}

async function calculateNurtureStreak(): Promise<number> {
  const now = new Date();
  let streak = 0;
  let currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() - now.getDay());
  currentWeekStart.setHours(0, 0, 0, 0);

  // Check up to 52 weeks back
  for (let i = 0; i < 52; i++) {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const { count } = await supabase
      .from('content_send_log')
      .select('*', { count: 'exact', head: true })
      .gte('sent_at', currentWeekStart.toISOString())
      .lt('sent_at', weekEnd.toISOString());

    if (count && count > 0) {
      streak++;
      currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    } else {
      break;
    }
  }

  return streak;
}

export async function getTodayLogs(): Promise<ContentSendLog[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return getSendLogs({ from: today.toISOString() });
}

export async function getAllTags(): Promise<string[]> {
  const { data, error } = await supabase
    .from('content_items')
    .select('tags');

  if (error) throw error;

  const allTags = new Set<string>();
  (data || []).forEach(item => {
    (item.tags || []).forEach((tag: string) => allTags.add(tag));
  });

  return Array.from(allTags).sort();
}
