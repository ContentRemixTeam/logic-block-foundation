import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isAllowedOrigin } from "../_shared/replayVaultAccess.ts";
import { createVaultPlaylistsHandler } from "../_shared/vaultPlaylists.ts";

const url = Deno.env.get("SUPABASE_URL") ?? "";
const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
  auth: { persistSession: false, autoRefreshToken: false },
});

serve(createVaultPlaylistsHandler({
  isAllowedOrigin,
  async authenticate(bearer) {
    const client = createClient(url, anon, {
      global: { headers: { Authorization: bearer } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.getUser(bearer.slice(7));
    return error || !data.user ? null : { id: data.user.id, email: data.user.email };
  },
  async rpc(name, args) { return await service.rpc(name, args); },
  log(taxonomy) { console.warn(`[vault-playlists:${taxonomy}]`); },
}));
