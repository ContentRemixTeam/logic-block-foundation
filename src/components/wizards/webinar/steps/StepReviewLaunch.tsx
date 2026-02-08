// Step 8: Review & Launch
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  WebinarWizardData, 
  getDefaultWebinarTasks, 
  WEBINAR_TASK_PHASES,
  WEBINAR_EVENT_TYPES,
} from '@/types/webinar';
import { CheckCircle, Video, Users, BookOpen, Settings, FileText, DollarSign, Mail } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface StepReviewLaunchProps {
  data: WebinarWizardData;
  onChange: (updates: Partial<WebinarWizardData>) => void;
}

export function StepReviewLaunch({ data, onChange }: StepReviewLaunchProps) {
  const tasks = getDefaultWebinarTasks(data);
  const eventTypeLabel = WEBINAR_EVENT_TYPES.find(t => t.value === data.eventType)?.label || 'Webinar';

  const toggleTask = (taskId: string) => {
    const current = data.selectedTasks[taskId];
    onChange({
      selectedTasks: {
        ...data.selectedTasks,
        [taskId]: current === false ? true : current === true ? false : false,
      },
    });
  };

  const isTaskSelected = (taskId: string) => {
    return data.selectedTasks[taskId] !== false;
  };

  const selectedCount = tasks.filter(t => isTaskSelected(t.id)).length;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Not set';
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{eventTypeLabel} Summary</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Video className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{data.name || 'Untitled'}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(data.eventDate)} at {data.eventTime || '12:00'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Target Audience</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {data.idealAttendee || 'Not defined'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Content</p>
                  <p className="text-xs text-muted-foreground">
                    {data.contentOutline.length} teaching points • {data.durationMinutes} min
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Settings className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Tech Setup</p>
                  <p className="text-xs text-muted-foreground">
                    {data.platform} • {data.hasPracticeRun ? 'Practice scheduled' : 'No practice run'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{data.offerName || 'Offer'}</p>
                  <p className="text-xs text-muted-foreground">
                    ${data.offerPrice?.toLocaleString() || 0}
                    {data.hasPaymentPlan && ' • Payment plan available'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Email Sequence</p>
                  <p className="text-xs text-muted-foreground">
                    {data.reminderSequenceCount} reminders • {data.followupSequenceLength} follow-ups
                  </p>
                </div>
              </div>
            </div>
          </div>

          {data.registrationGoal > 0 && (
            <>
              <Separator />
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Goals</p>
                  <p className="text-xs text-muted-foreground">
                    {data.registrationGoal} registrations • {data.showUpGoalPercent}% show-up • {data.conversionGoalPercent}% conversion
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Task Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Tasks to Create</CardTitle>
              <CardDescription>
                {selectedCount} of {tasks.length} tasks selected
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(WEBINAR_TASK_PHASES).map(([phaseKey, phaseName]) => {
            const phaseTasks = tasks.filter((t) => t.phase === phaseKey);
            if (phaseTasks.length === 0) return null;

            return (
              <div key={phaseKey} className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  {phaseName}
                </h4>
                <div className="space-y-1">
                  {phaseTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={isTaskSelected(task.id)}
                        onCheckedChange={() => toggleTask(task.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{task.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {task.description}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {task.daysFromEvent === 0
                          ? 'Event day'
                          : task.daysFromEvent > 0
                          ? `+${task.daysFromEvent}d`
                          : `${task.daysFromEvent}d`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
