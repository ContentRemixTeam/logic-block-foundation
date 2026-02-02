// Editorial Calendar Constants
// Schedule lane colors, platform defaults, and type mappings

// Schedule Lane Colors (Create vs Publish)
export const SCHEDULE_COLORS = {
  create: {
    bg: 'bg-teal-500/10',
    border: 'border-teal-500',
    text: 'text-teal-600',
    dot: 'bg-teal-500',
  },
  publish: {
    bg: 'bg-violet-500/10',
    border: 'border-violet-500',
    text: 'text-violet-600',
    dot: 'bg-violet-500',
  },
} as const;

// Default Platform Colors (hex values for styling)
export const DEFAULT_PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E4405F',
  linkedin: '#0A66C2',
  youtube: '#FF0000',
  tiktok: '#000000',
  facebook: '#1877F2',
  email: '#EA580C',
  blog: '#10B981',
  podcast: '#8B5CF6',
  twitter: '#1DA1F2',
  newsletter: '#F59E0B',
};

// Platform display names
export const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  email: 'Email',
  blog: 'Blog',
  podcast: 'Podcast',
  twitter: 'Twitter/X',
  newsletter: 'Newsletter',
};

// Platform short labels for badges
export const PLATFORM_SHORT_LABELS: Record<string, string> = {
  instagram: 'IG',
  linkedin: 'LI',
  youtube: 'YT',
  tiktok: 'TT',
  facebook: 'FB',
  email: 'Email',
  blog: 'Blog',
  podcast: 'Pod',
  twitter: 'X',
  newsletter: 'NL',
};

// Content type to Lucide icon mapping
export const CONTENT_TYPE_ICONS: Record<string, string> = {
  'email-sequence': 'Mail',
  'email-single': 'Mail',
  'blog-post': 'FileText',
  'linkedin-post': 'Linkedin',
  'twitter-thread': 'Twitter',
  'newsletter': 'Newspaper',
  'youtube-video': 'Youtube',
  'youtube-short': 'Youtube',
  'instagram-reel': 'Instagram',
  'tiktok': 'Video',
  'live-stream': 'Radio',
  'sales-video': 'Video',
  'testimonial-video': 'UserCheck',
  'tutorial-video': 'PlayCircle',
  'podcast-episode': 'Podcast',
  'podcast-guest': 'Mic',
  'audio-course': 'Headphones',
  'webinar': 'Presentation',
  'workshop': 'Users',
  'challenge': 'Trophy',
  'masterclass': 'GraduationCap',
  'group-call': 'Video',
  'case-study': 'FileBarChart',
  'pdf-guide': 'FileDown',
  'workbook': 'BookOpen',
  'checklist': 'CheckSquare',
  'infographic': 'BarChart',
  'carousel': 'Images',
  'quote-graphic': 'Quote',
  'instagram-post': 'Instagram',
  'facebook-post': 'Facebook',
  'community-post': 'Users',
};

// Default content type icon
export const DEFAULT_CONTENT_ICON = 'FileText';

// Get platform color (with fallback)
export function getPlatformColor(platform: string | null | undefined): string {
  if (!platform) return '#6B7280'; // gray fallback
  const normalized = platform.toLowerCase().replace(/\s+/g, '');
  return DEFAULT_PLATFORM_COLORS[normalized] || '#6B7280';
}

// Get platform label
export function getPlatformLabel(platform: string | null | undefined): string {
  if (!platform) return 'Unknown';
  const normalized = platform.toLowerCase().replace(/\s+/g, '');
  return PLATFORM_LABELS[normalized] || platform;
}

// Get platform short label
export function getPlatformShortLabel(platform: string | null | undefined): string {
  if (!platform) return '?';
  const normalized = platform.toLowerCase().replace(/\s+/g, '');
  return PLATFORM_SHORT_LABELS[normalized] || platform.slice(0, 2).toUpperCase();
}

// Get content type icon name
export function getContentTypeIcon(type: string | null | undefined): string {
  if (!type) return DEFAULT_CONTENT_ICON;
  return CONTENT_TYPE_ICONS[type] || DEFAULT_CONTENT_ICON;
}

// List of available platforms for selection
export const AVAILABLE_PLATFORMS = Object.keys(DEFAULT_PLATFORM_COLORS);

// Calendar item type (unified type for items from different sources)
export interface CalendarItem {
  id: string;
  title: string;
  type: string | null;
  channel: string | null;
  creationDate: string | null;
  publishDate: string | null;
  source: 'content_item' | 'content_plan_item' | 'task';
  status?: string;
  sourceId: string; // Original ID from source table
}

// Week day labels
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const WEEKDAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
