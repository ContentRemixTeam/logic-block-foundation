// Step 4: Your Opt-in Promise
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { LeadMagnetWizardData } from '@/types/leadMagnet';
import { Sparkles, Lightbulb, Target } from 'lucide-react';

interface StepOptinPromiseProps {
  data: LeadMagnetWizardData;
  onChange: (updates: Partial<LeadMagnetWizardData>) => void;
}

export function StepOptinPromise({ data, onChange }: StepOptinPromiseProps) {
  const handleBulletChange = (index: number, value: string) => {
    const updated = [...data.bullets];
    updated[index] = value;
    onChange({ bullets: updated });
  };

  return (
    <div className="space-y-6">
      {/* Teaching Callout */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Copywriting Tip</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your opt-in page needs to answer one question: "What's in it for me?" 
                Focus on the transformation, not just the format.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Headline */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Your Headline</CardTitle>
          </div>
          <CardDescription>
            This is the main promise that makes someone want to sign up.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="headline">Main Headline</Label>
            <Input
              id="headline"
              placeholder="e.g., Get Your First 1,000 Email Subscribers in 30 Days"
              value={data.headline}
              onChange={(e) => onChange({ headline: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Lead with a specific result or transformation.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subheadline">Supporting Subheadline</Label>
            <Textarea
              id="subheadline"
              placeholder="e.g., The exact step-by-step system I used to build my list without paid ads"
              value={data.subheadline}
              onChange={(e) => onChange({ subheadline: e.target.value })}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bullet Points */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">3 Key Benefits</CardTitle>
          <CardDescription>
            What will they learn, get, or be able to do?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.bullets.map((bullet, index) => (
            <div key={index} className="space-y-2">
              <Label htmlFor={`bullet-${index}`}>Bullet {index + 1}</Label>
              <Input
                id={`bullet-${index}`}
                placeholder={`e.g., "Discover the #1 mistake that keeps your list stuck under 500"`}
                value={bullet}
                onChange={(e) => handleBulletChange(index, e.target.value)}
              />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Start each bullet with an action verb: Discover, Learn, Get, Master, etc.
          </p>
        </CardContent>
      </Card>

      {/* Result Promise */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Result Promise</CardTitle>
          <CardDescription>
            Complete this sentence: "After downloading, they'll be able to..."
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="e.g., ...confidently plan their next 30 days of content without second-guessing themselves"
            value={data.resultPromise}
            onChange={(e) => onChange({ resultPromise: e.target.value })}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* AI Copy Hint */}
      <Card className="border-dashed border-2 bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-sm">Need help with copy?</p>
                <p className="text-xs text-muted-foreground">
                  AI can write your landing page copy on the final step.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
