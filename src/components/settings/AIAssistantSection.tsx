/**
 * Settings section: connect an AI assistant (Claude, Claude Code, Codex,
 * or any MCP-compatible client) to this planner via Personal Access Tokens
 * over the app's MCP server at /functions/v1/mcp.
 *
 * Raw tokens are shown ONCE at creation and never stored client- or server-side
 * in plaintext (server keeps only a SHA-256 hash). Revocation is immediate.
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Sparkles, Copy, Check, Plus, ShieldAlert, Trash2, Bot, PlugZap, HelpCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface TokenRow {
  id: string;
  name: string;
  token_prefix: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
const MCP_URL = projectId ? `https://${projectId}.supabase.co/functions/v1/mcp` : '';

// Tools the server currently exposes — kept in sync with supabase/functions/mcp/index.ts.
const TOOL_CATALOG: { name: string; description: string }[] = [
  { name: 'get_today', description: "Today's plan, battery level, bare-minimums, tasks" },
  { name: 'get_week', description: "This week's priorities and scheduled tasks" },
  { name: 'get_current_cycle', description: 'Active 90-day cycle + days remaining' },
  { name: 'list_tasks', description: 'Filter tasks by date / status / energy / project' },
  { name: 'search_tasks', description: 'Full-text search across your tasks' },
  { name: 'create_task', description: 'Add a task (optionally scheduled, energy-tagged, bare-minimum)' },
  { name: 'update_task', description: 'Reschedule, rename, or re-tag a task' },
  { name: 'complete_task', description: 'Mark a task done' },
  { name: 'list_projects', description: 'Your active projects (to attach tasks)' },
  { name: 'add_note', description: 'Quick-capture into your brain dump / notes' },
  { name: 'create_idea', description: 'Save something to your Ideas inbox' },
  { name: 'list_ideas', description: 'Recent ideas you captured' },
  { name: 'get_latest_weekly_review', description: 'Your most recent weekly review reflections' },
];

function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Couldn't copy — long-press or select the text.");
        }
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : label}
    </Button>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="relative rounded-lg border bg-muted/30 p-3">
      <pre className="overflow-x-auto text-xs leading-relaxed whitespace-pre-wrap break-all">
        {children}
      </pre>
      <div className="absolute right-2 top-2">
        <CopyButton value={children} />
      </div>
    </div>
  );
}

export function AIAssistantSection() {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('Claude');
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [testToken, setTestToken] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('integration_tokens')
      .select('id, name, token_prefix, last_used_at, revoked_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) setTokens(data as TokenRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  const createToken = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-integration-token', {
        body: { name: newName.trim() },
      });
      if (error || !data?.token) throw new Error(error?.message ?? 'Failed to create token');
      setFreshToken(data.token as string);
      setTestToken(data.token as string);
      setNewName('Claude');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create token');
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    const { error } = await supabase
      .from('integration_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return toast.error('Could not revoke');
    toast.success('Token revoked. It stops working immediately.');
    load();
  };

  const runTestConnection = async () => {
    if (!testToken.trim()) {
      setTestResult({ ok: false, message: 'Paste a token first (or create one above).' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(MCP_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testToken.trim()}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      });
      if (!res.ok) {
        const body = await res.text();
        setTestResult({ ok: false, message: `HTTP ${res.status}: ${body.slice(0, 160)}` });
        return;
      }
      const data = await res.json();
      const count = data?.result?.tools?.length ?? 0;
      setTestResult({
        ok: count > 0,
        message: count > 0
          ? `Connected. Server exposes ${count} tools.`
          : 'Connected but no tools returned.',
      });
    } catch (err) {
      setTestResult({ ok: false, message: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setTesting(false);
    }
  };

  const claudeCodeCmd = useMemo(
    () => `claude mcp add --transport http low-battery-planner "${MCP_URL}" --header "Authorization: Bearer YOUR_TOKEN"`,
    [],
  );
  const configJson = useMemo(
    () => JSON.stringify(
      {
        mcpServers: {
          'low-battery-planner': {
            transport: 'http',
            url: MCP_URL,
            headers: { Authorization: 'Bearer YOUR_TOKEN' },
          },
        },
      },
      null,
      2,
    ),
    [],
  );
  const codexToml = useMemo(
    () => `# ~/.codex/config.toml
[mcp_servers.low-battery-planner]
transport = "http"
url = "${MCP_URL}"
headers = { Authorization = "Bearer YOUR_TOKEN" }`,
    [],
  );

  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          AI Assistant
          <Badge variant="secondary" className="ml-1 text-[10px]">New</Badge>
        </CardTitle>
        <CardDescription>
          Connect Claude, Claude Code, Codex, or any MCP-compatible AI to your planner.
          Your assistant sees your day, adds tasks, and helps you plan — always scoped to your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Server URL */}
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">MCP Server URL</Label>
          <CodeBlock>{MCP_URL || '(URL will appear once the project is deployed)'}</CodeBlock>
        </div>

        {/* Freshly-minted token */}
        {freshToken && (
          <Alert className="border-primary/40 bg-primary/5">
            <ShieldAlert className="h-4 w-4 text-primary" />
            <AlertDescription className="space-y-2">
              <p className="font-medium text-foreground">Copy your token now — you won't see it again.</p>
              <CodeBlock>{freshToken}</CodeBlock>
              <div className="flex justify-end">
                <Button size="sm" variant="ghost" onClick={() => setFreshToken(null)}>
                  I've saved it
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Create token */}
        <div className="space-y-2">
          <Label htmlFor="token-name" className="text-sm">Create a token</Label>
          <div className="flex gap-2">
            <Input
              id="token-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Claude, Claude Code, Codex, Cursor"
              maxLength={60}
              disabled={creating}
            />
            <Button onClick={createToken} disabled={creating || !newName.trim()} className="gap-1.5">
              <Plus className="h-4 w-4" /> Create
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Name it after the tool you're connecting so you can revoke just that one later.
          </p>
        </div>

        {/* Token list */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Active tokens
          </Label>
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && tokens.length === 0 && (
            <p className="text-sm text-muted-foreground">No tokens yet. Create one above to get started.</p>
          )}
          <ul className="space-y-2">
            {tokens.map((t) => {
              const revoked = !!t.revoked_at;
              return (
                <li key={t.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{t.name}</span>
                      {revoked && <Badge variant="outline" className="text-[10px]">revoked</Badge>}
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {t.token_prefix}…
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {t.last_used_at
                        ? `Last used ${formatDistanceToNow(new Date(t.last_used_at))} ago`
                        : 'Not used yet'}
                    </p>
                  </div>
                  {!revoked && (
                    <Button variant="ghost" size="sm" onClick={() => revoke(t.id)} className="gap-1 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" /> Revoke
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Setup instructions */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Connect a client</Label>
          <Tabs defaultValue="claude">
            <TabsList>
              <TabsTrigger value="claude">Claude</TabsTrigger>
              <TabsTrigger value="claude-code">Claude Code</TabsTrigger>
              <TabsTrigger value="codex">Codex</TabsTrigger>
              <TabsTrigger value="generic">Other (JSON)</TabsTrigger>
            </TabsList>
            <TabsContent value="claude" className="space-y-2 pt-3 text-sm">
              <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>Open Claude → Settings → Connectors → Add custom connector.</li>
                <li>Name it <em>Low Battery Planner</em>.</li>
                <li>Paste the MCP Server URL above.</li>
                <li>Add header: <code className="rounded bg-muted px-1">Authorization</code> = <code className="rounded bg-muted px-1">Bearer YOUR_TOKEN</code>.</li>
                <li>Enable it from the chat composer and ask Claude about your day.</li>
              </ol>
            </TabsContent>
            <TabsContent value="claude-code" className="space-y-2 pt-3 text-sm">
              <p className="text-muted-foreground">Run in your terminal (replace <code className="rounded bg-muted px-1">YOUR_TOKEN</code>):</p>
              <CodeBlock>{claudeCodeCmd}</CodeBlock>
            </TabsContent>
            <TabsContent value="codex" className="space-y-2 pt-3 text-sm">
              <p className="text-muted-foreground">Add this block to your Codex MCP config, then restart Codex:</p>
              <CodeBlock>{codexToml}</CodeBlock>
            </TabsContent>
            <TabsContent value="generic" className="space-y-2 pt-3 text-sm">
              <p className="text-muted-foreground">Any MCP client that supports the Streamable HTTP transport:</p>
              <CodeBlock>{configJson}</CodeBlock>
            </TabsContent>
          </Tabs>
        </div>

        {/* Test connection */}
        <div className="space-y-2 rounded-lg border border-border/60 p-3">
          <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
            <PlugZap className="h-3 w-3" /> Test connection
          </Label>
          <p className="text-xs text-muted-foreground">
            Paste a token and we'll try to reach the MCP server as if we were Claude.
          </p>
          <div className="flex gap-2">
            <Input
              type="password"
              value={testToken}
              onChange={(e) => setTestToken(e.target.value)}
              placeholder="lbp_…"
              className="font-mono text-xs"
            />
            <Button onClick={runTestConnection} disabled={testing || !MCP_URL} size="sm">
              {testing ? 'Testing…' : 'Test'}
            </Button>
          </div>
          {testResult && (
            <p className={`text-xs ${testResult.ok ? 'text-emerald-600' : 'text-destructive'}`}>
              {testResult.ok ? '✓ ' : '✗ '}{testResult.message}
            </p>
          )}
        </div>

        {/* Example prompts */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3 w-3" /> Try asking your assistant
          </Label>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              "What should I focus on today given my battery level?"
            </li>
            <li className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              "Add these three tasks to Thursday: draft newsletter, record voice note, reply to Beth."
            </li>
            <li className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              "Mark 'record podcast intro' as done, and add a new low-energy task for tomorrow."
            </li>
            <li className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              "How am I tracking against my 90-day goal? What did I reflect on last week?"
            </li>
          </ul>
        </div>

        {/* Tools + troubleshooting */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="tools" className="border rounded-md px-3">
            <AccordionTrigger className="text-sm">
              What can the assistant actually do? ({TOOL_CATALOG.length} tools)
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-1 text-xs">
                {TOOL_CATALOG.map((t) => (
                  <li key={t.name} className="flex gap-2">
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{t.name}</code>
                    <span className="text-muted-foreground">{t.description}</span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="troubleshoot" className="border rounded-md px-3 mt-2">
            <AccordionTrigger className="text-sm">
              <span className="flex items-center gap-1.5"><HelpCircle className="h-3.5 w-3.5" /> Troubleshooting</span>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 text-xs text-muted-foreground">
              <p><strong>401 Invalid token</strong> — the token was mistyped or revoked. Create a fresh one above.</p>
              <p><strong>429 Rate limit exceeded</strong> — 60 requests per minute per token. Wait a minute and try again.</p>
              <p><strong>Tool not found</strong> — restart your MCP client; some clients cache the tool list.</p>
              <p><strong>Nothing happens in Claude</strong> — make sure the connector is toggled ON in the chat composer (Claude only enables custom connectors per-conversation).</p>
              <p><strong>Lost a token?</strong> — revoke it and create a new one. Old tokens can't be recovered (we only store a hash).</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
