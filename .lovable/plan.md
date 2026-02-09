

# Fix: "Failed to fetch" Error on AI Copy Generation

## Problem

The AI Copywriter calls OpenAI's API directly from the browser (`fetch('https://api.openai.com/v1/chat/completions')`). The Lovable preview environment intercepts these requests, causing "Failed to fetch" errors. This affects ALL content generation (emails, LinkedIn posts, etc.), not just LinkedIn templates.

## Solution

Route OpenAI calls through a backend function that proxies the request server-side. The function will:
1. Accept the authenticated user's request
2. Retrieve their encrypted OpenAI API key from the database
3. Decrypt it and call OpenAI server-side
4. Return the result

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/openai-proxy/index.ts` | Backend function that proxies OpenAI calls using the user's stored API key |

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/openai-service.ts` | Update `callOpenAI` method to call the backend proxy instead of OpenAI directly |

## Technical Details

### 1. Backend Function: `openai-proxy`

The function will:
- Authenticate the user via their JWT token
- Look up their encrypted API key from `user_api_keys` table
- Decrypt it (using the same encryption logic currently in the frontend)
- Forward the chat completion request to OpenAI
- Return the response

It accepts:
```json
{
  "messages": [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}],
  "temperature": 0.8,
  "max_tokens": 2000
}
```

### 2. Update `callOpenAI` in `openai-service.ts`

Change from:
```typescript
// Direct browser call (broken)
fetch('https://api.openai.com/v1/chat/completions', {
  headers: { 'Authorization': `Bearer ${apiKey}` },
  ...
})
```

To:
```typescript
// Proxy through backend function
supabase.functions.invoke('openai-proxy', {
  body: { messages, temperature, max_tokens }
})
```

The `apiKey` parameter can be removed from `callOpenAI` since the backend function handles key retrieval. The `getUserAPIKey` and `decryptAPIKey` logic moves server-side.

### 3. Encryption Key Handling

The current encryption uses a key derived from the user ID. The same decryption logic needs to be replicated in the edge function using Deno's Web Crypto API, or we can store/retrieve the encryption key as a backend secret.

## Implementation Sequence

1. Create the `openai-proxy` edge function with CORS headers, auth, key retrieval, and OpenAI forwarding
2. Update `callOpenAI` in `openai-service.ts` to use `supabase.functions.invoke` instead of direct fetch
3. Simplify the `generateCopy` flow since the API key no longer needs to be passed around on the frontend

