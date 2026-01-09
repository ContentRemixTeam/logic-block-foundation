import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Send, Mail, CheckCircle2, Loader2 } from 'lucide-react';
import { 
  ContentType,
  ContentChannel,
  CONTENT_TYPES,
  CONTENT_CHANNELS,
  createSendLog,
  getTodayLogs,
} from '@/lib/contentService';
import { toast } from 'sonner';
import { useActiveCycle } from '@/hooks/useActiveCycle';
import { useEffect } from 'react';

interface QuickLogCardProps {
  variant?: 'compact' | 'full';
}

export function QuickLogCard({ variant = 'compact' }: QuickLogCardProps) {
  const { data: cycle } = useActiveCycle();
  const [open, setOpen] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Form state
  const [channel, setChannel] = useState<ContentChannel>('Email');
  const [type, setType] = useState<ContentType>('Email');
  const [topic, setTopic] = useState('');

  useEffect(() => {
    const loadTodayLogs = async () => {
      try {
        const logs = await getTodayLogs();
        setTodayCount(logs.length);
      } catch (error) {
        console.error('Error loading today logs:', error);
      }
    };
    loadTodayLogs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createSendLog({
        channel,
        type,
        topic: topic.trim() || null,
        cycle_id: cycle?.cycle_id || null,
      });

      toast.success('Logged nurture ✅', {
        description: `${type} via ${channel}`,
      });

      setTodayCount(prev => prev + 1);
      setTopic('');
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to log');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Send className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Nurture Done Today?</p>
                <p className="text-xs text-muted-foreground">
                  {todayCount > 0 ? `${todayCount} logged today` : 'Track your consistency'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {todayCount > 0 && (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {todayCount}
                </Badge>
              )}
              <Button size="sm" onClick={() => setOpen(true)}>
                <Mail className="h-4 w-4 mr-1" />
                Log
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Log Nurture Activity</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as ContentChannel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_CHANNELS.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as ContentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Topic (optional)</Label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Mindset Monday"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Log It
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
