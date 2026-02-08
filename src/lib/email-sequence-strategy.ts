// Email Sequence Strategic Intelligence
// Defines the PSYCHOLOGY and CONVERSION STRATEGY for each email in the sequence

export interface EmailStrategicFramework {
  customerStage: string; // Where they are in the journey
  psychologicalState: string; // What they're feeling/thinking
  objectionsToPreempt: string[]; // What doubts exist at this stage
  proofRequired: string; // What credibility is needed
  trustBuilding: string; // How to build trust at this stage
}

export interface EmailConversionMechanics {
  primaryGoal: string; // Main objective
  secondaryGoal?: string; // Secondary objective
  ctaStrategy: string; // How to ask for action
  avoidAtAllCosts: string[]; // Critical mistakes
}

export interface TacticalTipExample {
  topic: string;
  badExample: string;
  goodExample: string;
  why: string;
}

export interface TacticalTipRequirements {
  mustHave: string[];
  mustAvoid: string[];
  goldStandard: string;
}

export interface EmailStrategyConfig {
  // Basic config
  purpose: string;
  tone: string;
  structure: string[];
  avoid: string[];
  length: string;
  subjectLineCount: number;
  
  // Strategic intelligence
  strategicFramework: EmailStrategicFramework;
  conversionMechanics: EmailConversionMechanics;
  psychologicalHooks: string[]; // Specific triggers to activate
  
  // Tactical tip enforcement (Email 1 only)
  tacticalTipExamples?: TacticalTipExample[];
  tacticalTipRequirements?: TacticalTipRequirements;
}

