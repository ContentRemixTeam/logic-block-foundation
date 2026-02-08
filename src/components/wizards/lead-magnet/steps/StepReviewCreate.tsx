// Step 8: Review & Create
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  LeadMagnetWizardData, 
  getDefaultLeadMagnetTasks, 
  LEAD_MAGNET_TASK_PHASES,
  LEAD_MAGNET_FORMATS,
} from '@/types/leadMagnet';
import { 
  CheckCircle2, 
  FileText, 
  Users, 
  Package, 
  Target, 
  Globe, 
  Mail, 
  Megaphone,
  Sparkles,
  ListTodo,
} from 'lucide-react';

interface StepReviewCreateProps {
  data: LeadMagnetWizardData;
  onChange: (updates: Partial<LeadMagnetWizardData>) => void;
}

export function StepReviewCreate({ data, onChange }: StepReviewCreateProps) {
  const tasks = useMemo(() => getDefaultLeadMagnetTasks(data), [data]);
  
  const formatLabel = LEAD_MAGNET_FORMATS.find(f => f.value === data.format);
  
  const handleTaskToggle = (taskId: string, checked: boolean) => {
    onChange({
      selectedTasks: {
        ...data.selectedTasks,
        [taskId]: checked,
      },
    });
  };

  const isTaskSelected = (taskId: string) => {
    // Default to true if not explicitly set
    return data.selectedTasks[taskId] !== false;
  };

  const selectedCount = tasks.filter(t => isTaskSelected(t.id)).length;
  const contentTasks = tasks.filter(t => t.isContent && isTaskSelected(t.id));

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
            <div>
              <p className="font-medium">Ready to Create Your Lead Magnet Project!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Review your plan below. You can toggle tasks on/off before creating.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Freebie Summary */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Your Freebie</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="font-medium">{data.name || 'Untitled Lead Magnet'}</span>
            </div>
            {formatLabel && (
              <Badge variant="secondary">{formatLabel.icon} {formatLabel.label}</Badge>
            )}
            {data.description && (
              <p className="text-muted-foreground line-clamp-2">{data.description}</p>
            )}
          </CardContent>
        </Card>

        {/* Audience Summary */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Target Audience</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground line-clamp-2">
              {data.idealSubscriber || 'Not specified'}
            </p>
            {data.platforms.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {data.platforms.slice(0, 3).map(p => (
                  <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                ))}
                {data.platforms.length > 3 && (
                  <Badge variant="outline" className="text-xs">+{data.platforms.length - 3}</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Summary */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Email Sequence</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{data.emailSequenceLength + 1} emails total (1 welcome + {data.emailSequenceLength} nurture)</p>
            <Badge variant="secondary">
              {data.emailSequencePurpose === 'value' && 'Pure Value'}
              {data.emailSequencePurpose === 'soft-sell' && 'Soft Sell'}
              {data.emailSequencePurpose === 'discovery-call' && 'Discovery Call'}
              {data.emailSequencePurpose === 'paid-offer' && 'Paid Offer'}
            </Badge>
          </CardContent>
        </Card>

        {/* Promotion Summary */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Promotion Plan</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{data.promotionDuration} • {data.weeklyCommitment}x/week</p>
            {data.promotionStartDate && (
              <p className="text-muted-foreground">
                Starting {new Date(data.promotionStartDate).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Task Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Tasks to Create</CardTitle>
            </div>
            <Badge variant="outline">{selectedCount} selected</Badge>
          </div>
          <CardDescription>
            Toggle tasks on/off to customize what gets created.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(LEAD_MAGNET_TASK_PHASES).map(([phase, phaseLabel]) => {
            const phaseTasks = tasks.filter(t => t.phase === phase);
            if (phaseTasks.length === 0) return null;
            
            return (
              <div key={phase} className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  {phaseLabel}
                </h4>
                <div className="space-y-2">
                  {phaseTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <Checkbox
                        id={`task-${task.id}`}
                        checked={isTaskSelected(task.id)}
                        onCheckedChange={(checked) => handleTaskToggle(task.id, checked === true)}
                      />
                      <div className="flex-1 min-w-0">
                        <Label
                          htmlFor={`task-${task.id}`}
                          className="font-medium cursor-pointer"
                        >
                          {task.title}
                        </Label>
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                      </div>
                      {task.isContent && (
                        <Badge variant="secondary" className="shrink-0">
                          <Sparkles className="h-3 w-3 mr-1" />
                          AI Copy
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Content to Generate */}
      {contentTasks.length > 0 && (
        <Card className="border-dashed border-2 bg-muted/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">AI Can Generate</CardTitle>
            </div>
            <CardDescription>
              After creating your project, you can use AI to write these pieces.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {contentTasks.map((task) => (
                <Badge key={task.id} variant="outline">
                  {task.title}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
