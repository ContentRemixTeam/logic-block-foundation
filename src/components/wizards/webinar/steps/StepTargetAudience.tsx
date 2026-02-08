// Step 2: Target Audience
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WebinarWizardData, EXPERIENCE_LEVELS } from '@/types/webinar';
import { Users, Lightbulb, Target } from 'lucide-react';

interface StepTargetAudienceProps {
  data: WebinarWizardData;
  onChange: (updates: Partial<WebinarWizardData>) => void;
}

export function StepTargetAudience({ data, onChange }: StepTargetAudienceProps) {
  return (
    <div className="space-y-6">
      {/* Teaching Callout */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Why This Matters</p>
              <p className="text-sm text-muted-foreground mt-1">
                The more specific your ideal attendee, the more compelling your registration page will be. 
                "Busy moms starting an online business" converts better than "entrepreneurs."
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ideal Attendee */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Who Is This For?</CardTitle>
          </div>
          <CardDescription>Describe your ideal attendee in detail</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="idealAttendee">Ideal Attendee</Label>
            <Textarea
              id="idealAttendee"
              placeholder="e.g., New coaches (0-12 months) who have their certification but haven't signed their first paying client yet. They're active on social media but feel invisible..."
              value={data.idealAttendee}
              onChange={(e) => onChange({ idealAttendee: e.target.value })}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Include demographics, experience level, and current situation.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Experience Level</Label>
            <Select
              value={data.experienceLevel}
              onValueChange={(value) => onChange({ experienceLevel: value as WebinarWizardData['experienceLevel'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Problem & Transformation */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Problem & Transformation</CardTitle>
          </div>
          <CardDescription>What pain do they feel? What result will they get?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mainProblem">Main Problem/Pain Point</Label>
            <Textarea
              id="mainProblem"
              placeholder="e.g., They're posting content but getting no engagement. They feel like they're shouting into the void. They've tried free discovery calls but no one shows up..."
              value={data.mainProblem}
              onChange={(e) => onChange({ mainProblem: e.target.value })}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Describe the frustration, fear, or stuck point they're experiencing.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transformation">Transformation Promise</Label>
            <Textarea
              id="transformation"
              placeholder="e.g., Walk away with a simple 3-step system to attract clients who are ready to pay—without spending money on ads or cold DMing strangers."
              value={data.transformation}
              onChange={(e) => onChange({ transformation: e.target.value })}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              What tangible result will they have after attending?
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
