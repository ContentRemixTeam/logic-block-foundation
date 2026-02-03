import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Target, Zap, Clock, Users, DollarSign, CheckCircle2,
  ChevronDown, ChevronUp, Trophy
} from 'lucide-react';
import { 
  MoneyMomentumData, 
  OfferScore,
  BrainstormIdeaType,
  getScoreBadge,
  IDEA_DISPLAY_NAMES
} from '@/types/moneyMomentum';
import { cn } from '@/lib/utils';

interface StepOfferScoringProps {
  data: MoneyMomentumData;
  onChange: (updates: Partial<MoneyMomentumData>) => void;
}

export function StepOfferScoring({ data, onChange }: StepOfferScoringProps) {
  const [expandedIdea, setExpandedIdea] = useState<string | null>(null);

  // Get ideas from brainstorming that need to be scored
  const ideasToScore = data.brainstormedIdeas.map((idea, index) => ({
    id: `${idea.type}-${index}`,
    type: idea.type,
    name: IDEA_DISPLAY_NAMES[idea.type] || 'Custom Idea',
    data: idea.data,
  }));

  const getExistingScore = (ideaId: string): OfferScore | undefined => {
    return data.offerScores.find(s => s.ideaId === ideaId);
  };

  const updateScore = (ideaId: string, ideaType: BrainstormIdeaType, ideaName: string, field: keyof OfferScore, value: number) => {
    const existingScores = [...data.offerScores];
    const existingIndex = existingScores.findIndex(s => s.ideaId === ideaId);
    
    const currentScore: OfferScore = existingIndex >= 0 
      ? { ...existingScores[existingIndex] }
      : {
          ideaId,
          ideaType,
          ideaName,
          speedToLaunch: 3,
          timeToFulfill: 3,
          audienceFit: 3,
          cashPotential: 3,
          confidence: 3,
          totalScore: 15,
        };

    // Update the field
    (currentScore as any)[field] = value;
    
    // Recalculate total
    currentScore.totalScore = 
      currentScore.speedToLaunch + 
      currentScore.timeToFulfill + 
      currentScore.audienceFit + 
      currentScore.cashPotential + 
      currentScore.confidence;

    if (existingIndex >= 0) {
      existingScores[existingIndex] = currentScore;
    } else {
      existingScores.push(currentScore);
    }

    onChange({ offerScores: existingScores });
  };

  // Get sorted scores for ranking
  const rankedScores = [...data.offerScores]
    .sort((a, b) => b.totalScore - a.totalScore);

  const topScore = rankedScores[0];
  const secondScore = rankedScores[1];

  const scoringFactors = [
    {
      key: 'speedToLaunch' as const,
      label: 'Speed to Launch',
      question: 'How fast can you START selling this?',
      low: 'Need weeks to prep',
      high: 'Can sell TODAY',
      icon: Zap,
    },
    {
      key: 'timeToFulfill' as const,
      label: 'Time to Fulfill',
      question: 'How much work AFTER someone buys?',
      low: 'Weeks of delivery',
      high: 'Instant/minimal delivery',
      icon: Clock,
    },
    {
      key: 'audienceFit' as const,
      label: 'Audience Fit',
      question: 'Do you have the RIGHT people for this?',
      low: 'No audience for this',
      high: "Perfect fit, they're asking",
      icon: Users,
    },
    {
      key: 'cashPotential' as const,
      label: 'Cash Potential (This Week)',
      question: 'Realistic revenue if you sell this NOW?',
      low: 'Under $500',
      high: '$5K+',
      icon: DollarSign,
    },
    {
      key: 'confidence' as const,
      label: 'Confidence',
      question: 'Will you ACTUALLY execute this?',
      low: 'Probably not',
      high: "Hell yes, I'm doing this",
      icon: CheckCircle2,
    },
  ];

  if (ideasToScore.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Score Your Ideas</h2>
          <p className="text-muted-foreground">
            Go back and brainstorm some ideas first!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Now let's find your TOP offer</h2>
        <p className="text-muted-foreground">
          You brainstormed {ideasToScore.length} idea{ideasToScore.length !== 1 ? 's' : ''}. Great!<br />
          Score each one so you pick the RIGHT one for THIS sprint.
        </p>
      </div>

      {/* Scoring Cards */}
      {ideasToScore.map((idea) => {
        const score = getExistingScore(idea.id);
        const isExpanded = expandedIdea === idea.id;
        const badge = score ? getScoreBadge(score.totalScore) : null;

        return (
          <Card key={idea.id} className={cn(
            'transition-all',
            score && score.totalScore >= 20 && 'border-green-500/50 bg-green-500/5'
          )}>
            <CardHeader 
              className="cursor-pointer hover:bg-accent/30 transition-colors"
              onClick={() => setExpandedIdea(isExpanded ? null : idea.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">{idea.name}</CardTitle>
                  {badge && (
                    <Badge className={cn('text-white', badge.color)}>
                      {badge.emoji} {score?.totalScore}/25
                    </Badge>
                  )}
                </div>
                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="space-y-6 pt-0">
                {scoringFactors.map(({ key, label, question, low, high, icon: Icon }) => {
                  const value = score?.[key] ?? 3;
                  return (
                    <div key={key} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <Label className="font-medium">{label}</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">{question}</p>
                      <div className="px-2">
                        <Slider
                          value={[value]}
                          min={1}
                          max={5}
                          step={1}
                          onValueChange={([v]) => updateScore(idea.id, idea.type, idea.name, key, v)}
                          className="py-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>1 = {low}</span>
                          <span className="font-medium text-foreground">{value}</span>
                          <span>5 = {high}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {score && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Total Score:</span>
                      <Badge className={cn('text-lg px-3 py-1 text-white', badge?.color)}>
                        {badge?.emoji} {score.totalScore}/25 - {badge?.label}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Ranking & Recommendation */}
      {rankedScores.length > 0 && (
        <>
          <Card className="border-primary">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <CardTitle>YOUR TOP OFFERS (Ranked)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {rankedScores.map((score, index) => {
                const badge = getScoreBadge(score.totalScore);
                return (
                  <div 
                    key={score.ideaId}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border',
                      index === 0 && 'bg-primary/5 border-primary',
                      index === 1 && 'bg-accent/30'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg text-muted-foreground">
                        {index + 1}.
                      </span>
                      <span className="font-medium">{score.ideaName}</span>
                    </div>
                    <Badge className={cn('text-white', badge.color)}>
                      {badge.emoji} {score.totalScore}/25
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Primary/Backup Selection */}
          {topScore && (
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <CardTitle>🎯 YOUR SPRINT OFFERS</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-background rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-primary text-primary-foreground">PRIMARY</Badge>
                    <span className="font-bold">{topScore.ideaName}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Score: {topScore.totalScore}/25 — This wins because it has the highest fit for your current situation.
                  </p>
                </div>

                {secondScore && (
                  <div className="p-4 bg-background/50 rounded-lg border border-dashed">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">BACKUP</Badge>
                      <span className="font-medium">{secondScore.ideaName}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Score: {secondScore.totalScore}/25 — Use if primary doesn't get traction in 3 days.
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <Label className="block mb-3 font-medium">
                    Which offer(s) will you sell in this sprint?
                  </Label>
                  <RadioGroup
                    value={data.offerSelectionMode || ''}
                    onValueChange={(value) => {
                      onChange({ 
                        offerSelectionMode: value as MoneyMomentumData['offerSelectionMode'],
                        primaryOfferId: topScore.ideaId,
                        backupOfferId: value === 'primary-backup' && secondScore ? secondScore.ideaId : null,
                      });
                    }}
                    className="space-y-2"
                  >
                    <Label 
                      htmlFor="selection-primary"
                      className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
                    >
                      <RadioGroupItem value="primary-only" id="selection-primary" />
                      <span>Primary only (focus on ONE)</span>
                    </Label>
                    {secondScore && (
                      <Label 
                        htmlFor="selection-both"
                        className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
                      >
                        <RadioGroupItem value="primary-backup" id="selection-both" />
                        <span>Primary + Backup (test both)</span>
                      </Label>
                    )}
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
