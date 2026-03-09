// Platform Scorecard Data — 15 platforms with strategic profiles

export interface PlatformProfile {
  id: string;
  name: string;
  emoji: string;
  idealFor: string;
  bestWhen: string;
  strengths: string[];
  contentType: string;
}

export const PLATFORMS: PlatformProfile[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    emoji: '📸',
    idealFor: 'Visual brands, lifestyle, coaching',
    bestWhen: 'You love creating reels and carousels',
    strengths: ['Visual storytelling', 'Reels virality', 'DM selling'],
    contentType: 'Short-form visual',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    emoji: '💼',
    idealFor: 'B2B, consulting, professional services',
    bestWhen: 'Your clients are professionals or business owners',
    strengths: ['Organic reach', 'Thought leadership', 'Long-form text posts'],
    contentType: 'Text & articles',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    emoji: '🎵',
    idealFor: 'Mass awareness, trending topics',
    bestWhen: 'You can create quick, personality-driven videos',
    strengths: ['Explosive reach', 'Algorithm-driven discovery', 'Gen Z / Millennial audience'],
    contentType: 'Short-form video',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    emoji: '📺',
    idealFor: 'Evergreen authority, tutorials, education',
    bestWhen: 'You can teach or share deep expertise on camera',
    strengths: ['Search-driven traffic', 'Evergreen content', 'Deep trust building'],
    contentType: 'Long-form video',
  },
  {
    id: 'podcast',
    name: 'Podcast',
    emoji: '🎙️',
    idealFor: 'Deep connection, storytelling, expert positioning',
    bestWhen: 'You love talking and have stories to share',
    strengths: ['Intimate connection', 'Passive listening', 'Guest networking'],
    contentType: 'Long-form audio',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    emoji: '👥',
    idealFor: 'Community building, groups, paid ads',
    bestWhen: 'You want to build a community or run ads',
    strengths: ['Groups for community', 'Mature ad platform', 'Event promotion'],
    contentType: 'Mixed media',
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    emoji: '𝕏',
    idealFor: 'Quick takes, networking, tech/business niche',
    bestWhen: 'You think in punchy one-liners and hot takes',
    strengths: ['Fast networking', 'Thread virality', 'Real-time engagement'],
    contentType: 'Short-form text',
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    emoji: '📌',
    idealFor: 'Evergreen traffic, visual products, DIY',
    bestWhen: 'Your content solves problems people search for',
    strengths: ['Search engine traffic', 'Evergreen pins', 'Low maintenance'],
    contentType: 'Visual pins',
  },
  {
    id: 'blog',
    name: 'Blog / SEO',
    emoji: '✍️',
    idealFor: 'Evergreen search traffic, authority',
    bestWhen: 'You enjoy writing and want passive traffic',
    strengths: ['Google search traffic', 'Evergreen authority', 'Repurposable content'],
    contentType: 'Long-form written',
  },
  {
    id: 'email-list',
    name: 'Email (Cold Outreach)',
    emoji: '📧',
    idealFor: 'B2B lead gen, freelancers, agencies',
    bestWhen: 'You have a specific target audience to reach directly',
    strengths: ['Direct access', 'High conversion', 'Personalized'],
    contentType: 'Personalized emails',
  },
  {
    id: 'networking',
    name: 'In-Person Networking',
    emoji: '🤝',
    idealFor: 'Local businesses, high-touch services',
    bestWhen: 'You thrive face-to-face and your market is local',
    strengths: ['High trust', 'Immediate relationships', 'Referral-driven'],
    contentType: 'In-person',
  },
  {
    id: 'speaking',
    name: 'Speaking / Summits',
    emoji: '🎤',
    idealFor: 'Authority building, lead gen at scale',
    bestWhen: 'You love presenting and want borrowed audiences',
    strengths: ['Borrowed audience', 'Authority positioning', 'List building'],
    contentType: 'Live presentations',
  },
  {
    id: 'collabs',
    name: 'Collaborations / JVs',
    emoji: '🤝',
    idealFor: 'Fast list growth, cross-promotion',
    bestWhen: 'You have peers with complementary audiences',
    strengths: ['Borrowed audience', 'Trust transfer', 'Win-win growth'],
    contentType: 'Partnership',
  },
  {
    id: 'paid-ads',
    name: 'Paid Ads',
    emoji: '💰',
    idealFor: 'Scale fast with budget, proven offers',
    bestWhen: 'You have a proven offer and want to scale',
    strengths: ['Immediate traffic', 'Scalable', 'Targeted audience'],
    contentType: 'Ad creatives',
  },
  {
    id: 'threads',
    name: 'Threads',
    emoji: '🧵',
    idealFor: 'Text-first creators, Instagram crossover',
    bestWhen: 'You already have an Instagram following',
    strengths: ['Text-first format', 'Instagram integration', 'Growing platform'],
    contentType: 'Short-form text',
  },
];
