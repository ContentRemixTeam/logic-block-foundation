import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AICoachMessage { role: 'system' | 'user' | 'assistant'; content: string }

interface CallOptions {
  messages: AICoachMessage[];
  temperature?: number;
  max_tokens?: number;
  provider?: 'openai' | 'anthropic';
}

/**
 * Mastermind-only AI coach. Calls the user's BYOK key (OpenAI or Claude)
 * via the mastermind-ai-coach edge function. Never silently mutates app data —
 * the consumer is responsible for showing suggestions and applying changes
 * only after the user explicitly approves.
 */
export function useMastermindAI() {
  return useMutation({
    mutationFn: async ({ messages, temperature = 0.5, max_tokens = 1500, provider }: CallOptions) => {
      const { data, error } = await supabase.functions.invoke('mastermind-ai-coach', {
        body: { messages, temperature, max_tokens, provider },
      });
      if (error) throw new Error(error.message || 'AI request failed');
      if (data?.error) throw new Error(data.error);
      return data as { content: string; tokens: number; provider: string };
    },
    onError: (err: Error) => {
      toast.error(err.message || 'AI request failed');
    },
  });
}

/** Best-effort JSON extractor — tolerates ```json fences. */
export function parseAIJson<T = unknown>(raw: string): T | null {
  if (!raw) return null;
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) s = fence[1].trim();
  // Take first {...} or [...] block if there's surrounding prose.
  const first = s.search(/[{\[]/);
  const last = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
  if (first >= 0 && last > first) s = s.slice(first, last + 1);
  try { return JSON.parse(s) as T; } catch { return null; }
}
