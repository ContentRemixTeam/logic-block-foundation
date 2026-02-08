import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Rocket, CheckCircle2, Calendar, ListTodo } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ContentChallengeWizardData, AVAILABLE_PLATFORMS } from '@/types/contentChallenge';
import { format, parseISO, addDays } from 'date-fns';
import { toast } from 'sonner';

interface StepReviewLaunchProps {
  data: ContentChallengeWizardData;
  setData: (updates: Partial<ContentChallengeWizardData>) => void;
  goNext: () => void;
  goBack: () => void;
}

export default function StepReviewLaunch({ data, setData }: StepReviewLaunchProps) {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);

  // Calculate stats
  const platformStats = data.selectedPlatforms.map(platformId => {
    const platform = AVAILABLE_PLATFORMS.find(p => p.id === platformId);
    const content = data.contentByPlatform?.[platformId] || [];
    const finalized = content.filter(c => c.status === 'finalized').length;
    return {
      platform,
      total: content.length,
      finalized,
    };
  });

  const totalFinalized = platformStats.reduce((sum, s) => sum + s.finalized, 0);
  const totalContent = platformStats.reduce((sum, s) => sum + s.total, 0);

  // Calculate pillar distribution
  const pillarCounts: Record<string, number> = {};
  Object.values(data.contentByPlatform || {}).flat().forEach(item => {
    if (item.pillarName) {
      pillarCounts[item.pillarName] = (pillarCounts[item.pillarName] || 0) + 1;
    }
  });

  const handleCreateChallenge = async () => {
    if (!data.startDate) {
      toast.error('Please select a start date');
      return;
    }

    setIsCreating(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('create-content-challenge', {
        body: {
          name: data.challengeName,
          startDate: data.startDate,
          endDate: format(addDays(parseISO(data.startDate), 29), 'yyyy-MM-dd'),
          platforms: data.selectedPlatforms,
          promotionContext: data.promotionContext,
          newPillars: data.newPillars,
          selectedPillarIds: data.selectedPillarIds,
          contentByPlatform: data.contentByPlatform,
          postingTimes: data.postingTimes,
          createPublishingTasks: data.createPublishingTasks,
        },
      });

      if (error) throw error;

      toast.success('30 Days of Content challenge created!');
      navigate('/editorial-calendar');
    } catch (error) {
      console.error('Error creating challenge:', error);
      toast.error('Failed to create challenge');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Challenge Name */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Challenge Name</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            value={data.challengeName}
            onChange={(e) => setData({ challengeName: e.target.value })}
            placeholder="e.g., 30 Days of LinkedIn Content"
          />
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{totalFinalized}</div>
              <div className="text-sm text-muted-foreground">Content Pieces Ready</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{data.selectedPlatforms.length}</div>
              <div className="text-sm text-muted-foreground">Platforms</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">30</div>
              <div className="text-sm text-muted-foreground">Days</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Content by Platform</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {platformStats.map(({ platform, total, finalized }) => (
            <div key={platform?.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <span className="font-medium">{platform?.name}</span>
                {finalized === 30 && (
                  <Badge className="bg-green-500/10 text-green-600">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Complete
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {finalized}/{total} finalized
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pillar Distribution */}
      {Object.keys(pillarCounts).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pillar Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(pillarCounts).map(([pillar, count]) => (
                <Badge key={pillar} variant="secondary">
                  {pillar}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="font-medium">
                {data.startDate ? format(parseISO(data.startDate), 'MMMM d, yyyy') : 'Not set'}
              </div>
              <div className="text-sm text-muted-foreground">Start Date</div>
            </div>
            {data.startDate && (
              <>
                <span className="text-muted-foreground">→</span>
                <div>
                  <div className="font-medium">
                    {format(addDays(parseISO(data.startDate), 29), 'MMMM d, yyyy')}
                  </div>
                  <div className="text-sm text-muted-foreground">End Date</div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Task Creation Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ListTodo className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">Create Publishing Tasks</div>
                <div className="text-sm text-muted-foreground">
                  Add tasks to your daily planner for each piece of content
                </div>
              </div>
            </div>
            <Switch
              checked={data.createPublishingTasks}
              onCheckedChange={(checked) => setData({ createPublishingTasks: checked })}
            />
          </div>
          {data.createPublishingTasks && (
            <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              This will create {totalFinalized} publishing tasks in your task list
            </div>
          )}
        </CardContent>
      </Card>

      {/* Launch Button */}
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div>
              <h3 className="font-medium text-lg">Ready to launch your 30-day challenge?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                This will add all your content to the Editorial Calendar
                {data.createPublishingTasks && ' and create publishing tasks'}
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleCreateChallenge}
              disabled={isCreating || !data.startDate || totalFinalized === 0}
              className="min-w-[200px]"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Challenge...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-4 w-4" />
                  Launch Challenge
                </>
              )}
            </Button>
            {totalFinalized === 0 && (
              <p className="text-sm text-amber-600">
                No finalized content yet. Go back to Step 4 to finalize your content.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
