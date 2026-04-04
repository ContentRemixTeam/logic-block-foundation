import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, RefreshCw, ExternalLink, Bot } from 'lucide-react';

export function McpConnectionPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState<'token' | 'config' | null>(null);
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

  const claudeConfig = JSON.stringify({
    mcpServers: {
      "90-day-planner": {
        command: "npx",
        args: ["-y", "mcp-remote", mcpUrl],
        env: {
          AUTHORIZATION: `Bearer ${token || 'YOUR_TOKEN_HERE'}`
        }
      }
    }
  }, null, 2);

  const handleCopy = async (text: string, type: 'token' | 'config') => {
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
          Claude AI Connection (MCP)
        </CardTitle>
        <CardDescription>
          Connect Claude Desktop to your planner so it can read and write your tasks, daily plans, and habits.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step 1 */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Step 1: Get your auth token</p>
          <p className="text-xs text-muted-foreground">
            This token lets Claude access your data securely. It expires periodically — come back here to refresh it.
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
          <p className="text-sm font-medium">Step 2: Add to Claude Desktop</p>
          <p className="text-xs text-muted-foreground">
            Copy the config below and paste it into your Claude Desktop config file:
          </p>
          <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
            <li><strong>Mac:</strong> ~/Library/Application Support/Claude/claude_desktop_config.json</li>
            <li><strong>Windows:</strong> %APPDATA%\Claude\claude_desktop_config.json</li>
          </ul>
          <div className="relative">
            <pre className="bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto">
              {claudeConfig}
            </pre>
            <Button
              onClick={() => handleCopy(claudeConfig, 'config')}
              variant="outline"
              size="sm"
              className="absolute top-2 right-2"
            >
              {copied === 'config' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {/* Step 3 */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Step 3: Restart Claude Desktop</p>
          <p className="text-xs text-muted-foreground">
            After saving the config, restart Claude Desktop. You can then ask Claude things like:
          </p>
          <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
            <li>"Add a task: Record podcast episode, due Friday"</li>
            <li>"What are my top priorities today?"</li>
            <li>"Mark my morning routine habit as done"</li>
            <li>"Show me my tasks for this week"</li>
            <li>"Brain dump: I need to finish the launch page, update pricing, and email the list"</li>
          </ul>
        </div>

        {/* What Claude can access */}
        <div className="border-t pt-3 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">What Claude can access:</p>
          <div className="flex flex-wrap gap-2">
            {['Tasks', 'Daily Plans', 'Brain Dumps', 'Habits'].map(item => (
              <span key={item} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                {item}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
