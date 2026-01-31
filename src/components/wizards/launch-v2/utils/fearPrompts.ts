// CTFAR Auto-Generation for Launch Fears
// Creates pre-populated thought work entries based on selected fears

import { BiggestFear, FEAR_THOUGHT_MAP, FEAR_FEELING_MAP } from '@/types/launchV2';

export interface CTFARPrompt {
  circumstance: string;
  thought: string;
  feeling: string;
  action: string;
  result: string;
  tags: string[];
}

/**
 * Generates CTFAR prompts for selected launch fears
 * Limits to 3 most impactful fears to avoid overwhelm
 */
export function generateFearCTFARPrompts(
  launchName: string,
  selectedFears: BiggestFear[],
  maxPrompts: number = 3
): CTFARPrompt[] {
  // Filter out "no-fear" and prioritize the most impactful fears
  const relevantFears = selectedFears
    .filter(fear => fear !== 'no-fear')
    .slice(0, maxPrompts);

  if (relevantFears.length === 0) {
    return [];
  }

  return relevantFears.map(fear => ({
    circumstance: `I'm launching ${launchName}`,
    thought: FEAR_THOUGHT_MAP[fear],
    feeling: FEAR_FEELING_MAP[fear],
    action: '', // User fills in
    result: '', // User fills in
    tags: ['launch', 'auto-generated', launchName.toLowerCase().replace(/\s+/g, '-')],
  }));
}

/**
 * Pre-written reframes for each fear type
 * These can be shown as suggestions during the wizard
 */
export const FEAR_REFRAME_MAP: Record<BiggestFear, string> = {
  'zero-sales': "Even if nobody buys, I'll have practiced launching. Next time I'll know what to adjust. This is how I learn.",
  'waste-time': "No effort is wasted if I'm learning. Every launch teaches me something valuable about my audience and offer.",
  'judgment': "People who judge aren't my people. The ones who need this will see its value. I'm serving, not performing.",
  'not-ready': "I don't have to be ready. I just have to start. The launch will teach me what I still need to learn.",
  'too-much-demand': "This is a good problem to have. I can always close doors, add waitlists, or raise prices if demand exceeds capacity.",
  'audience-small': "I don't need a big audience - I need the right people. Even 100 true fans is enough to build on.",
  'too-salesy': "Selling is serving. If I believe in my offer, sharing it is helping people. Not sharing would be selfish.",
  'no-fear': "I'm ready to embrace whatever happens. Success or lesson, I'm moving forward.",
};

/**
 * Gets a motivational affirmation based on selected fears
 */
export function getAffirmationForFear(fear: BiggestFear): string {
  const affirmations: Record<BiggestFear, string> = {
    'zero-sales': "I am worthy of sales, and my offer helps people. Each offer I make is practice in serving.",
    'waste-time': "My time invested in launching is never wasted. I'm building skills with every action.",
    'judgment': "I release the need for approval. My work speaks to those who need it.",
    'not-ready': "I am as ready as I need to be right now. Readiness grows through action.",
    'too-much-demand': "I welcome success and trust myself to handle growth gracefully.",
    'audience-small': "Quality over quantity. My small audience is mighty and engaged.",
    'too-salesy': "Selling is service. I share my offer with confidence and love.",
    'no-fear': "I am confident, prepared, and excited for what's ahead!",
  };
  
  return affirmations[fear];
}

/**
 * Generates daily mindset tasks based on fears
 * Used when readinessScore is low or user selects "confidence" need
 */
export function generateMindsetTasksForFears(
  selectedFears: BiggestFear[],
  startDate: string,
  endDate: string
): Array<{ text: string; date: string; category: string }> {
  const tasks: Array<{ text: string; date: string; category: string }> = [];
  
  // Filter meaningful fears
  const relevantFears = selectedFears.filter(f => f !== 'no-fear');
  if (relevantFears.length === 0) return tasks;

  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  // Create rotating mindset tasks
  for (let i = 0; i < daysDiff; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + i);
    const dateStr = currentDate.toISOString().split('T')[0];
    
    // Rotate through fears
    const fear = relevantFears[i % relevantFears.length];
    const affirmation = getAffirmationForFear(fear);
    
    tasks.push({
      text: `🧠 Mindset moment: "${affirmation}"`,
      date: dateStr,
      category: 'mindset',
    });
  }
  
  return tasks;
}

/**
 * Gets teaching content for the contingency step
 */
export const CONTINGENCY_TEACHING = {
  intro: "Let's be real: not every launch hits its goal. That's normal. What matters is how you respond.",
  
  normalize: "Most successful entrepreneurs have more \"failed\" launches than wins. Each one teaches you something.",
  
  reframe: "A \"failed\" launch isn't failure. It's market research you couldn't buy. It's practice. It's progress.",
  
  dataVsIdentity: "Your sales numbers are data, not a verdict on your worth. Separate what happened from what it means.",
  
  planBenefits: "Having a contingency plan actually HELPS you launch better. When you know you'll be okay either way, you show up with less desperation - and that sells.",
};
