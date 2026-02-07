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
    ]
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
