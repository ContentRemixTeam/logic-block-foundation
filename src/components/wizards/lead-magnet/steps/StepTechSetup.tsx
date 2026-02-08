// Step 5: Landing Page & Tech Setup
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LeadMagnetWizardData, 
  LANDING_PAGE_PLATFORMS, 
  LandingPagePlatform,
  LandingPageStatus,
  DeliveryMethod 
} from '@/types/leadMagnet';
import { Globe, Mail, Lightbulb } from 'lucide-react';

interface StepTechSetupProps {
  data: LeadMagnetWizardData;
  onChange: (updates: Partial<LeadMagnetWizardData>) => void;
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
              <p className="font-medium text-sm">Tech Setup Tip</p>
              <p className="text-sm text-muted-foreground mt-1">
                Don't let tech overwhelm you! Most email platforms have built-in landing pages. 
                Start simple—you can always upgrade later.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Landing Page Platform */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Landing Page Setup</CardTitle>
          </div>
          <CardDescription>
            Where will people sign up for your freebie?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Landing Page Platform</Label>
            <Select
              value={data.landingPagePlatform}
              onValueChange={(value) => onChange({ landingPagePlatform: value as LandingPagePlatform })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {LANDING_PAGE_PLATFORMS.map((platform) => (
                  <SelectItem key={platform.value} value={platform.value}>
                    {platform.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Landing Page Status</Label>
            <RadioGroup
              value={data.landingPageStatus}
              onValueChange={(value) => onChange({ landingPageStatus: value as LandingPageStatus })}
              className="space-y-2"
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="existing" id="lp-existing" />
                <Label htmlFor="lp-existing" className="font-normal">
                  I already have a landing page
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="need-to-create" id="lp-create" />
                <Label htmlFor="lp-create" className="font-normal">
                  I need to create one
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="platform-default" id="lp-default" />
                <Label htmlFor="lp-default" className="font-normal">
                  I'll use my platform's default form
                </Label>
              </div>
            </RadioGroup>
          </div>

          {data.landingPageStatus === 'existing' && (
            <div className="space-y-2">
              <Label htmlFor="lp-url">Landing Page URL</Label>
              <Input
                id="lp-url"
                placeholder="https://..."
                value={data.landingPageUrl}
                onChange={(e) => onChange({ landingPageUrl: e.target.value })}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Provider */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Email Delivery</CardTitle>
          </div>
          <CardDescription>
            How will subscribers receive your freebie?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Email Provider</Label>
            <Select
              value={data.emailProvider}
              onValueChange={(value) => onChange({ emailProvider: value as LandingPagePlatform })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select email provider" />
              </SelectTrigger>
              <SelectContent>
                {LANDING_PAGE_PLATFORMS.map((platform) => (
                  <SelectItem key={platform.value} value={platform.value}>
                    {platform.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Delivery Method</Label>
            <RadioGroup
              value={data.deliveryMethod}
              onValueChange={(value) => onChange({ deliveryMethod: value as DeliveryMethod })}
              className="space-y-2"
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="email" id="delivery-email" />
                <Label htmlFor="delivery-email" className="font-normal">
                  Email automation (download link in email)
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="redirect" id="delivery-redirect" />
                <Label htmlFor="delivery-redirect" className="font-normal">
                  Redirect to thank you page with download
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="both" id="delivery-both" />
                <Label htmlFor="delivery-both" className="font-normal">
                  Both (redirect + email)
                </Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
