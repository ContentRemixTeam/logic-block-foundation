import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Users, 
  ChevronDown, 
  ChevronUp,
  Calendar,
  Clock,
  Target,
  Mic,
  Radio
} from 'lucide-react';
import { ActiveSummit } from '@/hooks/useActiveSummits';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface SummitModeSectionProps {
  summit: ActiveSummit;
}

export function SummitModeSection({ summit }: SummitModeSectionProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Phase colors
  const phaseColors: Record<string, string> = {
    recruitment: 'bg-blue-500',
    content: 'bg-amber-500',
    promotion: 'bg-purple-500',
    live: 'bg-green-500 animate-pulse',
    'post-summit': 'bg-slate-500',
  };

  // Phase icons
  const phaseIcons: Record<string, React.ReactNode> = {
    recruitment: <Users className="h-4 w-4" />,
    content: <Mic className="h-4 w-4" />,
    promotion: <Target className="h-4 w-4" />,
    live: <Radio className="h-4 w-4" />,
    'post-summit': <Calendar className="h-4 w-4" />,
  };

  // Determine urgency
  let urgencyLevel: 'low' | 'medium' | 'high' = 'low';
  let countdown = '';

  if (summit.phase === 'live') {
    countdown = `Day ${summit.daysInPhase} of summit`;
    urgencyLevel = 'high';
  } else if (summit.daysUntilStart <= 3 && summit.daysUntilStart > 0) {
    countdown = `${summit.daysUntilStart} days until summit`;
    urgencyLevel = 'high';
  } else if (summit.daysUntilStart <= 7) {
    countdown = `${summit.daysUntilStart} days until summit`;
    urgencyLevel = 'medium';
  } else if (summit.daysUntilStart > 0) {
    countdown = `${summit.daysUntilStart} days to prepare`;
  } else {
    countdown = 'Summit complete';
  }

  return (
    <Card className={cn(
      "border-2 transition-all",
      urgencyLevel === 'high' && "border-purple-500/50 bg-purple-50/30 dark:bg-purple-950/10",
      urgencyLevel === 'medium' && "border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/10",
      urgencyLevel === 'low' && "border-blue-500/30"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-sm font-medium",
              phaseColors[summit.phase]
            )}>
              {phaseIcons[summit.phase]}
              {summit.phaseLabel}
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">{summit.name}</span>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {countdown}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {summit.target_speaker_count > 0 && (
              <Badge variant="outline" className="hidden sm:flex">
                <Users className="h-3 w-3 mr-1" />
                {summit.speakersConfirmed}/{summit.target_speaker_count}
              </Badge>
            )}
            <Link to={`/projects/${summit.project_id}`}>
              <Button variant="ghost" size="sm" className="text-xs">
                View Project
              </Button>
            </Link>
          </div>
        </div>

        {/* Progress bar */}
        {summit.tasksTotal > 0 && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Task Progress</span>
              <span>{summit.tasksCompleted}/{summit.tasksTotal} ({summit.taskPercent}%)</span>
            </div>
            <Progress value={summit.taskPercent} className="h-1.5" />
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Phase-specific quick info */}
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between h-8">
              <span className="flex items-center gap-1.5 text-sm">
                {summit.phase === 'recruitment' && '📧 Speaker Outreach Tips'}
                {summit.phase === 'content' && '🎬 Content Checklist'}
                {summit.phase === 'promotion' && '📣 Promotion Focus'}
                {summit.phase === 'live' && '🎯 Today\'s Summit Focus'}
                {summit.phase === 'post-summit' && '📊 Post-Summit Tasks'}
              </span>
              {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-2">
              {summit.phase === 'recruitment' && (
                <>
                  <p>✅ Send personalized speaker invites</p>
                  <p>✅ Follow up with pending responses</p>
                  <p>✅ Update speaker tracking sheet</p>
                </>
              )}
              {summit.phase === 'content' && (
                <>
                  <p>✅ Collect speaker bios and headshots</p>
                  <p>✅ Schedule/review recordings</p>
                  <p>✅ Prepare swipe copy for speakers</p>
                </>
              )}
              {summit.phase === 'promotion' && (
                <>
                  <p>✅ Send promotional emails</p>
                  <p>✅ Post on social media</p>
                  <p>✅ Remind speakers to promote</p>
                  {summit.registration_goal && (
                    <p className="font-medium">🎯 Registration goal: {summit.registration_goal}</p>
                  )}
                </>
              )}
              {summit.phase === 'live' && (
                <>
                  <p>✅ Host today's sessions</p>
                  <p>✅ Engage in community</p>
                  <p>✅ Send daily recap email</p>
                  {summit.has_all_access_pass && (
                    <p className="font-medium">💰 Promote All-Access Pass (${summit.all_access_price})</p>
                  )}
                </>
              )}
              {summit.phase === 'post-summit' && (
                <>
                  <p>✅ Send thank you emails</p>
                  <p>✅ Process affiliate commissions</p>
                  <p>✅ Complete summit debrief</p>
                </>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
