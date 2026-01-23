import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Lightbulb, ArrowRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type TopicPlanningCadence = 'monthly' | 'weekly' | 'daily' | 'external';

interface TopicPlanningPromptProps {
  value: TopicPlanningCadence | null;
  onChange: (cadence: TopicPlanningCadence | null) => void;
  contentCreationIntent: 'yes-focus' | 'yes-maintain' | 'no';
  className?: string;
}

const CADENCE_OPTIONS: { 
  value: TopicPlanningCadence; 
  label: string; 
  description: string;
  icon: React.ReactNode;
  recommended?: boolean;
}[] = [
  { 
    value: 'monthly', 
    label: 'Monthly', 
    description: 'Plan all topics at the start of each month',
    icon: <Calendar className="h-5 w-5" />,
  },
  { 
    value: 'weekly', 
    label: 'Weekly', 
    description: 'Plan topics during weekly planning sessions',
    icon: <Calendar className="h-5 w-5" />,
    recommended: true,
  },
  { 
    value: 'daily', 
    label: 'Daily', 
    description: 'Decide on topics each day',
    icon: <Lightbulb className="h-5 w-5" />,
  },
  { 
    value: 'external', 
    label: 'I plan elsewhere', 
    description: 'Using another tool or method for topic planning',
    icon: <ArrowRight className="h-5 w-5" />,
  },
];

export function TopicPlanningPrompt({
  value,
  onChange,
  contentCreationIntent,
  className,
}: TopicPlanningPromptProps) {
  // Don't show if user isn't creating content
  if (contentCreationIntent === 'no') {
    return null;
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Topic Planning</CardTitle>
          <Badge variant="secondary" className="text-xs">Optional</Badge>
        </div>
        <CardDescription>
          When do you want to decide what topics/ideas to create content about?
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {CADENCE_OPTIONS.map(option => {
            const isSelected = value === option.value;
            
            return (
              <button
                key={option.value}
                onClick={() => onChange(isSelected ? null : option.value)}
                className={cn(
                  'relative flex flex-col items-start p-4 rounded-lg border-2 text-left transition-all min-h-[44px]',
                  isSelected 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                )}
              >
                <div className="flex items-center gap-2 w-full">
                  <div className={cn(
                    'p-1.5 rounded-md',
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}>
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{option.label}</span>
                      {option.recommended && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          Rec
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 pl-9">
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Info box */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-muted-foreground">
            Topic planning helps you separate <strong>what to create</strong> from <strong>actually creating it</strong>. 
            Skip this if you prefer to decide in the moment.
          </p>
        </div>

        {value && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onChange(null)}
            className="text-muted-foreground"
          >
            Skip topic planning for now
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
