import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  Calendar, 
  FileText, 
  Layers, 
  Clock, 
  Sparkles,
  ListTodo,
  ArrowRight
} from 'lucide-react';
import { ContentPlannerData } from '@/types/contentPlanner';
import { getFormatMetadata, formatDuration, calculateTotalTime } from '../utils/formatHelpers';
import { format, parseISO, differenceInDays } from 'date-fns';
import { WizardTaskPreview } from '@/components/wizards/shared/WizardTaskPreview';
import { generateContentPlannerTasksPreview, CONTENT_PLANNER_PHASE_CONFIG } from '@/lib/contentPlannerTaskGenerator';

interface StepReviewCreateProps {
  data: ContentPlannerData;
  onChange: (updates: Partial<ContentPlannerData>) => void;
}

export function StepReviewCreate({ data, onChange }: StepReviewCreateProps) {
  // Generate task preview
  const allTasks = useMemo(() => generateContentPlannerTasksPreview(data), [data]);
  const selectedTaskCount = allTasks.filter(t => !(data.excludedTasks || []).includes(t.id)).length;
  
  // Calculate summary stats
  const totalItems = data.plannedItems.length;
  const repurposedCount = data.plannedItems.filter(i => i.isRepurposed).length;
  const newCount = totalItems - repurposedCount;
  const totalTime = calculateTotalTime(data.plannedItems.map(i => i.type));
  
  // Calculate time period
  const periodDays = data.customStartDate && data.customEndDate
    ? differenceInDays(parseISO(data.customEndDate), parseISO(data.customStartDate)) + 1
    : 0;

  // Group by format
  const formatCounts = data.plannedItems.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Check selling points coverage
  const coveredSellingPoints = data.sellingPoints.filter(sp =>
    data.plannedItems.some(item => item.sellingPointIds.includes(sp.id))
  );
  const allSellingPointsCovered = coveredSellingPoints.length === data.sellingPoints.length;

  // Check messaging angles coverage
  const usedAngles = [...new Set(data.plannedItems.map(i => i.messagingAngle).filter(Boolean))];

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Content Plan Summary</h2>
        <p className="text-muted-foreground">
          Review your plan before creating
        </p>
      </div>

      {/* Plan Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Plan Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Mode</p>
              <p className="font-medium capitalize">{data.mode || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Period</p>
              <p className="font-medium">
                {data.customStartDate && data.customEndDate ? (
                  <>
                    {format(parseISO(data.customStartDate), 'MMM d')} - {format(parseISO(data.customEndDate), 'MMM d')}
                    <span className="text-muted-foreground ml-1">({periodDays} days)</span>
                  </>
                ) : (
                  'Not set'
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Content Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {Object.entries(formatCounts).map(([format, count]) => {
              const metadata = getFormatMetadata(format as any);
              return (
                <div key={format} className="flex items-center justify-between">
                  <span className="text-sm">{metadata?.label || format}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              );
            })}
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between font-medium">
            <span>Total</span>
            <span>{totalItems} pieces</span>
          </div>
        </CardContent>
      </Card>

      {/* Repurposing Summary */}
      {repurposedCount > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Repurposing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">From vault</span>
              <span>{repurposedCount} pieces ({Math.round((repurposedCount / totalItems) * 100)}%)</span>
            </div>
            <div className="flex items-center justify-between text-green-600">
              <span className="text-sm">Time saved</span>
              <span>~{formatDuration(repurposedCount * 60)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Messaging Coverage */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className={allSellingPointsCovered ? "h-5 w-5 text-green-500" : "h-5 w-5 text-amber-500"} />
            Messaging Coverage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Selling points</span>
            {allSellingPointsCovered ? (
              <Badge variant="default" className="bg-green-500">
                All {data.sellingPoints.length} covered
              </Badge>
            ) : (
              <Badge variant="secondary">
                {coveredSellingPoints.length} of {data.sellingPoints.length}
              </Badge>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Messaging angles</span>
            <span className="text-sm">
              {usedAngles.length > 0 
                ? usedAngles.map(a => a?.replace('-', ' ')).join(', ')
                : 'None assigned'
              }
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Estimated Time */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Estimated Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total creation time</span>
            <span className="font-medium">{formatDuration(totalTime)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Task Generation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            Task Generation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="generate-tasks"
              checked={data.generateTasks}
              onCheckedChange={(checked) => onChange({ generateTasks: !!checked })}
            />
            <Label htmlFor="generate-tasks" className="cursor-pointer">
              Generate tasks for each content piece
            </Label>
          </div>
          
          {data.generateTasks && allTasks.length > 0 && (
            <WizardTaskPreview
              tasks={allTasks}
              excludedTasks={data.excludedTasks || []}
              dateOverrides={data.taskDateOverrides || []}
              onExcludedTasksChange={(excludedTasks) => onChange({ excludedTasks })}
              onDateOverridesChange={(taskDateOverrides) => onChange({ taskDateOverrides })}
              phaseOrder={CONTENT_PLANNER_PHASE_CONFIG}
              defaultExpandedPhases={['create']}
              maxHeight="300px"
            />
          )}
        </CardContent>
      </Card>

      {/* Ready Message */}
      <div className="text-center p-6 bg-muted/50 rounded-lg">
        <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
        <p className="font-medium">Your content plan is ready!</p>
        <p className="text-sm text-muted-foreground mt-1">
          Click "Create Content Plan" to save{data.generateTasks ? ` and create ${selectedTaskCount} tasks` : ''}
        </p>
      </div>
    </div>
  );
}
