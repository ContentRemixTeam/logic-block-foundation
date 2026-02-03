import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Calendar, Target, Radio, DollarSign } from 'lucide-react';
import { useActiveSummits } from '@/hooks/useActiveSummits';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface SummitCheckInCardProps {
  showAllSummits?: boolean;
}

export function SummitCheckInCard({ showAllSummits = false }: SummitCheckInCardProps) {
  const { data: summits = [], isLoading } = useActiveSummits();

  if (isLoading || summits.length === 0) {
    return null;
  }

  // Show only the first summit unless showAllSummits is true
  const displaySummits = showAllSummits ? summits : summits.slice(0, 1);

  const phaseColors: Record<string, string> = {
    recruitment: 'text-blue-600 bg-blue-500/10',
    content: 'text-amber-600 bg-amber-500/10',
    promotion: 'text-purple-600 bg-purple-500/10',
    live: 'text-green-600 bg-green-500/10',
    'post-summit': 'text-slate-600 bg-slate-500/10',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Summit Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {displaySummits.map(summit => (
          <div key={summit.id} className="p-4 border rounded-lg space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{summit.name}</h4>
                <Badge 
                  variant="outline" 
                  className={cn("mt-1", phaseColors[summit.phase])}
                >
                  {summit.phaseLabel}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/projects/${summit.project_id}`}>View</Link>
              </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Task Progress */}
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Target className="h-3 w-3" />
                  Tasks
                </div>
                <Progress value={summit.taskPercent} className="h-1.5" />
                <p className="text-xs">
                  {summit.tasksCompleted}/{summit.tasksTotal} ({summit.taskPercent}%)
                </p>
              </div>

              {/* Timeline */}
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Timeline
                </div>
                {summit.phase === 'live' ? (
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Radio className="h-3 w-3 text-green-500 animate-pulse" />
                    Day {summit.daysInPhase} of summit
                  </p>
                ) : summit.daysUntilStart > 0 ? (
                  <p className="text-sm font-medium">
                    {summit.daysUntilStart} days until summit
                  </p>
                ) : (
                  <p className="text-sm font-medium">
                    Summit complete
                  </p>
                )}
              </div>
            </div>

            {/* Phase-specific metrics */}
            {summit.phase === 'recruitment' && summit.target_speaker_count > 0 && (
              <div className="p-2 bg-blue-500/5 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Speakers Confirmed</span>
                  <span className="font-medium">
                    {summit.speakersConfirmed} / {summit.target_speaker_count}
                  </span>
                </div>
              </div>
            )}

            {summit.phase === 'promotion' && summit.registration_goal && (
              <div className="p-2 bg-purple-500/5 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Registration Goal</span>
                  <span className="font-medium">{summit.registration_goal}</span>
                </div>
              </div>
            )}

            {(summit.phase === 'live' || summit.phase === 'post-summit') && summit.has_all_access_pass && (
              <div className="p-2 bg-green-500/5 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    All-Access Pass
                  </span>
                  <span className="font-medium">${summit.all_access_price}</span>
                </div>
              </div>
            )}
          </div>
        ))}

        {!showAllSummits && summits.length > 1 && (
          <p className="text-xs text-muted-foreground text-center">
            +{summits.length - 1} more summit{summits.length > 2 ? 's' : ''}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
