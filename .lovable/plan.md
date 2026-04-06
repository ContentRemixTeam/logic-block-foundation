

# Plan: Add Claude (Anthropic) BYOK Support

## Overview

Add Claude/Anthropic as an alternative AI provider alongside the existing OpenAI integration. Users can bring their own Anthropic API key and choose which model provider to use for copy generation.

## Current Architecture

- `user_api_keys` table stores one encrypted OpenAI key per user (no `provider` column)
- `openai-proxy` edge function decrypts the key and forwards to OpenAI
- `OpenAIService` class in `src/lib/openai-service.ts` orchestrates multi-pass generation via `callOpenAI()`
- `APIKeySettings.tsx` handles key input/test/delete UI (hardcoded to OpenAI)

## Changes

### 1. Database: Add provider support to `user_api_keys`

Add a `provider` column (`text`, default `'openai'`) so users can store one key per provider.

```sql
ALTER TABLE user_api_keys ADD COLUMN provider text NOT NULL DEFAULT 'openai';
-- Drop existing unique constraint on user_id and add composite one
ALTER TABLE user_api_keys DROP CONSTRAINT IF EXISTS user_api_keys_user_id_key;
ALTER TABLE user_api_keys ADD CONSTRAINT user_api_keys_user_provider_unique UNIQUE (user_id, provider);
```

### 2. New Edge Function: `anthropic-proxy`

Mirror `openai-proxy` but forward to `https://api.anthropic.com/v1/messages`:
- Same auth flow (JWT validation, decrypt key from `user_api_keys` where `provider = 'anthropic'`)
- Map OpenAI-style messages to Anthropic format (separate system prompt, `messages` array)
- Return normalized `{ content, tokens }` response
- Use `claude-sonnet-4-20250514` as default model

### 3. Update `OpenAIService` (rename concept to `AIService`)

- Add a `provider` parameter to `callOpenAI` (rename to `callAI`)
- Route to either `openai-proxy` or `anthropic-proxy` based on user's active provider preference
- Add `getActiveProvider(userId)` method to check which key(s) the user has configured
- Add `testAnthropicKey()` static method

### 4. Update Hooks (`useAICopywriting.ts`)

- `useAPIKey()` becomes `useAPIKeys()` -- fetches all provider rows for the user
- `useSaveAPIKey()` accepts a `provider` parameter
- `useActiveProvider()` -- tracks which provider is selected for generation
- Store active provider preference in `user_settings` or localStorage

### 5. Update `APIKeySettings.tsx`

- Add tabs or toggle: **OpenAI** | **Claude**
- Each tab shows the same key management UI (add/test/delete) scoped to that provider
- "How to Get a Key" instructions update per provider (link to console.anthropic.com)
- Key validation: OpenAI starts with `sk-`, Anthropic starts with `sk-ant-`
- Add a "Default Provider" selector when both keys are configured

### 6. Update Content Generator UI

- When both keys exist, show a small provider selector chip near the generate button
- Single key: auto-use that provider, no selector shown

## Technical Details

- Anthropic API uses `x-api-key` header (not `Authorization: Bearer`)
- Anthropic system prompt goes in a separate `system` field, not in messages array
- Token counting: Anthropic returns `usage.input_tokens` + `usage.output_tokens`
- Model mapping: `gpt-4o` equivalent is `claude-sonnet-4-20250514`

## Files to Create
- `supabase/functions/anthropic-proxy/index.ts`

## Files to Modify
- `src/hooks/useAICopywriting.ts` (multi-provider key hooks)
- `src/lib/openai-service.ts` (add provider routing)
- `src/components/ai-copywriting/APIKeySettings.tsx` (provider tabs)
- `src/components/ai-copywriting/ContentGenerator.tsx` (provider selector)
- `src/types/aiCopywriting.ts` (add provider type)

## Migration
- 1 SQL migration to add `provider` column and update constraints

