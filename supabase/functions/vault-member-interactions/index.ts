import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createInteractionsHandler } from "../_shared/vaultInteractionsR2.ts";

const url = Deno.env.get("SUPABASE_URL") ?? "";
const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const service = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

serve(createInteractionsHandler({
  async authenticate(req) {
    const authorization = req.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return null;
    const client = createClient(url, anon, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.getUser(authorization.slice(7));
    return error || !data.user
      ? null
      : { id: data.user.id, email: data.user.email };
  },
  async rpc(name, args) {
    return await service.rpc(name, args);
  },
  log(taxonomy, meta) {
    console.warn(`[vault-member-interactions:${taxonomy}]`, meta);
  },
}));
