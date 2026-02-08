// Step 2: Define Your Ideal Subscriber
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { LeadMagnetWizardData, SOCIAL_PLATFORMS } from '@/types/leadMagnet';
import { Users, Lightbulb } from 'lucide-react';

interface StepIdealSubscriberProps {
  data: LeadMagnetWizardData;
  onChange: (updates: Partial<LeadMagnetWizardData>) => void;
}

export function StepIdealSubscriber({ data, onChange }: StepIdealSubscriberProps) {
  const handlePlatformToggle = (platform: string, checked: boolean) => {
    const updated = checked
      ? [...data.platforms, platform]
      : data.platforms.filter(p => p !== platform);
    onChange({ platforms: updated });
  };

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
                The more specific you are about who your freebie is for, the more magnetic it becomes. 
                A focused lead magnet converts better than a generic one.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Who Is This Freebie For?</CardTitle>
          </div>
          <CardDescription>
            Get specific about who will download this lead magnet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="ideal-subscriber">Describe Your Ideal Subscriber</Label>
            <Textarea
              id="ideal-subscriber"
              placeholder="e.g., Busy moms who want to start an online business but feel overwhelmed by all the options..."
              value={data.idealSubscriber}
              onChange={(e) => onChange({ idealSubscriber: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="main-problem">What Main Problem Are They Experiencing?</Label>
            <Textarea
              id="main-problem"
              placeholder="e.g., They have no idea where to start and feel paralyzed by information overload..."
              value={data.mainProblem}
              onChange={(e) => onChange({ mainProblem: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transformation">What Transformation Do They Want?</Label>
            <Textarea
              id="transformation"
              placeholder="e.g., They want clarity on what to do first and confidence that they're on the right path..."
              value={data.transformation}
              onChange={(e) => onChange({ transformation: e.target.value })}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Where Does Your Audience Hang Out?</CardTitle>
          <CardDescription>
            Select all platforms where your ideal subscriber spends time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {SOCIAL_PLATFORMS.map((platform) => (
              <div key={platform} className="flex items-center space-x-2">
                <Checkbox
                  id={`platform-${platform}`}
                  checked={data.platforms.includes(platform)}
                  onCheckedChange={(checked) => handlePlatformToggle(platform, checked === true)}
                />
                <Label htmlFor={`platform-${platform}`} className="font-normal text-sm">
                  {platform}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
