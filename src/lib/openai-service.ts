import { supabase } from '@/integrations/supabase/client';
import { decryptAPIKey } from './encryption';
import { VoiceProfile, BrandProfile, UserProduct, AICopyGeneration } from '@/types/aiCopywriting';

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
   * Multi-pass generation system for highest quality
   */
  static async generateCopy(userId: string, options: GenerateOptions): Promise<{
    copy: string;
    tokensUsed: number;
    generationTime: number;
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
      temperature: 0.8 // More creative
    });
    
    // PASS 2: Critique the draft
    const critique = await this.callOpenAI(apiKey, {
      systemPrompt: `You are a direct-response copywriting expert. Review this copy and identify:
1. Weak headlines (not curiosity-driven)
2. Vague language (not specific enough)
3. Missing emotional hooks
4. Weak CTAs (not action-oriented)
5. Areas that don't match the brand voice`,
      userPrompt: `COPY TO CRITIQUE:\n${draft1.content}\n\nBRAND VOICE SAMPLES:\n${options.context.businessProfile?.voice_samples?.join('\n\n') || 'None provided'}`,
      temperature: 0.3 // More analytical
    });
    
    // PASS 3: Regenerate based on critique
    const finalCopy = await this.callOpenAI(apiKey, {
      systemPrompt: this.buildSystemPrompt(options.context),
      userPrompt: `ORIGINAL COPY:\n${draft1.content}\n\nCRITIQUE:\n${critique.content}\n\nRewrite the copy addressing all critique points. Make it tighter, more specific, more emotional, and more aligned with the brand voice.`,
      temperature: 0.7
    });
    
    const totalTokens = draft1.tokens + critique.tokens + finalCopy.tokens;
    const generationTime = Date.now() - startTime;
    
    return {
      copy: finalCopy.content,
      tokensUsed: totalTokens,
      generationTime
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
      content: data.choices[0].message.content,
      tokens: data.usage.total_tokens
    };
  }
  
  /**
   * Build system prompt with brand context
   */
  private static buildSystemPrompt(context: GenerateOptions['context']): string {
    const profile = context.businessProfile;
    
    let prompt = `You are an expert copywriter specializing in conversion-focused content.`;
    
    if (profile) {
      prompt += `\n\nBUSINESS CONTEXT:
Business: ${profile.business_name || 'Not specified'}
Industry: ${profile.industry || 'Not specified'}
What they sell: ${profile.what_you_sell || 'Not specified'}
Target customer: ${profile.target_customer || 'Not specified'}`;

      if (profile.voice_profile) {
        const vp = profile.voice_profile as VoiceProfile;
        prompt += `\n\nBRAND VOICE PROFILE:
${vp.style_summary || ''}
Tone Characteristics:
${JSON.stringify(vp.tone_scores || {}, null, 2)}
Signature Phrases:
${vp.signature_phrases?.join('\n') || 'None identified'}`;
      }
      
      if (profile.voice_samples?.length) {
        prompt += `\n\nVOICE SAMPLES (write in this style):
${profile.voice_samples.slice(0, 3).join('\n\n---\n\n')}`;
      }
      
      if (profile.customer_reviews?.length) {
        prompt += `\n\nCUSTOMER VOICE (use their language):
${profile.customer_reviews.slice(0, 5).join('\n')}`;
      }
    }
    
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
    let prompt = '';
    
    if (options.context.productToPromote) {
      prompt += `Product/Offer to promote:\n`;
      prompt += `Name: ${options.context.productToPromote.product_name}\n`;
      prompt += `Type: ${options.context.productToPromote.product_type}\n`;
      if (options.context.productToPromote.price) {
        prompt += `Price: $${options.context.productToPromote.price}\n`;
      }
      if (options.context.productToPromote.description) {
        prompt += `Description: ${options.context.productToPromote.description}\n`;
      }
      prompt += `\n`;
    }
    
    if (options.context.additionalContext) {
      prompt += `Additional context: ${options.context.additionalContext}\n\n`;
    }
    
    // Content type specific instructions
    switch (options.contentType) {
      case 'welcome_email_1':
        prompt += `Write the FIRST email in a welcome sequence. This is sent immediately after someone joins the email list.

Structure:
1. Warm welcome (acknowledge they just joined)
2. Set expectations (what they'll receive, how often)
3. Quick win or valuable insight
4. Soft introduction to who you are
5. Simple CTA (reply, follow on social, or consume free content)

Tone: Warm, appreciative, not salesy
Length: 150-250 words
Subject line: Include a compelling subject line at the top`;
        break;
        
      case 'welcome_email_2':
        prompt += `Write the SECOND email in a welcome sequence. Sent 1-2 days after Email 1.

Structure:
1. Connect with a relatable story or insight
2. Share a valuable tip or framework
3. Build trust through authenticity
4. Light CTA to engage (reply or check content)

Tone: Personal, valuable, building relationship
Length: 200-300 words
Subject line: Include a compelling subject line at the top`;
        break;
        
      case 'welcome_email_3':
        prompt += `Write the THIRD email in a welcome sequence. Sent 2-3 days after Email 2.

Structure:
1. Share your origin story or why you do this work
2. Connect your story to their journey
3. Reinforce your unique approach
4. Subtle positioning as the guide

Tone: Authentic, inspiring, vulnerable
Length: 250-350 words
Subject line: Include a compelling subject line at the top`;
        break;
        
      case 'welcome_email_4':
        prompt += `Write the FOURTH email in a welcome sequence. Sent 2-3 days after Email 3.

Structure:
1. Lead with social proof or results
2. Share a transformation story (client or personal)
3. Extract lessons they can apply
4. Plant seeds about your offer

Tone: Results-focused, inspiring, credible
Length: 200-300 words
Subject line: Include a compelling subject line at the top`;
        break;
        
      case 'welcome_email_5':
        prompt += `Write the FIFTH email in a welcome sequence. Sent 2-3 days after Email 4.

Structure:
1. Transition to offering help
2. Introduce your offer naturally
3. Focus on transformation, not features
4. Clear, compelling CTA
5. Handle main objection

Tone: Helpful, confident, not pushy
Length: 250-350 words
Subject line: Include a compelling subject line at the top`;
        break;
      
      default:
        prompt += `Write compelling ${options.contentType} copy.`;
    }
    
    return prompt;
  }
  
  /**
   * Analyze voice from text samples
   */
  static async analyzeVoice(apiKey: string, samples: string[]): Promise<VoiceProfile> {
    const combinedSamples = samples.filter(s => s.trim()).join('\n\n---\n\n');
    
    const response = await this.callOpenAI(apiKey, {
      systemPrompt: `You are a brand voice analyst. Analyze writing samples and extract detailed voice characteristics.`,
      userPrompt: `Analyze these writing samples and create a voice profile.

SAMPLES:
${combinedSamples}

Extract and return as JSON:
{
  "style_summary": "2-3 sentence description of their writing style",
  "tone_scores": {
    "formality": 1-10 (1=very casual, 10=very formal),
    "energy": 1-10 (1=calm, 10=high-energy),
    "humor": 1-10 (1=none, 10=very funny),
    "emotion": 1-10 (1=data-driven, 10=heart-led)
  },
  "sentence_structure": {
    "avg_length": number,
    "style": "punchy" or "flowing" or "mixed"
  },
  "signature_phrases": ["phrase 1", "phrase 2", "phrase 3"],
  "vocabulary_patterns": {
    "uses_contractions": true/false,
    "industry_jargon": true/false,
    "common_words": ["word1", "word2"]
  },
  "storytelling_style": "description of how they tell stories"
}

Return ONLY valid JSON, no other text.`,
      temperature: 0.3
    });
    
    try {
      // Parse the JSON, handling potential markdown code blocks
      let jsonStr = response.content.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '');
      }
      return JSON.parse(jsonStr);
    } catch {
      throw new Error('Failed to parse voice analysis');
    }
  }
}

export default OpenAIService;
