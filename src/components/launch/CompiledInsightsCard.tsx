import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  BarChart3, 
  ChevronDown, 
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Zap,
  Battery,
  Calendar
} from 'lucide-react';
import { CompiledLaunchInsights } from '@/hooks/useDailyLaunchReflection';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface CompiledInsightsCardProps {
  insights: CompiledLaunchInsights;
  onPrefillWhatWorked?: (text: string) => void;
  onPrefillWhatToImprove?: (text: string) => void;
}

export function CompiledInsightsCard({ 
  insights, 
  onPrefillWhatWorked,
  onPrefillWhatToImprove 
}: CompiledInsightsCardProps) {
  const [showWorkedDetails, setShowWorkedDetails] = useState(false);
  const [showDidntWorkDetails, setShowDidntWorkDetails] = useState(false);
  const [showDailyBreakdown, setShowDailyBreakdown] = useState(false);

  // Count occurrences for grouping
  const workedCounts = insights.allWhatWorked.reduce((acc, item) => {
    const normalized = item.toLowerCase().trim();
    acc[normalized] = (acc[normalized] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const didntWorkCounts = insights.allWhatDidntWork.reduce((acc, item) => {
    const normalized = item.toLowerCase().trim();
    acc[normalized] = (acc[normalized] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Sort by count
  const topWorked = Object.entries(workedCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topDidntWork = Object.entries(didntWorkCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Energy emoji
  const getEnergyEmoji = (level: number) => {
    if (level >= 4.5) return '🤩';
    if (level >= 3.5) return '😊';
    if (level >= 2.5) return '😐';
    if (level >= 1.5) return '😕';
    return '😫';
  };

  const handlePrefillWorked = () => {
    if (onPrefillWhatWorked) {
      const text = insights.allWhatWorked.join('\n• ');
      onPrefillWhatWorked(text ? `• ${text}` : '');
    }
  };

  const handlePrefillDidntWork = () => {
    if (onPrefillWhatToImprove) {
      const text = insights.allWhatDidntWork.join('\n• ');
      onPrefillWhatToImprove(text ? `• ${text}` : '');
    }
  };

  return (
    <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-accent" />
            Compiled from Your Daily Reflections
          </div>
          <Badge variant="secondary" className="font-normal">
            {insights.totalEntries} daily entries
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {insights.averageEnergy !== null && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
              <Battery className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">
                  {getEnergyEmoji(insights.averageEnergy)} {insights.averageEnergy.toFixed(1)}/5
                </div>
                <div className="text-xs text-muted-foreground">Avg Energy</div>
              </div>
            </div>
          )}
          {insights.totalOffers > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
              <Zap className="h-4 w-4 text-yellow-500" />
              <div>
                <div className="font-medium">{insights.totalOffers}</div>
                <div className="text-xs text-muted-foreground">Total Offers</div>
              </div>
            </div>
          )}
          {insights.totalSales > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div>
                <div className="font-medium">{insights.totalSales}</div>
                <div className="text-xs text-muted-foreground">Total Sales</div>
              </div>
            </div>
          )}
          {insights.totalRevenue > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div>
                <div className="font-medium">${insights.totalRevenue.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Revenue</div>
              </div>
            </div>
          )}
        </div>

        {/* What Worked Summary */}
        {topWorked.length > 0 && (
          <Collapsible open={showWorkedDetails} onOpenChange={setShowWorkedDetails}>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 px-2 text-green-600 hover:text-green-700">
                  <TrendingUp className="h-4 w-4" />
                  What Worked ({insights.allWhatWorked.length} entries)
                  {showWorkedDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              {onPrefillWhatWorked && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handlePrefillWorked}
                  className="text-xs h-7"
                >
                  Use in Debrief
                </Button>
              )}
            </div>
            
            <div className="mt-2 space-y-1">
              {topWorked.slice(0, 3).map(([item, count]) => (
                <div key={item} className="flex items-center justify-between text-sm px-2 py-1 rounded bg-green-50 dark:bg-green-950/30">
                  <span className="capitalize">{item}</span>
                  {count > 1 && (
                    <Badge variant="secondary" className="text-xs">
                      {count}x
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            <CollapsibleContent className="mt-2 space-y-1">
              {topWorked.slice(3).map(([item, count]) => (
                <div key={item} className="flex items-center justify-between text-sm px-2 py-1 rounded bg-green-50 dark:bg-green-950/30">
                  <span className="capitalize">{item}</span>
                  {count > 1 && (
                    <Badge variant="secondary" className="text-xs">
                      {count}x
                    </Badge>
                  )}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* What Didn't Work Summary */}
        {topDidntWork.length > 0 && (
          <Collapsible open={showDidntWorkDetails} onOpenChange={setShowDidntWorkDetails}>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 px-2 text-orange-600 hover:text-orange-700">
                  <TrendingDown className="h-4 w-4" />
                  What Didn't Work ({insights.allWhatDidntWork.length} entries)
                  {showDidntWorkDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              {onPrefillWhatToImprove && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handlePrefillDidntWork}
                  className="text-xs h-7"
                >
                  Use in Debrief
                </Button>
              )}
            </div>
            
            <div className="mt-2 space-y-1">
              {topDidntWork.slice(0, 3).map(([item, count]) => (
                <div key={item} className="flex items-center justify-between text-sm px-2 py-1 rounded bg-orange-50 dark:bg-orange-950/30">
                  <span className="capitalize">{item}</span>
                  {count > 1 && (
                    <Badge variant="secondary" className="text-xs">
                      {count}x
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            <CollapsibleContent className="mt-2 space-y-1">
              {topDidntWork.slice(3).map(([item, count]) => (
                <div key={item} className="flex items-center justify-between text-sm px-2 py-1 rounded bg-orange-50 dark:bg-orange-950/30">
                  <span className="capitalize">{item}</span>
                  {count > 1 && (
                    <Badge variant="secondary" className="text-xs">
                      {count}x
                    </Badge>
                  )}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Daily Breakdown */}
        <Collapsible open={showDailyBreakdown} onOpenChange={setShowDailyBreakdown}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 px-2 w-full justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                View Daily Breakdown
              </span>
              {showDailyBreakdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-2 max-h-60 overflow-y-auto">
            {insights.entriesByDate.map((entry) => (
              <div 
                key={entry.id}
                className="p-2 rounded-md bg-muted/50 text-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">
                    {format(parseISO(entry.date), 'EEE, MMM d')}
                  </span>
                  <div className="flex items-center gap-2">
                    {entry.energy_level && (
                      <span>{getEnergyEmoji(entry.energy_level)}</span>
                    )}
                    <Badge variant="outline" className="text-xs capitalize">
                      {entry.phase}
                    </Badge>
                  </div>
                </div>
                {entry.what_worked.length > 0 && (
                  <div className="text-xs text-green-600">
                    ✓ {entry.what_worked.slice(0, 2).join(', ')}
                    {entry.what_worked.length > 2 && ` +${entry.what_worked.length - 2} more`}
                  </div>
                )}
                {entry.what_didnt_work.length > 0 && (
                  <div className="text-xs text-orange-600">
                    ✗ {entry.what_didnt_work.slice(0, 2).join(', ')}
                    {entry.what_didnt_work.length > 2 && ` +${entry.what_didnt_work.length - 2} more`}
                  </div>
                )}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