export const STRATEGIC_EMAIL_CONFIGS: Record<string, EmailStrategyConfig> = {
  welcome_email_1: {
    purpose: "Deliver lead magnet + build initial relationship",
    tone: "Warm welcome, like inviting a friend into your home",
    structure: [
      "Thank them for downloading (briefly)",
      "Quick personal story showing you understand their struggle",
      "ONE specific actionable tip they can use this week",
      "Clear CTA: Reply and share [specific thing]"
    ],
    avoid: ["Selling anything", "Overwhelming with too much", "Generic inspiration"],
    length: "250-350 words",
    subjectLineCount: 3,
    
    strategicFramework: {
      customerStage: "Just downloaded lead magnet (warm, curious)",
      psychologicalState: "Hopeful but skeptical - 'Is this just another generic freebie? Will they spam me?'",
      objectionsToPreempt: [
        "This will be just like everyone else",
        "They're going to hard-sell me immediately",
        "The free stuff won't actually be useful"
      ],
      proofRequired: "Quick win they can implement TODAY - show immediate value",
      trustBuilding: "Deliver MORE than promised, show you're different, no pitch"
    },
    
    conversionMechanics: {
      primaryGoal: "Get them to ENGAGE (reply, apply tip, feel connected)",
      secondaryGoal: "Position as helpful guide, not salesperson",
      ctaStrategy: "Soft invitation to share results or ask questions - builds relationship",
      avoidAtAllCosts: [
        "Selling anything, even soft mentions",
        "Generic 'welcome' without substance",
        "Not delivering immediate value"
      ]
    },
    
    psychologicalHooks: [
      "Immediate value (they got more than expected)",
      "Personal connection (you understand their specific struggle)",
      "Achievability (they can do this TODAY, not 'someday')",
      "Community feeling (they're not alone in this struggle)",
      "Reciprocity (you gave first, freely)"
    ],
    
    // Tactical tip examples for Email 1
    tacticalTipExamples: [
      {
        topic: 'Visibility/Traffic',
        badExample: 'Think about where your ideal clients hang out online.',
        goodExample: `Pick ONE platform where your ideal client hangs out (Facebook group, LinkedIn, Reddit).

Spend 15 minutes TODAY answering 3 questions people are asking—genuinely helpful, no pitch, no link to your stuff. Just help.

Do this 3x this week. Watch what happens to your DMs.

Try it and let me know what you discover.`,
        why: 'Good example is: (1) Specific (ONE platform, 3 questions), (2) Achievable TODAY (15 min), (3) Measurable (3x this week), (4) Has expected outcome (DMs increase)'
      },
      {
        topic: 'List Building',
        badExample: 'Consider asking your audience what they need help with.',
        goodExample: `Go to your Instagram/Facebook and post this exact question:

"Quick question: What's your biggest struggle with [your niche's main problem]?"

Pin it to your profile. 

When people comment, DM them: "Can I send you a free resource that helped me with that exact thing?"

Boom. New subscriber who's already engaged.

Do it today. Let me know how many people respond.`,
        why: 'Good example provides: (1) Exact wording to use, (2) Specific platform, (3) Clear next steps, (4) Expected outcome (subscribers + engagement), (5) Can do in 5 minutes'
      },
      {
        topic: 'Content Strategy',
        badExample: 'Try to make your content more valuable.',
        goodExample: `Before creating ANY content this week, ask yourself these 3 questions:

1. What problem does this solve?
2. Can they implement it in under 30 minutes?
3. Will they think "I need to save this"?

If you can't answer all 3 with "yes," don't post it.

Go look at your last 5 posts. Which ones pass the test?

Reply and tell me what you find—I'm curious.`,
        why: 'Good example gives: (1) Clear framework (3 questions), (2) Immediate application (review last 5 posts), (3) Aha moment likely, (4) Invitation to engage'
      },
      {
        topic: 'Email Marketing',
        badExample: 'Focus on connecting with your subscribers.',
        goodExample: `Here's what I want you to do this week:

Email your list (even if it's just 10 people) and ask ONE specific question:

"What's the biggest obstacle stopping you from [their desired outcome]?"

Don't overthink it. Just send it.

Then create your next piece of content answering what they tell you.

Bonus: You'll get a 20-30% response rate. That's real engagement.`,
        why: 'Good example: (1) Specific action (send email with exact question), (2) Works for any list size, (3) Clear next step (create content from answers), (4) Expected outcome (20-30% response)'
      },
      {
        topic: 'Mindset/Productivity',
        badExample: 'Try to stay focused on what matters most.',
        goodExample: `Do this exercise right now (takes 2 minutes):

Write down the 3 things you did for your business this week.

Now ask: "Which ONE of these, if I did it every single day, would 10x my results?"

That's your ONE THING.

For the next 7 days, do ONLY that thing. Say no to everything else.

Send me a message on Day 7 and tell me what happened.`,
        why: 'Good example: (1) Takes 2 minutes, (2) Clear process, (3) Specific timeframe (7 days), (4) Forces prioritization, (5) Accountability built in'
      }
    ],
    
    // Tactical tip requirements
    tacticalTipRequirements: {
      mustHave: [
        'Specific action they can take (not "think about" or "consider")',
        'Timeframe (TODAY, this week, next 7 days)',
        'Clear steps (numbered or sequenced)',
        'Expected outcome (what will happen if they do it)',
        'Invitation to report back (engagement loop)'
      ],
      mustAvoid: [
        'Vague advice ("focus on your strategy", "find your leverage")',
        'Questions without answers ("What\'s your gap?")',
        'Generic inspiration ("You\'ve got this!")',
        'Advice that requires tools/budget they might not have',
        'Multi-step processes that take hours/days'
      ],
      goldStandard: 'A tactical tip should be so clear that someone could do it within 30 minutes of reading the email and see/feel a result.'
    }
  },

  welcome_email_2: {
    purpose: "Share your origin story + position yourself as guide",
    tone: "Vulnerable storytelling, real and relatable",
    structure: [
      "Brief recap of where they are now (mirror their struggle)",
      "Your story: how you were in their exact position",
      "The specific moment/realization that shifted everything for you",
      "What you learned that they can apply",
      "CTA: Which part of this story resonated most?"
    ],
    avoid: ["Humble bragging", "Vague 'transformation' language", "Pitching"],
    length: "300-400 words",
    subjectLineCount: 3,
    
    strategicFramework: {
      customerStage: "Read email 1, possibly took action (engaged but still evaluating)",
      psychologicalState: "Curious about you - 'Who is this person? Can they really help ME?'",
      objectionsToPreempt: [
        "They don't understand MY unique situation",
        "They're just successful, they've never struggled like me",
        "This worked for them, but will it work for me?"
      ],
      proofRequired: "Vulnerable story showing you were THEM - same struggles, same doubts",
      trustBuilding: "Share a real struggle/failure, show you're human, create 'me too' moment"
    },
    
    conversionMechanics: {
      primaryGoal: "Position as GUIDE who's been there, not expert on a pedestal",
      secondaryGoal: "Build emotional connection through shared experience",
      ctaStrategy: "Invite reflection - ask which part resonated (deepens engagement)",
      avoidAtAllCosts: [
        "Success-only stories (no vulnerability)",
        "Vague transformations without specific details",
        "Making it sound too easy"
      ]
    },
    
    psychologicalHooks: [
      "Mirror neurons (see yourself in their story)",
      "Authority through experience (not credentials)",
      "Vulnerability creates trust",
      "Hope (they did it, maybe I can too)",
      "Specificity (real story with details, not vague inspiration)"
    ]
  },

  welcome_email_3: {
    purpose: "Establish authority + provide high-value content",
    tone: "Confident teacher, generous with knowledge",
    structure: [
      "Address common mistake/misconception in their industry",
      "Explain why this mistake happens (empathy)",
      "Share your framework/process for doing it right",
      "Give them step 1 they can implement today",
      "CTA: Try this and let me know what happens"
    ],
    avoid: ["Gatekeeping the best advice", "Being preachy", "Too theoretical"],
    length: "350-450 words",
    subjectLineCount: 3,
    
    strategicFramework: {
      customerStage: "Engaged subscriber, trust building (warm)",
      psychologicalState: "Ready to learn - 'Okay, I trust them a bit. What can they teach me?'",
      objectionsToPreempt: [
        "Is this going to be vague advice I've heard before?",
        "Will they hold back the good stuff to sell later?",
        "Can I actually implement this?"
      ],
      proofRequired: "Tactical framework they can use - not theory, but actual method",
      trustBuilding: "Give away something valuable for free - show you're not gatekeeping"
    },
    
    conversionMechanics: {
      primaryGoal: "Establish AUTHORITY as teacher who gets results",
      secondaryGoal: "Create aha moment ('Oh! That's why I've been struggling!')",
      ctaStrategy: "Action-based invitation - try it and report back (engagement loop)",
      avoidAtAllCosts: [
        "Generic advice ('just be consistent')",
        "Theory without tactical steps",
        "Holding back the real value"
      ]
    },
    
    psychologicalHooks: [
      "Aha moment (misconception revealed)",
      "Relief (it's not their fault, common mistake)",
      "Clarity (simple framework cuts through confusion)",
      "Empowerment (they can DO this)",
      "Generosity (you're giving real value)"
    ]
  },

  welcome_email_4: {
    purpose: "Social proof + soft intro to your offer",
    tone: "Excited storytelling about client wins",
    structure: [
      "Client success story with specific details (name, situation, result)",
      "What made the difference for them",
      "Connect their situation to the reader's",
      "Mention your offer exists (soft intro, not a pitch)",
      "CTA: Want to learn more about [program]?"
    ],
    avoid: ["Making it sound too easy", "Salesy language", "Fake urgency"],
    length: "300-400 words",
    subjectLineCount: 3,
    
    strategicFramework: {
      customerStage: "Warmed up, considering next level (getting hot)",
      psychologicalState: "Evaluating - 'I like their content, but will this actually work FOR ME?'",
      objectionsToPreempt: [
        "This works for other people, but not someone like me",
        "I don't have [time/money/experience] like that person had",
        "Results sound too good to be true"
      ],
      proofRequired: "Relatable success story - someone LIKE THEM who got results",
      trustBuilding: "Show real people, real struggles, real results - not testimonials, stories"
    },
    
    conversionMechanics: {
      primaryGoal: "Prove it WORKS for people like them (proof of concept)",
      secondaryGoal: "Soft intro to offer without hard selling",
      ctaStrategy: "Curiosity-based invitation - 'want to learn more?' (not 'buy now')",
      avoidAtAllCosts: [
        "Generic testimonials",
        "Making it sound effortless",
        "Hard selling (ruins trust)"
      ]
    },
    
    psychologicalHooks: [
      "Social proof (others like me succeeded)",
      "Believability (realistic journey, not overnight)",
      "Relatability (their struggle = my struggle)",
      "Possibility (if they can, maybe I can)",
      "Curiosity (I want to know more about this program)"
    ]
  },

  welcome_email_5: {
    purpose: "Make the offer + invite to next step",
    tone: "Direct invitation, friend recommending something that helped them",
    structure: [
      "You've been getting [benefit from emails], here's how to go deeper",
      "What your program/offer is and who it's for",
      "Specific outcomes they can expect",
      "Investment + what's included",
      "Clear CTA with urgency (enrollment closes, spots limited, etc.)",
      "Reassurance: address main objection"
    ],
    avoid: ["Pushy sales tactics", "Fake scarcity", "Manipulation"],
    length: "400-500 words",
    subjectLineCount: 3,
    
    strategicFramework: {
      customerStage: "Hot lead, ready to decide (considering purchase)",
      psychologicalState: "Decision mode - 'Is this worth it? Is NOW the right time?'",
      objectionsToPreempt: [
        "Is this worth the investment?",
        "Is now the right time for me?",
        "What if it doesn't work for me specifically?"
      ],
      proofRequired: "Clear outcome promise + what's included + why now",
      trustBuilding: "Transparency about investment, honest about who it's for, address objection"
    },
    
    conversionMechanics: {
      primaryGoal: "Convert to customer - clear ask, clear offer",
      secondaryGoal: "Make decision easy (clear next step, address objection)",
      ctaStrategy: "Direct invitation with real urgency - deadlines/spots (if true)",
      avoidAtAllCosts: [
        "Fake scarcity (breaks trust)",
        "Manipulation tactics",
        "Being vague about price or what's included"
      ]
    },
    
    psychologicalHooks: [
      "Natural progression (you've given value, now offering more)",
      "Clear outcome (they know what they'll get)",
      "Real urgency (if applicable - enrollment closes, spots limited)",
      "Objection handling (you address their main concern)",
      "Permission (it's okay to invest in yourself)"
    ]
  }
};

// Helper to get strategic config for any email type
export function getStrategicConfig(contentType: string): EmailStrategyConfig | null {
  return STRATEGIC_EMAIL_CONFIGS[contentType] || null;
}
