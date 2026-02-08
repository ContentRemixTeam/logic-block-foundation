import { CopyControls } from './copyControls';

export type ContentCategory = 'email' | 'social' | 'ad' | 'sales' | 'other';

export interface ContentTypeDefinition {
  id: string;
  category: ContentCategory;
  name: string;
  icon: string;
  description: string;
  defaultControls: CopyControls;
  guidance: string;
}

// Universal content type library - 12 essential types
export const CONTENT_TYPES: Record<string, ContentTypeDefinition> = {
  welcome_email_1: {
    id: 'welcome_email_1',
    category: 'email',
    name: 'Welcome Email #1',
    icon: '📧',
    description: 'Deliver value + build trust (no selling)',
    defaultControls: {
      length: 'short',
      emotion: 'moderate',
      urgency: 'none',
      tone: 'balanced'
    },
    guidance: `This is Email 1 in a welcome sequence.

CRITICAL REQUIREMENTS:
- Include ONE tactical tip with numbered steps
- Specific timeframe (today, this week)
- Expected outcome stated
- NO selling or pitching
- Soft CTA (reply, try this)

Length: 250-400 words`
  },
  
  welcome_email_2: {
    id: 'welcome_email_2',
    category: 'email',
    name: 'Welcome Email #2',
    icon: '📧',
    description: 'Origin story + position as guide',
    defaultControls: {
      length: 'medium',
      emotion: 'high',
      urgency: 'none',
      tone: 'balanced'
    },
    guidance: `This is Email 2 in a welcome sequence.

PURPOSE: Build emotional connection through story.

REQUIREMENTS:
- Share YOUR struggle (specific moment)
- Turning point with details
- Mirror reader's current situation
- NO selling

Length: 350-500 words`
  },
  
  welcome_email_3: {
    id: 'welcome_email_3',
    category: 'email',
    name: 'Welcome Email #3',
    icon: '📧',
    description: 'Teaching content + value',
    defaultControls: {
      length: 'medium',
      emotion: 'moderate',
      urgency: 'none',
      tone: 'balanced'
    },
    guidance: `This is Email 3 in a welcome sequence.

PURPOSE: Deliver teaching content that positions you as expert.

REQUIREMENTS:
- One clear teaching point
- Actionable framework or method
- Real examples with specifics
- Light mention of what you offer (if relevant)

Length: 400-550 words`
  },
  
  welcome_email_4: {
    id: 'welcome_email_4',
    category: 'email',
    name: 'Welcome Email #4',
    icon: '📧',
    description: 'Social proof + soft intro to offer',
    defaultControls: {
      length: 'medium',
      emotion: 'moderate',
      urgency: 'soft',
      tone: 'balanced'
    },
    guidance: `This is Email 4 in a welcome sequence.

PURPOSE: Build credibility through social proof and hint at solution.

REQUIREMENTS:
- Share client/customer wins (specifics!)
- Show transformation
- Soft intro to your offer
- NO hard sell yet

Length: 400-500 words`
  },
  
  welcome_email_5: {
    id: 'welcome_email_5',
    category: 'email',
    name: 'Welcome Email #5',
    icon: '📧',
    description: 'Make the offer + invite next step',
    defaultControls: {
      length: 'long',
      emotion: 'moderate',
      urgency: 'soft',
      tone: 'balanced'
    },
    guidance: `This is Email 5 in a welcome sequence.

PURPOSE: Make your offer with clear next step.

REQUIREMENTS:
- Clear offer presentation
- Benefits over features
- Overcome 2-3 objections
- Strong but not pushy CTA
- Deadline or reason to act (if authentic)

Length: 500-700 words`
  },
  
  email_newsletter: {
    id: 'email_newsletter',
    category: 'email',
    name: 'Email Newsletter',
    icon: '📨',
    description: 'Weekly value email',
    defaultControls: {
      length: 'medium',
      emotion: 'moderate',
      urgency: 'none',
      tone: 'balanced'
    },
    guidance: `Weekly newsletter email.

REQUIREMENTS:
- One main topic/teaching
- Actionable takeaway
- Personal touch
- Soft CTA (reply/engage)
- 300-500 words
- NO hard selling`
  },
  
  promo_email: {
    id: 'promo_email',
    category: 'email',
    name: 'Promo Email',
    icon: '📧',
    description: 'Promotional/launch email',
    defaultControls: {
      length: 'medium',
      emotion: 'moderate',
      urgency: 'soft',
      tone: 'balanced'
    },
    guidance: `Promotional or launch email.

REQUIREMENTS:
- Clear offer
- Deadline (if real)
- Benefits focus
- Strong CTA
- 400-600 words`
  },
  
  instagram_post: {
    id: 'instagram_post',
    category: 'social',
    name: 'Instagram Post',
    icon: '📸',
    description: 'Stop-the-scroll caption',
    defaultControls: {
      length: 'short',
      emotion: 'high',
      urgency: 'none',
      tone: 'casual'
    },
    guidance: `Instagram post caption.

REQUIREMENTS:
- Hook in first 3 words
- Line breaks for readability (2-3 lines max per paragraph)
- One clear point
- Engagement question at end
- 100-300 words max`
  },
  
  linkedin_post: {
    id: 'linkedin_post',
    category: 'social',
    name: 'LinkedIn Post',
    icon: '💼',
    description: 'Professional thought leadership',
    defaultControls: {
      length: 'medium',
      emotion: 'moderate',
      urgency: 'none',
      tone: 'balanced'
    },
    guidance: `LinkedIn post.

REQUIREMENTS:
- Professional but authentic
- Clear insight/takeaway
- Specific examples or data
- Engagement question
- 150-400 words`
  },
  
  twitter_thread: {
    id: 'twitter_thread',
    category: 'social',
    name: 'Twitter/X Thread',
    icon: '🐦',
    description: 'Multi-tweet thread',
    defaultControls: {
      length: 'medium',
      emotion: 'moderate',
      urgency: 'none',
      tone: 'casual'
    },
    guidance: `Twitter/X thread.

REQUIREMENTS:
- Hook tweet (quotable)
- 5-10 tweets total
- Numbered (1/10, 2/10...)
- One clear teaching
- Strong CTA at end
- Each tweet standalone readable
- Max 280 chars per tweet`
  },
  
  facebook_ad: {
    id: 'facebook_ad',
    category: 'ad',
    name: 'Facebook Ad',
    icon: '📱',
    description: 'Scroll-stopping ad copy',
    defaultControls: {
      length: 'short',
      emotion: 'high',
      urgency: 'soft',
      tone: 'casual'
    },
    guidance: `Facebook/Instagram ad copy.

REQUIREMENTS:
- Hook in first 3 words
- Clear benefit/outcome
- Single CTA
- Under 150 words
- NO hype words ("amazing", "incredible")`
  },
  
  sales_page_headline: {
    id: 'sales_page_headline',
    category: 'sales',
    name: 'Sales Page Headline',
    icon: '💰',
    description: 'Attention-grabbing headline',
    defaultControls: {
      length: 'short',
      emotion: 'high',
      urgency: 'soft',
      tone: 'balanced'
    },
    guidance: `Sales page headline.

REQUIREMENTS:
- Clear outcome/benefit
- Specific (numbers if possible)
- Under 15 words
- Believable promise

PATTERNS:
- [Outcome] in [Timeframe] without [Pain]
- How to [Desire] Even If [Objection]`
  },
  
  sales_page_body: {
    id: 'sales_page_body',
    category: 'sales',
    name: 'Sales Page Body',
    icon: '💰',
    description: 'Long-form sales copy',
    defaultControls: {
      length: 'long',
      emotion: 'high',
      urgency: 'strong',
      tone: 'professional'
    },
    guidance: `Long-form sales page body.

REQUIREMENTS:
- Hook + Problem Agitation
- Story + Solution
- Benefits (not features)
- Social proof
- Handle objections
- Clear offer + CTA
- 1000-2000 words`
  },
  
  blog_post: {
    id: 'blog_post',
    category: 'other',
    name: 'Blog Post',
    icon: '📝',
    description: 'Educational blog content',
    defaultControls: {
      length: 'long',
      emotion: 'moderate',
      urgency: 'none',
      tone: 'balanced'
    },
    guidance: `Blog post content.

REQUIREMENTS:
- Clear structure with sections
- Actionable takeaways
- Examples throughout
- 800-2000 words
- CTA at end`
  },
  
  video_script: {
    id: 'video_script',
    category: 'other',
    name: 'Video Script',
    icon: '🎥',
    description: 'Engaging video script',
    defaultControls: {
      length: 'medium',
      emotion: 'high',
      urgency: 'none',
      tone: 'casual'
    },
    guidance: `Video script.

REQUIREMENTS:
- Hook in first 3 seconds
- Pattern interrupts every 30s
- Conversational (write how you speak)
- Visual cues noted: [B-roll], [Show screen]
- Strong CTA
- 300-800 words (2-5 min)`
  },
  
  social_post: {
    id: 'social_post',
    category: 'social',
    name: 'Social Media Post',
    icon: '📱',
    description: 'General social content',
    defaultControls: {
      length: 'short',
      emotion: 'high',
      urgency: 'none',
      tone: 'casual'
    },
    guidance: `General social media post.

REQUIREMENTS:
- Hook immediately
- One clear point
- Engagement element (question, CTA)
- 100-250 words`
  }
};

export function getContentType(id: string): ContentTypeDefinition | null {
  return CONTENT_TYPES[id] || null;
}

export function getContentTypesByCategory(category: ContentCategory): ContentTypeDefinition[] {
  return Object.values(CONTENT_TYPES).filter(ct => ct.category === category);
}

export const CATEGORY_LABELS: Record<ContentCategory, string> = {
  email: '📧 Email Marketing',
  social: '📱 Social Media',
  ad: '💰 Ad Copy',
  sales: '🎯 Sales Pages',
  other: '📝 Other Content'
};
