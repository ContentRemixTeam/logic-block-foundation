// Step 4: Tech Setup
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WebinarWizardData, WEBINAR_PLATFORMS, REGISTRATION_PLATFORMS } from '@/types/webinar';
import { Settings, Lightbulb, Monitor, Link } from 'lucide-react';

interface StepTechSetupProps {
  data: WebinarWizardData;
  onChange: (updates: Partial<WebinarWizardData>) => void;
}

export function StepTechSetup({ data, onChange }: StepTechSetupProps) {
  return (
    <div className="space-y-6">
      {/* Teaching Callout */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Tech Success Tips</p>
              <p className="text-sm text-muted-foreground mt-1">
                Always do a practice run! Test your audio, screenshare, and slides. Have a backup plan 
                (phone hotspot, second device) in case something fails.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webinar Platform */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Webinar Platform</CardTitle>
          </div>
          <CardDescription>Where will you host your live event?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select
              value={data.platform}
              onValueChange={(value) => onChange({ platform: value as WebinarWizardData['platform'] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {WEBINAR_PLATFORMS.map((platform) => (
                  <SelectItem key={platform.value} value={platform.value}>
                    {platform.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {data.platform === 'zoom' && (
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p className="font-medium">Zoom Tips:</p>
              <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                <li>Enable registration in your Zoom settings</li>
                <li>Set up waiting room for a professional start</li>
                <li>Consider Zoom Webinars for larger audiences (&gt;100)</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registration Platform */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Registration Setup</CardTitle>
          </div>
          <CardDescription>Where will people sign up?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Registration Platform</Label>
            <Select
              value={data.registrationPlatform}
              onValueChange={(value) => onChange({ registrationPlatform: value as WebinarWizardData['registrationPlatform'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGISTRATION_PLATFORMS.map((platform) => (
                  <SelectItem key={platform.value} value={platform.value}>
                    {platform.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Using a dedicated landing page often converts better than platform-native registration.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="registrationUrl">Registration URL (optional)</Label>
            <Input
              id="registrationUrl"
              placeholder="https://..."
              value={data.registrationUrl}
              onChange={(e) => onChange({ registrationUrl: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Practice Run */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Practice Run</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Schedule a Practice Run</Label>
              <p className="text-sm text-muted-foreground">Highly recommended for live events</p>
            </div>
            <Switch
              checked={data.hasPracticeRun}
              onCheckedChange={(checked) => onChange({ hasPracticeRun: checked })}
            />
          </div>

          {data.hasPracticeRun && (
            <div className="space-y-2">
              <Label htmlFor="practiceDate">Practice Date</Label>
              <Input
                id="practiceDate"
                type="date"
                value={data.practiceDate}
                onChange={(e) => onChange({ practiceDate: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Schedule at least 2-3 days before your live event.
              </p>
            </div>
          )}

          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <p className="font-medium">Practice Run Checklist:</p>
            <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
              <li>Test audio and video quality</li>
              <li>Practice screen sharing and slide transitions</li>
              <li>Time your presentation</li>
              <li>Test your offer/checkout links</li>
              <li>Have a friend join to test attendee view</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
