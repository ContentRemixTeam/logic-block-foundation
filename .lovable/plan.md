

# Stop Auto-Invalidating Your API Key

## Problem

Right now, if OpenAI returns a single 401 error, your key gets permanently marked as "invalid" in the database. After that, every request fails with "API key is marked as invalid" and you have to re-enter the key from scratch -- even if the key is actually fine (e.g., OpenAI had a momentary issue, or your billing lapsed briefly then you fixed it).

## Solution

Two changes to eliminate this friction:

### 1. Remove the auto-invalidation from the backend function

Instead of permanently marking the key as invalid on a 401, simply return the error to the user. This way a single bad response from OpenAI doesn't lock you out permanently. If the key is truly dead, the user will see the error and can update it themselves.

**File:** `supabase/functions/openai-proxy/index.ts`
- Remove the code that does `UPDATE user_api_keys SET key_status = 'invalid'` on a 401

### 2. Remove the frontend block on "invalid" keys

The frontend currently throws an error and refuses to even try if `key_status === 'invalid'`. Remove this check so the key is always attempted -- OpenAI is the source of truth for whether a key works.

**File:** `src/lib/openai-service.ts`
- In `getUserAPIKey()`, remove the `if (data.key_status === 'invalid') throw` check

**File:** `supabase/functions/openai-proxy/index.ts`
- Remove the server-side check that returns 400 for `key_status === 'invalid'`

### What this means for you

- Your key will never get auto-locked again
- If OpenAI rejects the key, you'll see the actual OpenAI error message (e.g., "key expired") and can decide what to do
- The "Test Connection" button in Settings still works for manual validation
- You only need to update your key when it's genuinely expired/revoked

