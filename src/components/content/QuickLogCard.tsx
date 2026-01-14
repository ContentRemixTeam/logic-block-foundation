import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Send, Mail, CheckCircle2, Loader2 } from 'lucide-react';
import { 
  ContentType,
  ContentChannel,
  CONTENT_TYPES,
  CONTENT_CHANNELS,
  createSendLog,
  getTodayLogs,
  getDefaultsForNurtureMethod,
  getNurtureMethodLabel,
} from '@/lib/contentService';
import { toast } from 'sonner';
import { useActiveCycle } from '@/hooks/useActiveCycle';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface NurturePlatform {
  method: string;
  isPrimary?: boolean;
}

interface QuickLogCardProps {
  variant?: 'compact' | 'full';
}

export function QuickLogCard({ variant = 'compact' }: QuickLogCardProps) {
  const { data: cycle } = useActiveCycle();
  const [open, setOpen] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // User's nurture platforms from 90-day plan
  const [userNurturePlatforms, setUserNurturePlatforms] = useState<NurturePlatform[]>([]);

  // Form state
  const [channel, setChannel] = useState<ContentChannel>('Email');
  const [type, setType] = useState<ContentType>('Newsletter');
  const [topic, setTopic] = useState('');

  // Load today's logs
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

  // Load user's nurture platforms from their 90-day cycle
  useEffect(() => {
    const loadNurturePlatforms = async () => {
      if (!cycle?.cycle_id) return;

      try {
        const { data, error } = await supabase
          .from('cycle_strategy')
          .select('nurture_platforms')
          .eq('cycle_id', cycle.cycle_id)
          .maybeSingle();

        if (error) {
          console.error('Error loading nurture platforms:', error);
          return;
        }

        if (data?.nurture_platforms && Array.isArray(data.nurture_platforms)) {
          const platforms = (data.nurture_platforms as unknown) as NurturePlatform[];
          setUserNurturePlatforms(platforms);

          // Auto-set defaults from primary platform
          const primary = platforms.find(p => p.isPrimary);
          if (primary) {
            const defaults = getDefaultsForNurtureMethod(primary.method);
            setChannel(defaults.channel);
            setType(defaults.type);
          } else if (platforms.length > 0) {
            // If no primary, use the first platform
            const defaults = getDefaultsForNurtureMethod(platforms[0].method);
            setChannel(defaults.channel);
            setType(defaults.type);
          }
        }
      } catch (error) {
        console.error('Error loading nurture platforms:', error);
      }
    };

    loadNurturePlatforms();
  }, [cycle?.cycle_id]);

  const handleSelectPlatform = (platform: NurturePlatform) => {
    const defaults = getDefaultsForNurtureMethod(platform.method);
    setChannel(defaults.channel);
    setType(defaults.type);
  };

  const isSelectedPlatform = (platform: NurturePlatform) => {
    const defaults = getDefaultsForNurtureMethod(platform.method);
    return channel === defaults.channel && type === defaults.type;
  };

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
            {/* Quick Select from User's Platforms */}
            {userNurturePlatforms.length > 0 && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Quick Select (Your Platforms)</Label>
                  <div className="flex flex-wrap gap-2">
                    {userNurturePlatforms.map((platform, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className={cn(
                          "cursor-pointer hover:bg-primary/10 transition-colors",
                          isSelectedPlatform(platform) && "bg-primary/20 border-primary text-primary"
                        )}
                        onClick={() => handleSelectPlatform(platform)}
                      >
                        {platform.isPrimary && '⭐ '}
                        {getNurtureMethodLabel(platform.method)}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    From your 90-Day Plan commitments
                  </p>
                </div>
                <Separator />
              </>
            )}

            {/* Channel & Type Dropdowns */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Channel (Where)</Label>
                <Select value={channel} onValueChange={(v) => setChannel(v as ContentChannel)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {CONTENT_CHANNELS.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Type (What)</Label>
                <Select value={type} onValueChange={(v) => setType(v as ContentType)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {CONTENT_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Topic (optional)</Label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Mindset Monday"
                className="h-9"
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
