import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Copy,
  Check,
  KeyRound,
  Bot,
  ShieldCheck,
  Wrench,
  MessageSquareText,
  AlertTriangle,
  Trash2,
  ExternalLink,
  Download,
  Apple,
  Monitor,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface KeyRecord {
  id: string;
  name: string;
  key_prefix: string;
  key_last4: string;
  expires_at: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

const promptExamples = [
  'Add a task to follow up with Sarah tomorrow about the sales page.',
  'Create three tasks from this plan and put anything without a date in my backlog.',
  'Add this as a high priority task for Friday: record the podcast intro.',
  'Brain dump these into my planner: update checkout, email the list, ask the team about webinar reminders.',
  'Show me my tasks for this week and help me choose the top 3.',
  'Mark the task called "Send replay email" as done.',
];

export function McpConnectionPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<'key' | 'config' | 'mac-command' | 'win-command' | 'config-path-mac' | 'config-path-win' | 'prompt' | null>(null);
  const [creating, setCreating] = useState(false);
  const [keys, setKeys] = useState<KeyRecord[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);

  const mcpUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mcp-server`;

  const loadKeys = async () => {
    if (!user) return;
    setLoadingKeys(true);
    try {
      const { data, error } = await supabase
        .from('ai_connection_keys')
        .select('id, name, key_prefix, key_last4, expires_at, last_used_at, revoked_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setKeys((data as KeyRecord[]) ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingKeys(false);
    }
  };

  useEffect(() => {
    loadKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleCreateKey = async () => {
    setCreating(true);
    setFreshKey(null);
    try {
      const { data, error } = await supabase.functions.invoke('create-ai-connection-key', {
        body: { name: 'Boss Planner AI Key' },
      });
      if (error) throw error;
      const key = (data as { key?: string })?.key;
      if (!key) throw new Error('No key returned');
      setFreshKey(key);
      toast({ title: 'AI connection key created', description: 'Copy it now — it will not be shown again.' });
      await loadKeys();
    } catch (err) {
      console.error(err);
      toast({
        title: 'Could not create key',
        description: (err as Error).message ?? 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ai_connection_keys')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Key revoked' });
      await loadKeys();
    } catch (err) {
      toast({
        title: 'Could not revoke',
        description: (err as Error).message,
        variant: 'destructive',
      });
    }
  };

  const tokenForCommands = freshKey || 'YOUR_AI_CONNECTION_KEY_HERE';

  const mcpConfig = JSON.stringify({
    mcpServers: {
      'boss-planner': {
        command: 'npx',
        args: ['-y', 'mcp-remote', mcpUrl],
        env: {
          AUTHORIZATION: `Bearer ${tokenForCommands}`,
        },
      },
    },
  }, null, 2);

  const macSetupCommand = `python3 - <<'PY'
import json
import os

path = os.path.expanduser("~/Library/Application Support/Claude/claude_desktop_config.json")
os.makedirs(os.path.dirname(path), exist_ok=True)

try:
    with open(path, "r") as file:
        config = json.load(file)
except Exception:
    config = {}

config.setdefault("mcpServers", {})
config["mcpServers"]["boss-planner"] = {
    "command": "npx",
    "args": ["-y", "mcp-remote", "${mcpUrl}"],
    "env": {
        "AUTHORIZATION": "Bearer ${tokenForCommands}"
    }
}

with open(path, "w") as file:
    json.dump(config, file, indent=2)

print("Done. Now fully quit and reopen Claude Desktop.")
PY`;

  const winSetupCommand = `powershell -NoProfile -Command "$path = \\"$env:APPDATA\\Claude\\claude_desktop_config.json\\"; New-Item -ItemType Directory -Force -Path (Split-Path $path) | Out-Null; if (Test-Path $path) { $cfg = Get-Content $path -Raw | ConvertFrom-Json } else { $cfg = [PSCustomObject]@{} }; if (-not $cfg.mcpServers) { $cfg | Add-Member -NotePropertyName mcpServers -NotePropertyValue ([PSCustomObject]@{}) -Force }; $cfg.mcpServers | Add-Member -NotePropertyName 'boss-planner' -NotePropertyValue ([PSCustomObject]@{ command='npx'; args=@('-y','mcp-remote','${mcpUrl}'); env=[PSCustomObject]@{ AUTHORIZATION='Bearer ${tokenForCommands}' } }) -Force; $cfg | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 $path; Write-Host 'Done. Fully quit and reopen Claude Desktop.'"`;

  const configPathMac = '~/Library/Application Support/Claude/claude_desktop_config.json';
  const configPathWin = '%APPDATA%\\Claude\\claude_desktop_config.json';

  const handleCopy = async (text: string, type: 'key' | 'config' | 'mac-command' | 'win-command' | 'config-path-mac' | 'config-path-win' | 'prompt') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      toast({ title: 'Copied!' });
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast({ title: 'Copy failed', description: 'Please select and copy manually.', variant: 'destructive' });
    }
  };

  if (!user) return null;

  const activeKeys = keys.filter((k) => !k.revoked_at);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Task Connection
        </CardTitle>
        <CardDescription>
          Connect Claude, Codex, or another AI tool so it can add tasks to your planner — with a single long-lived key.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/40 p-3">
          <p className="text-sm font-medium">What this does</p>
          <p className="mt-1 text-xs text-muted-foreground">
            This lets your AI assistant create planner tasks for you, read your planner tasks, update your daily plan, and log habits.
            It only connects to <strong>your</strong> account.
          </p>
        </div>

        {/* Prerequisites */}
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex gap-2">
            <Download className="mt-0.5 h-4 w-4 text-primary" />
            <div className="space-y-2">
              <p className="text-sm font-medium">Before you start (one-time setup)</p>
              <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
                <li>
                  Install <strong>Node.js (LTS)</strong> — required so Claude/Codex can talk to the planner.{' '}
                  <a
                    href="https://nodejs.org/en/download"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline inline-flex items-center gap-1"
                  >
                    Download Node.js <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>
                  Install <strong>Claude Desktop</strong> (or Codex).{' '}
                  <a
                    href="https://claude.ai/download"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline inline-flex items-center gap-1"
                  >
                    Download Claude Desktop <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>Stay logged into this planner in your browser.</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="flex gap-2">
            <Wrench className="mt-0.5 h-4 w-4 text-primary" />
            <div className="space-y-2">
              <p className="text-sm font-medium">Beginner setup checklist</p>
              <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
                <li>Click <strong>Create AI Connection Key</strong> below.</li>
                <li>Copy the key right away — it's only shown once.</li>
                <li>Copy the <strong>Mac</strong> or <strong>Windows</strong> setup command for your computer.</li>
                <li>Open <strong>Terminal</strong> (Mac) or <strong>PowerShell</strong> (Windows), paste it, and press Enter.</li>
                <li>Fully quit Claude Desktop (right-click the icon → Quit), then reopen it.</li>
                <li>Ask Claude to add a simple test task, then check your Tasks page.</li>
              </ol>
              <p className="text-xs text-muted-foreground">
                If you use Codex or another AI app, use the same server URL and AI connection key in its MCP settings.
              </p>
            </div>
          </div>
        </div>

        {/* Step 1 — Create key */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Step 1: Create your AI connection key</p>
          <p className="text-xs text-muted-foreground">
            This is a long-lived private key that starts with <span className="font-mono">bp_live_</span> and lasts <strong>1 year</strong>.
            You only need to create it once. Treat it like a password — anyone with this key can add tasks to your planner.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleCreateKey} disabled={creating} size="sm">
              <KeyRound className={`h-4 w-4 mr-2 ${creating ? 'animate-pulse' : ''}`} />
              {creating ? 'Creating…' : 'Create AI Connection Key'}
            </Button>
            {freshKey && (
              <Button onClick={() => handleCopy(freshKey, 'key')} variant="outline" size="sm">
                {copied === 'key' ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                Copy Key
              </Button>
            )}
          </div>

          {freshKey && (
            <div className="rounded-md border border-warning/40 bg-warning/5 p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-warning">
                <AlertTriangle className="h-3.5 w-3.5" />
                Copy this key now — it will not be shown again.
              </div>
              <Input readOnly value={freshKey} className="font-mono text-xs" />
            </div>
          )}
        </div>

        {/* Step 2 — Mac/Windows setup */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Step 2: Add the connection to Claude Desktop</p>
          {!freshKey && (
            <p className="text-xs text-muted-foreground italic">
              Tip: create a key in Step 1 first — the commands below will then include your real key.
            </p>
          )}

          {/* Mac */}
          <div className="rounded-md border p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Apple className="h-4 w-4" /> Mac (Terminal)
            </div>
            <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
              <li>Press <kbd className="rounded border bg-muted px-1">⌘</kbd> + <kbd className="rounded border bg-muted px-1">Space</kbd>, type <strong>Terminal</strong>, press Enter.</li>
              <li>Click <strong>Copy Mac Setup Command</strong> below.</li>
              <li>Paste into Terminal (<kbd className="rounded border bg-muted px-1">⌘</kbd> + <kbd className="rounded border bg-muted px-1">V</kbd>) and press Enter.</li>
              <li>Fully quit Claude Desktop and reopen it.</li>
            </ol>
            <div className="relative">
              <pre className="bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto max-h-40 overflow-y-auto">
                {macSetupCommand}
              </pre>
              <Button
                onClick={() => handleCopy(macSetupCommand, 'mac-command')}
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
              >
                {copied === 'mac-command' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span className="sr-only">Copy Mac Setup Command</span>
              </Button>
            </div>
            <Button onClick={() => handleCopy(macSetupCommand, 'mac-command')} variant="outline" size="sm">
              {copied === 'mac-command' ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              Copy Mac Setup Command
            </Button>
          </div>

          {/* Windows */}
          <div className="rounded-md border p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Monitor className="h-4 w-4" /> Windows (PowerShell)
            </div>
            <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
              <li>Press the <strong>Windows key</strong>, type <strong>PowerShell</strong>, press Enter.</li>
              <li>Click <strong>Copy Windows Setup Command</strong> below.</li>
              <li>Right-click inside PowerShell to paste, then press Enter.</li>
              <li>Fully quit Claude Desktop (right-click tray icon → Quit) and reopen it.</li>
            </ol>
            <div className="relative">
              <pre className="bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto max-h-40 overflow-y-auto">
                {winSetupCommand}
              </pre>
              <Button
                onClick={() => handleCopy(winSetupCommand, 'win-command')}
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
              >
                {copied === 'win-command' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span className="sr-only">Copy Windows Setup Command</span>
              </Button>
            </div>
            <Button onClick={() => handleCopy(winSetupCommand, 'win-command')} variant="outline" size="sm">
              {copied === 'win-command' ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              Copy Windows Setup Command
            </Button>
          </div>

          {/* Advanced / manual */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="manual" className="border rounded-md px-3">
              <AccordionTrigger className="text-sm">Manual setup (for Codex or editing the config file yourself)</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Open Claude Desktop's config file at:</p>
                  <p className="text-xs"><strong>Mac:</strong> <span className="font-mono">{configPathMac}</span></p>
                  <p className="text-xs"><strong>Windows:</strong> <span className="font-mono">{configPathWin}</span></p>
                  <p className="text-xs text-muted-foreground">
                    (In Claude Desktop you can also go to <strong>Settings → Developer → Edit Config</strong>.)
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste this block inside (merge with any existing <span className="font-mono">mcpServers</span>):
                </p>
                <div className="relative">
                  <pre className="bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto">
                    {mcpConfig}
                  </pre>
                  <Button
                    onClick={() => handleCopy(mcpConfig, 'config')}
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                  >
                    {copied === 'config' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    <span className="sr-only">Copy Config</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Server URL: <span className="font-mono">{mcpUrl}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  For <strong>Codex</strong>: add the same server (command <span className="font-mono">npx -y mcp-remote {mcpUrl}</span>)
                  with header <span className="font-mono">Authorization: Bearer YOUR_KEY</span> in its MCP settings, then restart Codex.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Step 3 — Try it */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Step 3: Ask your AI to add tasks</p>
          <p className="text-xs text-muted-foreground">After connecting, copy one of these prompts into Claude or Codex:</p>
          <div className="grid gap-2">
            {promptExamples.map((prompt) => (
              <div key={prompt} className="flex items-start justify-between gap-2 rounded-md border bg-background p-2">
                <div className="flex gap-2">
                  <MessageSquareText className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">"{prompt}"</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 px-2"
                  onClick={() => handleCopy(prompt, 'prompt')}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Existing keys */}
        <div className="space-y-2 border-t pt-3">
          <p className="text-sm font-medium">Your AI connection keys</p>
          {loadingKeys ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : keys.length === 0 ? (
            <p className="text-xs text-muted-foreground">No keys yet. Create one above.</p>
          ) : (
            <div className="space-y-2">
              {keys.map((k) => {
                const isRevoked = !!k.revoked_at;
                const isExpired = k.expires_at && new Date(k.expires_at).getTime() < Date.now();
                const status = isRevoked ? 'Revoked' : isExpired ? 'Expired' : 'Active';
                return (
                  <div key={k.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-xs">
                    <div className="space-y-0.5">
                      <div className="font-mono">{k.key_prefix}••••{k.key_last4}</div>
                      <div className="text-muted-foreground">
                        {status} · created {new Date(k.created_at).toLocaleDateString()}
                        {k.expires_at ? ` · expires ${new Date(k.expires_at).toLocaleDateString()}` : ''}
                        {k.last_used_at ? ` · last used ${new Date(k.last_used_at).toLocaleDateString()}` : ''}
                      </div>
                    </div>
                    {!isRevoked && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-destructive"
                        onClick={() => handleRevoke(k.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Revoke
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {activeKeys.length > 1 && (
            <p className="text-xs text-muted-foreground">
              Tip: you usually only need one active key. Revoke old ones you're not using.
            </p>
          )}
        </div>

        {/* Reconnect instructions */}
        <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
          <p className="text-xs font-medium">If the AI connection disconnects</p>
          <p className="text-xs text-muted-foreground">
            Come back to this page, create a new key, copy the Mac setup command,
            paste it into Terminal, then restart Claude Desktop or Codex.
          </p>
        </div>

        {/* What AI can access */}
        <div className="border-t pt-3 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">What connected AI can access:</p>
          <div className="flex flex-wrap gap-2">
            {['Tasks', 'Daily Plans', 'Brain Dumps', 'Habits'].map((item) => (
              <span key={item} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-muted/40 p-3">
          <div className="flex gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
            <div className="space-y-1">
              <p className="text-xs font-medium">Private per user</p>
              <p className="text-xs text-muted-foreground">
                This connection uses your own AI connection key. One user's AI cannot add tasks to another user's account.
                Treat your key like a password and do not post it publicly.
              </p>
            </div>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="text-xs text-muted-foreground">
          Troubleshooting MCP connections?{' '}
          <a
            href="https://modelcontextprotocol.io/docs/tools/debugging"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary underline"
          >
            See the MCP debugging guide
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
