import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, CheckCircle2, ListChecks, Calendar, Target, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlanningLevel, PLANNING_LEVEL_OPTIONS } from '@/types/wizard';

interface PlanningLevelSelectorProps {
  value: PlanningLevel;
  onChange: (level: PlanningLevel) => void;
  className?: string;
}

const LEVEL_ICONS: Record<PlanningLevel, React.ReactNode> = {
  detailed: <ListChecks className="h-5 w-5" />,
  simple: <Calendar className="h-5 w-5" />,
  minimal: <Target className="h-5 w-5" />,
  none: <FileText className="h-5 w-5" />,
};

export function PlanningLevelSelector({ 
  value, 
  onChange,
  className 
}: PlanningLevelSelectorProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid gap-3 sm:grid-cols-2">
        {PLANNING_LEVEL_OPTIONS.map(option => {
          const isSelected = value === option.value;
          
          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={cn(
                'relative flex flex-col items-start p-4 rounded-lg border-2 text-left transition-all min-h-[44px]',
                isSelected 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              <div className="flex items-center gap-3 w-full">
                <div className={cn(
                  'p-2 rounded-lg',
                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}>
                  {LEVEL_ICONS[option.value]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{option.label}</span>
                    {option.recommended && (
                      <Badge variant="secondary" className="text-xs">
                        Recommended
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {option.description}
                  </p>
                </div>
                {isSelected && (
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <Card className="bg-muted/50 border-dashed">
        <CardContent className="flex items-start gap-3 py-3">
          <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Not sure which to pick?</p>
            <p className="mt-1">
              Start with <strong>Simple</strong>. You can always add more detail later. 
              Done beats perfect—you can adjust your plan as you go.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
