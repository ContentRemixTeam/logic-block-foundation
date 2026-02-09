// Wizard AI Prompts
// Specialized prompts for generating high-quality, conversion-focused copy within wizards

import { WizardGenerationContext, WizardContentType, EmailSequenceConfig, EMAIL_SEQUENCE_CONFIGS } from '@/types/wizardAIGeneration';

// ============== Anti-AI Detection Rules ==============
const ANTI_AI_RULES = `
CRITICAL ANTI-AI RULES (follow religiously):

❌ NEVER USE THESE PHRASES:
- "Here's what changed everything"
- "I realized that"
- "embark on a journey" / "journey"
- "delve into" / "dive deep"
- "unlock the secrets"
- "game-changer" / "game changer"
- "transform your life"
- "at the end of the day"
- "in today's world/landscape"
- "let's be honest"
- "picture this" / "imagine this"
- "the bottom line is"
- "harness the power"
- "it's worth noting that"
- "feel free to" / "don't hesitate to"
- "take your [X] to the next level"
- "elevate your"

❌ AVOID AI PATTERNS:
- Starting with "Here's what/how/why"
- Using "feel free to" or "don't hesitate to"
- Ending with "I hope this helps"
- Being overly polite or formal
- Perfect grammar (contractions are good, fragments okay)
- Using "Absolutely!" or "Certainly!"
- Lists of exactly 3 things every time
- Using "Not only... but also"
- Starting sentences with "So," or "Now,"

✅ DO THIS INSTEAD:
- Start mid-thought like a conversation already happening
- Use specific details (names, dates, exact amounts)
- Write like you're texting a friend who needs advice
- Short sentences. Fragments are fine. Mix it up.
- Be imperfect. Real people don't write perfectly.
- Show, don't tell (stories > statements)
- One idea per sentence max
- Use contractions naturally
- Include the occasional typo-like informality
`;

// ============== Voice Profile Integration ==============
function buildVoicePrompt(context: WizardGenerationContext): string {
  const { voiceProfile, voiceSamples, businessName } = context;
  
  let prompt = `VOICE MATCHING: Write exactly like ${businessName || 'this business owner'} writes.\n\n`;
  
  if (voiceProfile) {
    const scores = voiceProfile.tone_scores;
    if (scores) {
      prompt += `VOICE PROFILE:
- Formality: ${scores.formality}/10 ${scores.formality < 4 ? '(very casual)' : scores.formality > 7 ? '(more formal)' : '(conversational)'}
- Energy: ${scores.energy}/10 ${scores.energy > 7 ? '(high energy, enthusiastic)' : scores.energy < 4 ? '(calm, measured)' : '(moderate)'}
- Emotion: ${scores.emotion}/10 ${scores.emotion > 7 ? '(very expressive)' : '(balanced)'}
- Humor: ${scores.humor}/10

`;
    }
    
    if (voiceProfile.signature_phrases && voiceProfile.signature_phrases.length > 0) {
      prompt += `SIGNATURE PHRASES (use naturally):
${voiceProfile.signature_phrases.slice(0, 6).map(p => `- "${p}"`).join('\n')}

`;
    }
    
    if (voiceProfile.style_summary) {
      prompt += `STYLE: ${voiceProfile.style_summary}\n\n`;
    }
  }
  
  if (voiceSamples && voiceSamples.length > 0) {
    const validSamples = voiceSamples.filter(s => s && s.trim().length > 30);
    if (validSamples.length > 0) {
      prompt += `WRITING SAMPLES (match this style exactly):

${validSamples.slice(0, 2).map((s, i) => `Sample ${i + 1}:\n${s.substring(0, 400)}`).join('\n\n---\n\n')}

`;
    }
  }
  
  return prompt;
}

// ============== Offer Context Builder ==============
function buildOfferContext(context: WizardGenerationContext): string {
  const { offerName, offerType, pricePoint, idealCustomer, bonuses, guarantee, spotLimit, urgencyType } = context;
  
  let prompt = `OFFER DETAILS:
- Offer Name: ${offerName || 'Not specified'}
- Type: ${offerType || 'Not specified'}
- Price: ${pricePoint ? `$${pricePoint}` : 'Not specified'}
- Ideal Customer: ${idealCustomer || 'Not specified'}
`;

  if (bonuses && bonuses.length > 0) {
    prompt += `- Bonuses: ${bonuses.join(', ')}\n`;
  }
  
  if (guarantee) {
    prompt += `- Guarantee: ${guarantee}\n`;
  }
  
  if (urgencyType && urgencyType !== 'none') {
    prompt += `- Urgency Type: ${urgencyType}`;
    if (spotLimit) {
      prompt += ` (${spotLimit} spots)`;
    }
    prompt += '\n';
  }
  
  return prompt;
}

