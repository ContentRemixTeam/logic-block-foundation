import { StepProps } from '../CycleWizardTypes';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Shield, Lightbulb } from 'lucide-react';

export function StepBottleneck({ data, setData }: StepProps) {
  return (
    <div className="space-y-6">
      {/* Teaching Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Name It to Tame It</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm">
            Most people fail because they don't anticipate obstacles. By naming your fears and
            bottlenecks now, you reduce their power over you when they show up.
          </CardDescription>
        </CardContent>
      </Card>

      {/* Inputs */}
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="bottleneck" className="text-base font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            What's the main thing that could hold you back?
          </Label>
          <Textarea
            id="bottleneck"
            value={data.biggestBottleneck}
            onChange={(e) => setData({ biggestBottleneck: e.target.value })}
            placeholder="e.g., Getting distracted by client work, perfectionism, not enough time..."
            className="min-h-[80px] text-base resize-none"
            maxLength={300}
          />
          <p className="text-xs text-muted-foreground">
            Think about past patterns that have stopped you
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fear" className="text-base font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            What are you most afraid of?
          </Label>
          <Textarea
            id="fear"
            value={data.biggestFear}
            onChange={(e) => setData({ biggestFear: e.target.value })}
            placeholder="e.g., What if no one buys? What if I'm not good enough? What if I fail publicly?"
            className="min-h-[80px] text-base resize-none"
            maxLength={300}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="response" className="text-base font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-500" />
            How will you handle it when it comes up?
          </Label>
          <Textarea
            id="response"
            value={data.fearResponse}
            onChange={(e) => setData({ fearResponse: e.target.value })}
            placeholder="e.g., I'll remind myself that done is better than perfect. I'll text my accountability partner..."
            className="min-h-[80px] text-base resize-none"
            maxLength={300}
          />
          <p className="text-xs text-muted-foreground">
            Write your response now so you have it ready
          </p>
        </div>
      </div>

      {/* If/Then Summary */}
      {data.biggestFear && data.fearResponse && (
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">Your If/Then Plan:</p>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              <span className="font-medium">If</span> {data.biggestFear.toLowerCase().replace(/\?$/, '')}...{' '}
              <span className="font-medium">then</span> {data.fearResponse.toLowerCase()}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
