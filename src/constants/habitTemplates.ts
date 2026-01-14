// Business-focused habit templates
export interface HabitTemplate {
  name: string;
  category: string;
  type: 'daily' | 'weekly';
  description: string;
  successDefinition: string;
}

export const BUSINESS_HABIT_TEMPLATES: HabitTemplate[] = [
  {
    name: 'Weekly Email/Newsletter',
    category: 'Marketing',
    type: 'weekly',
    description: 'Send at least one email or newsletter to your list each week',
    successDefinition: '1x per week - email sent to list'
  },
  {
    name: 'Instagram Posts',
    category: 'Marketing',
    type: 'weekly',
    description: 'Post on Instagram regularly to stay visible and engaged with your audience',
    successDefinition: '3x per week - posts published'
  },
  {
    name: 'Sales/Discovery Calls',
    category: 'Sales',
    type: 'daily',
    description: 'Have at least one sales or discovery call each day',
    successDefinition: 'At least 1 call completed'
  },
  {
    name: 'Client Deliverables',
    category: 'Delivery',
    type: 'daily',
    description: 'Complete at least one client deliverable or work session each day',
    successDefinition: 'At least 1 client task completed'
  },
  {
    name: 'Content Creation',
    category: 'Marketing',
    type: 'daily',
    description: 'Create or batch content for your audience (posts, reels, podcasts, etc.)',
    successDefinition: 'At least 30 min dedicated to content'
  },
  {
    name: 'DM Outreach',
    category: 'Sales',
    type: 'daily',
    description: 'Send DMs to potential leads or nurture existing connections',
    successDefinition: 'At least 5 meaningful DMs sent'
  },
  {
    name: 'Lead Follow-up',
    category: 'Sales',
    type: 'daily',
    description: 'Follow up with leads who have expressed interest',
    successDefinition: 'All pending leads contacted'
  },
  {
    name: 'Morning Routine',
    category: 'Mindset',
    type: 'daily',
    description: 'Complete your morning mindset routine (meditation, journaling, etc.)',
    successDefinition: 'Routine completed before work begins'
  }
];
