import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isAllowedOrigin } from '../_shared/replayVaultAccess.ts';
import { createMemberLibraryHandler } from '../_shared/vaultMemberLibraryR4.ts';

declare const Deno: { env: { get(name: string): string | undefined } };

const url = Deno.env.get('SUPABASE_URL');
const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(createMemberLibraryHandler({
  isAllowedOrigin,
  authenticate: async (bearer) => {
    if (!url || !anonKey) throw new Error('not_configured');
    const client = createClient(url, anonKey, { global: { headers: { Authorization: bearer } } });
    const { data, error } = await client.auth.getUser(bearer.slice(7));
    return error || !data.user ? null : { id: data.user.id };
  },
  rpc: async (name, args) => {
    if (!url || !serviceRoleKey) throw new Error('not_configured');
    const service = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    return service.rpc(name, args);
  },
  log: (requestId, taxonomy) => console.error('[vault-member-library]', requestId, taxonomy),
}));
