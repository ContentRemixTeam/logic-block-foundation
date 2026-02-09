import { supabase } from '@/integrations/supabase/client';
import { decryptAPIKey } from './encryption';
import { VoiceProfile, BrandProfile, UserProduct, AICopyGeneration, ContentType } from '@/types/aiCopywriting';
import { GenerationMode } from '@/types/generationModes';
import { CopyControls, LENGTH_CONFIGS, EMOTION_CONFIGS, URGENCY_CONFIGS, TONE_CONFIGS } from '@/types/copyControls';
import { checkAIDetection } from './ai-detection-checker';
import { STRATEGIC_EMAIL_CONFIGS, type EmailStrategyConfig } from './email-sequence-strategy';
import AdaptiveLearningService, { AdaptiveParams } from './adaptive-learning-service';
import { QUALITY_EXAMPLES, QUALITY_RUBRIC, checkForBannedPhrases, validateTacticalTip, validateSubjectLines } from './quality-system';
import { BrandDNA } from '@/types/brandDNA';
import { getContentType } from '@/types/contentTypes';
import { buildLinkedInTemplatePrompt } from './linkedin-prompt-builder';
import { getLinkedInTemplate } from './linkedin-templates';

interface GenerateOptions {
  contentType: string;
  generationMode?: GenerationMode;
  copyControls?: CopyControls;
  linkedInTemplateId?: string;
  context: {
    businessProfile?: Partial<BrandProfile>;
    brandDNA?: BrandDNA;
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
   * Build system prompt with deep voice matching and anti-AI rules
   */
  private static buildSystemPrompt(
    context: GenerateOptions['context'],
    adaptiveParams?: AdaptiveParams
  ): string {
    const profile = context.businessProfile;
    const voiceProfile = profile?.voice_profile as VoiceProfile | undefined;
    
    let prompt = `You are an elite copywriter writing as ${profile?.business_name || 'this business owner'}.

CRITICAL: This copy must sound EXACTLY like the writing samples provided. Not like AI. Not like a professional copywriter. Like THIS SPECIFIC PERSON.

`;

    // Add voice profile if available
    if (voiceProfile) {
      prompt += `VOICE PROFILE (match this EXACTLY - this is HOW they think):

TONE SCORES:
- Formality: ${voiceProfile.tone_scores?.formality || 5}/10 ${(voiceProfile.tone_scores?.formality || 5) < 4 ? '(very casual, like texting)' : (voiceProfile.tone_scores?.formality || 5) > 7 ? '(professional/formal)' : '(conversational)'}
- Energy: ${voiceProfile.tone_scores?.energy || 5}/10 ${(voiceProfile.tone_scores?.energy || 5) > 7 ? '(high energy, enthusiastic)' : (voiceProfile.tone_scores?.energy || 5) < 4 ? '(calm, measured)' : '(moderate energy)'}
- Emotion: ${voiceProfile.tone_scores?.emotion || 5}/10 ${(voiceProfile.tone_scores?.emotion || 5) > 7 ? '(very expressive, storytelling)' : '(balanced emotion)'}
- Humor: ${voiceProfile.tone_scores?.humor || 5}/10

`;

      // Add deep writing patterns
      if (voiceProfile.writing_patterns) {
        const wp = voiceProfile.writing_patterns;
        prompt += `WRITING PATTERNS (replicate these decision-making habits):
- When making a point: ${wp.decision_making_style === 'data-driven' ? 'Leads with data/stats/numbers' : wp.decision_making_style === 'story-driven' ? 'Tells a story first, then makes the point' : wp.decision_making_style === 'authority-driven' ? 'Makes authoritative statements backed by experience' : 'Mixes data, stories, and authority'}
- Transitions between ideas: ${wp.transition_style === 'abrupt' ? 'Jumps quickly, short bridges' : wp.transition_style === 'smooth' ? 'Smooth, flowing connections' : 'Conversational asides and natural pivots'}
- Provides examples using: ${wp.example_usage === 'specific-numbers' ? 'Concrete numbers, dates, amounts' : wp.example_usage === 'relatable-scenarios' ? 'Relatable "imagine this" scenarios' : wp.example_usage === 'client-stories' ? 'Real client/customer stories' : 'Mix of numbers, scenarios, and stories'}
- Handles objections: ${wp.objection_handling === 'direct-address' ? 'Addresses them head-on' : wp.objection_handling === 'story-reframe' ? 'Reframes through stories' : wp.objection_handling === 'preemptive' ? 'Preempts before reader thinks it' : 'Varies approach'}
- CTAs (calls to action): ${wp.cta_style === 'direct-command' ? 'Direct commands ("Do this")' : wp.cta_style === 'soft-invitation' ? 'Soft invitations ("Want to try?")' : wp.cta_style === 'question-based' ? 'Questions ("Ready to X?")' : 'Varies style'}

`;
      }

      // Add structural preferences
      if (voiceProfile.structural_preferences) {
        const sp = voiceProfile.structural_preferences;
        prompt += `STRUCTURAL HABITS:
- Paragraph length: ${sp.paragraph_length === 'short' ? '1-3 sentences max' : sp.paragraph_length === 'medium' ? '3-5 sentences' : sp.paragraph_length === 'long' ? '5+ sentences' : 'Varies strategically'}
- Sentence variety: ${sp.sentence_variety}/10 ${sp.sentence_variety > 7 ? '(dramatic mix of 3-word and 30-word sentences)' : sp.sentence_variety < 4 ? '(consistent length)' : '(moderate variety)'}
- Uses lists/bullets: ${sp.list_usage}
- Uses questions: ${sp.question_usage === 'rhetorical' ? 'Rhetorical (for emphasis)' : sp.question_usage === 'engagement' ? 'For engagement (expects replies)' : sp.question_usage === 'clarifying' ? 'To clarify/teach' : 'Mixed usage'}

`;
      }

      // Add psychological style
      if (voiceProfile.psychological_style) {
        const ps = voiceProfile.psychological_style;
        prompt += `PSYCHOLOGICAL APPROACH:
- Empathy level: ${ps.empathy_level}/10 ${ps.empathy_level > 7 ? '(highly empathetic, "I get it" energy)' : ps.empathy_level < 4 ? '(more logical/practical)' : '(balanced)'}
- Projects as: ${ps.authority_projection === 'expert' ? 'Expert/Authority' : ps.authority_projection === 'peer' ? 'Peer/Friend' : ps.authority_projection === 'guide' ? 'Experienced Guide' : 'Mix'}
- Vulnerability: ${ps.vulnerability_index}/10 ${ps.vulnerability_index > 7 ? '(shares struggles openly)' : ps.vulnerability_index < 4 ? '(mostly shows wins)' : '(balanced)'}
- Urgency: ${ps.urgency_tendency === 'soft' ? 'Gentle suggestions' : ps.urgency_tendency === 'moderate' ? 'Moderate nudges' : 'Strong pushes/deadlines'}

`;
      }

      // Add pattern examples (MOST IMPORTANT - show GPT actual examples)
      if (voiceProfile.pattern_examples) {
        const pe = voiceProfile.pattern_examples;
        
        if (pe.typical_opening && pe.typical_opening.length > 0) {
          prompt += `HOW THEY TYPICALLY OPEN MESSAGES (use these patterns):
${pe.typical_opening.slice(0, 3).map(ex => `"${ex}"`).join('\n')}

`;
        }
        
        if (pe.typical_transition && pe.typical_transition.length > 0) {
          prompt += `HOW THEY TRANSITION BETWEEN IDEAS (replicate this style):
${pe.typical_transition.slice(0, 3).map(ex => `"${ex}"`).join('\n')}

`;
        }
        
        if (pe.typical_cta && pe.typical_cta.length > 0) {
          prompt += `HOW THEY ASK FOR ACTION (match this CTA style):
${pe.typical_cta.slice(0, 3).map(ex => `"${ex}"`).join('\n')}

`;
        }
        
        if (pe.typical_proof && pe.typical_proof.length > 0) {
          prompt += `HOW THEY BUILD CREDIBILITY (use this proof style):
${pe.typical_proof.slice(0, 3).map(ex => `"${ex}"`).join('\n')}

`;
        }
      }

      // Sentence style
      if (voiceProfile.sentence_structure) {
        prompt += `SENTENCE STYLE:
- Average length: ${voiceProfile.sentence_structure.avg_length || 15} words
- Overall style: ${voiceProfile.sentence_structure.style}

`;
      }

      // Signature phrases
      if (voiceProfile.signature_phrases && voiceProfile.signature_phrases.length > 0) {
        prompt += `SIGNATURE PHRASES (use sparingly and naturally - don't force these):
${voiceProfile.signature_phrases.slice(0, 8).map(p => `- "${p}"`).join('\n')}

`;
      }

      // Style summary
      if (voiceProfile.style_summary) {
        prompt += `OVERALL STYLE: ${voiceProfile.style_summary}

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

CRITICAL VOICE MATCHING RULES:
1. Don't just match TONE - match their THINKING PATTERNS
2. Use the pattern examples as templates for structure
3. If they lead with stories, YOU lead with stories
4. If they use specific numbers, YOU use specific numbers  
5. If their CTAs are questions, YOUR CTAs should be questions
6. Match their paragraph and sentence rhythm exactly

You're not "writing like them" - you're THINKING like them and writing what they would write.`;

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
    
    // Add adaptive learning adjustments
    if (adaptiveParams) {
      prompt += AdaptiveLearningService.buildAdaptivePromptAdditions(adaptiveParams);
    }
    
    return prompt;
  }
  
  /**
   * Get the content family for a given content type (for example matching)
   */
  private static getContentFamily(contentType: string): keyof BrandDNA['content_examples'] | null {
    if (contentType.startsWith('welcome_email') || contentType.includes('email') || contentType === 'newsletter' || contentType === 'promo_email') {
      return 'email';
    }
    if (contentType.includes('instagram') || contentType.includes('linkedin') || contentType.includes('twitter') || contentType.includes('facebook') || contentType === 'social_post') {
      return 'social';
    }
    if (contentType.includes('sales') || contentType.includes('headline') || contentType.includes('landing')) {
      return 'sales';
    }
    if (contentType.includes('blog') || contentType.includes('video') || contentType.includes('article')) {
      return 'longform';
    }
    return null;
  }

  /**
   * Build Brand DNA prompt additions
   */
  private static buildBrandDNAPromptAdditions(brandDNA?: BrandDNA, contentType?: string): string {
    if (!brandDNA) return '';
    
    let additions = '\n\n=== BRAND DNA (CRITICAL COMPLIANCE REQUIRED) ===\n';
    
    // Custom banned phrases - CRITICAL enforcement at the top
    if (brandDNA.custom_banned_phrases && brandDNA.custom_banned_phrases.length > 0) {
      additions += `\n🚫 ABSOLUTELY FORBIDDEN PHRASES (never use these - this is non-negotiable):
${brandDNA.custom_banned_phrases.map(phrase => `- "${phrase}"`).join('\n')}

If you accidentally write any of these phrases, STOP immediately and rewrite that section without them.
`;
    }
    
    // Content Philosophies - shape the overall approach
    if (brandDNA.content_philosophies && brandDNA.content_philosophies.length > 0) {
      additions += `\n📚 CONTENT PHILOSOPHIES (follow these principles):
${brandDNA.content_philosophies.map((p, i) => `${i + 1}. ${p}`).join('\n')}
`;
    }
    
    // Frameworks (if applicable to content type)
    if (brandDNA.frameworks && brandDNA.frameworks.length > 0) {
      additions += `\n🎯 PREFERRED FRAMEWORKS (structure content using these when relevant):
${brandDNA.frameworks.map(f => `
📋 ${f.name}
Description: ${f.description}
${f.example ? `Example:\n${f.example}` : ''}
`).join('\n')}
`;
    }
    
    // Brand Values
    if (brandDNA.brand_values && brandDNA.brand_values.length > 0) {
      additions += `\n💎 BRAND VALUES (infuse these into the messaging):
${brandDNA.brand_values.join(', ')}
`;
    }
    
    // Signature phrases
    if (brandDNA.signature_phrases && brandDNA.signature_phrases.length > 0) {
      additions += `\n💬 SIGNATURE PHRASES (use naturally when fitting - don't force):
${brandDNA.signature_phrases.map(phrase => `- "${phrase}"`).join('\n')}
`;
    }
    
    // Content examples for this type (few-shot learning)
    if (contentType && brandDNA.content_examples) {
      const contentFamily = this.getContentFamily(contentType);
      if (contentFamily) {
        const examples = brandDNA.content_examples[contentFamily];
        const validExamples = examples?.filter(ex => ex && ex.trim().length > 50);
        
        if (validExamples && validExamples.length > 0) {
          additions += `\n\n📝 EXAMPLES OF EXCELLENT ${contentFamily.toUpperCase()} (match this quality):
${validExamples.map((ex, i) => `
Example ${i + 1}:
${ex.substring(0, 800)}
`).join('\n')}
`;
        }
      }
    }
    
    // Emoji Preferences
    if (brandDNA.emoji_preferences) {
      const prefs = brandDNA.emoji_preferences;
      if (prefs.use_emojis && prefs.preferred_emojis?.length > 0) {
        additions += `\n😊 EMOJI USAGE:
Use emojis sparingly. Preferred options: ${prefs.preferred_emojis.join(' ')}
`;
      } else if (!prefs.use_emojis) {
        additions += `\n❌ EMOJI USAGE: Do NOT use emojis in this content.
`;
      }
    }
    
    return additions;
  }
  
  /**
   * Build content type guidance from new content types system
   */
  private static buildContentTypeGuidance(contentTypeId: string): string {
    const contentTypeDef = getContentType(contentTypeId);
    if (!contentTypeDef) return '';
    
    return `\n\n═══ CONTENT TYPE: ${contentTypeDef.name} ═══\n${contentTypeDef.guidance}\n`;
  }
  
  /**
   * Build control-based prompt additions
   */
  private static buildControlPromptAdditions(controls?: CopyControls): string {
    if (!controls) return '';
    
    let additions = '\n\n=== COPY CUSTOMIZATION REQUIREMENTS ===\n\n';
    
    // Length control
    additions += `LENGTH REQUIREMENT:\n${LENGTH_CONFIGS[controls.length].promptAddition}\n\n`;
    
    // Emotional intensity
    additions += `EMOTIONAL INTENSITY:\n${EMOTION_CONFIGS[controls.emotion].promptAddition}\n\n`;
    
    // Urgency level
    additions += `URGENCY LEVEL:\n${URGENCY_CONFIGS[controls.urgency].promptAddition}\n\n`;
    
    // Tone style
    additions += `TONE STYLE:\n${TONE_CONFIGS[controls.tone].promptAddition}\n\n`;
    
    return additions;
  }
  
  /**
   * Build user prompt for specific content type with strategic intelligence
   */
  private static buildUserPrompt(options: GenerateOptions): string {
    const { contentType, context } = options;
    const profile = context.businessProfile;
    const product = context.productToPromote;
    
    // Get strategic email config if it's an email type
    const strategyConfig = STRATEGIC_EMAIL_CONFIGS[contentType];
    
    if (!strategyConfig) {
      // Fallback for non-email content types - use new content type system
      let prompt = `Create ${contentType.replace(/_/g, ' ')} copy for ${profile?.business_name || 'this business'}.

TARGET AUDIENCE: ${profile?.target_customer || 'Not specified'}

`;

      // Add content type guidance from new system
      prompt += this.buildContentTypeGuidance(contentType);

      if (product) {
        prompt += `\nPRODUCT/OFFER:
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
    
    // Build strategic email-specific prompt
    let prompt = `Create ${contentType.replace(/_/g, ' ')} for a strategic welcome email sequence.

=== STRATEGIC CONTEXT ===

CUSTOMER JOURNEY STAGE:
${strategyConfig.strategicFramework.customerStage}

PSYCHOLOGICAL STATE (what they're thinking/feeling):
${strategyConfig.strategicFramework.psychologicalState}

OBJECTIONS TO PREEMPT:
${strategyConfig.strategicFramework.objectionsToPreempt.map(obj => `- ${obj}`).join('\n')}

PROOF REQUIRED:
${strategyConfig.strategicFramework.proofRequired}

TRUST BUILDING STRATEGY:
${strategyConfig.strategicFramework.trustBuilding}

=== CONVERSION MECHANICS ===

PRIMARY GOAL: ${strategyConfig.conversionMechanics.primaryGoal}
${strategyConfig.conversionMechanics.secondaryGoal ? `SECONDARY GOAL: ${strategyConfig.conversionMechanics.secondaryGoal}` : ''}

CTA STRATEGY: ${strategyConfig.conversionMechanics.ctaStrategy}

CRITICAL - AVOID AT ALL COSTS:
${strategyConfig.conversionMechanics.avoidAtAllCosts.map(item => `❌ ${item}`).join('\n')}

=== PSYCHOLOGICAL HOOKS TO ACTIVATE ===
${strategyConfig.psychologicalHooks.map(hook => `✓ ${hook}`).join('\n')}

=== BUSINESS CONTEXT ===
- Business: ${profile?.business_name || '[Business Name]'}
- Industry: ${profile?.industry || 'Not specified'}
- What they sell: ${profile?.what_you_sell || 'Products/services'}
- Target customer: ${profile?.target_customer || 'Not specified'}

`;

    // Add product context if available
    if (product) {
      prompt += `=== PRODUCT/OFFER TO MENTION ===
- Name: ${product.product_name}
- Type: ${product.product_type}
- Price: ${product.price ? `$${product.price}` : 'Pricing varies'}
- Description: ${product.description || 'Not provided'}

`;
    }

    // Add additional context if provided
    if (context.additionalContext) {
      prompt += `=== ADDITIONAL CONTEXT FROM USER ===
${context.additionalContext}

`;
    }

    // Add structure and guidelines
    prompt += `=== EMAIL STRUCTURE ===
${strategyConfig.structure.map((item, i) => `${i + 1}. ${item}`).join('\n')}

THINGS TO AVOID:
${strategyConfig.avoid.map(item => `❌ ${item}`).join('\n')}

LENGTH: ${strategyConfig.length}
TONE: ${strategyConfig.tone}

=== DELIVERABLE ===
1. Subject line options (${strategyConfig.subjectLineCount} variations - curiosity-driven, not clickbait)
2. Email body (plain text, no HTML)

${options.contentType === 'welcome_email_1' && strategyConfig.tacticalTipRequirements ? `
=== CRITICAL: TACTICAL TIP REQUIREMENT ===

Email 1 MUST include ONE tactical tip that meets ALL these criteria:

MUST HAVE:
${strategyConfig.tacticalTipRequirements.mustHave.map(req => `✓ ${req}`).join('\n')}

MUST AVOID:
${strategyConfig.tacticalTipRequirements.mustAvoid.map(avoid => `❌ ${avoid}`).join('\n')}

GOLD STANDARD: ${strategyConfig.tacticalTipRequirements.goldStandard}

=== TACTICAL TIP EXAMPLES (Study These) ===
${strategyConfig.tacticalTipExamples?.slice(0, 2).map((ex, i) => `
EXAMPLE ${i + 1}: ${ex.topic}
❌ BAD: "${ex.badExample}"
✅ GOOD: "${ex.goodExample}"
`).join('\n---\n') || ''}

DO NOT write vague advice. GIVE THEM SOMETHING VALUABLE THEY CAN DO RIGHT NOW.
` : ''}

=== CRITICAL REMINDERS ===
- Match the voice profile EXACTLY (sound like the business owner, not ChatGPT)
- Use the strategic context above - this isn't just an email, it's a specific moment in their journey
- Activate the psychological hooks listed
- Preempt the objections listed
- Provide the proof type required at this stage
- Follow the CTA strategy specified
- Use specific examples with details (names, dates, exact amounts)
- Be conversational (like you're writing to a friend)
- No generic inspiration - be tactical and real

Write this email now. Remember: You're not just writing an email, you're engineering a specific psychological moment in their customer journey.`;

    return prompt;
  }
  
  /**
   * Specialized generation for LinkedIn posts using templates
   * Uses the template-specific prompts and anti-AI rules
   */
  private static async generateLinkedInWithTemplate(
    templateId: string,
    context: GenerateOptions['context'],
    baseTemperature: number
  ): Promise<{ content: string; tokens: number }> {
    const brandDNA = context.brandDNA;
    
    if (!brandDNA) {
      throw new Error('Brand DNA is required for template-based generation');
    }
    
    // Extract topic from additional context
    const topic = context.additionalContext || 'my professional experience';
    
    // Extract brain dump if provided (from ideation flow)
    let brainDump: string | undefined;
    if (context.additionalContext?.includes('USER\'S THOUGHTS & IDEAS:')) {
      const parts = context.additionalContext.split('USER\'S THOUGHTS & IDEAS:');
      brainDump = parts[1]?.trim();
    }
    
    // Build template-specific prompts
    const { systemPrompt, userPrompt } = buildLinkedInTemplatePrompt(
      templateId,
      topic,
      brandDNA,
      brainDump
    );
    
    let totalTokens = 0;
    
    // Pass 1: Generate initial draft using template
    const draft = await this.callOpenAI({
      systemPrompt,
      userPrompt,
      temperature: baseTemperature,
    });
    totalTokens += draft.tokens;
    
    // Pass 2: Quality check and refinement
    const refinement = await this.callOpenAI({
      systemPrompt: `You are a LinkedIn content editor. Review this post and improve it.

CRITICAL CHECKS:
1. Does it follow the template structure? If not, restructure it.
2. Are there ANY banned AI phrases? Remove them completely.
3. Does it use contractions naturally? (I'm, don't, can't)
4. Does it have specific numbers/examples?
5. Does it end with a genuine, specific question (not "Thoughts?" or "Agree?")?
6. Does it sound like a real person wrote it?

BANNED PHRASES TO REMOVE:
- "I'm excited to share", "Let me share", "Here's the thing"
- "game-changer", "leverage", "unlock"
- "in today's landscape", "delve into"
- "Thoughts?", "Agree?", "What do you think?"

Keep the post's structure and message intact while fixing issues.`,
      userPrompt: `ORIGINAL POST:\n${draft.content}\n\nReview and improve this LinkedIn post. Keep the same structure and core message, but fix any issues.`,
      temperature: 0.6,
    });
    totalTokens += refinement.tokens;
    
    return {
      content: refinement.content,
      tokens: totalTokens,
    };
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
    
    // Get adaptive learning parameters based on user's past feedback
    const feedbackPattern = await AdaptiveLearningService.analyzeFeedbackPatterns(
      userId, 
      options.contentType as ContentType
    );
    
    const adaptiveParams = AdaptiveLearningService.generateAdaptiveParams(feedbackPattern);
    
    // Adjust base temperature based on learning
    const baseTemperature = 0.8 + adaptiveParams.temperatureAdjustment;
    
    // Determine which mode to use
    const generationMode = options.generationMode || 'premium';
    const useEfficientMode = generationMode === 'efficient';
    
    // Check if this is a LinkedIn post with a template selected
    const isLinkedInWithTemplate = options.contentType === 'linkedin_post' && options.linkedInTemplateId;
    
    let finalContent = '';
    let totalTokens = 0;
    let aiCheck = { score: 0, warnings: [] as string[], suggestions: [] as string[] };
    
    // LINKEDIN TEMPLATE PATH: Specialized high-quality generation
    if (isLinkedInWithTemplate) {
      const templateResult = await this.generateLinkedInWithTemplate(
        options.linkedInTemplateId!,
        options.context,
        baseTemperature
      );
      finalContent = templateResult.content;
      totalTokens = templateResult.tokens;
      aiCheck = checkAIDetection(finalContent);
    } else if (useEfficientMode) {
      // EFFICIENT MODE: 4-pass system with quality examples
      const controlAdditions = this.buildControlPromptAdditions(options.copyControls);
      const brandDNAAdditions = this.buildBrandDNAPromptAdditions(options.context.brandDNA, options.contentType);
      
      // Pass 1: Generate initial draft with quality examples
      const draft = await this.callOpenAI({
        systemPrompt: this.buildSystemPrompt(options.context, adaptiveParams) + QUALITY_EXAMPLES + controlAdditions + brandDNAAdditions,
        userPrompt: this.buildUserPrompt(options),
        temperature: baseTemperature,
      });
      totalTokens += draft.tokens;
      
      // Pass 2: Combined critique (strategic + voice + conversion + banned phrases)
      const critique = await this.callOpenAI({
        systemPrompt: `You are a direct-response copywriting expert. Review this ${options.contentType} and identify issues:

${options.contentType === 'welcome_email_1' ? `
CRITICAL FOR EMAIL 1: Check if there is a TACTICAL TIP that:
1. Gives specific steps (not "think about" or "consider")
2. Can be done within 30 minutes
3. Has a clear expected outcome
4. Is actionable TODAY

If the tactical tip is missing or vague, this is a CRITICAL FAILURE.
` : ''}

CHECK FOR BANNED AI PHRASES (must be removed):
- "here's what/how/why", "secret weapon", "game changer", "transform your"
- "at the end of the day", "take it to the next level", "unlock the secrets"
- "feel free to", "don't hesitate to", "I hope this helps"

1. STRATEGIC: Does it match the customer journey stage and preempt objections?
2. VOICE: Does it sound like the provided writing samples?
3. CONVERSION: Are CTAs clear? Is proof appropriate?
4. BANNED PHRASES: List any AI phrases that need removal.
${options.contentType === 'welcome_email_1' ? '5. TACTICAL TIP: Is there a specific, actionable tip they can do today?' : ''}

Be specific and actionable.`,
        userPrompt: `COPY TO CRITIQUE:\n${draft.content}\n\nProvide specific, actionable feedback.`,
        temperature: 0.3,
      });
      totalTokens += critique.tokens;
      
      // Pass 3: Rewrite from critique
      const rewrite = await this.callOpenAI({
        systemPrompt: this.buildSystemPrompt(options.context, adaptiveParams) + QUALITY_EXAMPLES + controlAdditions,
        userPrompt: `ORIGINAL COPY:\n${draft.content}\n\nCRITIQUE:\n${critique.content}\n\nRewrite addressing all feedback. Make it better. Remove ALL banned phrases.`,
        temperature: 0.7,
      });
      totalTokens += rewrite.tokens;
      finalContent = rewrite.content;
      
      // Pass 4: AI detection refinement if needed
      aiCheck = checkAIDetection(finalContent);
      if (aiCheck.score > 3) {
        const refinement = await this.callOpenAI({
          systemPrompt: `Rewrite to sound 100% human. Current AI score: ${aiCheck.score}/10.

Issues: ${aiCheck.warnings.join(', ')}

Fix: ${aiCheck.suggestions.join(', ')}`,
          userPrompt: finalContent,
          temperature: 0.8,
        });
        totalTokens += refinement.tokens;
        finalContent = refinement.content;
        aiCheck = checkAIDetection(finalContent);
      }
      
    } else {
      // PREMIUM MODE: Quality-First Multi-Pass System with validation gates
      const controlAdditions = this.buildControlPromptAdditions(options.copyControls);
      const brandDNAAdditions = this.buildBrandDNAPromptAdditions(options.context.brandDNA, options.contentType);
      
      // PASS 1: Examples-First Draft with quality examples and controls
      const draft1 = await this.callOpenAI({
        systemPrompt: this.buildSystemPrompt(options.context, adaptiveParams) + QUALITY_EXAMPLES + controlAdditions + brandDNAAdditions,
        userPrompt: this.buildUserPrompt(options),
        temperature: baseTemperature
      });
      
      // PASS 2: Self-Scoring with Rubric
      const scoring = await this.callOpenAI({
        systemPrompt: 'You are a quality auditor. Score this email against the rubric. Be brutally honest.',
        userPrompt: `${QUALITY_RUBRIC}\n\nEMAIL TO SCORE:\n${draft1.content}`,
        temperature: 0.2,
      });
      
      // Parse overall score from scoring response
      const scoreMatch = scoring.content.match(/AVERAGE:\s*(\d+(?:\.\d+)?)/);
      const overallScore = scoreMatch ? parseFloat(scoreMatch[1]) : 10;
      
      let currentDraft = draft1.content;
      totalTokens = draft1.tokens + scoring.tokens;
      
      // VALIDATION GATE 1: Quality Score < 7 triggers rewrite
      if (overallScore < 7) {
        const rewrite1 = await this.callOpenAI({
          systemPrompt: this.buildSystemPrompt(options.context, adaptiveParams) + QUALITY_EXAMPLES + controlAdditions,
          userPrompt: `ORIGINAL DRAFT:\n${currentDraft}\n\nQUALITY AUDIT:\n${scoring.content}\n\nRewrite fixing ALL issues identified. Must score 8+/10 on every criterion.`,
          temperature: 0.7,
        });
        totalTokens += rewrite1.tokens;
        currentDraft = rewrite1.content;
      }
      
      // VALIDATION GATE 2: Banned Phrases Check
      const bannedCheck = checkForBannedPhrases(currentDraft);
      if (!bannedCheck.passes) {
        const phraseFix = await this.callOpenAI({
          systemPrompt: this.buildSystemPrompt(options.context, adaptiveParams) + controlAdditions,
          userPrompt: `EMAIL:\n${currentDraft}\n\nFOUND BANNED AI PHRASES: ${bannedCheck.found.join(', ')}\n\nRewrite removing ALL these phrases. Replace with natural, human alternatives. Do not use any of these AI-sounding phrases.`,
          temperature: 0.6,
        });
        totalTokens += phraseFix.tokens;
        currentDraft = phraseFix.content;
      }
      
      // VALIDATION GATE 3: Tactical Tip Check (Email 1 only)
      if (options.contentType === 'welcome_email_1') {
        const tipCheck = validateTacticalTip(currentDraft);
        if (!tipCheck.passes) {
          const tipFix = await this.callOpenAI({
            systemPrompt: this.buildSystemPrompt(options.context, adaptiveParams) + QUALITY_EXAMPLES + controlAdditions,
            userPrompt: `EMAIL:\n${currentDraft}\n\nTACTICAL TIP ISSUES:\n${!tipCheck.hasNumberedSteps ? '- Missing numbered steps\n' : ''}${!tipCheck.hasTimeframe ? '- Missing specific timeframe (TODAY, this week, etc.)\n' : ''}${!tipCheck.hasOutcome ? '- Missing expected outcome\n' : ''}\n\nRewrite the tactical tip section with:\n1. Numbered steps (1. 2. 3.)\n2. Specific timeframe (today, this week, next 7 days)\n3. Expected outcome (what will happen)\n4. Invitation to report back\n\nUse the QUALITY EXAMPLES as reference. Make it SPECIFIC and ACTIONABLE.`,
            temperature: 0.7,
          });
          totalTokens += tipFix.tokens;
          currentDraft = tipFix.content;
        }
      }
      
      // VALIDATION GATE 4: Subject Line Quality
      const subjectLines = currentDraft.match(/Subject.*:\s*\n([\s\S]*?)(?=\n\n|Email Body|---)/i);
      if (subjectLines) {
        const lines = subjectLines[1].split('\n').filter(l => l.trim() && l.match(/^\d+\./));
        const subjectCheck = validateSubjectLines(lines);
        if (!subjectCheck.passes) {
          const subjectFix = await this.callOpenAI({
            systemPrompt: 'You are a subject line expert. Create specific, number-driven subject lines that reference the actual email content.',
            userPrompt: `EMAIL BODY:\n${currentDraft}\n\nCURRENT SUBJECT LINES (too generic):\n${lines.join('\n')}\n\nRewrite 3 subject lines that:\n1. Include specific numbers from the email\n2. Reference the actual tactical tip/content\n3. Create curiosity without clickbait\n\nEXAMPLE GOOD SUBJECT LINES:\n"Answer 3 questions, get 10 DMs (15 minutes)"\n"The $4K launch I built in 7 days (no ads)"\n"Why 47 subscribers beat 4,700 (engagement math)"\n\nReturn just the 3 numbered subject lines, nothing else.`,
            temperature: 0.7,
          });
          totalTokens += subjectFix.tokens;
          
          // Replace subject lines in draft
          const newSubjects = subjectFix.content.split('\n').filter(l => l.trim());
          if (newSubjects.length >= 1) {
            currentDraft = currentDraft.replace(
              /Subject.*:\s*\n[\s\S]*?(?=\n\n|Email Body|---)/i,
              `Subject Line Options:\n${newSubjects.slice(0, 3).map((l, i) => `${i+1}. ${l.replace(/^\d+\.\s*/, '')}`).join('\n')}\n`
            );
          }
        }
      }
      
      // PASS 5: Final AI Humanization if needed
      aiCheck = checkAIDetection(currentDraft);
      if (aiCheck.score > 3) {
        const humanize = await this.callOpenAI({
          systemPrompt: `${this.buildSystemPrompt(options.context, adaptiveParams)}

CRITICAL: This copy scored ${aiCheck.score}/10 for AI detection. Rewrite to sound completely human.

Issues found:
${aiCheck.warnings.join('\n')}

MUST FIX:
${aiCheck.suggestions.join('\n')}

Write like a real person - imperfect, conversational, authentic. Not like ChatGPT.`,
          userPrompt: `Make this sound 100% human (current AI score: ${aiCheck.score}/10):\n\n${currentDraft}`,
          temperature: baseTemperature
        });
        
        totalTokens += humanize.tokens;
        currentDraft = humanize.content;
        aiCheck = checkAIDetection(currentDraft);
      }
      
      finalContent = currentDraft;
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
   * Call OpenAI API via backend proxy
   */
  private static async callOpenAI(params: CallOpenAIParams): Promise<CallOpenAIResult> {
    const { data, error } = await supabase.functions.invoke('openai-proxy', {
      body: {
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt }
        ],
        temperature: params.temperature,
        max_tokens: 2000
      }
    });
    
    if (error) {
      throw new Error(error.message || 'OpenAI API call failed');
    }
    
    if (data?.error) {
      throw new Error(data.error);
    }
    
    return {
      content: data?.content || '',
      tokens: data?.tokens || 0
    };
  }
  
  /**
   * Analyze voice from text samples - deep pattern extraction
   */
  static async analyzeVoice(userId: string, samples: string[]): Promise<VoiceProfile> {
    
    const combinedSamples = samples.filter(s => s && s.trim()).join('\n\n---\n\n');
    
    const systemPrompt = `You are a writing forensics expert analyzing HOW someone thinks through writing, not just what they write.

Your job is to extract the DECISION-MAKING PATTERNS behind their writing so AI can replicate their thought process.

Analyze these writing samples for:

1. DECISION-MAKING PATTERNS:
   - When facing a point to make, do they lead with data/stats, stories, or authority statements?
   - How do they handle potential objections? (Address directly? Reframe with story? Preempt before reader thinks it?)
   - What type of proof do they typically use? (Specific numbers? Client stories? Relatable scenarios?)

2. STRUCTURAL DNA:
   - How do they transition between ideas? (Abrupt jumps? Smooth bridges? Conversational asides?)
   - Do they use questions to engage readers, clarify points, or rhetorically?
   - How varied are their sentence lengths? (Consistent? Wildly mixed? Strategic variety?)
   - How do they use lists/bullets vs. prose paragraphs?

3. PSYCHOLOGICAL FINGERPRINT:
   - How empathetic vs. authoritative is their tone? (Rate 1-10)
   - How vulnerable do they get? Share struggles/failures? (Rate 1-10)
   - Do they project as expert, peer, or guide?
   - How aggressive is their urgency? (Soft suggestions? Moderate nudges? Strong pushes?)

4. CONVERSION MECHANICS:
   - How do they typically ask for action? (Direct commands? Soft invitations? Questions?)
   - How do they open messages? (Mid-thought? Greeting? Hook?)
   - How do they build credibility? (Stories? Stats? Credentials? Results?)

5. PATTERN EXTRACTION:
   - Find 3-5 examples of how they TYPICALLY open a message
   - Find 3-5 examples of how they TRANSITION between ideas
   - Find 3-5 examples of how they ASK for action (CTAs)
   - Find 3-5 examples of how they provide PROOF/credibility

Return ONLY a JSON object (no markdown, no explanation) with this EXACT structure:

{
  "style_summary": "2-3 sentence description",
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
    "uses_contractions": true/false,
    "industry_jargon": true/false,
    "common_words": ["word1", "word2", ...]
  },
  "storytelling_style": "brief description",
  "writing_patterns": {
    "decision_making_style": "data-driven" | "story-driven" | "authority-driven" | "mixed",
    "transition_style": "abrupt" | "smooth" | "conversational",
    "example_usage": "specific-numbers" | "relatable-scenarios" | "client-stories" | "mixed",
    "objection_handling": "direct-address" | "story-reframe" | "preemptive" | "mixed",
    "cta_style": "direct-command" | "soft-invitation" | "question-based" | "mixed"
  },
  "structural_preferences": {
    "paragraph_length": "short" | "medium" | "long" | "mixed",
    "sentence_variety": 1-10,
    "list_usage": "frequent" | "occasional" | "rare",
    "question_usage": "rhetorical" | "engagement" | "clarifying" | "mixed"
  },
  "psychological_style": {
    "empathy_level": 1-10,
    "authority_projection": "expert" | "peer" | "guide" | "mixed",
    "vulnerability_index": 1-10,
    "urgency_tendency": "soft" | "moderate" | "aggressive"
  },
  "pattern_examples": {
    "typical_opening": ["example 1", "example 2", "example 3"],
    "typical_transition": ["example 1", "example 2", "example 3"],
    "typical_cta": ["example 1", "example 2", "example 3"],
    "typical_proof": ["example 1", "example 2", "example 3"]
  }
}

SCORING GUIDES:
- Formality: 1=texting a friend, 10=academic paper
- Energy: 1=calm professor, 10=motivational speaker
- Humor: 1=serious/professional, 10=comedian
- Emotion: 1=neutral/factual, 10=passionate storyteller
- Empathy: 1=pure logic, 10=deeply understanding
- Vulnerability: 1=only shows wins, 10=shares all struggles
- Sentence Variety: 1=all same length, 10=wild mix of short and long

CRITICAL: Base ALL ratings and categorizations on ACTUAL PATTERNS you see in the samples, not assumptions. Quote specific examples to yourself before categorizing.`;

    const userPrompt = `Analyze these writing samples and extract the deep patterns:

${combinedSamples}

For each category, find SPECIFIC EVIDENCE in the samples before making your determination.

For pattern_examples, PULL DIRECT QUOTES from the samples that show:
- How they typically open messages
- How they transition between ideas  
- How they ask for action
- How they provide proof/build credibility

Return ONLY the JSON object matching the schema above. No explanations, no markdown formatting.`;

    const result = await this.callOpenAI({
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
