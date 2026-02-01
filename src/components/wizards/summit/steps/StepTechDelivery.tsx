import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  SummitWizardData, 
  HOSTING_PLATFORMS, 
  EMAIL_PLATFORMS, 
  CHECKOUT_PLATFORMS,
  STREAMING_PLATFORMS 
} from '@/types/summit';

interface StepProps {
  data: SummitWizardData;
  updateData: (updates: Partial<SummitWizardData>) => void;
}

export function StepTechDelivery({ data, updateData }: StepProps) {
  return (
    <div className="space-y-6">
      {/* Hosting Platform */}
      <div className="space-y-2">
        <Label htmlFor="hosting">Summit hosting platform</Label>
        <Select
          value={data.hostingPlatform}
          onValueChange={(value) => updateData({ hostingPlatform: value })}
        >
          <SelectTrigger id="hosting">
            <SelectValue placeholder="Select a platform" />
          </SelectTrigger>
          <SelectContent>
            {HOSTING_PLATFORMS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {data.hostingPlatform === 'other' && (
          <Input
            value={data.hostingPlatformOther}
            onChange={(e) => updateData({ hostingPlatformOther: e.target.value })}
            placeholder="Enter platform name"
            className="mt-2"
          />
        )}
      </div>

      {/* Email Platform */}
      <div className="space-y-2">
        <Label htmlFor="email">Email platform</Label>
        <Select
          value={data.emailPlatform}
          onValueChange={(value) => updateData({ emailPlatform: value })}
        >
          <SelectTrigger id="email">
            <SelectValue placeholder="Select a platform" />
          </SelectTrigger>
          <SelectContent>
            {EMAIL_PLATFORMS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {data.emailPlatform === 'other' && (
          <Input
            value={data.emailPlatformOther}
            onChange={(e) => updateData({ emailPlatformOther: e.target.value })}
            placeholder="Enter platform name"
            className="mt-2"
          />
        )}
      </div>

      {/* Checkout Platform */}
      <div className="space-y-2">
        <Label htmlFor="checkout">Checkout platform</Label>
        <Select
          value={data.checkoutPlatform}
          onValueChange={(value) => updateData({ checkoutPlatform: value })}
        >
          <SelectTrigger id="checkout">
            <SelectValue placeholder="Select a platform" />
          </SelectTrigger>
          <SelectContent>
            {CHECKOUT_PLATFORMS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {data.checkoutPlatform === 'other' && (
          <Input
            value={data.checkoutPlatformOther}
            onChange={(e) => updateData({ checkoutPlatformOther: e.target.value })}
            placeholder="Enter platform name"
            className="mt-2"
          />
        )}
      </div>

      {/* Live Sessions */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <Label htmlFor="live-sessions">Are you doing live sessions?</Label>
          <p className="text-sm text-muted-foreground">
            Will any sessions be streamed live during the summit?
          </p>
        </div>
        <Switch
          id="live-sessions"
          checked={data.hasLiveSessions}
          onCheckedChange={(checked) => updateData({ hasLiveSessions: checked })}
        />
      </div>

      {/* Streaming Platform */}
      {data.hasLiveSessions && (
        <div className="space-y-2">
          <Label htmlFor="streaming">Streaming platform</Label>
          <Select
            value={data.streamingPlatform}
            onValueChange={(value) => updateData({ streamingPlatform: value })}
          >
            <SelectTrigger id="streaming">
              <SelectValue placeholder="Select a platform" />
            </SelectTrigger>
            <SelectContent>
              {STREAMING_PLATFORMS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {data.streamingPlatform === 'other' && (
            <Input
              value={data.streamingPlatformOther}
              onChange={(e) => updateData({ streamingPlatformOther: e.target.value })}
              placeholder="Enter platform name"
              className="mt-2"
            />
          )}
        </div>
      )}

      {/* Tech Stack Summary */}
      {(data.hostingPlatform || data.emailPlatform || data.checkoutPlatform) && (
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium mb-2">Your Tech Stack:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {data.hostingPlatform && (
              <li>• Hosting: {HOSTING_PLATFORMS.find(p => p.value === data.hostingPlatform)?.label || data.hostingPlatformOther}</li>
            )}
            {data.emailPlatform && (
              <li>• Email: {EMAIL_PLATFORMS.find(p => p.value === data.emailPlatform)?.label || data.emailPlatformOther}</li>
            )}
            {data.checkoutPlatform && (
              <li>• Checkout: {CHECKOUT_PLATFORMS.find(p => p.value === data.checkoutPlatform)?.label || data.checkoutPlatformOther}</li>
            )}
            {data.hasLiveSessions && data.streamingPlatform && (
              <li>• Streaming: {STREAMING_PLATFORMS.find(p => p.value === data.streamingPlatform)?.label || data.streamingPlatformOther}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
