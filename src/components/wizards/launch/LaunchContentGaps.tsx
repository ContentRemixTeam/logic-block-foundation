import { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, Clock, Sparkles, Mail, FileText, Video, MessageSquare } from 'lucide-react';
import { LaunchWizardData, ContentPiece } from '@/types/launch';
import { supabase } from '@/integrations/supabase/client';

interface LaunchContentGapsProps {
  data: LaunchWizardData;
  onChange: (updates: Partial<LaunchWizardData>) => void;
}

interface ContentRequirement {
  type: string;
  category: string;
  countNeeded: number;
  description: string;
  timePerPiece: number; // minutes
}

interface SelectedContentItem {
  id: string;
  title: string;
  type: string;
}

// Time estimates per content type (in minutes)
const TIME_ESTIMATES: Record<string, number> = {
  email: 60,
  social: 15,
  video: 120,
  blog: 90,
  podcast: 60,
  leadMagnet: 180,
  salesPage: 240,
  webinar: 120,
};

export function LaunchContentGaps({ data, onChange }: LaunchContentGapsProps) {
  const [selectedItems, setSelectedItems] = useState<SelectedContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load details of selected content items
  useEffect(() => {
    const loadSelectedContent = async () => {
      if (!data.selectedContentIds || data.selectedContentIds.length === 0) {
        setSelectedItems([]);
        setIsLoading(false);
        return;
      }

      const { data: items } = await supabase
        .from('content_items')
        .select('id, title, type')
        .in('id', data.selectedContentIds);

      setSelectedItems(items || []);
      setIsLoading(false);
    };

    loadSelectedContent();
  }, [data.selectedContentIds]);

  // Calculate content requirements based on wizard answers
  const requirements = useMemo((): ContentRequirement[] => {
    const reqs: ContentRequirement[] = [];

    // Email requirements based on sequences
    if (data.preLaunchTasks?.emailSequences) {
      reqs.push({
        type: 'email',
        category: 'Pre-Launch Emails',
        countNeeded: 4,
        description: 'Warm-up sequence before cart opens',
        timePerPiece: TIME_ESTIMATES.email,
      });
    }

    if (data.preLaunchTasks?.emailTypes?.launch) {
      reqs.push({
        type: 'email',
        category: 'Launch Week Emails',
        countNeeded: 5,
        description: 'Daily emails during cart open period',
        timePerPiece: TIME_ESTIMATES.email,
      });
    }

    if (data.preLaunchTasks?.emailTypes?.cartClose) {
      reqs.push({
        type: 'email',
        category: 'Cart Close Emails',
        countNeeded: 3,
        description: 'Urgency emails for final 24-48 hours',
        timePerPiece: TIME_ESTIMATES.email,
      });
    }

    // Lead magnet
    if (data.preLaunchTasks?.leadMagnet) {
      reqs.push({
        type: 'leadMagnet',
        category: 'Lead Magnet',
        countNeeded: 1,
        description: 'Free resource to attract leads',
        timePerPiece: TIME_ESTIMATES.leadMagnet,
      });
    }

    // Social content based on posts per day and launch duration
    const launchDays = data.launchDuration === '3_days' ? 3 
      : data.launchDuration === '5_days' ? 5 
      : data.launchDuration === '7_days' ? 7 
      : data.launchDuration === '14_days' ? 14 : 7;
    
    const socialNeeded = (data.socialPostsPerDay || 1) * (launchDays + 7); // Launch + warm-up week
    if (socialNeeded > 0) {
      reqs.push({
        type: 'social',
        category: 'Social Posts',
        countNeeded: socialNeeded,
        description: `${data.socialPostsPerDay || 1} post(s)/day during launch`,
        timePerPiece: TIME_ESTIMATES.social,
      });
    }

    // Live events
    if (data.liveEvents && data.liveEvents.length > 0) {
      reqs.push({
        type: 'webinar',
        category: 'Live Event Content',
        countNeeded: data.liveEvents.length,
        description: 'Slides/scripts for live events',
        timePerPiece: TIME_ESTIMATES.webinar,
      });
    }

    // Video content
    if (data.contentFormats?.video && data.videoCount > 0) {
      reqs.push({
        type: 'video',
        category: 'Video Content',
        countNeeded: data.videoCount,
        description: 'Pre-launch videos',
        timePerPiece: TIME_ESTIMATES.video,
      });
    }

    // Sales page
    if (data.preLaunchTasks?.salesPage) {
      reqs.push({
        type: 'salesPage',
        category: 'Sales Page',
        countNeeded: 1,
        description: 'Main offer page',
        timePerPiece: TIME_ESTIMATES.salesPage,
      });
    }

    return reqs;
  }, [data]);

  // Calculate gaps (what's needed vs what's being reused)
  const gapAnalysis = useMemo(() => {
    const reusedByType: Record<string, number> = {};
    
    // Count reused content by type
    for (const item of selectedItems) {
      reusedByType[item.type] = (reusedByType[item.type] || 0) + 1;
    }

    let totalReused = selectedItems.length;
    let totalGaps = 0;
    let timeSaved = 0;
    const gaps: Array<{ type: string; category: string; count: number }> = [];

    for (const req of requirements) {
      const reusedCount = reusedByType[req.type] || 0;
      const gapCount = Math.max(0, req.countNeeded - reusedCount);
      
      if (reusedCount > 0) {
        timeSaved += Math.min(reusedCount, req.countNeeded) * req.timePerPiece;
      }
      
      if (gapCount > 0) {
        totalGaps += gapCount;
        gaps.push({
          type: req.type,
          category: req.category,
          count: gapCount,
        });
      }
    }

    return {
      reusedCount: totalReused,
      gapsCount: totalGaps,
      estimatedTimeSavedMinutes: timeSaved,
      gaps,
    };
  }, [selectedItems, requirements]);

  // Update parent when gap analysis changes
  useEffect(() => {
    if (!isLoading) {
      onChange({ contentGapAnalysis: gapAnalysis });
    }
  }, [gapAnalysis, isLoading]);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'video':
      case 'webinar':
        return <Video className="h-4 w-4" />;
      case 'social':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Content Gap Analysis</h3>
        <p className="text-muted-foreground">
          Based on your launch plan, here's what you'll need to create vs. what you can reuse.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Time Saved */}
        <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-full">
                <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {formatTime(gapAnalysis.estimatedTimeSavedMinutes)}
                </p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">Time saved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Reused */}
        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {gapAnalysis.reusedCount}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">Pieces reused</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gaps to Fill */}
        <Card className={`${gapAnalysis.gapsCount > 0 ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' : 'bg-muted/50'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${gapAnalysis.gapsCount > 0 ? 'bg-amber-100 dark:bg-amber-900' : 'bg-muted'}`}>
                <AlertCircle className={`h-5 w-5 ${gapAnalysis.gapsCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${gapAnalysis.gapsCount > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground'}`}>
                  {gapAnalysis.gapsCount}
                </p>
                <p className={`text-sm ${gapAnalysis.gapsCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                  {gapAnalysis.gapsCount === 0 ? 'All covered!' : 'Pieces to create'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reused Content */}
      {selectedItems.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Content You're Reusing
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {selectedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-md border border-emerald-200 dark:border-emerald-800"
              >
                {getIconForType(item.type)}
                <span className="text-sm truncate flex-1">{item.title}</span>
                <Badge variant="outline" className="text-xs shrink-0">
                  {item.type}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content Gaps */}
      {gapAnalysis.gaps.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" />
            Content Gaps to Fill
          </Label>
          <div className="space-y-2">
            {gapAnalysis.gaps.map((gap, index) => {
              const req = requirements.find(r => r.category === gap.category);
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-800"
                >
                  <div className="flex items-center gap-3">
                    {getIconForType(gap.type)}
                    <div>
                      <p className="font-medium text-sm">{gap.category}</p>
                      {req && (
                        <p className="text-xs text-muted-foreground">{req.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="font-mono">
                      {gap.count} needed
                    </Badge>
                    {req && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ~{formatTime(gap.count * req.timePerPiece)} total
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Auto-create tasks toggle */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <Label className="font-semibold">Auto-create content tasks</Label>
            <p className="text-sm text-muted-foreground">
              Generate tasks for content gaps when creating your launch
            </p>
          </div>
        </div>
        <Switch
          checked={data.autoCreateGapTasks}
          onCheckedChange={(checked) => onChange({ autoCreateGapTasks: checked })}
        />
      </div>

      {/* Encouragement */}
      {gapAnalysis.estimatedTimeSavedMinutes > 0 && (
        <div className="p-4 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            🎉 Nice! By reusing existing content, you're saving approximately{' '}
            <span className="font-bold">{formatTime(gapAnalysis.estimatedTimeSavedMinutes)}</span>{' '}
            of content creation time!
          </p>
        </div>
      )}
    </div>
  );
}
