// Hook for generating AI copy within wizards
// Provides multi-pass generation, calendar/vault integration, progress tracking,
// error recovery with progressive save, and rate limiting

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useBrandProfile, useAPIKey } from '@/hooks/useAICopywriting';
import { useSaveToVault } from '@/hooks/useSaveToVault';
import { useAddCopyToCalendar } from '@/hooks/useAddCopyToCalendar';
import { OpenAIService } from '@/lib/openai-service';
import { checkAIDetection } from '@/lib/ai-detection-checker';
import { toast } from 'sonner';
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

interface SavedGenerationState {
  draft?: string;
  critique?: string;
  draftTokens?: number;
  critiqueTokens?: number;
  contentType?: WizardContentType;
  timestamp?: number;
}

const RATE_LIMIT_COOLDOWN_MS = 10000; // 10 seconds between generations
const DAILY_LIMIT_WARNING = 30;
const DAILY_LIMIT_HARD = 100;

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

  // Rate limiting state
  const [lastGenerationTime, setLastGenerationTime] = useState<number>(0);
  const [generationsToday, setGenerationsToday] = useState<number>(0);
  const [todayDate, setTodayDate] = useState<string>(new Date().toDateString());
  const [hasRecoverableState, setHasRecoverableState] = useState<boolean>(false);

  // Load rate limiting counts from localStorage on mount
  useEffect(() => {
    const today = new Date().toDateString();
    const stored = localStorage.getItem('ai_generation_stats');
    
    if (stored) {
      try {
        const stats = JSON.parse(stored);
        if (stats.date === today) {
          setGenerationsToday(stats.count);
        } else {
          // New day, reset
          setGenerationsToday(0);
          localStorage.setItem('ai_generation_stats', JSON.stringify({ date: today, count: 0 }));
        }
      } catch {
        localStorage.setItem('ai_generation_stats', JSON.stringify({ date: today, count: 0 }));
      }
    }
    setTodayDate(today);

    // Check for recoverable state
    if (user) {
      const recoveryKey = `wizard_generation_recovery_${user.id}`;
      const recovered = localStorage.getItem(recoveryKey);
      if (recovered) {
        try {
          const savedState = JSON.parse(recovered) as SavedGenerationState;
          // Only consider recovery if saved within last hour
          if (savedState.timestamp && Date.now() - savedState.timestamp < 3600000) {
            setHasRecoverableState(true);
          } else {
            localStorage.removeItem(recoveryKey);
          }
        } catch {
          localStorage.removeItem(recoveryKey);
        }
      }
    }
  }, [user]);

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

  // Check rate limits before generation
  const checkRateLimits = useCallback((): { allowed: boolean; message?: string } => {
    const now = Date.now();
    const timeSinceLastGen = now - lastGenerationTime;
    
    // Cooldown check
    if (timeSinceLastGen < RATE_LIMIT_COOLDOWN_MS) {
      const secondsLeft = Math.ceil((RATE_LIMIT_COOLDOWN_MS - timeSinceLastGen) / 1000);
      return { 
        allowed: false, 
        message: `Please wait ${secondsLeft} seconds before generating again` 
      };
    }
    
    // Daily hard limit
    if (generationsToday >= DAILY_LIMIT_HARD) {
      return { 
        allowed: false, 
        message: 'You\'ve reached the daily limit of 100 generations. Please try again tomorrow.' 
      };
    }
    
    return { allowed: true };
  }, [lastGenerationTime, generationsToday]);

  // Update rate limiting counts after generation
  const updateRateLimitCounts = useCallback(() => {
    const now = Date.now();
    setLastGenerationTime(now);
    const newCount = generationsToday + 1;
    setGenerationsToday(newCount);
    
    localStorage.setItem('ai_generation_stats', JSON.stringify({
      date: todayDate,
      count: newCount,
    }));
  }, [generationsToday, todayDate]);

  // Clear recovery state
  const clearRecoveryState = useCallback(() => {
    if (user) {
      localStorage.removeItem(`wizard_generation_recovery_${user.id}`);
      setHasRecoverableState(false);
    }
  }, [user]);

  // Resume from saved state - returns saved state or null
  const getRecoverableState = useCallback((contentType: WizardContentType): SavedGenerationState | null => {
    if (!user) return null;
    
    const recoveryKey = `wizard_generation_recovery_${user.id}`;
    const recovered = localStorage.getItem(recoveryKey);
    if (!recovered) return null;
    
    try {
      const savedState = JSON.parse(recovered) as SavedGenerationState;
      if (savedState.contentType !== contentType) {
        // Different content type, can't resume
        clearRecoveryState();
        return null;
      }
      return savedState;
    } catch {
      clearRecoveryState();
      return null;
    }
  }, [user, clearRecoveryState]);
      
  // Generate email sequence with multi-pass refinement, rate limiting, and error recovery
  const generateEmailSequence = useCallback(async (contentType: WizardContentType): Promise<WizardGenerationResult> => {
    // Check rate limits first
    const rateLimitCheck = checkRateLimits();
    if (!rateLimitCheck.allowed) {
      toast.error(rateLimitCheck.message);
      throw new Error(rateLimitCheck.message);
    }
    
    // Warn at threshold
    if (generationsToday >= DAILY_LIMIT_WARNING && generationsToday < 50) {
      const shouldContinue = window.confirm(
        `You've generated ${generationsToday} pieces today. ` +
        `Estimated API cost: $${(generationsToday * 0.05).toFixed(2)}. Continue?`
      );
      if (!shouldContinue) {
        throw new Error('Generation cancelled by user');
      }
    }
    
    if (generationsToday >= 50) {
      const shouldContinue = window.confirm(
        `⚠️ WARNING: You've generated ${generationsToday} pieces today. ` +
        `Estimated API cost: $${(generationsToday * 0.05).toFixed(2)}+. ` +
        `This could be expensive. Are you sure you want to continue?`
      );
      if (!shouldContinue) {
        throw new Error('Generation cancelled by user');
      }
    }

    const startTime = Date.now();
    let totalTokens = 0;
    
    const context = buildContext();
    context.contentType = contentType;
    
    const sequenceConfig = getSequenceConfig(contentType);
    if (!sequenceConfig) {
      throw new Error(`Unknown sequence type: ${contentType}`);
    }
    
    // Check for recoverable state
    const recoveryKey = user ? `wizard_generation_recovery_${user.id}` : null;
    let savedState: SavedGenerationState = {};
    
    if (hasRecoverableState && recoveryKey) {
      const recoveredState = getRecoverableState(contentType);
      if (recoveredState && recoveredState.draft) {
        const shouldResume = window.confirm(
          'We found a partially completed generation. Resume from where you left off?'
        );
        if (shouldResume) {
          savedState = recoveredState;
          toast.success('Resuming from saved progress...');
        } else {
          clearRecoveryState();
        }
      }
    }
    
    setState(prev => ({ 
      ...prev, 
      isGenerating: true, 
      currentPass: savedState.draft ? 'critique' : 'draft', 
      progress: savedState.draft ? 35 : 10, 
      error: null 
    }));
    
    try {
      // Pass 1: Generate draft (or use saved)
      let draftContent = savedState.draft || '';
      let draftTokens = savedState.draftTokens || 0;
      
      if (!draftContent) {
        const draft = await callOpenAI({
          systemPrompt: buildEmailSequenceSystemPrompt(context, sequenceConfig),
          userPrompt: buildEmailSequenceUserPrompt(context, sequenceConfig),
          temperature: 0.8,
        });
        draftContent = draft.content;
        draftTokens = draft.tokens;
        
        // SAVE IMMEDIATELY after successful draft
        if (recoveryKey) {
          savedState = { draft: draftContent, draftTokens, contentType, timestamp: Date.now() };
          localStorage.setItem(recoveryKey, JSON.stringify(savedState));
        }
      }
      totalTokens += draftTokens;
      setState(prev => ({ ...prev, currentPass: 'critique', progress: 35 }));
      
      // Pass 2: Critique with voice samples (or use saved)
      let critiqueContent = savedState.critique || '';
      let critiqueTokens = savedState.critiqueTokens || 0;
      
      if (!critiqueContent) {
        const critique = await callOpenAI({
          systemPrompt: 'You are a direct-response copywriting expert providing specific, actionable feedback that compares generated copy against the user\'s actual writing samples.',
          userPrompt: buildCritiquePrompt(draftContent, contentType, context.voiceSamples, context.voiceProfile as any),
          temperature: 0.3,
        });
        critiqueContent = critique.content;
        critiqueTokens = critique.tokens;
        
        // SAVE IMMEDIATELY after successful critique
        if (recoveryKey) {
          savedState.critique = critiqueContent;
          savedState.critiqueTokens = critiqueTokens;
          savedState.timestamp = Date.now();
          localStorage.setItem(recoveryKey, JSON.stringify(savedState));
        }
      }
      totalTokens += critiqueTokens;
      setState(prev => ({ ...prev, currentPass: 'rewrite', progress: 55 }));
      
      // Pass 3: Rewrite based on critique
      const rewrite = await callOpenAI({
        systemPrompt: buildEmailSequenceSystemPrompt(context, sequenceConfig),
        userPrompt: buildRewritePrompt(draftContent, critiqueContent, context),
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
      
      // Success! Clear saved state and update rate limits
      if (recoveryKey) {
        localStorage.removeItem(recoveryKey);
        setHasRecoverableState(false);
      }
      updateRateLimitCounts();
      
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
      
      // If we have partial results, notify user
      if (savedState.draft && recoveryKey) {
        toast.error(
          'Generation interrupted. Your progress has been saved. Click "Generate" again to resume.',
          { duration: 10000 }
        );
      }
      
      setState(prev => ({ ...prev, isGenerating: false, error: errorMessage }));
      throw error;
    }
  }, [buildContext, callOpenAI, checkRateLimits, updateRateLimitCounts, generationsToday, hasRecoverableState, getRecoverableState, clearRecoveryState, user]);

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
    
    // Rate limiting info
    generationsToday,
    hasRecoverableState,
    
    // Actions
    generateEmailSequence,
    scheduleToCalendar,
    saveSequenceToVault,
    reset,
    clearRecoveryState,
    
    // Context builder (for preview)
    buildContext,
  };
}
