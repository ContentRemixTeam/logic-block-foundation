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
  pinterest: '#E60023',
  threads: '#000000',
  substack: '#FF6719',
  patreon: '#F96854',
  discord: '#5865F2',
  whatsapp: '#25D366',
  clubhouse: '#F6E05E',
  teachable: '#FF7849',
  twitch: '#9146FF',
  slack: '#4A154B',
  medium: '#000000',
  spotify: '#1DB954',
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
  pinterest: 'Pinterest',
  threads: 'Threads',
  substack: 'Substack',
  patreon: 'Patreon',
  discord: 'Discord',
  whatsapp: 'WhatsApp',
  clubhouse: 'Clubhouse',
  teachable: 'Teachable/Courses',
  twitch: 'Twitch',
  slack: 'Slack Community',
  medium: 'Medium',
  spotify: 'Spotify',
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
  pinterest: 'Pin',
  threads: 'Thr',
  substack: 'Sub',
  patreon: 'Pat',
  discord: 'Disc',
  whatsapp: 'WA',
  clubhouse: 'Club',
  teachable: 'Teach',
  twitch: 'Twi',
  slack: 'Slack',
  medium: 'Med',
  spotify: 'Spot',
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

// Label-to-ID mapping for content types (handles display labels -> icon keys)
const TYPE_LABEL_TO_ID: Record<string, string> = {
  'newsletter': 'newsletter',
  'post': 'instagram-post',
  'reel': 'instagram-reel',
  'reel/short': 'instagram-reel',
  'short': 'youtube-short',
  'video': 'youtube-video',
  'linkedin post': 'linkedin-post',
  'blog post': 'blog-post',
  'blog': 'blog-post',
  'email': 'email-single',
  'email sequence': 'email-sequence',
  'twitter thread': 'twitter-thread',
  'thread': 'twitter-thread',
  'youtube video': 'youtube-video',
  'youtube short': 'youtube-short',
  'instagram reel': 'instagram-reel',
  'instagram post': 'instagram-post',
  'tiktok': 'tiktok',
  'live stream': 'live-stream',
  'livestream': 'live-stream',
  'live': 'live-stream',
  'sales video': 'sales-video',
  'testimonial': 'testimonial-video',
  'testimonial video': 'testimonial-video',
  'tutorial': 'tutorial-video',
  'tutorial video': 'tutorial-video',
  'podcast': 'podcast-episode',
  'podcast episode': 'podcast-episode',
  'podcast guest': 'podcast-guest',
  'audio course': 'audio-course',
  'audio': 'audio-course',
  'webinar': 'webinar',
  'workshop': 'workshop',
  'challenge': 'challenge',
  'masterclass': 'masterclass',
  'group call': 'group-call',
  'case study': 'case-study',
  'pdf': 'pdf-guide',
  'pdf guide': 'pdf-guide',
  'guide': 'pdf-guide',
  'workbook': 'workbook',
  'checklist': 'checklist',
  'infographic': 'infographic',
  'carousel': 'carousel',
  'quote': 'quote-graphic',
  'quote graphic': 'quote-graphic',
  'facebook post': 'facebook-post',
  'community post': 'community-post',
};

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

// Get content type icon name with normalization
export function getContentTypeIcon(type: string | null | undefined): string {
  if (!type) return DEFAULT_CONTENT_ICON;
  
  // Try direct match first (e.g., already using kebab-case keys)
  if (CONTENT_TYPE_ICONS[type]) return CONTENT_TYPE_ICONS[type];
  
  // Normalize: lowercase, trim
  const normalized = type.toLowerCase().trim();
  
  // Try normalized direct match
  if (CONTENT_TYPE_ICONS[normalized]) return CONTENT_TYPE_ICONS[normalized];
  
  // Try label-to-ID mapping (e.g., "Reel/Short" -> "instagram-reel")
  const mappedId = TYPE_LABEL_TO_ID[normalized];
  if (mappedId && CONTENT_TYPE_ICONS[mappedId]) return CONTENT_TYPE_ICONS[mappedId];
  
  return DEFAULT_CONTENT_ICON;
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