// ============== Timeline Context Builder ==============
function buildTimelineContext(context: WizardGenerationContext): string {
  const { cartOpensDate, cartClosesDate, launchDuration } = context;
  
  if (!cartOpensDate && !cartClosesDate) return '';
  
  let prompt = '\nLAUNCH TIMELINE:\n';
  
  if (cartOpensDate) {
    prompt += `- Cart Opens: ${cartOpensDate}\n`;
  }
  if (cartClosesDate) {
    prompt += `- Cart Closes: ${cartClosesDate}\n`;
  }
  if (launchDuration) {
    prompt += `- Duration: ${launchDuration} days\n`;
  }
  
  return prompt;
}

// ============== Email Sequence System Prompt ==============
export function buildEmailSequenceSystemPrompt(context: WizardGenerationContext, sequenceConfig: EmailSequenceConfig): string {
  return `You are an elite direct-response copywriter writing email sequences for ${context.businessName || 'this business'}.

${buildVoicePrompt(context)}

${ANTI_AI_RULES}

SEQUENCE TYPE: ${sequenceConfig.label}
TOTAL EMAILS: ${sequenceConfig.emailCount}

CRITICAL REQUIREMENTS:
1. Each email must sound like the business owner wrote it, NOT like AI
2. Include specific details, stories, and examples
3. Create genuine urgency without manipulation
4. Every email must have a clear purpose and ONE main CTA
5. Subject lines should create curiosity without being clickbait
6. Write conversationally - this is an email, not a formal document

CONVERSION PRINCIPLES:
- Hook them in the first line (no "Hey [NAME], I wanted to...")
- Use the "open loop" technique - create curiosity early
- Address ONE objection or desire per email
- End with a clear, single call-to-action
- Make each email stand alone but connect to the sequence narrative`;
}

