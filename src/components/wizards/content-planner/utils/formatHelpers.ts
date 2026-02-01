import { ContentFormat, FormatMetadata } from '@/types/contentPlanner';

// Comprehensive format metadata
export const FORMAT_METADATA: FormatMetadata[] = [
  // Email & Text
  {
    id: 'email-sequence',
    label: 'Email Sequence',
    description: 'Multi-email nurturing or sales sequence',
    icon: 'Mail',
    category: 'email',
    estimatedMinutes: 180,
    repurposeFromFormats: ['blog-post', 'webinar', 'podcast-episode'],
  },
  {
    id: 'email-single',
    label: 'Single Email',
    description: 'One-off promotional or value email',
    icon: 'Mail',
    category: 'email',
    estimatedMinutes: 30,
    repurposeFromFormats: ['linkedin-post', 'blog-post'],
  },
  {
    id: 'blog-post',
    label: 'Blog Post',
    description: 'Long-form article for SEO and authority',
    icon: 'FileText',
    category: 'email',
    estimatedMinutes: 240,
  },
  {
    id: 'linkedin-post',
    label: 'LinkedIn Post',
    description: 'Professional network content',
    icon: 'Linkedin',
    category: 'social',
    estimatedMinutes: 20,
    repurposeFromFormats: ['blog-post', 'email-single', 'podcast-episode'],
  },
  {
    id: 'twitter-thread',
    label: 'Twitter Thread',
    description: 'Multi-tweet story or lesson',
    icon: 'Twitter',
    category: 'social',
    estimatedMinutes: 30,
    repurposeFromFormats: ['blog-post', 'linkedin-post'],
  },
  {
    id: 'newsletter',
    label: 'Newsletter',
    description: 'Regular subscriber update',
    icon: 'Newspaper',
    category: 'email',
    estimatedMinutes: 60,
  },
  
  // Video
  {
    id: 'youtube-video',
    label: 'YouTube Video',
    description: 'Long-form video content',
    icon: 'Youtube',
    category: 'video',
    estimatedMinutes: 480,
    repurposeFromFormats: ['blog-post', 'webinar', 'podcast-episode'],
  },
  {
    id: 'youtube-short',
    label: 'YouTube Short',
    description: 'Vertical short-form video',
    icon: 'Youtube',
    category: 'video',
    estimatedMinutes: 60,
    repurposeFromFormats: ['youtube-video', 'instagram-reel', 'tiktok'],
  },
  {
    id: 'instagram-reel',
    label: 'Instagram Reel',
    description: 'Short vertical video',
    icon: 'Instagram',
    category: 'video',
    estimatedMinutes: 45,
    repurposeFromFormats: ['youtube-video', 'testimonial-video'],
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    description: 'Short-form viral content',
    icon: 'Video',
    category: 'video',
    estimatedMinutes: 45,
    repurposeFromFormats: ['instagram-reel', 'youtube-short'],
  },
  {
    id: 'live-stream',
    label: 'Live Stream',
    description: 'Real-time video broadcast',
    icon: 'Radio',
    category: 'video',
    estimatedMinutes: 120,
  },
  {
    id: 'sales-video',
    label: 'Sales Video (VSL)',
    description: 'Video sales letter for landing pages',
    icon: 'Video',
    category: 'video',
    estimatedMinutes: 360,
  },
  {
    id: 'testimonial-video',
    label: 'Testimonial Video',
    description: 'Customer success story',
    icon: 'UserCheck',
    category: 'video',
    estimatedMinutes: 120,
  },
  {
    id: 'tutorial-video',
    label: 'Tutorial Video',
    description: 'How-to educational content',
    icon: 'PlayCircle',
    category: 'video',
    estimatedMinutes: 180,
  },
  
  // Audio
  {
    id: 'podcast-episode',
    label: 'Podcast Episode',
    description: 'Audio content for your show',
    icon: 'Podcast',
    category: 'audio',
    estimatedMinutes: 180,
    repurposeFromFormats: ['blog-post', 'webinar'],
  },
  {
    id: 'podcast-guest',
    label: 'Podcast Guest',
    description: 'Appear on someone else\'s show',
    icon: 'Mic',
    category: 'audio',
    estimatedMinutes: 90,
  },
  {
    id: 'audio-course',
    label: 'Audio Course',
    description: 'Educational audio series',
    icon: 'Headphones',
    category: 'audio',
    estimatedMinutes: 480,
  },
  
  // Events
  {
    id: 'webinar',
    label: 'Webinar',
    description: 'Live online presentation',
    icon: 'Presentation',
    category: 'events',
    estimatedMinutes: 240,
  },
  {
    id: 'workshop',
    label: 'Workshop',
    description: 'Interactive training session',
    icon: 'Users',
    category: 'events',
    estimatedMinutes: 360,
  },
  {
    id: 'challenge',
    label: 'Challenge',
    description: 'Multi-day engagement event',
    icon: 'Trophy',
    category: 'events',
    estimatedMinutes: 480,
  },
  {
    id: 'masterclass',
    label: 'Masterclass',
    description: 'Premium teaching session',
    icon: 'GraduationCap',
    category: 'events',
    estimatedMinutes: 300,
  },
  {
    id: 'group-call',
    label: 'Group Call',
    description: 'Live Q&A or coaching session',
    icon: 'Video',
    category: 'events',
    estimatedMinutes: 60,
  },
  
  // Documents
  {
    id: 'case-study',
    label: 'Case Study',
    description: 'Detailed client success story',
    icon: 'FileBarChart',
    category: 'documents',
    estimatedMinutes: 180,
  },
  {
    id: 'pdf-guide',
    label: 'PDF Guide',
    description: 'Downloadable resource',
    icon: 'FileDown',
    category: 'documents',
    estimatedMinutes: 240,
    repurposeFromFormats: ['blog-post', 'webinar'],
  },
  {
    id: 'workbook',
    label: 'Workbook',
    description: 'Interactive exercise document',
    icon: 'BookOpen',
    category: 'documents',
    estimatedMinutes: 180,
  },
  {
    id: 'checklist',
    label: 'Checklist',
    description: 'Quick reference guide',
    icon: 'CheckSquare',
    category: 'documents',
    estimatedMinutes: 60,
    repurposeFromFormats: ['blog-post', 'webinar'],
  },
  
  // Visual
  {
    id: 'infographic',
    label: 'Infographic',
    description: 'Visual data representation',
    icon: 'BarChart',
    category: 'visual',
    estimatedMinutes: 120,
    repurposeFromFormats: ['blog-post', 'case-study'],
  },
  {
    id: 'carousel',
    label: 'Carousel',
    description: 'Multi-slide social post',
    icon: 'Images',
    category: 'visual',
    estimatedMinutes: 60,
    repurposeFromFormats: ['blog-post', 'linkedin-post'],
  },
  {
    id: 'quote-graphic',
    label: 'Quote Graphic',
    description: 'Shareable quote image',
    icon: 'Quote',
    category: 'visual',
    estimatedMinutes: 15,
  },
  
  // Social
  {
    id: 'instagram-post',
    label: 'Instagram Post',
    description: 'Static image post',
    icon: 'Instagram',
    category: 'social',
    estimatedMinutes: 30,
  },
  {
    id: 'facebook-post',
    label: 'Facebook Post',
    description: 'Facebook page content',
    icon: 'Facebook',
    category: 'social',
    estimatedMinutes: 20,
  },
  {
    id: 'community-post',
    label: 'Community Post',
    description: 'Group or community content',
    icon: 'Users',
    category: 'social',
    estimatedMinutes: 15,
  },
];

