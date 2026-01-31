import { StepProps, STEP_TITLES } from '../CycleWizardTypes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Target, Eye, Heart, DollarSign, TrendingUp, Calendar, 
  AlertTriangle, Brain, Pencil, FileDown, CheckCircle2 
} from 'lucide-react';
import { format } from 'date-fns';

interface StepReviewProps extends StepProps {
  onGoToStep: (step: number) => void;
  onExportPDF: () => void;
  isExporting?: boolean;
}

function ReviewSection({ 
  title, 
  icon: Icon, 
  children, 
  step, 
  onEdit 
}: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode; 
  step: number;
  onEdit: (step: number) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onEdit(step)}
          >
            <Pencil className="h-3 w-3 mr-1" />
            Edit
          </Button>
        </div>
      </CardHeader>
      <CardContent className="text-sm">{children}</CardContent>
    </Card>
  );
}

export function StepReview({ data, onGoToStep, onExportPDF, isExporting }: StepReviewProps) {
  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
          <CheckCircle2 className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Your 90-Day Plan</h2>
        <p className="text-sm text-muted-foreground">
          {format(new Date(data.startDate), 'MMMM d, yyyy')} - {format(new Date(data.endDate), 'MMMM d, yyyy')}
        </p>
      </div>

      {/* Export Button - Prominent */}
      <Button
        onClick={onExportPDF}
        disabled={isExporting}
        className="w-full h-12 text-base"
        variant="outline"
      >
        <FileDown className="h-5 w-5 mr-2" />
        {isExporting ? 'Generating PDF...' : 'Download PDF of Your Plan'}
      </Button>

      {/* Review Cards */}
      <div className="space-y-4">
        {/* Goal */}
        <ReviewSection title="The Big Goal" icon={Target} step={1} onEdit={onGoToStep}>
          <p className="font-medium">{data.goal || 'Not set'}</p>
          {data.why && (
            <p className="text-muted-foreground mt-1">Because: {data.why}</p>
          )}
        </ReviewSection>

        {/* Diagnostic */}
        <ReviewSection title="Business Diagnostic" icon={Eye} step={2} onEdit={onGoToStep}>
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-500">{data.discoverScore}/10</div>
              <div className="text-xs text-muted-foreground">Discover</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-500">{data.nurtureScore}/10</div>
              <div className="text-xs text-muted-foreground">Nurture</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-500">{data.convertScore}/10</div>
              <div className="text-xs text-muted-foreground">Convert</div>
            </div>
          </div>
          {data.focusArea && (
            <Badge variant="secondary" className="mt-2 capitalize">
              Focus: {data.focusArea}
            </Badge>
          )}
        </ReviewSection>

        {/* Identity */}
        {(data.identity || data.targetFeeling) && (
          <ReviewSection title="Identity" icon={Heart} step={3} onEdit={onGoToStep}>
            {data.identity && <p className="italic">"{data.identity}"</p>}
            {data.targetFeeling && (
              <p className="text-muted-foreground mt-1">
                Feeling: {data.targetFeeling}
              </p>
            )}
          </ReviewSection>
        )}

        {/* Metrics */}
        {data.metric1_name && (
          <ReviewSection title="Success Metrics" icon={TrendingUp} step={4} onEdit={onGoToStep}>
            <div className="space-y-2">
              {[
                { name: data.metric1_name, start: data.metric1_start, goal: data.metric1_goal },
                { name: data.metric2_name, start: data.metric2_start, goal: data.metric2_goal },
                { name: data.metric3_name, start: data.metric3_start, goal: data.metric3_goal },
              ].filter(m => m.name).map((metric, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span>{metric.name}</span>
                  <span className="text-muted-foreground">
                    {metric.start ?? 0} → {metric.goal ?? '?'}
                  </span>
                </div>
              ))}
            </div>
          </ReviewSection>
        )}

        {/* Rhythm */}
        <ReviewSection title="Weekly Rhythm" icon={Calendar} step={5} onEdit={onGoToStep}>
          <div className="space-y-1">
            <p>Planning: {data.weeklyPlanningDay || 'Not set'}</p>
            <p>Review: {data.weeklyDebriefDay || 'Not set'}</p>
            {data.officeHoursStart && data.officeHoursEnd && (
              <p className="text-muted-foreground text-xs">
                Office hours: {data.officeHoursStart} - {data.officeHoursEnd}
              </p>
            )}
          </div>
        </ReviewSection>

        {/* Bottleneck & Fear */}
        {(data.biggestBottleneck || data.biggestFear) && (
          <ReviewSection title="Obstacles" icon={AlertTriangle} step={6} onEdit={onGoToStep}>
            {data.biggestBottleneck && (
              <p><span className="font-medium">Bottleneck:</span> {data.biggestBottleneck}</p>
            )}
            {data.biggestFear && (
              <p className="mt-1"><span className="font-medium">Fear:</span> {data.biggestFear}</p>
            )}
            {data.fearResponse && (
              <p className="mt-1 text-green-600 dark:text-green-400">
                <span className="font-medium">Response:</span> {data.fearResponse}
              </p>
            )}
          </ReviewSection>
        )}

        {/* THE GAP */}
        {(data.gapStrategy || data.accountabilityPerson) && (
          <ReviewSection title="THE GAP Strategy" icon={AlertTriangle} step={7} onEdit={onGoToStep}>
            {data.gapStrategy && <p className="italic">"{data.gapStrategy}"</p>}
            {data.accountabilityPerson && (
              <p className="text-muted-foreground mt-1">
                Accountability: {data.accountabilityPerson}
              </p>
            )}
          </ReviewSection>
        )}

        {/* Mindset */}
        {(data.usefulBelief || data.usefulThought || data.thingsToRemember.length > 0) && (
          <ReviewSection title="Mindset Anchors" icon={Brain} step={8} onEdit={onGoToStep}>
            {data.usefulBelief && (
              <p><span className="font-medium">Belief:</span> {data.usefulBelief}</p>
            )}
            {data.limitingThought && data.usefulThought && (
              <p className="mt-1 text-sm">
                <span className="line-through text-muted-foreground">{data.limitingThought}</span>
                {' → '}
                <span className="text-primary">{data.usefulThought}</span>
              </p>
            )}
            {data.thingsToRemember.length > 0 && (
              <div className="mt-2 space-y-1">
                {data.thingsToRemember.map((item, i) => (
                  <p key={i} className="text-xs text-muted-foreground">• {item}</p>
                ))}
              </div>
            )}
          </ReviewSection>
        )}
      </div>
    </div>
  );
}
