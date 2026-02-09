// LinkedIn Templates System - Prompt Builder
import type { LinkedInTemplate } from '@/types/linkedinTemplates';
import type { BrandDNA } from '@/types/brandDNA';
import { LINKEDIN_ANTI_AI_RULES, getLinkedInTemplate } from './linkedin-templates';

interface LinkedInTemplatePromptResult {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * Build optimized prompts for LinkedIn template-based generation
 * Total: ~700-1000 tokens depending on context
 */
export function buildLinkedInTemplatePrompt(
  templateId: string,
  topic: string,
  brandDNA: BrandDNA,
  brainDump?: string,
  additionalContext?: string
): LinkedInTemplatePromptResult {
  const template = getLinkedInTemplate(templateId);
  
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }
  
  // Merge banned phrases from system + user's custom list
  const allBannedPhrases = [
    ...LINKEDIN_ANTI_AI_RULES.bannedPhrases,
    ...(brandDNA.custom_banned_phrases || [])
  ];
  const uniqueBanned = [...new Set(allBannedPhrases)];
  
  // Build system prompt
  const systemPrompt = buildSystemPrompt(template, uniqueBanned, brandDNA);
  
  // Build user prompt with topic and context
  const userPrompt = buildUserPrompt(template, topic, brainDump, additionalContext);
  
  return { systemPrompt, userPrompt };
}

function buildSystemPrompt(
  template: LinkedInTemplate,
  bannedPhrases: string[],
  brandDNA: BrandDNA
): string {
  let prompt = `You are writing a LinkedIn post using the "${template.name}" template.

═══ CRITICAL: ANTI-AI ENFORCEMENT ═══

🚫 ABSOLUTELY FORBIDDEN PHRASES (using any of these = automatic failure):
${bannedPhrases.slice(0, 20).map(p => `- "${p}"`).join('\n')}

If you accidentally write any of these, STOP and rewrite that sentence.

✅ REQUIRED VOICE PATTERNS:
${LINKEDIN_ANTI_AI_RULES.requiredPatterns.map(p => `• ${p}`).join('\n')}

✅ ENGAGEMENT RULES:
${LINKEDIN_ANTI_AI_RULES.engagementRules.map(r => `• ${r}`).join('\n')}

═══ TEMPLATE STRUCTURE: ${template.name.toUpperCase()} ═══

Hook Pattern: ${template.hookPattern}

Required Structure:
${template.structure.map((s, i) => `${i + 1}. ${s}`).join('\n')}

═══ GOLD STANDARD EXAMPLE ═══

${template.example}

WHY THIS WORKS:
${template.exampleWhyItWorks.map(w => `• ${w}`).join('\n')}

═══ YOUR TASK ═══

Write a post that:
1. FOLLOWS the structure above exactly
2. MATCHES the example's quality and voice
3. AVOIDS all banned phrases
4. Uses contractions and sounds human
5. Ends with a genuine, specific question

`;

  // Add brand DNA elements
  if (brandDNA.signature_phrases && brandDNA.signature_phrases.length > 0) {
    prompt += `\n💬 SIGNATURE PHRASES TO USE NATURALLY (don't force):
${brandDNA.signature_phrases.slice(0, 5).map(p => `- "${p}"`).join('\n')}
`;
  }

  if (brandDNA.brand_values && brandDNA.brand_values.length > 0) {
    prompt += `\n💎 BRAND VALUES TO INFUSE:
${brandDNA.brand_values.join(', ')}
`;
  }

  if (brandDNA.content_philosophies && brandDNA.content_philosophies.length > 0) {
    prompt += `\n📚 CONTENT PHILOSOPHIES:
${brandDNA.content_philosophies.slice(0, 3).map((p, i) => `${i + 1}. ${p}`).join('\n')}
`;
  }

  // Emoji preferences
  if (brandDNA.emoji_preferences?.use_emojis && brandDNA.emoji_preferences.preferred_emojis?.length > 0) {
    prompt += `\n😊 EMOJI USAGE: Use sparingly. Preferred: ${brandDNA.emoji_preferences.preferred_emojis.join(' ')}
`;
  } else if (!brandDNA.emoji_preferences?.use_emojis) {
    prompt += `\n❌ EMOJI USAGE: Do NOT use emojis.
`;
  }

  return prompt;
}

function buildUserPrompt(
  template: LinkedInTemplate,
  topic: string,
  brainDump?: string,
  additionalContext?: string
): string {
  let prompt = `Write a "${template.name}" LinkedIn post about:

TOPIC: ${topic}

`;

  if (brainDump && brainDump.trim().length > 0) {
    prompt += `MY THOUGHTS & IDEAS (use these as raw material):
${brainDump}

`;
  }

  if (additionalContext && additionalContext.trim().length > 0) {
    prompt += `ADDITIONAL CONTEXT:
${additionalContext}

`;
  }

  prompt += `IMPORTANT:
- Follow the ${template.name} template structure exactly
- Include specific numbers, dates, or amounts where relevant
- The post should be 150-300 words
- End with a genuine question that invites real stories
- Sound like a real person, not a corporate account

Write the post now:`;

  return prompt;
}

/**
 * Check if a generated post passes the anti-AI rules
 */
export function validateLinkedInPost(post: string, customBannedPhrases?: string[]): {
  passes: boolean;
  violations: string[];
  suggestions: string[];
} {
  const violations: string[] = [];
  const suggestions: string[] = [];
  
  const allBanned = [
    ...LINKEDIN_ANTI_AI_RULES.bannedPhrases,
    ...(customBannedPhrases || [])
  ];
  
  // Check for banned phrases
  const lowerPost = post.toLowerCase();
  for (const phrase of allBanned) {
    if (lowerPost.includes(phrase.toLowerCase())) {
      violations.push(`Contains banned phrase: "${phrase}"`);
    }
  }
  
  // Check for contractions
  const noContractions = !/(i'm|don't|can't|won't|it's|that's|you're|we're|they're|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|doesn't|didn't|wouldn't|couldn't|shouldn't)/i.test(post);
  if (noContractions) {
    suggestions.push('Add contractions to sound more natural (I\'m, don\'t, can\'t)');
  }
  
  // Check for weak endings
  const weakEndings = ['thoughts?', 'agree?', 'what do you think?', 'drop a comment'];
  const lastLine = post.split('\n').filter(l => l.trim()).pop()?.toLowerCase() || '';
  for (const weak of weakEndings) {
    if (lastLine.includes(weak)) {
      suggestions.push(`Replace weak ending "${weak}" with a specific question`);
    }
  }
  
  // Check if it ends with a question
  const endsWithQuestion = lastLine.endsWith('?');
  if (!endsWithQuestion) {
    suggestions.push('End with a genuine question to drive engagement');
  }
  
  return {
    passes: violations.length === 0,
    violations,
    suggestions
  };
}
