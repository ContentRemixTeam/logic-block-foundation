import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, RefreshCw, Bot, ShieldCheck, Wrench, MessageSquareText } from 'lucide-react';

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
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState<'token' | 'config' | 'mac-command' | 'prompt' | null>(null);
  const [loading, setLoading] = useState(false);

  const mcpUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mcp-server`;

  const handleGetToken = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        setToken(data.session.access_token);
      } else {
        toast({ title: 'Not logged in', description: 'Please log in first.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Could not get auth token.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const mcpConfig = JSON.stringify({
    mcpServers: {
      "boss-planner": {
        command: "npx",
        args: ["-y", "mcp-remote", mcpUrl],
        env: {
          AUTHORIZATION: `Bearer ${token || 'YOUR_TOKEN_HERE'}`
        }
      }
    }
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
        "AUTHORIZATION": "Bearer ${token || 'YOUR_TOKEN_HERE'}"
    }
}

with open(path, "w") as file:
    json.dump(config, file, indent=2)

print("Done. Now fully quit and reopen Claude Desktop.")
PY`;

  const handleCopy = async (text: string, type: 'token' | 'config' | 'mac-command' | 'prompt') => {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Task Connection
        </CardTitle>
        <CardDescription>
          Connect Claude, Codex, or another AI tool so it can add tasks to your planner.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/40 p-3">
          <p className="text-sm font-medium">What this does</p>
          <p className="mt-1 text-xs text-muted-foreground">
            This lets your AI assistant create planner tasks for you, read your planner tasks, update your daily plan, and log habits.
            It does not connect anyone else to your account.
          </p>
        </div>

        <div className="rounded-lg border p-3">
          <div className="flex gap-2">
            <Wrench className="mt-0.5 h-4 w-4 text-primary" />
            <div className="space-y-2">
              <p className="text-sm font-medium">Beginner setup checklist</p>
              <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
                <li>Stay logged into this planner account.</li>
                <li>Click <strong>Get Token</strong> below.</li>
                <li>Click <strong>Copy Mac Setup Command</strong>.</li>
                <li>Open Terminal on your Mac.</li>
                <li>Paste the command, press Enter, then fully restart Claude Desktop.</li>
                <li>Ask Claude to add a simple test task, then check your Tasks page.</li>
              </ol>
              <p className="text-xs text-muted-foreground">
                If you use Codex or another AI app, use the same server URL and token shown here.
              </p>
            </div>
          </div>
        </div>

        {/* Step 1 */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Step 1: Get your private connection token</p>
          <p className="text-xs text-muted-foreground">
            Think of this like a temporary key. It connects an AI tool to only your planner account.
            If the connection stops working later, come back here and click Refresh Token.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleGetToken} disabled={loading} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {token ? 'Refresh Token' : 'Get Token'}
            </Button>
            {token && (
              <Button
                onClick={() => handleCopy(token, 'token')}
                variant="outline"
                size="sm"
              >
                {copied === 'token' ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                Copy Token
              </Button>
            )}
          </div>
          {token && (
            <Input
              readOnly
              value={token.slice(0, 40) + '...'}
              className="font-mono text-xs"
            />
          )}
        </div>

        {/* Step 2 */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Step 2: Add the connection to your AI tool</p>
          <p className="text-xs text-muted-foreground">
            Easiest Mac option: copy this command, paste it into Terminal, and press Enter.
            It keeps Claude's existing settings and adds this planner connection.
          </p>
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
          {token && (
            <Button
              onClick={() => handleCopy(macSetupCommand, 'mac-command')}
              variant="outline"
              size="sm"
            >
              {copied === 'mac-command' ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              Copy Mac Setup Command
            </Button>
          )}

          <p className="text-xs text-muted-foreground">
            Advanced/manual option: if Claude gives you a config box, copy this block instead.
          </p>
          <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
            <li>If Claude gives you a config box, paste this whole block.</li>
            <li>If Claude asks for a server URL, use the URL shown in the config.</li>
            <li>If Claude asks for a token or authorization header, use the private token from Step 1.</li>
          </ul>
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
          {token && (
            <Button
              onClick={() => handleCopy(mcpConfig, 'config')}
              variant="outline"
              size="sm"
            >
              {copied === 'config' ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              Copy Config
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            Server URL: <span className="font-mono">{mcpUrl}</span>
          </p>
        </div>

        {/* Step 3 */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Step 3: Ask your AI to add tasks</p>
          <p className="text-xs text-muted-foreground">
            After connecting, copy one of these prompts into Claude or Codex:
          </p>
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

        {/* What AI can access */}
        <div className="border-t pt-3 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">What connected AI can access:</p>
          <div className="flex flex-wrap gap-2">
            {['Tasks', 'Daily Plans', 'Brain Dumps', 'Habits'].map(item => (
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
                This connection uses the signed-in user's own token. One user's AI cannot add tasks to another user's account.
                Treat your token like a password and do not post it publicly.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
