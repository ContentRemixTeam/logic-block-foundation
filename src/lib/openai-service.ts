import { supabase } from '@/integrations/supabase/client';
import { decryptAPIKey } from './encryption';
import { VoiceProfile, BrandProfile, UserProduct, AICopyGeneration } from '@/types/aiCopywriting';
import { checkAIDetection } from './ai-detection-checker';

interface GenerateOptions {
  contentType: string;
  context: {
    businessProfile?: Partial<BrandProfile>;
    productToPromote?: UserProduct | null;
    additionalContext?: string;
    pastFeedback?: AICopyGeneration[];
  };
}

interface CallOpenAIParams {
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
}

interface CallOpenAIResult {
  content: string;
  tokens: number;
}

// Email sequence configuration
const EMAIL_SEQUENCE_CONFIG: Record<string, {
  purpose: string;
  tone: string;
  structure: string[];
  avoid: string[];
  length: string;
  subjectLineCount: number;
}> = {
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
    subjectLineCount: 3
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
    subjectLineCount: 3
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
    subjectLineCount: 3
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
    subjectLineCount: 3
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
    subjectLineCount: 3
  }
};

export class OpenAIService {
  
  /**
   * Get and decrypt user's OpenAI API key
   */
  static async getUserAPIKey(userId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('user_api_keys')
      .select('encrypted_key, key_status')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) return null;
    if (data.key_status === 'invalid') throw new Error('API key is invalid');
    
