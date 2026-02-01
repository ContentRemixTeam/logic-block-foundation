import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, GripVertical, X, Calendar, Clock } from 'lucide-react';
import { ContentPlannerData, PlannedContentItem, ContentFormat, MessagingAngle } from '@/types/contentPlanner';
import { getFormatMetadata, formatDuration } from '../utils/formatHelpers';
import { format, addDays, parseISO, eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';

interface StepCalendarProps {
  data: ContentPlannerData;
  onChange: (updates: Partial<ContentPlannerData>) => void;
}

// Phase definitions for launch mode
const LAUNCH_PHASES = ['runway', 'pre-launch', 'cart-open', 'post-launch'] as const;

export function StepCalendar({ data, onChange }: StepCalendarProps) {
  // Initialize planned items from selected formats if empty
  useEffect(() => {
    if (data.plannedItems.length === 0 && data.selectedFormats.length > 0) {
      const startDate = data.customStartDate || format(new Date(), 'yyyy-MM-dd');
      
      const initialItems: PlannedContentItem[] = data.selectedFormats.map((formatId, index) => ({
        id: crypto.randomUUID(),
        title: getFormatMetadata(formatId)?.label || formatId,
        type: formatId,
        date: format(addDays(parseISO(startDate), index), 'yyyy-MM-dd'),
        sellingPointIds: [],
        messagingAngle: '',
        isRepurposed: data.selectedRepurposeIds.length > 0,
      }));
      
      onChange({ plannedItems: initialItems });
    }
  }, []);

  const addItem = () => {
    const lastDate = data.plannedItems.length > 0
      ? data.plannedItems[data.plannedItems.length - 1].date
      : data.customStartDate || format(new Date(), 'yyyy-MM-dd');
    
    const newItem: PlannedContentItem = {
      id: crypto.randomUUID(),
      title: 'New Content',
      type: data.selectedFormats[0] || 'email-single',
      date: format(addDays(parseISO(lastDate), 1), 'yyyy-MM-dd'),
      sellingPointIds: [],
      messagingAngle: '',
      isRepurposed: false,
    };
    
    onChange({ plannedItems: [...data.plannedItems, newItem] });
  };

  const updateItem = (id: string, updates: Partial<PlannedContentItem>) => {
    onChange({
      plannedItems: data.plannedItems.map(item =>
        item.id === id ? { ...item, ...updates } : item
      ),
    });
  };

  const removeItem = (id: string) => {
    onChange({
      plannedItems: data.plannedItems.filter(item => item.id !== id),
    });
  };

  // Group items by phase for launch mode
  const groupedByPhase = data.mode === 'launch'
    ? LAUNCH_PHASES.reduce((acc, phase) => {
        acc[phase] = data.plannedItems.filter(item => item.phase === phase);
        return acc;
      }, {} as Record<string, PlannedContentItem[]>)
    : null;

  // Calculate selling point coverage
  const sellingPointCoverage = data.sellingPoints.map(sp => {
    const count = data.plannedItems.filter(item => 
      item.sellingPointIds.includes(sp.id)
    ).length;
    return { ...sp, count };
  });

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Content Calendar</h2>
        <p className="text-muted-foreground">
          Schedule your content{data.mode === 'launch' ? ' by phase' : ''}
        </p>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-center gap-4 p-4 bg-muted/50 rounded-lg">
        <Badge variant="secondary">
          {data.plannedItems.length} items
        </Badge>
        {data.customStartDate && data.customEndDate && (
          <span className="text-sm text-muted-foreground">
            {format(parseISO(data.customStartDate), 'MMM d')} - {format(parseISO(data.customEndDate), 'MMM d')}
          </span>
        )}
      </div>

      {/* Content Items */}
      {data.mode === 'launch' && groupedByPhase ? (
        // Grouped by phase for launch mode
        <div className="space-y-6">
          {LAUNCH_PHASES.map((phase) => (
            <Card key={phase}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base capitalize flex items-center gap-2">
                    <span className={cn(
                      "w-3 h-3 rounded-full",
                      phase === 'runway' && "bg-blue-500",
                      phase === 'pre-launch' && "bg-amber-500",
                      phase === 'cart-open' && "bg-green-500",
                      phase === 'post-launch' && "bg-purple-500"
                    )} />
                    {phase.replace('-', ' ')}
                  </CardTitle>
                  <Badge variant="outline">
                    {groupedByPhase[phase].length} items
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {groupedByPhase[phase].map((item) => (
                  <ContentItemRow
                    key={item.id}
                    item={item}
                    formats={data.selectedFormats}
                    sellingPoints={data.sellingPoints}
                    onUpdate={(updates) => updateItem(item.id, updates)}
                    onRemove={() => removeItem(item.id)}
                  />
                ))}
                {groupedByPhase[phase].length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No content planned for this phase
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // Simple list for regular mode
        <div className="space-y-3">
          {data.plannedItems.map((item) => (
            <ContentItemRow
              key={item.id}
              item={item}
              formats={data.selectedFormats}
              sellingPoints={data.sellingPoints}
              onUpdate={(updates) => updateItem(item.id, updates)}
              onRemove={() => removeItem(item.id)}
            />
          ))}
        </div>
      )}

      <Button onClick={addItem} variant="outline" className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Content
      </Button>

      {/* Selling Point Coverage */}
      {data.sellingPoints.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Selling Points Coverage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sellingPointCoverage.map((sp) => (
              <div key={sp.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">{sp.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {sp.count} pieces
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all",
                        sp.count >= 3 ? "bg-green-500" : sp.count >= 1 ? "bg-amber-500" : "bg-muted-foreground/30"
                      )}
                      style={{ width: `${Math.min(100, (sp.count / 5) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Individual content item row component
interface ContentItemRowProps {
  item: PlannedContentItem;
  formats: ContentFormat[];
  sellingPoints: { id: string; label: string }[];
  onUpdate: (updates: Partial<PlannedContentItem>) => void;
  onRemove: () => void;
}

function ContentItemRow({ item, formats, sellingPoints, onUpdate, onRemove }: ContentItemRowProps) {
  const metadata = getFormatMetadata(item.type);
  
  return (
    <Card className="group">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab shrink-0 mt-2" />
          
          <div className="flex-1 space-y-3">
            <div className="flex items-start gap-3">
              <Input
                value={item.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                placeholder="Content title"
                className="flex-1"
              />
              <Input
                type="date"
                value={item.date}
                onChange={(e) => onUpdate({ date: e.target.value })}
                className="w-40"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Select
                value={item.type}
                onValueChange={(value) => onUpdate({ type: value as ContentFormat })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formats.map((format) => (
                    <SelectItem key={format} value={format}>
                      {getFormatMetadata(format)?.label || format}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {item.isRepurposed && (
                <Badge variant="secondary">Repurposed</Badge>
              )}
              
              <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                <Clock className="h-3 w-3" />
                {formatDuration(metadata?.estimatedMinutes || 0)}
              </span>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
