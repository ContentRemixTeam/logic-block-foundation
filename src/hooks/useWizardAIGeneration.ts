// Hook for generating AI copy within wizards
// Provides multi-pass generation, calendar/vault integration, and progress tracking

import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useBrandProfile, useAPIKey } from '@/hooks/useAICopywriting';
import { useSaveToVault } from '@/hooks/useSaveToVault';
import { useAddCopyToCalendar } from '@/hooks/useAddCopyToCalendar';
import { OpenAIService } from '@/lib/openai-service';
import { checkAIDetection } from '@/lib/ai-detection-checker';
import {
  WizardGenerationContext,
  WizardContentType,
  WizardAIGeneratorState,
  GeneratedEmail,
  GeneratedSequence,
  WizardGenerationResult,
  CalendarScheduleItem,
  VaultSaveItem,
  EMAIL_SEQUENCE_CONFIGS,
} from '@/types/wizardAIGeneration';
import {
  buildEmailSequenceSystemPrompt,
  buildEmailSequenceUserPrompt,
  buildSalesPageSystemPrompt,
  buildSalesPageUserPrompt,
  buildSocialBatchSystemPrompt,
  buildSocialBatchUserPrompt,
  buildCritiquePrompt,
  buildRewritePrompt,
  buildAIRefinementPrompt,
  getSequenceConfig,
} from '@/lib/wizard-ai-prompts';
import { ContentType } from '@/types/aiCopywriting';
import { addDays, format, parseISO } from 'date-fns';

