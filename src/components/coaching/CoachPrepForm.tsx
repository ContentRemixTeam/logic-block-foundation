import { useState } from 'react';
import { format } from 'date-fns';
import { FileText, Calendar, Target, HelpCircle, Lightbulb, Brain, Download, Share2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CoachPrepFormProps {
  initialValues?: {
    id?: string;
    call_date?: string;
    metrics?: Record<string, unknown>;
    main_question?: string;
    what_tried?: string;
    blocking_thought?: string;
    coaching_need?: string;
  };
  onSave: (values: {
    call_date: string;
    metrics: Record<string, unknown>;
    main_question: string;
    what_tried: string;
    blocking_thought: string;
    coaching_need: string;
  }) => void;
  onExportPdf?: () => void;
  onShare?: () => void;
  onPrint?: () => void;
  isSaving?: boolean;
}

export function CoachPrepForm({
  initialValues,
  onSave,
  onExportPdf,
  onShare,
  onPrint,
  isSaving,
}: CoachPrepFormProps) {
  const [callDate, setCallDate] = useState<Date>(
    initialValues?.call_date ? new Date(initialValues.call_date) : new Date()
  );
  const [metrics, setMetrics] = useState<Record<string, string>>({
    metric1: String(initialValues?.metrics?.metric1 || ''),
    metric2: String(initialValues?.metrics?.metric2 || ''),
    metric3: String(initialValues?.metrics?.metric3 || ''),
    offersThisWeek: String(initialValues?.metrics?.offersThisWeek || ''),
  });
  const [mainQuestion, setMainQuestion] = useState(initialValues?.main_question || '');
  const [whatTried, setWhatTried] = useState(initialValues?.what_tried || '');
  const [blockingThought, setBlockingThought] = useState(initialValues?.blocking_thought || '');
  const [coachingNeed, setCoachingNeed] = useState(initialValues?.coaching_need || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      call_date: format(callDate, 'yyyy-MM-dd'),
      metrics: {
        metric1: metrics.metric1 || null,
        metric2: metrics.metric2 || null,
        metric3: metrics.metric3 || null,
        offersThisWeek: metrics.offersThisWeek || null,
      },
      main_question: mainQuestion,
      what_tried: whatTried,
      blocking_thought: blockingThought,
      coaching_need: coachingNeed,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Call Date */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Call Date
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !callDate && "text-muted-foreground"
                )}
              >
                {callDate ? format(callDate, 'EEEE, MMMM d, yyyy') : 'Select a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={callDate}
                onSelect={(date) => date && setCallDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Metrics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Your Numbers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="metric1">Metric 1</Label>
              <Input
                id="metric1"
                type="text"
                value={metrics.metric1}
                onChange={(e) => setMetrics(prev => ({ ...prev, metric1: e.target.value }))}
                placeholder="Enter value"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metric2">Metric 2</Label>
              <Input
                id="metric2"
                type="text"
                value={metrics.metric2}
                onChange={(e) => setMetrics(prev => ({ ...prev, metric2: e.target.value }))}
                placeholder="Enter value"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metric3">Metric 3</Label>
              <Input
                id="metric3"
                type="text"
                value={metrics.metric3}
                onChange={(e) => setMetrics(prev => ({ ...prev, metric3: e.target.value }))}
                placeholder="Enter value"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offersThisWeek">Offers Made This Week</Label>
              <Input
                id="offersThisWeek"
                type="number"
                value={metrics.offersThisWeek}
                onChange={(e) => setMetrics(prev => ({ ...prev, offersThisWeek: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Question */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary" />
            Your Question
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={mainQuestion}
            onChange={(e) => setMainQuestion(e.target.value)}
            placeholder="What's the one question you most want answered?"
            className="min-h-[80px]"
          />
        </CardContent>
      </Card>

      {/* What You've Tried */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            What You've Tried
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={whatTried}
            onChange={(e) => setWhatTried(e.target.value)}
            placeholder="What approaches have you already tried?"
            className="min-h-[80px]"
          />
        </CardContent>
      </Card>

      {/* Blocking Thought */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Your Thought Creating This Problem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={blockingThought}
            onChange={(e) => setBlockingThought(e.target.value)}
            placeholder="What thought might be creating or amplifying this challenge?"
            className="min-h-[80px]"
          />
        </CardContent>
      </Card>

      {/* What You Need Coaching On */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            What You Need Coaching On
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={coachingNeed}
            onChange={(e) => setCoachingNeed(e.target.value)}
            placeholder="Specifically, what do you need help with?"
            className="min-h-[80px]"
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isSaving} className="flex-1 min-w-[120px]">
          {isSaving ? 'Saving...' : 'Save Prep'}
        </Button>
        {onExportPdf && (
          <Button type="button" variant="outline" onClick={onExportPdf} className="gap-2">
            <Download className="h-4 w-4" />
            PDF
          </Button>
        )}
        {onShare && (
          <Button type="button" variant="outline" onClick={onShare} className="gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        )}
        {onPrint && (
          <Button type="button" variant="outline" onClick={onPrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        )}
      </div>
    </form>
  );
}