// Get metadata for a format
export function getFormatMetadata(format: ContentFormat): FormatMetadata | undefined {
  return FORMAT_METADATA.find(f => f.id === format);
}

// Get formats by category
export function getFormatsByCategory(category: FormatMetadata['category']): FormatMetadata[] {
  return FORMAT_METADATA.filter(f => f.category === category);
}

// Get all categories
export function getCategories(): FormatMetadata['category'][] {
  return ['email', 'video', 'audio', 'events', 'documents', 'visual', 'social'];
}

// Get category label
export function getCategoryLabel(category: FormatMetadata['category']): string {
  const labels: Record<FormatMetadata['category'], string> = {
    email: 'Email & Text',
    video: 'Video',
    audio: 'Audio',
    events: 'Events',
    documents: 'Documents',
    visual: 'Visual',
    social: 'Social Media',
  };
  return labels[category];
}

// Get category icon
export function getCategoryIcon(category: FormatMetadata['category']): string {
  const icons: Record<FormatMetadata['category'], string> = {
    email: 'Mail',
    video: 'Video',
    audio: 'Mic',
    events: 'Calendar',
    documents: 'FileText',
    visual: 'Image',
    social: 'Share2',
  };
  return icons[category];
}

// Calculate total estimated time for selected formats
export function calculateTotalTime(formats: ContentFormat[]): number {
  return formats.reduce((total, format) => {
    const metadata = getFormatMetadata(format);
    return total + (metadata?.estimatedMinutes || 0);
  }, 0);
}

// Format minutes as human readable
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// Get suggested repurpose formats for a source format
export function getSuggestedRepurposeFormats(sourceFormat: ContentFormat): ContentFormat[] {
  return FORMAT_METADATA
    .filter(f => f.repurposeFromFormats?.includes(sourceFormat))
    .map(f => f.id);
}
