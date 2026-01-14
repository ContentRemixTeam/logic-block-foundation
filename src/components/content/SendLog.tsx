import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, isWithinInterval, subWeeks } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Send, Flame, Mail, Calendar, TrendingUp, Loader2 } from 'lucide-react';
import { 
  ContentSendLog,
  ContentType,
  ContentChannel,
  CONTENT_TYPES,
  CONTENT_CHANNELS,
  getSendLogs,
  createSendLog,
  deleteSendLog,
  getNurtureStats,
} from '@/lib/contentService';
import { toast } from 'sonner';
import { useActiveCycle } from '@/hooks/useActiveCycle';

interface SendLogProps {
  onLogCreated?: () => void;
}

export function SendLog({ onLogCreated }: SendLogProps) {
  const { data: cycle } = useActiveCycle();
  const [logs, setLogs] = useState<ContentSendLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({
    thisWeekEmails: 0,
    thisWeekTotal: 0,
    thisMonthEmails: 0,
    thisMonthTotal: 0,
    streak: 0,
    lastPublished: null as string | null,
  });

  // Form state
  const [channel, setChannel] = useState<ContentChannel>('Email');
  const [type, setType] = useState<ContentType>('Newsletter');
  const [topic, setTopic] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [logsData, statsData] = await Promise.all([
        getSendLogs({ limit: 50 }),
        getNurtureStats(cycle?.cycle_id),
      ]);
      setLogs(logsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading send logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [cycle?.cycle_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await createSendLog({
        channel,
        type,
        topic: topic.trim() || null,
        cycle_id: cycle?.cycle_id || null,
      });

      toast.success('Logged! ✅', {
        description: `${type} via ${channel}${topic ? ` - ${topic}` : ''}`,
      });

      setTopic('');
      loadData();
      onLogCreated?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to log');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSendLog(id);
      toast.success('Log removed');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete');
    }
  };

  // Group logs by week
  const groupedLogs = logs.reduce((acc, log) => {
    const weekStart = startOfWeek(new Date(log.sent_at), { weekStartsOn: 0 });
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    
    if (!acc[weekKey]) {
      acc[weekKey] = {
        weekStart,
        weekEnd: endOfWeek(weekStart, { weekStartsOn: 0 }),
        logs: [],
      };
    }
    acc[weekKey].logs.push(log);
    return acc;
  }, {} as Record<string, { weekStart: Date; weekEnd: Date; logs: ContentSendLog[] }>);

  const isCurrentWeek = (weekStart: Date) => {
    const now = new Date();
    return isWithinInterval(now, {
      start: weekStart,
      end: endOfWeek(weekStart, { weekStartsOn: 0 }),
    });
  };

  return (
    <div className="space-y-6">
      {/* Quick Log Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Quick Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as ContentChannel)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_CHANNELS.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as ContentType)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 flex-1 min-w-[150px]">
              <Label className="text-xs">Topic (optional)</Label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Mindset Monday"
              />
            </div>

            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Log It
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Flame className="h-4 w-4 text-orange-500" />
              Streak
            </div>
            <p className="text-2xl font-bold">{stats.streak} weeks</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Mail className="h-4 w-4 text-blue-500" />
              Emails This Week
            </div>
            <p className="text-2xl font-bold">{stats.thisWeekEmails}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Total This Week
            </div>
            <p className="text-2xl font-bold">{stats.thisWeekTotal}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Calendar className="h-4 w-4 text-purple-500" />
              Last Published
            </div>
            <p className="text-lg font-medium">
              {stats.lastPublished 
                ? format(new Date(stats.lastPublished), 'MMM d')
                : 'Never'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Activity Feed</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : Object.keys(groupedLogs).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Send className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No nurture activity logged yet</p>
              <p className="text-sm">Use the quick log above to track your content</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedLogs)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([weekKey, { weekStart, weekEnd, logs: weekLogs }]) => (
                  <div key={weekKey}>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                      </h3>
                      {isCurrentWeek(weekStart) && (
                        <Badge variant="secondary" className="text-xs">This Week</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {weekLogs.length} logged
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {weekLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30 group"
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-xs">
                              {log.type}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{log.channel}</span>
                            {log.topic && (
                              <span className="text-sm font-medium">{log.topic}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.sent_at), 'MMM d, h:mm a')}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDelete(log.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Send Log is for consistency tracking. Log every email, post, or nurture touch to build your streak.
      </p>
    </div>
  );
}
