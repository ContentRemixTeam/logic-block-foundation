import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  SummitWizardData, 
  COMMUNITY_OPTIONS, 
  ENGAGEMENT_ACTIVITIES,
  NURTURE_OPTIONS,
  CommunityType,
  PostSummitNurture
} from '@/types/summit';

interface StepProps {
  data: SummitWizardData;
  updateData: (updates: Partial<SummitWizardData>) => void;
}

export function StepEngagement({ data, updateData }: StepProps) {
  const toggleActivity = (value: string) => {
    const current = data.engagementActivities;
    if (current.includes(value)) {
      updateData({ engagementActivities: current.filter(v => v !== value) });
    } else {
      updateData({ engagementActivities: [...current, value] });
    }
  };

  return (
    <div className="space-y-6">
      {/* Community Type */}
      <div className="space-y-3">
        <Label>Will you have a community for attendees?</Label>
        <RadioGroup
          value={data.communityType}
          onValueChange={(value) => updateData({ communityType: value as CommunityType })}
          className="grid grid-cols-2 gap-2"
        >
          {COMMUNITY_OPTIONS.map((option) => (
            <div
              key={option.value}
              className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                data.communityType === option.value
                  ? 'border-primary bg-primary/10'
                  : 'hover:bg-accent/50'
              }`}
              onClick={() => updateData({ communityType: option.value as CommunityType })}
            >
              <RadioGroupItem value={option.value} id={`community-${option.value}`} />
              <label htmlFor={`community-${option.value}`} className="cursor-pointer">
                {option.label}
              </label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Engagement Activities */}
      <div className="space-y-3">
        <Label>Daily engagement activities</Label>
        <p className="text-sm text-muted-foreground">Select all that apply</p>
        <div className="grid grid-cols-2 gap-2">
          {ENGAGEMENT_ACTIVITIES.map((option) => (
            <div
              key={option.value}
              className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                data.engagementActivities.includes(option.value)
                  ? 'border-primary bg-primary/10'
                  : 'hover:bg-accent/50'
              }`}
              onClick={() => toggleActivity(option.value)}
            >
              <Checkbox
                id={`activity-${option.value}`}
                checked={data.engagementActivities.includes(option.value)}
                onCheckedChange={() => toggleActivity(option.value)}
              />
              <label htmlFor={`activity-${option.value}`} className="cursor-pointer">
                {option.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Post-Summit Offer */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label htmlFor="post-offer">Special launch offer after summit?</Label>
            <p className="text-sm text-muted-foreground">
              Will you pitch a product/service after the summit ends?
            </p>
          </div>
          <Switch
            id="post-offer"
            checked={data.hasPostSummitOffer}
            onCheckedChange={(checked) => updateData({ hasPostSummitOffer: checked })}
          />
        </div>

        {data.hasPostSummitOffer && (
          <div className="space-y-2">
            <Label htmlFor="offer-details">Describe the offer</Label>
            <Textarea
              id="offer-details"
              value={data.postSummitOfferDetails}
              onChange={(e) => updateData({ postSummitOfferDetails: e.target.value })}
              placeholder="e.g., Group coaching program, mastermind, course..."
              rows={3}
            />
          </div>
        )}
      </div>

      {/* Post-Summit Nurture */}
      <div className="space-y-3">
        <Label>Post-summit nurture plan</Label>
        <p className="text-sm text-muted-foreground">
          How will you follow up with attendees after the summit?
        </p>
        <RadioGroup
          value={data.postSummitNurture}
          onValueChange={(value) => updateData({ postSummitNurture: value as PostSummitNurture })}
          className="space-y-2"
        >
          {NURTURE_OPTIONS.map((option) => (
            <div
              key={option.value}
              className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                data.postSummitNurture === option.value
                  ? 'border-primary bg-primary/10'
                  : 'hover:bg-accent/50'
              }`}
              onClick={() => updateData({ postSummitNurture: option.value as PostSummitNurture })}
            >
              <RadioGroupItem value={option.value} id={`nurture-${option.value}`} />
              <label htmlFor={`nurture-${option.value}`} className="cursor-pointer">
                {option.label}
              </label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Engagement Summary */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <p className="text-sm font-medium mb-2">Engagement Plan:</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Community: {COMMUNITY_OPTIONS.find(c => c.value === data.communityType)?.label}</li>
          {data.engagementActivities.length > 0 && (
            <li>• {data.engagementActivities.length} daily activities planned</li>
          )}
          {data.hasPostSummitOffer && <li>• Post-summit offer prepared</li>}
          <li>• Nurture: {NURTURE_OPTIONS.find(n => n.value === data.postSummitNurture)?.label}</li>
        </ul>
      </div>
    </div>
  );
}
