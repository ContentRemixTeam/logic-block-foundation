/**
 * OAuth 2.1 consent route for the Supabase managed authorization server.
 * Mounted at /.lovable/oauth/consent — Supabase redirects here to ask the
 * signed-in user whether they want to grant an external client (Claude) access
 * to their planner.
 *
 * Uses the beta `supabase.auth.oauth` namespace exposed by supabase-js. We
 * type-shim it locally because the SDK types don't yet declare it.
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ShieldCheck, ShieldAlert, Sparkles } from 'lucide-react';

interface AuthorizationDetails {
  client?: {
    client_id?: string;
    client_name?: string;
    client_uri?: string;
    logo_uri?: string;
    redirect_uris?: string[];
  } | null;
  scope?: string;
  scopes?: string[];
  redirect_url?: string;
  redirect_to?: string;
}

interface OAuthBeta {
  getAuthorizationDetails(id: string): Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization(id: string): Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
  denyAuthorization(id: string): Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
}

function oauth(): OAuthBeta {
  return (supabase.auth as unknown as { oauth: OAuthBeta }).oauth;
}

function scopeLabel(scope: string): string {
  switch (scope) {
    case 'openid': return 'Confirm your identity';
    case 'profile': return 'Read your basic profile (name, avatar)';
    case 'email': return 'Read your email address';
    case 'offline_access': return 'Stay connected without asking again each time';
    default: return `Additional permission: ${scope}`;
  }
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get('authorization_id') ?? '';
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'approve' | 'deny' | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError('Missing authorization request.');
        setLoading(false);
        return;
      }
      const { data: sessionRes } = await supabase.auth.getSession();
      if (!sessionRes.session) {
        // Preserve the full consent URL so the auth flow returns us here.
        const next = window.location.pathname + window.location.search;
        window.location.href = `/auth?next=${encodeURIComponent(next)}`;
        return;
      }
      try {
        const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) {
          setError(error.message);
        } else {
          // If provider returned an immediate redirect (session already granted), follow it.
          const immediate = data?.redirect_url ?? data?.redirect_to;
          if (immediate && !data?.client) {
            window.location.href = immediate;
            return;
          }
          setDetails(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load this authorization request.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(approve ? 'approve' : 'deny');
    setError(null);
    try {
      const { data, error } = approve
        ? await oauth().approveAuthorization(authorizationId)
        : await oauth().denyAuthorization(authorizationId);
      if (error) {
        setError(error.message);
        setBusy(null);
        return;
      }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) {
        setError('The authorization server did not return a redirect URL.');
        setBusy(null);
        return;
      }
      window.location.href = target;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(null);
    }
  }

  const clientName = details?.client?.client_name ?? 'an AI assistant';
  const scopeList = (
    details?.scopes && details.scopes.length > 0
      ? details.scopes
      : (details?.scope ?? '').split(/\s+/).filter(Boolean)
  );

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Connection request</span>
          </div>
          <CardTitle className="text-2xl">Connect {clientName} to your planner</CardTitle>
          <CardDescription>
            This lets {clientName} view and manage your planner data on your behalf while you're signed in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          )}

          {!loading && error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              <div className="flex items-center gap-2 font-medium">
                <ShieldAlert className="h-4 w-4" /> Could not complete this request
              </div>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {!loading && !error && details && (
            <>
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  What {clientName} will be able to do
                </div>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>• See today's plan, your 90-day cycle, and your tasks</li>
                  <li>• Add tasks, notes, and ideas to your account</li>
                  <li>• Mark tasks done and reschedule them</li>
                </ul>
                {scopeList.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t pt-3 text-xs text-muted-foreground">
                    {scopeList.map((s) => (
                      <li key={s}>• {scopeLabel(s)}</li>
                    ))}
                  </ul>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                You can revoke this connection any time from Settings → AI Assistant.
                This does not bypass any of the planner's data protections.
              </p>

              <div className="flex flex-col gap-2 sm:flex-row-reverse">
                <Button
                  onClick={() => decide(true)}
                  disabled={busy !== null}
                  className="sm:flex-1"
                >
                  {busy === 'approve' ? 'Connecting…' : 'Allow'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => decide(false)}
                  disabled={busy !== null}
                  className="sm:flex-1"
                >
                  {busy === 'deny' ? 'Cancelling…' : 'Cancel'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