// ============== Email Sequence User Prompt ==============
export function buildEmailSequenceUserPrompt(
  context: WizardGenerationContext, 
  sequenceConfig: EmailSequenceConfig,
  emailPosition?: number
): string {
  let prompt = `Generate ${emailPosition ? `email #${emailPosition}` : `a complete ${sequenceConfig.emailCount}-email sequence`} for ${sequenceConfig.label}.

${buildOfferContext(context)}
${buildTimelineContext(context)}

`;

  if (emailPosition) {
    const emailConfig = sequenceConfig.emails.find(e => e.position === emailPosition);
    if (emailConfig) {
      prompt += `EMAIL ${emailPosition} REQUIREMENTS:
- Purpose: ${emailConfig.purpose}
- Tone: ${emailConfig.tone}
- Send Day: Day ${emailConfig.sendDay} of sequence
- Structure: ${emailConfig.structure.join(' → ')}
- Avoid: ${emailConfig.avoid.join(', ')}

`;
    }
  } else {
    prompt += `SEQUENCE STRUCTURE:
${sequenceConfig.emails.map(e => `
Email ${e.position} (Day ${e.sendDay}):
- Purpose: ${e.purpose}
- Tone: ${e.tone}
`).join('')}

`;
  }

  if (context.additionalContext) {
    prompt += `ADDITIONAL CONTEXT:\n${context.additionalContext}\n\n`;
  }

  prompt += `FORMAT EACH EMAIL AS:
---
EMAIL ${emailPosition || '[NUMBER]'}
SEND DAY: [Day relative to sequence start]
PURPOSE: [Brief purpose statement]

SUBJECT LINE OPTIONS:
1. [Subject line 1]
2. [Subject line 2]
3. [Subject line 3]

BODY:
[Email body - conversational, matches brand voice, includes CTA]

CTA: [Primary call-to-action]
---

Remember: Sound human. Be specific. Create genuine connection. One CTA per email.`;

  return prompt;
}

// ============== Sales Page System Prompt ==============
export function buildSalesPageSystemPrompt(context: WizardGenerationContext): string {
  return `You are an elite long-form sales copywriter trained by legends like Gary Halbert, Dan Kennedy, and Joanna Wiebe.

${buildVoicePrompt(context)}

${ANTI_AI_RULES}

SALES PAGE PRINCIPLES:
1. Lead with the transformation, not features
2. Agitate the problem before presenting the solution
3. Use specific numbers, timeframes, and outcomes
4. Include the right amount of social proof (don't overdo it)
5. Address objections before they arise
6. Create urgency through value, not manipulation
7. The guarantee should reduce risk, not seem suspicious

STRUCTURE FLOW:
Headline → Subheadline → Problem Agitation → Solution Introduction → 
What's Included → Bonuses → Pricing → Objection Handling → FAQ → 
Guarantee → Final CTA

CRITICAL: Every section should make them want to read the next section. No boring transitions.`;
}

// ============== Sales Page User Prompt ==============
export function buildSalesPageUserPrompt(context: WizardGenerationContext, sectionOnly?: string): string {
  let prompt = `Generate ${sectionOnly ? `the ${sectionOnly} section` : 'a complete long-form sales page'} for ${context.offerName || 'this offer'}.

${buildOfferContext(context)}
${buildTimelineContext(context)}

TARGET READER: ${context.idealCustomer || 'Not specified'}

`;

  if (sectionOnly) {
    const sectionInstructions: Record<string, string> = {
      headline: 'Create 3 headline options. Each should promise a specific transformation. Include a subheadline that adds context.',
      problem: 'Agitate their current pain. Be specific about what their life looks like with this problem. Make them feel understood.',
      solution: 'Introduce your offer as THE answer. Connect it to the problem. Show the transformation path.',
      features: 'List what is included with benefit-focused descriptions. Each feature should answer "so what?" for the reader.',
      bonuses: 'Present each bonus as valuable on its own. Include the monetary value if appropriate.',
      pricing: 'Present the investment with value anchoring. Include payment plan options if available. Make it feel like a no-brainer.',
      faq: 'Answer 5-7 common objections disguised as questions. Each answer should move them closer to buying.',
      guarantee: 'Present the guarantee in a way that removes all risk. Make it bold and confident.',
      cta: 'Write a compelling final section that summarizes the transformation and makes the decision feel urgent and exciting.',
    };
    
    prompt += `SECTION: ${sectionOnly.toUpperCase()}\n${sectionInstructions[sectionOnly] || ''}\n\n`;
  }

  if (context.additionalContext) {
    prompt += `ADDITIONAL CONTEXT:\n${context.additionalContext}\n\n`;
  }

  prompt += `Remember: Write like a human having a conversation about something they genuinely believe in. Be specific. Use stories. Make them feel something.`;

  return prompt;
}

// ============== Social Batch System Prompt ==============
export function buildSocialBatchSystemPrompt(context: WizardGenerationContext, platform: string): string {
  const platformGuide: Record<string, string> = {
    instagram: `INSTAGRAM GUIDELINES:
- Optimal caption length: 125-150 words for feed posts
- First line is critical - hook them immediately
- Use line breaks for readability
- Include 3-5 relevant hashtags at the end (not in the middle)
- End with a soft CTA or question`,
    linkedin: `LINKEDIN GUIDELINES:
- Professional but personal tone
- Start with a hook that makes them stop scrolling
- Use short paragraphs (1-2 sentences each)
- Stories and lessons perform well
- CTA should be contextual, not salesy`,
    facebook: `FACEBOOK GUIDELINES:
- Conversational, community-focused tone
- Questions and engagement prompts work well
- Medium length posts (100-200 words)
- Can be more casual and personal
- Include a clear but soft CTA`,
    twitter: `TWITTER/X GUIDELINES:
- Punchy, value-packed statements
- Thread format for longer content
- First tweet must stand alone and hook
- Use specific numbers and outcomes
- Minimal hashtags (0-2)`,
  };
  
  return `You are a social media copywriter specializing in ${platform} content for course creators and coaches.

${buildVoicePrompt(context)}

${ANTI_AI_RULES}

${platformGuide[platform.toLowerCase()] || platformGuide.instagram}

LAUNCH CONTENT TYPES TO CREATE:
- Cart open announcement
- Value/teaching posts (with soft pitch)
- Testimonial/social proof posts
- Behind-the-scenes content
- Countdown/urgency posts (final days)
- Cart close post

Each post should be able to stand alone while contributing to the launch narrative.`;
}

// ============== Social Batch User Prompt ==============
export function buildSocialBatchUserPrompt(
  context: WizardGenerationContext, 
  platform: string,
  postCount: number,
  launchPhase: 'pre-launch' | 'cart-open' | 'cart-close'
): string {
  const phaseGuide: Record<string, string> = {
    'pre-launch': 'Focus on building anticipation, sharing value, and warming up the audience. No direct selling yet.',
    'cart-open': 'Mix value content with clear offers. Include testimonials, what is included, and why now.',
    'cart-close': 'Urgency-focused. Countdown posts, last chance messaging, final objection handling.',
  };
  
  return `Generate ${postCount} ${platform} posts for the ${launchPhase} phase of this launch.

${buildOfferContext(context)}
${buildTimelineContext(context)}

PHASE FOCUS: ${phaseGuide[launchPhase]}

${context.additionalContext ? `ADDITIONAL CONTEXT:\n${context.additionalContext}\n\n` : ''}

FORMAT EACH POST AS:
---
POST ${1}
TYPE: [cart-open/value/testimonial/countdown/etc]
PLATFORM: ${platform}
SUGGESTED DATE: [Relative to launch, e.g., "Cart Open Day 1"]

CAPTION:
[Full post caption with line breaks]

HASHTAGS: [3-5 relevant hashtags]
CTA: [Primary call-to-action]
---

Create varied post types. Not every post should be a direct pitch. Value content builds trust.`;
}

// ============== Speaker Invite System Prompt (Summit) ==============
export function buildSpeakerInviteSystemPrompt(context: WizardGenerationContext): string {
  return `You are writing speaker invitation emails for a virtual summit. These need to feel personal, professional, and compelling.

${buildVoicePrompt(context)}

${ANTI_AI_RULES}

SPEAKER INVITE PRINCIPLES:
1. Lead with what's in it for THEM (exposure, leads, credibility)
2. Be specific about your audience size and engagement
3. Make the ask clear and the commitment minimal
4. Provide all logistics upfront (dates, format, time required)
5. Make it easy to say yes

THREE VERSIONS NEEDED:
- Cold outreach (never interacted before)
- Warm outreach (some previous connection)
- VIP/influencer pitch (for bigger names)

Each should have subject line options and clear CTAs.`;
}

// ============== Swipe Pack System Prompt (Summit) ==============
export function buildSwipePackSystemPrompt(context: WizardGenerationContext, emailCount: number): string {
  return `You are creating swipe copy that speakers can send to their email lists to promote a virtual summit.

${buildVoicePrompt(context)}

${ANTI_AI_RULES}

SWIPE COPY PRINCIPLES:
1. Easy for speakers to customize (clear placeholders)
2. Focus on the transformation attendees will get
3. Mention speaker credibility without over-hyping
4. Clear registration CTA in every email
5. Build urgency as summit approaches

CREATE ${emailCount} EMAILS:
- Email 1: Initial announcement + registration
- Email 2: "Why this summit" + speaker credibility
${emailCount >= 3 ? '- Email 3: All-access pass value pitch' : ''}
${emailCount >= 4 ? '- Email 4: Countdown/reminder (2-3 days before)' : ''}
${emailCount >= 5 ? '- Email 5: Final chance (day of/before)' : ''}

Use placeholders like [YOUR NAME], [YOUR AUDIENCE'S MAIN STRUGGLE], etc.`;
}

// ============== Content Brief System Prompt ==============
export function buildContentBriefSystemPrompt(context: WizardGenerationContext): string {
  return `You are a content strategist creating detailed content briefs for ${context.businessName || 'this business'}.

${buildVoicePrompt(context)}

A content brief should give the creator everything they need to produce the content WITHOUT requiring additional research or planning.

BRIEF COMPONENTS:
1. Hook/angle options (3 different approaches)
2. Key points to cover (bullet points)
3. Stories/examples to include
4. Call-to-action suggestions
5. Estimated length/duration
6. Platform-specific notes if applicable`;
}

// ============== Critique Prompt (Pass 2) with Voice Matching ==============
export interface VoiceProfile {
  tone_scores?: {
    formality: number;
    energy: number;
    emotion: number;
    humor: number;
  };
  signature_phrases?: string[];
  style_summary?: string;
  sentence_structure?: {
    avg_length: number;
    style: string;
  };
  [key: string]: unknown;
}

export function buildCritiquePrompt(
  generatedContent: string, 
  contentType: WizardContentType,
  voiceSamples?: string[],
  voiceProfile?: VoiceProfile
): string {
  // If no voice samples, fall back to basic critique
  const validSamples = voiceSamples?.filter(s => s && s.length > 50).slice(0, 2) || [];
  
  if (validSamples.length === 0) {
    return `You are a direct-response copywriting expert. Review this ${contentType.replace(/_/g, ' ')} and identify:

1. HEADLINE/SUBJECT LINES: Are they curiosity-driven? Would they get opened/read?
2. HOOKS: Does the opening immediately grab attention?
3. EMOTIONAL RESONANCE: Does it make the reader FEEL something?
4. SPECIFICITY: Are there vague claims that need concrete details?
5. VOICE MATCH: Does it sound like a real person or like AI?
6. CTAs: Are they action-oriented and singular per section?
7. FLOW: Does each section make them want to read the next?
8. AI PATTERNS: Any phrases that scream "ChatGPT wrote this"?

CONTENT TO CRITIQUE:
${generatedContent}

Provide specific, actionable feedback. Point to exact phrases that need improvement.`;
  }

  // Enhanced critique with side-by-side voice comparison
  return `Compare the generated content to these ACTUAL writing samples from the user:

VOICE SAMPLES:
${validSamples.map((s, i) => `
=== Sample ${i + 1} ===
${s.substring(0, 500)}
`).join('\n')}

GENERATED CONTENT TO CRITIQUE:
${generatedContent}

SIDE-BY-SIDE ANALYSIS:
Identify specific differences between their actual writing and the generated content:

1. Opening Style:
   - Theirs: [quote first sentence from sample]
   - Generated: [quote first sentence]
   - Match? Yes/No - if No, explain why

2. Sentence Rhythm:
   - Theirs: [describe avg length, variety, flow]
   - Generated: [describe]
   - Match? Yes/No - if No, explain how to fix

3. Signature Phrases:
${voiceProfile?.signature_phrases?.slice(0, 5).map(p => `   - "${p}" - Used naturally? Forced? Missing?`).join('\n') || '   - No signature phrases provided'}

4. Paragraph Structure:
   - Theirs: [short/medium/long, how they break ideas]
   - Generated: [describe]
   - Match? Yes/No

5. Emotional Arc:
   - Theirs: [describe how emotion builds in samples]
   - Generated: [describe]
   - Match? Yes/No

6. AI-Sounding Phrases (check generated content for):
   - "Elevate your", "Unlock the power", "Transform your journey"
   - "Dive deep", "Game-changer", "Next level"
   - "Here's what/how", "I realized that", "Let's be honest"
   - Mark each one found and provide natural alternatives from their samples

SPECIFIC LINE-BY-LINE FEEDBACK:
Quote exact sentences from generated content that don't match their voice, then show how to rewrite using patterns from their samples.`;
}

// ============== Rewrite Prompt (Pass 3) with Pattern Matching ==============
export function buildRewritePrompt(
  originalContent: string, 
  critique: string, 
  context: WizardGenerationContext
): string {
  const validSamples = context.voiceSamples?.filter(s => s && s.length > 50).slice(0, 2) || [];
  
  let voiceReference = '';
  if (validSamples.length > 0) {
    voiceReference = `
VOICE REFERENCE (match these patterns EXACTLY):
${validSamples.map((s, i) => `
Sample ${i + 1}:
${s.substring(0, 400)}
`).join('\n---\n')}
`;
  }
  
  return `CRITICAL: You are REWRITING to match their EXACT patterns.
Before writing each section, identify:
1. What pattern do they use for this in their samples?
2. How can I apply that exact pattern here?
3. Am I using their rhythm, not my instincts?

${voiceReference}

ORIGINAL CONTENT:
${originalContent}

CRITIQUE FEEDBACK:
${critique}

${buildVoicePrompt(context)}

REWRITING REQUIREMENTS:
- Fix every issue mentioned in the critique
- MATCH the sentence length and paragraph structure from voice samples
- USE their transition patterns between ideas
- REPLICATE their opening and closing styles
- ADD specific details where things were vague
- STRENGTHEN emotional hooks using their emotional vocabulary
- IMPROVE CTAs matching their CTA style
- REMOVE any AI-sounding phrases and replace with patterns from samples
- Use THEIR vocabulary, not copywriting jargon

Output the improved version in the same format as the original.`;
}

// ============== AI Detection Refinement Prompt (Pass 4) ==============
export function buildAIRefinementPrompt(content: string, aiScore: number, warnings: string[]): string {
  return `This content scored ${aiScore}/10 on AI detection (lower is better). Rewrite to sound completely human.

ISSUES DETECTED:
${warnings.map(w => `- ${w}`).join('\n')}

CONTENT TO HUMANIZE:
${content}

REWRITE RULES:
- Replace any flagged phrases with natural alternatives
- Add imperfections (contractions, fragments, casual transitions)
- Include more specific details and anecdotes
- Vary sentence length more dramatically
- Start sentences differently (not with "So," "Now," "Here's")
- Sound like a real person who types fast and doesn't over-edit

Output the humanized version. Must score 3 or lower on AI detection.`;
}

// ============== Export Helper ==============
export function getSequenceConfig(contentType: WizardContentType): EmailSequenceConfig | null {
  return EMAIL_SEQUENCE_CONFIGS[contentType] || null;
}
