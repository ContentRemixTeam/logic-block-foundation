// Step 5: Registration Flow
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WebinarWizardData } from '@/types/webinar';
import { FileText, Lightbulb, Mail, Calendar } from 'lucide-react';

interface StepRegistrationFlowProps {
  data: WebinarWizardData;
  onChange: (updates: Partial<WebinarWizardData>) => void;
}

export function StepRegistrationFlow({ data, onChange }: StepRegistrationFlowProps) {
  const updateBullet = (index: number, value: string) => {
    const newBullets = [...data.registrationBullets];
    newBullets[index] = value;
    onChange({ registrationBullets: newBullets });
  };

  return (
    <div className="space-y-6">
      {/* Teaching Callout */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Registration Page Tips</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your headline should state the specific result they'll get. Use bullets to list 
                tangible takeaways. Include urgency (limited spots, live-only bonuses).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registration Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Registration Timeline</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="registrationOpenDate">Registration Opens</Label>
            <Input
              id="registrationOpenDate"
              type="date"
              value={data.registrationOpenDate}
              onChange={(e) => onChange({ registrationOpenDate: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              7-14 days before the event is typical. Shorter timelines create urgency.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Registration Page Copy */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Registration Page Copy</CardTitle>
          </div>
          <CardDescription>What will convince them to sign up?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="registrationHeadline">Headline</Label>
            <Textarea
              id="registrationHeadline"
              placeholder="e.g., FREE MASTERCLASS: How to Land 3 High-Paying Clients in 30 Days (Without Cold DMs or Ads)"
              value={data.registrationHeadline}
              onChange={(e) => onChange({ registrationHeadline: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-3">
            <Label>Benefit Bullets (What They'll Learn)</Label>
            {data.registrationBullets.map((bullet, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                <Input
                  placeholder={`Bullet ${index + 1}: e.g., "The exact script I use to convert DMs into discovery calls"`}
                  value={bullet}
                  onChange={(e) => updateBullet(index, e.target.value)}
                />
              </div>
            ))}
            {data.registrationBullets.length < 5 && (
              <button
                type="button"
                onClick={() => onChange({ registrationBullets: [...data.registrationBullets, ''] })}
                className="text-sm text-primary hover:underline"
              >
                + Add another bullet
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Email Sequence */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Confirmation & Reminders</CardTitle>
          </div>
          <CardDescription>Emails to maximize show-up rate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Confirmation Email</Label>
            <Select
              value={data.confirmationEmailStatus}
              onValueChange={(value) => onChange({ confirmationEmailStatus: value as WebinarWizardData['confirmationEmailStatus'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="existing">I already have one</SelectItem>
                <SelectItem value="need-to-create">I need to create one</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Number of Reminder Emails</Label>
            <Select
              value={String(data.reminderSequenceCount)}
              onValueChange={(value) => onChange({ reminderSequenceCount: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 reminder (day before)</SelectItem>
                <SelectItem value="2">2 reminders (day before + hour before)</SelectItem>
                <SelectItem value="3">3 reminders (3 days, 1 day, 1 hour before)</SelectItem>
                <SelectItem value="4">4 reminders (7 days, 3 days, 1 day, 1 hour)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              More reminders = higher show-up rate. 3 is the sweet spot for most.
            </p>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <p className="font-medium">Reminder Email Tips:</p>
            <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
              <li>Reminder 1 (3 days): "Don't forget! Here's what you'll learn..."</li>
              <li>Reminder 2 (1 day): "Tomorrow! Add to calendar + prep questions"</li>
              <li>Reminder 3 (1 hour): "We're LIVE in 1 hour! Click to join..."</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