    return await decryptAPIKey(data.encrypted_key, userId);
  }
  
  /**
   * Test if API key is valid
   */
  static async testAPIKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  /**
   * Build system prompt with voice matching and anti-AI rules
   */
  private static buildSystemPrompt(context: GenerateOptions['context']): string {
    const profile = context.businessProfile;
    const voiceProfile = profile?.voice_profile as VoiceProfile | undefined;
    
    let prompt = `You are an elite copywriter writing as ${profile?.business_name || 'this business owner'}.

CRITICAL: This copy must sound EXACTLY like the writing samples provided. Not like AI. Not like a professional copywriter. Like THIS SPECIFIC PERSON.

`;

    // Add voice profile if available
    if (voiceProfile) {
      prompt += `VOICE PROFILE (match this exactly):
- Formality level: ${voiceProfile.tone_scores?.formality || 5}/10 ${(voiceProfile.tone_scores?.formality || 5) < 4 ? '(very casual)' : (voiceProfile.tone_scores?.formality || 5) > 7 ? '(more formal)' : '(conversational)'}
- Energy level: ${voiceProfile.tone_scores?.energy || 5}/10 ${(voiceProfile.tone_scores?.energy || 5) > 7 ? '(high energy, enthusiastic)' : (voiceProfile.tone_scores?.energy || 5) < 4 ? '(calm, measured)' : '(moderate)'}
- Emotional expression: ${voiceProfile.tone_scores?.emotion || 5}/10 ${(voiceProfile.tone_scores?.emotion || 5) > 7 ? '(very expressive)' : '(balanced)'}
- Humor level: ${voiceProfile.tone_scores?.humor || 5}/10

SENTENCE STYLE:
- Average length: ${voiceProfile.sentence_structure?.avg_length || 15} words
- Style: ${voiceProfile.sentence_structure?.style || 'mixed'}

`;

      if (voiceProfile.signature_phrases && voiceProfile.signature_phrases.length > 0) {
        prompt += `SIGNATURE PHRASES (use these naturally):
${voiceProfile.signature_phrases.slice(0, 8).map(p => `- "${p}"`).join('\n')}

`;
      }

      if (voiceProfile.style_summary) {
        prompt += `STYLE SUMMARY: ${voiceProfile.style_summary}

`;
      }
    }

    // Add business context
    if (profile) {
      prompt += `BUSINESS CONTEXT:
Business: ${profile.business_name || 'Not specified'}
Industry: ${profile.industry || 'Not specified'}
What they sell: ${profile.what_you_sell || 'Not specified'}
Target customer: ${profile.target_customer || 'Not specified'}

`;
    }

    // Add voice samples if available
    if (profile?.voice_samples && profile.voice_samples.length > 0) {
      const validSamples = profile.voice_samples.filter(s => s && s.trim().length > 0);
      if (validSamples.length > 0) {
        prompt += `WRITING SAMPLES (study these and match the style):

${validSamples.slice(0, 3).map((sample: string, i: number) => 
  `Sample ${i + 1}:\n${sample.substring(0, 500)}\n`
).join('\n---\n\n')}

`;
      }
    }

    // Anti-AI detection rules
    prompt += `CRITICAL ANTI-AI RULES (follow religiously):

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

❌ AVOID AI PATTERNS:
- Starting with "Here's what/how/why"
- Using "feel free to" or "don't hesitate to"
- Ending with "I hope this helps"
- Being overly polite or formal
- Perfect grammar (contractions are good, fragments okay)
- Using "Absolutely!" or "Certainly!"
- Lists of exactly 3 things every time

✅ DO THIS INSTEAD:
- Start mid-thought like a conversation already happening
- Use specific details (names, dates, exact amounts)
- Write like you're texting a friend who needs advice
- Short sentences. Fragments are fine. Mix it up.
- Be imperfect. Real people don't write perfectly.
- Show, don't tell (stories > statements)
- One idea per sentence max

TONE TARGETS:
- Sound human, not polished
- Conversational, not corporate
- Specific, not vague
- Real, not inspirational

Remember: You're writing AS this person, not FOR them. Channel their voice completely.`;

    // Add past feedback if available
    if (context.pastFeedback?.length) {
      const recentFeedback = context.pastFeedback
        .filter(f => f.user_rating !== null && f.user_rating < 8)
        .slice(0, 3);
      
      if (recentFeedback.length) {
        prompt += `\n\nIMPORTANT - USER PREFERENCES (from past feedback):`;
        recentFeedback.forEach(f => {
          prompt += `\n- Previously rated ${f.user_rating}/10 because: ${f.feedback_text || f.feedback_tags?.join(', ')}`;
        });
        prompt += `\n\nAdjust your writing to address these concerns.`;
      }
    }
    
    return prompt;
  }
  
  /**
   * Build user prompt for specific content type
   */
  private static buildUserPrompt(options: GenerateOptions): string {
    const { contentType, context } = options;
    const profile = context.businessProfile;
    const product = context.productToPromote;
    
    // Get email config if it's an email type
    const emailConfig = EMAIL_SEQUENCE_CONFIG[contentType];
    
    if (!emailConfig) {
      // Fallback for non-email content types
      let prompt = `Create ${contentType.replace(/_/g, ' ')} copy for ${profile?.business_name || 'this business'}.

TARGET AUDIENCE: ${profile?.target_customer || 'Not specified'}

`;

      if (product) {
        prompt += `PRODUCT/OFFER:
- Name: ${product.product_name}
- Type: ${product.product_type}
- Price: ${product.price ? `$${product.price}` : 'Not specified'}
- Description: ${product.description || 'Not provided'}

`;
      }

      if (context.additionalContext) {
        prompt += `ADDITIONAL CONTEXT:\n${context.additionalContext}\n\n`;
      }

      prompt += `Write compelling copy that converts. Remember to sound human and match the brand voice.`;
      return prompt;
    }
    
    // Build email-specific prompt
    let prompt = `Create ${contentType.replace(/_/g, ' ')} for a welcome email sequence.

EMAIL PURPOSE: ${emailConfig.purpose}
DESIRED TONE: ${emailConfig.tone}

ABOUT THE BUSINESS:
- Business: ${profile?.business_name || '[Business Name]'}
- Industry: ${profile?.industry || 'Not specified'}
- What they sell: ${profile?.what_you_sell || 'Products/services'}
- Target customer: ${profile?.target_customer || 'Not specified'}

`;

    if (product) {
      prompt += `PRODUCT/OFFER TO MENTION:
- Name: ${product.product_name}
- Type: ${product.product_type}
- Price: ${product.price ? `$${product.price}` : 'Pricing varies'}
- Description: ${product.description || 'Not provided'}

`;
    }

    if (context.additionalContext) {
      prompt += `ADDITIONAL CONTEXT FROM USER:
${context.additionalContext}

`;
    }

    prompt += `EMAIL STRUCTURE (follow this exactly):
${emailConfig.structure.map((item, i) => `${i + 1}. ${item}`).join('\n')}

THINGS TO AVOID:
${emailConfig.avoid.map(item => `❌ ${item}`).join('\n')}

LENGTH: ${emailConfig.length}

DELIVERABLE:
1. Subject line options (${emailConfig.subjectLineCount} variations - keep them curiosity-driven, not clickbait)
2. Email body (plain text, no HTML)

CRITICAL REMINDERS:
- Match the voice samples EXACTLY (don't sound like AI)
- Use specific examples with details
- Be conversational (like you're writing to a friend)
- No generic inspiration - be tactical and real
- Every claim needs a specific story or example to back it up

Write this email now. Remember: sound like ${profile?.business_name || 'the business owner'}, NOT like ChatGPT.`;

    return prompt;
  }
  
  /**
   * Multi-pass generation system for highest quality
   * Pass 1: Generate draft (temp 0.8)
   * Pass 2: Critique draft (temp 0.3)
   * Pass 3: Rewrite from critique (temp 0.7)
   * Pass 4: AI detection refinement if needed (temp 0.8)
   */
  static async generateCopy(userId: string, options: GenerateOptions): Promise<{
    copy: string;
    tokensUsed: number;
    generationTime: number;
    aiDetectionScore: number;
  }> {
    const startTime = Date.now();
    const apiKey = await this.getUserAPIKey(userId);
    
    if (!apiKey) {
      throw new Error('No API key configured. Please add your OpenAI API key in settings.');
    }
    
    // PASS 1: Generate initial draft
    const draft1 = await this.callOpenAI(apiKey, {
      systemPrompt: this.buildSystemPrompt(options.context),
      userPrompt: this.buildUserPrompt(options),
      temperature: 0.8
    });
    
    // PASS 2: Critique the draft
    const critique = await this.callOpenAI(apiKey, {
      systemPrompt: `You are a direct-response copywriting expert. Review this copy and identify:
1. Weak headlines (not curiosity-driven)
2. Vague language (not specific enough)
3. Missing emotional hooks
4. Weak CTAs (not action-oriented)
5. Areas that don't match the brand voice
6. Any phrases that sound robotic or AI-generated

Be brutally honest but constructive.`,
      userPrompt: `COPY TO CRITIQUE:\n${draft1.content}\n\nBRAND VOICE SAMPLES:\n${options.context.businessProfile?.voice_samples?.slice(0, 2).join('\n\n') || 'None provided'}\n\nProvide specific critique with examples of what to fix.`,
      temperature: 0.3
    });
    
    // PASS 3: Regenerate based on critique
    const pass3Copy = await this.callOpenAI(apiKey, {
      systemPrompt: this.buildSystemPrompt(options.context),
      userPrompt: `ORIGINAL COPY:\n${draft1.content}\n\nCRITIQUE:\n${critique.content}\n\nRewrite the copy addressing all critique points. Make it:
- Tighter and more specific
- More emotionally resonant
- Better aligned with the brand voice
- More human (less AI-sounding)

Keep the same general structure but improve everything.`,
      temperature: 0.7
    });
    
    let finalContent = pass3Copy.content;
    let totalTokens = draft1.tokens + critique.tokens + pass3Copy.tokens;
    
    // Check AI detection score
    let aiCheck = checkAIDetection(finalContent);
    
    // PASS 4: Additional refinement if AI score is high
    if (aiCheck.score > 3) {
      const refinement = await this.callOpenAI(apiKey, {
        systemPrompt: `${this.buildSystemPrompt(options.context)}

CRITICAL: This copy scored ${aiCheck.score}/10 for AI detection. Rewrite to sound completely human.

Issues found:
${aiCheck.warnings.join('\n')}

MUST FIX:
${aiCheck.suggestions.join('\n')}

Write like a real person - imperfect, conversational, authentic. Not like ChatGPT.`,
        userPrompt: `Make this sound 100% human (current AI score: ${aiCheck.score}/10):\n\n${finalContent}`,
        temperature: 0.8
      });
      
      finalContent = refinement.content;
      totalTokens += refinement.tokens;
      
      // Re-check
      aiCheck = checkAIDetection(finalContent);
    }
    
    const generationTime = Date.now() - startTime;
    
    return {
      copy: finalContent,
      tokensUsed: totalTokens,
      generationTime,
      aiDetectionScore: aiCheck.score
    };
  }
  
  /**
   * Call OpenAI API
   */
  private static async callOpenAI(apiKey: string, params: CallOpenAIParams): Promise<CallOpenAIResult> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt }
        ],
        temperature: params.temperature,
        max_tokens: 2000
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API call failed');
    }
    
    const data = await response.json();
    
    return {
      content: data.choices[0]?.message?.content || '',
      tokens: data.usage?.total_tokens || 0
    };
  }
  
  /**
   * Analyze voice from text samples - uses userId to fetch API key internally
   */
  static async analyzeVoice(userId: string, samples: string[]): Promise<VoiceProfile> {
    const apiKey = await this.getUserAPIKey(userId);
    
    if (!apiKey) {
      throw new Error('No API key configured. Please add your OpenAI API key in settings.');
    }
    
    const combinedSamples = samples.filter(s => s && s.trim()).join('\n\n---\n\n');
    
    const systemPrompt = `You are a writing style analyst. Analyze the provided writing samples and extract a detailed voice profile.

Return ONLY a JSON object (no markdown, no explanation) with this exact structure:
{
  "style_summary": "2-3 sentence description of overall writing style",
  "tone_scores": {
    "formality": 1-10,
    "energy": 1-10,
    "humor": 1-10,
    "emotion": 1-10
  },
  "sentence_structure": {
    "avg_length": number,
    "style": "punchy" | "flowing" | "mixed"
  },
  "signature_phrases": ["phrase1", "phrase2", ...],
  "vocabulary_patterns": {
    "uses_contractions": boolean,
    "industry_jargon": boolean,
    "common_words": ["word1", "word2", ...]
  },
  "storytelling_style": "brief description"
}

Scoring guide:
- Formality: 1=very casual (like texting), 10=very formal (academic)
- Energy: 1=calm/measured, 10=high energy/enthusiastic
- Humor: 1=serious, 10=frequently funny
- Emotion: 1=neutral/factual, 10=very expressive/emotional`;

    const userPrompt = `Analyze these writing samples and create a voice profile:

${combinedSamples}

Extract:
1. Tone scores (formality, energy, humor, emotion)
2. Sentence patterns (length, style)
3. Signature phrases (things they say repeatedly)
4. Vocabulary patterns
5. Storytelling approach

Return ONLY the JSON object, nothing else.`;

    const result = await this.callOpenAI(apiKey, {
      systemPrompt,
      userPrompt,
      temperature: 0.3
    });
    
    // Parse JSON response
    try {
      const cleaned = result.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('Failed to parse voice profile:', result.content);
      throw new Error('Failed to analyze voice. Please try again.');
    }
  }
}

export default OpenAIService;