interface UseWizardAIGenerationOptions {
  wizardType: 'launch-v2' | 'summit' | 'content-planner';
  wizardData: Record<string, unknown>;
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

export function useWizardAIGeneration({ wizardType, wizardData }: UseWizardAIGenerationOptions) {
  const { user } = useAuth();
  const { data: brandProfile } = useBrandProfile();
  const { data: apiKey } = useAPIKey();
  const saveToVault = useSaveToVault();
  const addToCalendar = useAddCopyToCalendar();
  
  const [state, setState] = useState<WizardAIGeneratorState>({
    isGenerating: false,
    currentPass: 'draft',
    progress: 0,
    result: null,
    error: null,
  });

  // Check if AI generation is available
  const isAvailable = Boolean(user && apiKey?.key_status === 'valid' && brandProfile);
  const missingRequirements = {
    apiKey: !apiKey || apiKey.key_status !== 'valid',
    brandProfile: !brandProfile,
    user: !user,
  };

  // Build generation context from wizard data and brand profile
  const buildContext = useCallback((): WizardGenerationContext => {
    return {
      wizardType,
      contentType: 'launch_warmup_sequence', // Will be overridden
      
      // Business context from brand profile
      businessName: brandProfile?.business_name || '',
      industry: brandProfile?.industry || '',
      targetCustomer: brandProfile?.target_customer || '',
      whatYouSell: brandProfile?.what_you_sell || '',
      voiceProfile: brandProfile?.voice_profile || undefined,
      voiceSamples: brandProfile?.voice_samples || [],
      
      // Offer context from wizard data
      offerName: (wizardData.name as string) || '',
      offerType: (wizardData.offerType as string) || '',
      pricePoint: (wizardData.pricePoint as number) || (wizardData.offerPricing as any)?.fullPrice || null,
      paymentPlanDetails: (wizardData.paymentPlanDetails as string) || '',
      idealCustomer: (wizardData.idealCustomer as string) || '',
      bonuses: (wizardData.bonusStack as any[])?.map(b => b.name) || [],
      guarantee: (wizardData.offerStack as any)?.guaranteeDetails || '',
      
      // Timeline context
      cartOpensDate: (wizardData.cartOpensDate as string) || '',
      cartClosesDate: (wizardData.cartClosesDate as string) || '',
      launchDuration: (() => {
        const opens = wizardData.cartOpensDate as string;
        const closes = wizardData.cartClosesDate as string;
        if (!opens || !closes) return undefined;
        try {
          const start = parseISO(opens);
          const end = parseISO(closes);
          return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        } catch {
          return undefined;
        }
      })(),
      
      // Launch-specific
      launchStyle: (wizardData.launchStyle as string) || '',
      urgencyType: (wizardData.hasLimitations as string) === 'limited-spots' ? 'spots' : 'deadline',
      spotLimit: (wizardData.spotLimit as number) || undefined,
    };
  }, [wizardType, wizardData, brandProfile]);

  // Call OpenAI API directly
  const callOpenAI = async (params: CallOpenAIParams): Promise<CallOpenAIResult> => {
    if (!user) throw new Error('Not authenticated');
    
    const userApiKey = await OpenAIService.getUserAPIKey(user.id);
    if (!userApiKey) {
      throw new Error('No API key configured. Please add your OpenAI API key in AI Copywriting settings.');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt },
        ],
        temperature: params.temperature,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API call failed');
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || '',
      tokens: data.usage?.total_tokens || 0,
    };
  };

  // Parse email sequence from generated text
  const parseEmailSequence = (text: string, sequenceType: WizardContentType): GeneratedEmail[] => {
    const emails: GeneratedEmail[] = [];
    const emailBlocks = text.split(/---\s*\n/g).filter(block => block.includes('EMAIL'));
    
    emailBlocks.forEach((block, index) => {
      const purposeMatch = block.match(/PURPOSE:\s*(.+)/i);
      const sendDayMatch = block.match(/SEND DAY:\s*(?:Day\s*)?(\d+)/i);
      const subjectMatch = block.match(/SUBJECT LINE OPTIONS:\s*\n([\s\S]*?)(?=\n\nBODY:|BODY:)/i);
      const bodyMatch = block.match(/BODY:\s*\n([\s\S]*?)(?=\n\nCTA:|CTA:)/i);
      const ctaMatch = block.match(/CTA:\s*(.+)/i);
      
      const subjectLines = subjectMatch 
        ? subjectMatch[1].split('\n').filter(l => l.trim()).map(l => l.replace(/^\d+\.\s*/, '').trim())
        : [];
      
      const body = bodyMatch ? bodyMatch[1].trim() : '';
      const aiCheck = checkAIDetection(body);
      
      emails.push({
        id: `email-${Date.now()}-${index}`,
        sequencePosition: index + 1,
        purpose: purposeMatch ? purposeMatch[1].trim() : '',
        subjectLines,
        body,
        sendDay: sendDayMatch ? parseInt(sendDayMatch[1]) : index,
        aiDetectionScore: aiCheck.score,
      });
    });
    
    return emails;
  };

  // Generate email sequence with multi-pass refinement
  const generateEmailSequence = useCallback(async (contentType: WizardContentType): Promise<WizardGenerationResult> => {
    const startTime = Date.now();
    let totalTokens = 0;
    
    const context = buildContext();
    context.contentType = contentType;
    
    const sequenceConfig = getSequenceConfig(contentType);
    if (!sequenceConfig) {
      throw new Error(`Unknown sequence type: ${contentType}`);
    }
    
    setState(prev => ({ ...prev, isGenerating: true, currentPass: 'draft', progress: 10, error: null }));
    
    try {
      // Pass 1: Generate draft
      const draft = await callOpenAI({
        systemPrompt: buildEmailSequenceSystemPrompt(context, sequenceConfig),
        userPrompt: buildEmailSequenceUserPrompt(context, sequenceConfig),
        temperature: 0.8,
      });
      totalTokens += draft.tokens;
      setState(prev => ({ ...prev, currentPass: 'critique', progress: 35 }));
      
      // Pass 2: Critique
      const critique = await callOpenAI({
        systemPrompt: 'You are a direct-response copywriting expert providing specific, actionable feedback.',
        userPrompt: buildCritiquePrompt(draft.content, contentType),
        temperature: 0.3,
      });
      totalTokens += critique.tokens;
      setState(prev => ({ ...prev, currentPass: 'rewrite', progress: 55 }));
      
      // Pass 3: Rewrite based on critique
      const rewrite = await callOpenAI({
        systemPrompt: buildEmailSequenceSystemPrompt(context, sequenceConfig),
        userPrompt: buildRewritePrompt(draft.content, critique.content, context),
        temperature: 0.7,
      });
      totalTokens += rewrite.tokens;
      setState(prev => ({ ...prev, currentPass: 'detection', progress: 75 }));
      
      // Parse emails and check AI detection
      let emails = parseEmailSequence(rewrite.content, contentType);
      const avgScore = emails.reduce((sum, e) => sum + e.aiDetectionScore, 0) / emails.length;
      
      // Pass 4: AI detection refinement if needed
      if (avgScore > 3) {
        const aiCheck = checkAIDetection(rewrite.content);
        const refinement = await callOpenAI({
          systemPrompt: buildEmailSequenceSystemPrompt(context, sequenceConfig),
          userPrompt: buildAIRefinementPrompt(rewrite.content, avgScore, aiCheck.warnings),
          temperature: 0.8,
        });
        totalTokens += refinement.tokens;
        emails = parseEmailSequence(refinement.content, contentType);
      }
      
      setState(prev => ({ ...prev, currentPass: 'complete', progress: 100 }));
      
      const generationTime = Date.now() - startTime;
      const finalAvgScore = emails.reduce((sum, e) => sum + e.aiDetectionScore, 0) / emails.length;
      
      const result: WizardGenerationResult = {
        success: true,
        contentType,
        generatedAt: new Date().toISOString(),
        emailSequence: {
          sequenceType: contentType,
          sequenceLabel: sequenceConfig.label,
          emails,
          totalEmails: emails.length,
          avgAiScore: finalAvgScore,
          tokensUsed: totalTokens,
          generationTimeMs: generationTime,
        },
        tokensUsed: totalTokens,
        generationTimeMs: generationTime,
        avgAiDetectionScore: finalAvgScore,
      };
      
      setState(prev => ({ ...prev, isGenerating: false, result }));
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      setState(prev => ({ ...prev, isGenerating: false, error: errorMessage }));
      throw error;
    }
  }, [buildContext, callOpenAI]);

  // Schedule generated emails to calendar
  const scheduleToCalendar = useCallback(async (
    emails: GeneratedEmail[],
    baseDate: string,
    campaignId?: string
  ): Promise<void> => {
    const base = parseISO(baseDate);
    
    for (const email of emails) {
      const publishDate = format(addDays(base, email.sendDay), 'yyyy-MM-dd');
      const creationDate = format(addDays(base, Math.max(0, email.sendDay - 2)), 'yyyy-MM-dd');
      
      await addToCalendar.mutateAsync({
        generatedCopy: email.body,
        contentType: 'welcome_email_1' as ContentType, // Map to closest type
        generationId: email.id,
        title: email.subjectLines[0] || `Email ${email.sequencePosition}`,
        platform: 'email',
        creationDate,
        publishDate,
        campaignId,
      });
    }
  }, [addToCalendar]);

  // Save generated emails to vault
  const saveSequenceToVault = useCallback(async (emails: GeneratedEmail[]): Promise<void> => {
    for (const email of emails) {
      await saveToVault.mutateAsync({
        title: email.subjectLines[0] || `Email ${email.sequencePosition}`,
        body: email.body,
        contentType: 'welcome_email_1' as ContentType,
        channel: 'email',
        tags: ['ai-generated', 'email-sequence'],
        generationId: email.id,
      });
    }
  }, [saveToVault]);

  // Reset state
  const reset = useCallback(() => {
    setState({
      isGenerating: false,
      currentPass: 'draft',
      progress: 0,
      result: null,
      error: null,
    });
  }, []);

  return {
    // State
    ...state,
    isAvailable,
    missingRequirements,
    
    // Actions
    generateEmailSequence,
    scheduleToCalendar,
    saveSequenceToVault,
    reset,
    
    // Context builder (for preview)
    buildContext,
  };
}
