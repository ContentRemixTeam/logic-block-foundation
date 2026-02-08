import { useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FlashSaleWizardData, generateFlashSaleTasks, FlashSaleTask } from '@/types/flashSale';
import { Rocket, CheckCircle2, Mail, Share2, Settings, BarChart3, Wand2, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface StepProps {
  data: FlashSaleWizardData;
  setData: (updates: Partial<FlashSaleWizardData>) => void;
  onComplete: () => void;
}

const TASK_TYPE_ICONS: Record<string, React.ReactNode> = {
  setup: <Settings className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  social: <Share2 className="h-4 w-4" />,
  ads: <BarChart3 className="h-4 w-4" />,
  tracking: <CheckCircle2 className="h-4 w-4" />,
};

export function StepReviewLaunch({ data, setData, onComplete }: StepProps) {
  const [isCreating, setIsCreating] = useState(false);

  const tasks = useMemo(() => generateFlashSaleTasks(data), [data]);

  const groupedTasks = useMemo(() => {
    const groups: Record<string, FlashSaleTask[]> = {
      'pre-sale': [],
      'during-sale': [],
      'post-sale': [],
    };
    tasks.forEach((task) => {
      groups[task.phase].push(task);
    });
    return groups;
  }, [tasks]);

  const toggleTask = (taskId: string) => {
    setData({
      tasksEnabled: {
        ...data.tasksEnabled,
        [taskId]: !data.tasksEnabled[taskId],
      },
    });
  };

  const isTaskEnabled = (taskId: string) => {
    return data.tasksEnabled[taskId] !== false;
  };

  const enabledTaskCount = tasks.filter((t) => isTaskEnabled(t.id)).length;

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await onComplete();
    } finally {
      setIsCreating(false);
    }
  };

  const salePrice = data.salePrice || (data.originalPrice && data.discountValue 
    ? data.discountType === 'percentage' 
      ? data.originalPrice * (1 - data.discountValue / 100)
      : data.originalPrice - data.discountValue
    : null);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10">
          <Rocket className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Review & Launch</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Review your flash sale details and create your project
        </p>
      </div>

      {/* Sale Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Flash Sale Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Product</p>
              <p className="font-medium">{data.productName || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sale Name</p>
              <p className="font-medium">{data.saleName || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Discount</p>
              <p className="font-medium">
                {data.discountValue
                  ? data.discountType === 'percentage'
                    ? `${data.discountValue}% OFF`
                    : `$${data.discountValue} OFF`
                  : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sale Price</p>
              <p className="font-medium text-green-600">
                {salePrice ? `$${salePrice.toFixed(2)}` : 'Not set'}
                {data.originalPrice && (
                  <span className="text-muted-foreground line-through ml-2">
                    ${data.originalPrice.toFixed(2)}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Starts</p>
                <p className="font-medium">
                  {data.startDate
                    ? `${format(parseISO(data.startDate), 'MMM d, yyyy')} at ${data.startTime}`
                    : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ends</p>
                <p className="font-medium">
                  {data.endDate
                    ? `${format(parseISO(data.endDate), 'MMM d, yyyy')} at ${data.endTime}`
                    : 'Not set'}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Urgency Type</p>
                <p className="font-medium capitalize">
                  {data.urgencyType?.replace('-', ' ') || 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email Sequence</p>
                <p className="font-medium capitalize">
                  {data.emailSequenceType} ({data.emailsPlanned.filter(e => e.enabled).length} emails)
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Copy Generation */}
      <Card className="border-dashed border-2">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Content to Generate
          </CardTitle>
          <CardDescription>
            AI can create all your sales and email copy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-2xl mb-1">📧</p>
              <p className="text-sm font-medium">
                {data.emailsPlanned.filter(e => e.enabled).length} Emails
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-2xl mb-1">📱</p>
              <p className="text-sm font-medium">
                {data.promotionPlatforms.length * 3} Social Posts
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-2xl mb-1">📝</p>
              <p className="text-sm font-medium">Sales Page Copy</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Copy generation will be available after creating your project
          </p>
        </CardContent>
      </Card>

      {/* Task Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tasks to Create</CardTitle>
          <CardDescription>
            {enabledTaskCount} of {tasks.length} tasks enabled
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={['pre-sale', 'during-sale']} className="space-y-2">
            {Object.entries(groupedTasks).map(([phase, phaseTasks]) => (
              <AccordionItem key={phase} value={phase} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span className="capitalize font-medium">
                      {phase.replace('-', ' ')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({phaseTasks.filter(t => isTaskEnabled(t.id)).length}/{phaseTasks.length})
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pb-2">
                    {phaseTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-center justify-between p-2 rounded-lg ${
                          isTaskEnabled(task.id) ? 'bg-muted' : 'bg-muted/30 opacity-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded bg-background">
                            {TASK_TYPE_ICONS[task.type]}
                          </div>
                          <span className="text-sm">{task.title}</span>
                        </div>
                        <Switch
                          checked={isTaskEnabled(task.id)}
                          onCheckedChange={() => toggleTask(task.id)}
                        />
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Create Button */}
      <div className="flex justify-center pt-4">
        <Button
          size="lg"
          onClick={handleCreate}
          disabled={isCreating || !data.saleName || !data.startDate}
          className="gap-2 px-8"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Creating Flash Sale...
            </>
          ) : (
            <>
              <Rocket className="h-5 w-5" />
              Create Flash Sale Project
            </>
          )}
        </Button>
      </div>

      {(!data.saleName || !data.startDate) && (
        <p className="text-sm text-center text-muted-foreground">
          Please complete the required fields (sale name, dates) before creating
        </p>
      )}
    </div>
  );
}
