// Shared helpers for handling BYOK (bring-your-own-key) AI errors on the client.
// The generate-* edge functions return { error: 'NO_API_KEY', message: '...' } with
// status 400 when the signed-in user has not configured an OpenAI/Anthropic key.

import { toast } from 'sonner';

export const AI_KEY_SETTINGS_PATH = '/ai-copywriting/settings';

export const NO_API_KEY_CODE = 'NO_API_KEY';

export const NO_API_KEY_MESSAGE =
  'Add your OpenAI or Anthropic key to generate.';

export interface ParsedFunctionError {
  code?: string;
  message?: string;
}

/**
 * supabase.functions.invoke() surfaces non-2xx responses as a FunctionsHttpError
 * whose `context` is the raw Response. Read the JSON body so we can tell a
 * missing-key error apart from a genuine failure.
 */
export async function parseFunctionError(error: unknown): Promise<ParsedFunctionError> {
  const context = (error as { context?: unknown })?.context as
    | (Response & { json?: () => Promise<unknown> })
    | undefined;

  if (context && typeof context.json === 'function') {
    try {
      const source = typeof context.clone === 'function' ? context.clone() : context;
      const body = (await source.json()) as { error?: string; message?: string };
      return { code: body?.error, message: body?.message };
    } catch {
      // Body already consumed or not JSON — fall through.
    }
  }

  return {};
}

/** True when the edge function reported that no usable API key is configured. */
export function isNoApiKeyPayload(payload: unknown): boolean {
  return (payload as { error?: string })?.error === NO_API_KEY_CODE;
}

/** Friendly toast pointing the user at the API key settings screen. */
export function toastMissingAIKey(message?: string) {
  toast.error(message || NO_API_KEY_MESSAGE, {
    description: 'AI features use your own API key, so you stay in control of costs.',
    action: {
      label: 'Add key',
      onClick: () => {
        window.location.assign(AI_KEY_SETTINGS_PATH);
      },
    },
  });
}

/**
 * Single entry point for AI generation failures.
 * Shows the "add a key" prompt for NO_API_KEY, otherwise a normal error toast.
 */
export async function handleAIGenerationError(
  error: unknown,
  fallbackMessage: string,
  data?: unknown
): Promise<void> {
  if (isNoApiKeyPayload(data)) {
    toastMissingAIKey((data as { message?: string })?.message);
    return;
  }

  const parsed = await parseFunctionError(error);
  if (parsed.code === NO_API_KEY_CODE) {
    toastMissingAIKey(parsed.message);
    return;
  }

  if ((error as Error)?.message === NO_API_KEY_CODE) {
    toastMissingAIKey();
    return;
  }

  toast.error(parsed.message || fallbackMessage);
}
