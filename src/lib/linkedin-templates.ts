// LinkedIn Templates System - Core Template Definitions & Anti-AI Rules
import type { LinkedInTemplate, LinkedInAntiAIRules } from '@/types/linkedinTemplates';

/**
 * Shared Anti-AI Rules (~150 tokens)
 * These are merged with user's custom_banned_phrases from Brand DNA
 */
export const LINKEDIN_ANTI_AI_RULES: LinkedInAntiAIRules = {
  bannedPhrases: [
    // Opening phrases that scream AI
    "I'm excited to share",
    "I'm thrilled to announce",
    "Let me share something",
    "Here's what I learned",
    "Let's dive in",
    "Here's the thing",
    
    // Corporate buzzwords
    "game-changer",
    "game changer",
    "leverage",
    "synergy",
    "unlock the power",
    "unlock your potential",
    "transform your",
    "revolutionize",
    "paradigm shift",
    
    // AI-sounding transitions
    "in today's landscape",
    "in today's world",
    "in this day and age",
    "delve into",
    "dive deep",
    "embark on a journey",
    "harness the power",
    
    // Weak CTAs
    "feel free to",
    "don't hesitate to",
    "I hope this helps",
    
    // Lazy engagement
    "Thoughts?",
    "Agree?",
    "What do you think?",
    "Drop a comment",
  ],
  
  requiredPatterns: [
    "Use contractions (I'm, don't, can't, won't, it's) - not 'I am', 'do not'",
    "Include specific numbers when possible (47, not 'many')",
    "Use one-sentence paragraphs for impact",
    "Start sentences with 'And' or 'But' occasionally",
    "Write like you're texting a smart friend"
  ],
  
  engagementRules: [
    "End with a GENUINE question that invites real stories, not 'Thoughts?'",
    "Questions should be specific: 'What's the biggest lesson you learned from a client you fired?'",
    "Avoid questions that can be answered with yes/no",
    "The question should relate directly to your post's main insight"
  ]
};

/**
 * The 5 LinkedIn Post Templates (~550 tokens total)
 * Each template includes structure, example, and why it works
 */
