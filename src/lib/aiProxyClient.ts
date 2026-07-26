// Server-side AI proxy client.
// The user's API key is decrypted ONLY inside the edge function — it is never
// fetched, decrypted, or held in the browser.

import { supabase } from '@/integrations/supabase/client';
import { NO_API_KEY_CODE, parseFunctionError } from '@/lib/aiKeyErrors';

export type AIProviderName = 'openai' | 'anthropic';

const PROXY_FUNCTIONS: Record<AIProviderName, string> = {
  openai: 'openai-proxy',
  anthropic: 'anthropic-proxy',
};

export interface AIProxyMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIProxyParams {
  messages: AIProxyMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Provider of the user's configured key. Defaults to OpenAI. */
  provider?: AIProviderName;
}

export interface AIProxyResult {
  content: string;
  tokens: number;
}

/**
 * Calls the user's own AI provider through the server proxy.
 * Throws an Error with message NO_API_KEY when the user has no usable key,
 * so callers can show the "add a key" prompt.
 */
export async function callUserAIProxy({
  messages,
  temperature = 0.8,
  maxTokens = 4000,
  provider = 'openai',
}: AIProxyParams): Promise<AIProxyResult> {
  const functionName = PROXY_FUNCTIONS[provider] ?? PROXY_FUNCTIONS.openai;

  const { data, error } = await supabase.functions.invoke(functionName, {
    body: { messages, temperature, max_tokens: maxTokens },
  });

  if (error) {
    const parsed = await parseFunctionError(error);
    if (parsed.code === NO_API_KEY_CODE) {
      throw new Error(NO_API_KEY_CODE);
    }
    throw new Error(parsed.message || error.message || 'AI request failed');
  }

  if (!data || data.error) {
    if (data?.error === NO_API_KEY_CODE) throw new Error(NO_API_KEY_CODE);
    throw new Error(data?.message || data?.error || 'AI request failed');
  }

  return {
    content: data.content || '',
    tokens: data.tokens || 0,
  };
}
