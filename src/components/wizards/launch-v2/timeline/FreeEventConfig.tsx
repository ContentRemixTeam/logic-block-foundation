// Configure optional free event (webinar, workshop, etc.)

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Video, Lightbulb } from 'lucide-react';
import { LaunchWizardV2Data, FREE_EVENT_TYPE_OPTIONS } from '@/types/launchV2';

interface FreeEventConfigProps {
  data: LaunchWizardV2Data;
  onChange: (updates: Partial<LaunchWizardV2Data>) => void;
}

const FREE_EVENT_PHASE_OPTIONS = [
  { value: 'runway', label: 'During Runway', description: 'Build buzz before the event' },
  { value: 'pre-launch', label: 'During Pre-Launch', description: 'Recommended - maximize conversion' },
  { value: 'cart-open', label: 'During Cart Open', description: 'Drive urgency during sales' },
] as const;

export function FreeEventConfig({ data, onChange }: FreeEventConfigProps) {
  const hasFreeEvent = data.hasFreeEvent;

  return (
    <div className="space-y-4">
      {/* Yes/No toggle */}
      <div className="space-y-3">
        <Label className="text-base font-medium">
          Are you doing a free event (webinar, workshop, challenge)?
        </Label>
        <RadioGroup
          value={hasFreeEvent ? 'yes' : 'no'}
          onValueChange={(value) => onChange({ hasFreeEvent: value === 'yes' })}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="free-event-no" />
            <Label htmlFor="free-event-no" className="cursor-pointer">No</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="free-event-yes" />
            <Label htmlFor="free-event-yes" className="cursor-pointer">Yes</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Free event configuration */}
      {hasFreeEvent && (
        <Card className="bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Video className="h-4 w-4" />
              Free Event Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Event type */}
            <div className="space-y-2">
              <Label htmlFor="event-type">Event type</Label>
              <Select
                value={data.freeEventType || ''}
                onValueChange={(value) => onChange({ freeEventType: value as typeof FREE_EVENT_TYPE_OPTIONS[number]['value'] })}
              >
                <SelectTrigger id="event-type">
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {FREE_EVENT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Event date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event-date">Date</Label>
                <Input
                  id="event-date"
                  type="date"
                  value={data.freeEventDate || ''}
                  onChange={(e) => onChange({ freeEventDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-time">Time</Label>
                <Input
                  id="event-time"
                  type="time"
                  value={data.freeEventTime || ''}
                  onChange={(e) => onChange({ freeEventTime: e.target.value })}
                />
              </div>
            </div>

            {/* Which phase */}
            <div className="space-y-3">
              <Label className="text-sm">Which phase is your event in?</Label>
              <RadioGroup
                value={data.freeEventPhase || 'pre-launch'}
                onValueChange={(value) => onChange({ freeEventPhase: value as 'runway' | 'pre-launch' | 'cart-open' })}
                className="space-y-2"
              >
                {FREE_EVENT_PHASE_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-start space-x-3">
                    <RadioGroupItem 
                      value={option.value} 
                      id={`phase-${option.value}`}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label 
                        htmlFor={`phase-${option.value}`} 
                        className="cursor-pointer font-medium"
                      >
                        {option.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Tip */}
            <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Pre-launch is best.</strong> You've built buzz during runway, and now they attend the free event right before cart opens—maximizing conversion.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
