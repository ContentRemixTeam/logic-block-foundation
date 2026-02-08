import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLearningInsights } from '@/hooks/useLearningInsights';
import { Brain, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { TAG_LABELS } from '@/types/learningInsights';

export function LearningInsightsCard() {
  const { insights, isLoading, hasEnoughData } = useLearningInsights();
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  if (!hasEnoughData) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Learning From Your Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Rate at least 3 generations to start seeing personalized adjustments.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Rated so far: {insights.totalRated}/3
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const TrendIcon = insights.ratingTrend === 'improving' 
    ? TrendingUp 
    : insights.ratingTrend === 'declining' 
      ? TrendingDown 
      : Minus;
  
  const trendColor = insights.ratingTrend === 'improving' 
    ? 'text-green-500' 
    : insights.ratingTrend === 'declining' 
      ? 'text-red-500' 
      : 'text-muted-foreground';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          What I've Learned
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Based on {insights.totalRated} rated generations
          </span>
          <div className="flex items-center gap-2">
            <span className="font-medium">{insights.avgRating.toFixed(1)}/10</span>
            <TrendIcon className={`h-4 w-4 ${trendColor}`} />
          </div>
        </div>
        
        {/* Key Adjustments */}
        {insights.keyAdjustments.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Adjustments I'm making:</p>
            <ul className="text-sm space-y-1">
              {insights.keyAdjustments.slice(0, 4).map((adjustment, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span className="text-muted-foreground">{adjustment}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Avoid Patterns */}
        {insights.avoidPatterns.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Avoiding:</p>
            <div className="flex flex-wrap gap-1">
              {insights.avoidPatterns.slice(0, 4).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/20">
                  {TAG_LABELS[tag] || tag.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Emphasize Patterns */}
        {insights.emphasizePatterns.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Emphasizing:</p>
            <div className="flex flex-wrap gap-1">
              {insights.emphasizePatterns.slice(0, 4).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                  {TAG_LABELS[tag] || tag.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
