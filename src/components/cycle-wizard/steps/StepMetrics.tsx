import { useState } from 'react';
import { StepProps, MetricSuggestion } from '../CycleWizardTypes';
import { FOCUS_METRICS, PLATFORM_METRICS } from '../CycleWizardData';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Lightbulb, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricRowProps {
  index: number;
  name: string;
  start: number | null;
  goal: number | null;
  onNameChange: (value: string) => void;
  onStartChange: (value: number | null) => void;
  onGoalChange: (value: number | null) => void;
  required?: boolean;
}

function MetricRow({ index, name, start, goal, onNameChange, onStartChange, onGoalChange, required }: MetricRowProps) {
  return (
    <div className="p-4 rounded-lg bg-muted/30 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          Metric {index + 1} {required && <span className="text-destructive">*</span>}
        </Label>
        {!required && name && (
          <button
            onClick={() => {
              onNameChange('');
              onStartChange(null);
              onGoalChange(null);
            }}
            className="text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      
      <Input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="e.g., Email list size"
        className="text-base"
      />
      
      {name && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Starting at</Label>
            <Input
              type="number"
              value={start ?? ''}
              onChange={(e) => onStartChange(e.target.value ? Number(e.target.value) : null)}
              placeholder="0"
              className="text-base"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Goal</Label>
            <Input
              type="number"
              value={goal ?? ''}
              onChange={(e) => onGoalChange(e.target.value ? Number(e.target.value) : null)}
              placeholder="Target"
              className="text-base"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function StepMetrics({ data, setData }: StepProps) {
  const [activeTab, setActiveTab] = useState<string>(data.focusArea || 'discover');

  const handleSuggestionClick = (suggestion: MetricSuggestion) => {
    // Find first empty slot
    if (!data.metric1_name) {
      setData({ metric1_name: suggestion.name });
    } else if (!data.metric2_name) {
      setData({ metric2_name: suggestion.name });
    } else if (!data.metric3_name) {
      setData({ metric3_name: suggestion.name });
    }
  };

  const allSuggestions = [
    ...(FOCUS_METRICS[data.focusArea] || []),
    ...Object.values(PLATFORM_METRICS).flat(),
  ];

  const usedMetrics = [data.metric1_name, data.metric2_name, data.metric3_name].filter(Boolean);
  const availableSuggestions = allSuggestions.filter(s => !usedMetrics.includes(s.name));

  return (
    <div className="space-y-6">
      {/* Teaching Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Track What Matters</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm">
            Choose 1-3 metrics that directly measure progress toward your goal.
            {data.focusArea && (
              <span className="block mt-1">
                Since your focus is <span className="font-medium text-primary capitalize">{data.focusArea}</span>,
                we suggest related metrics below.
              </span>
            )}
          </CardDescription>
        </CardContent>
      </Card>

      {/* Metric Inputs */}
      <div className="space-y-4">
        <MetricRow
          index={0}
          name={data.metric1_name}
          start={data.metric1_start}
          goal={data.metric1_goal}
          onNameChange={(v) => setData({ metric1_name: v })}
          onStartChange={(v) => setData({ metric1_start: v })}
          onGoalChange={(v) => setData({ metric1_goal: v })}
          required
        />
        <MetricRow
          index={1}
          name={data.metric2_name}
          start={data.metric2_start}
          goal={data.metric2_goal}
          onNameChange={(v) => setData({ metric2_name: v })}
          onStartChange={(v) => setData({ metric2_start: v })}
          onGoalChange={(v) => setData({ metric2_goal: v })}
        />
        <MetricRow
          index={2}
          name={data.metric3_name}
          start={data.metric3_start}
          goal={data.metric3_goal}
          onNameChange={(v) => setData({ metric3_name: v })}
          onStartChange={(v) => setData({ metric3_start: v })}
          onGoalChange={(v) => setData({ metric3_goal: v })}
        />
      </div>

      {/* Suggestions */}
      {usedMetrics.length < 3 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Quick Add Suggestions
          </Label>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="discover" className="text-xs">Discover</TabsTrigger>
              <TabsTrigger value="nurture" className="text-xs">Nurture</TabsTrigger>
              <TabsTrigger value="convert" className="text-xs">Convert</TabsTrigger>
              <TabsTrigger value="platform" className="text-xs">Platform</TabsTrigger>
            </TabsList>
            
            {['discover', 'nurture', 'convert'].map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-3">
                <div className="flex flex-wrap gap-2">
                  {(FOCUS_METRICS[tab] || [])
                    .filter(s => !usedMetrics.includes(s.name))
                    .map((suggestion) => (
                      <Badge
                        key={suggestion.name}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10 transition-colors"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {suggestion.name}
                      </Badge>
                    ))}
                </div>
              </TabsContent>
            ))}
            
            <TabsContent value="platform" className="mt-3 space-y-3">
              {Object.entries(PLATFORM_METRICS).map(([platform, metrics]) => (
                <div key={platform} className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground capitalize">{platform}</p>
                  <div className="flex flex-wrap gap-2">
                    {metrics
                      .filter(s => !usedMetrics.includes(s.name))
                      .slice(0, 3)
                      .map((suggestion) => (
                        <Badge
                          key={suggestion.name}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary/10 transition-colors text-xs"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {suggestion.name}
                        </Badge>
                      ))}
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Summary */}
      {usedMetrics.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Tracking {usedMetrics.length} metric{usedMetrics.length > 1 ? 's' : ''}</p>
            </div>
            <div className="text-xs text-muted-foreground">
              {usedMetrics.join(' • ')}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