export const LINKEDIN_TEMPLATES: LinkedInTemplate[] = [
  {
    id: 'vulnerable_pivot',
    name: 'Vulnerable Pivot',
    emoji: '💔',
    description: 'Open with a shocking admission, then pivot to the lesson learned',
    hookPattern: '[Shocking admission that creates curiosity]',
    structure: [
      'Open with vulnerable admission (1-2 sentences)',
      'Context: What led to this moment (2-3 sentences)',
      'The pivot: What changed your thinking (2-3 sentences)',
      'The lesson/insight (2-3 sentences)',
      'Engaging question that invites similar stories'
    ],
    example: `I fired my best client last week.

They paid on time. Never complained. Renewed every year.

But every call left me drained. I'd spend the next hour second-guessing every word I said.

Last Tuesday, after another call where I felt like I was walking on eggshells, I realized something:

I was building my business around their approval.

So I wrote the scariest email of my career. Thanked them for 3 years together. And ended it.

The next morning, I woke up excited to work for the first time in months.

Not every "good" client is good for you.

What's a "successful" relationship you've had to walk away from?`,
    exampleWhyItWorks: [
      'Hook creates instant curiosity (why fire a GOOD client?)',
      'Uses specific details (3 years, Tuesday, next morning)',
      'Shows vulnerability without being self-pitying',
      'Lesson feels earned, not preached',
      'Question invites similar stories'
    ]
  },
  {
    id: 'numbers_story',
    name: 'Numbers Story',
    emoji: '📊',
    description: 'Lead with specific numbers to create credibility and curiosity',
    hookPattern: '[Specific number] + [unexpected contrast or outcome]',
    structure: [
      'Open with specific number that creates curiosity (1 sentence)',
      'The contrast or surprising outcome (1-2 sentences)',
      'Context and backstory (2-3 sentences)',
      'The insight or framework (2-3 sentences)',
      'Specific takeaway (1-2 sentences)',
      'Question about their experience with numbers'
    ],
    example: `I interviewed 47 candidates for one role.

Only 3 made it past the first call.

Not because the other 44 weren't qualified. Most had impressive resumes and relevant experience.

They failed the "airport test."

Would I want to be stuck in an airport with this person for 6 hours?

It's not about being fun or entertaining. It's about:
- Do they listen more than they talk?
- Can they disagree without being defensive?
- Do they ask questions that surprise me?

Skills can be taught. Chemistry can't.

What's YOUR non-negotiable filter that most people overlook?`,
    exampleWhyItWorks: [
      'Specific numbers (47, 3, 44, 6 hours) create credibility',
      'Creates curiosity gap (why did 44 fail?)',
      'Simple framework (airport test) is memorable',
      'List is brief and actionable',
      'Question is specific and invites real answers'
    ]
  },
  {
    id: 'if_i_started_over',
    name: 'If I Started Over',
    emoji: '🔄',
    description: 'Share hindsight wisdom as advice to your past self',
    hookPattern: '[Time span] + [topic]. Here\'s what I\'d tell my younger self:',
    structure: [
      'Experience claim with time span (1 sentence)',
      'Transition to hindsight (1 sentence)',
      'List of 3-5 lessons learned (short, punchy)',
      'The ONE thing that matters most (2-3 sentences)',
      'Invitation for others to share their lesson'
    ],
    example: `10 years in marketing. Here's what I'd tell my younger self:

1. Stop chasing tactics. Master ONE channel first.
2. Your best clients come from 3-4 people who love you. Treat them like gold.
3. The "overnight success" you're jealous of? 5 years of invisible work.
4. No one cares about your features. They care about their problems.
5. Being consistent beats being brilliant.

But the biggest one?

Build the audience before you build the product.

I spent 2 years building something nobody wanted. Now I spend 2 months validating before I write a single line of code.

What's ONE thing you wish you knew when you started?`,
    exampleWhyItWorks: [
      'Time span establishes credibility',
      'List format is scannable',
      'Each point is short and punchy',
      'The "biggest one" creates emphasis',
      'Personal example adds authenticity',
      'Simple, specific question'
    ]
  },
  {
    id: 'contrarian_take',
    name: 'Contrarian Take',
    emoji: '🔥',
    description: 'Challenge conventional wisdom with a reasoned argument',
    hookPattern: 'Unpopular opinion: [challenge to common belief]',
    structure: [
      'Hot take statement (1 sentence)',
      'Why most people believe the opposite (2-3 sentences)',
      'Your reasoning/evidence (2-4 sentences)',
      'The nuance or exception (1-2 sentences)',
      'Provocative question that acknowledges disagreement'
    ],
    example: `Unpopular opinion: Hustle culture isn't killing your business.

Pretending to be busy is.

I used to work 12-hour days. Wore it like a badge of honor. Checked email at dinner. Responded to Slacks at midnight.

Then I tracked my ACTUAL productive hours.

2.5 hours a day.

The rest? Meetings that should've been emails. "Research" that was really scrolling. Busy work that made me feel productive but moved nothing forward.

Now I work 6 hours. But I protect them ruthlessly:
- No meetings before noon
- Phone in another room
- One MIT (Most Important Task) before checking email

My output doubled. My stress halved.

The problem isn't how much you work. It's how much of that work actually matters.

What's one "busy work" habit you've had to break?`,
    exampleWhyItWorks: [
      'Challenges a popular narrative without being preachy',
      'Uses specific data (12 hours, 2.5 hours, 6 hours)',
      'Shows the personal journey, not just the conclusion',
      'Actionable framework (3 bullet points)',
      'Admits nuance instead of being absolute',
      'Question invites vulnerability'
    ]
  },
  {
    id: 'mistake_autopsy',
    name: 'Mistake Autopsy',
    emoji: '💸',
    description: 'Break down a failure with specific lessons learned',
    hookPattern: 'My $[amount] mistake (and what I\'d do differently)',
    structure: [
      'Hook with specific cost/impact (1 sentence)',
      'What happened - the story (3-4 sentences)',
      'The autopsy: what went wrong (2-3 bullet points)',
      'The lessons/what you\'d do differently (2-3 points)',
      'How it made you better (1-2 sentences)',
      'Question about their biggest expensive lesson'
    ],
    example: `My $50,000 mistake (and what I'd do differently).

In 2019, I hired an agency to run our ads. They had great case studies. Impressive client list. Talked a big game.

6 months later:
- $50K in ad spend
- 0 paying customers
- A lot of "we're optimizing" emails

What went wrong:

→ I outsourced before I understood. I didn't know enough about ads to know if they were doing it right.
→ I valued credentials over process. Never asked HOW they'd approach our specific situation.
→ I ignored early warning signs. By month 2, the numbers weren't there. I kept hoping.

What I do now:

→ Learn the basics myself first, even if I'll outsource later
→ Ask for the process, not the pitch
→ Set 30-day checkpoints with clear metrics

That $50K taught me more than any course could.

What's the most expensive lesson you've learned in business?`,
    exampleWhyItWorks: [
      'Specific dollar amount creates immediate interest',
      'Story has concrete details (2019, 6 months, month 2)',
      'Clear structure: what happened, what went wrong, what changed',
      'Bullets make lessons scannable',
      'Ends on growth, not regret',
      'Question invites similar stories'
    ]
  }
];

/**
 * Get a template by ID
 */
export function getLinkedInTemplate(templateId: string): LinkedInTemplate | undefined {
  return LINKEDIN_TEMPLATES.find(t => t.id === templateId);
}

/**
 * Get a random template (for "Surprise Me" feature)
 */
export function getRandomLinkedInTemplate(): LinkedInTemplate {
  const index = Math.floor(Math.random() * LINKEDIN_TEMPLATES.length);
  return LINKEDIN_TEMPLATES[index];
}
