// Configure optional free event (webinar, workshop, etc.) - ENHANCED
// Deep planning for event name, teaching topics, special offers, etc.

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Video, 
  Lightbulb, 
  Plus, 
  X, 
  Users, 
  Gift, 
  Calendar,
  ChevronDown,
  MessageSquare,
  Mail,
} from 'lucide-react';
import { 
  LaunchWizardV2Data, 
  FREE_EVENT_TYPE_OPTIONS,
  FreeEventDetails,
  DEFAULT_FREE_EVENT_DETAILS,
} from '@/types/launchV2';

interface FreeEventConfigProps {
  data: LaunchWizardV2Data;
  onChange: (updates: Partial<LaunchWizardV2Data>) => void;
}

const FREE_EVENT_PHASE_OPTIONS = [
  { value: 'runway', label: 'During Runway', description: 'Build buzz before the event' },
  { value: 'pre-launch', label: 'During Pre-Launch', description: 'Recommended - maximize conversion' },
  { value: 'cart-open', label: 'During Cart Open', description: 'Drive urgency during sales' },
] as const;

const CHALLENGE_DURATION_OPTIONS = [
  { value: 3, label: '3 Days' },
  { value: 5, label: '5 Days' },
  { value: 7, label: '7 Days' },
  { value: 10, label: '10 Days' },
];

export function FreeEventConfig({ data, onChange }: FreeEventConfigProps) {
  const hasFreeEvent = data.hasFreeEvent;
  const [specialOfferOpen, setSpecialOfferOpen] = useState(false);
  const [challengeSettingsOpen, setChallengeSettingsOpen] = useState(false);
  
  // Ensure freeEventDetails exists with defaults
  const eventDetails = data.freeEventDetails || DEFAULT_FREE_EVENT_DETAILS;

  const handleEventDetailsChange = (updates: Partial<FreeEventDetails>) => {
    const newDetails = { ...eventDetails, ...updates };
    onChange({ 
      freeEventDetails: newDetails,
      // Keep legacy fields in sync
      freeEventType: newDetails.type,
      freeEventDate: newDetails.date,
      freeEventTime: newDetails.time,
      freeEventPhase: newDetails.phase,
    });
  };

  // Teaching topics management
  const handleAddTopic = () => {
    const newTopics = [...(eventDetails.teachingTopics || []), ''];
    handleEventDetailsChange({ teachingTopics: newTopics });
  };

  const handleUpdateTopic = (index: number, value: string) => {
    const newTopics = [...(eventDetails.teachingTopics || [])];
    newTopics[index] = value;
    handleEventDetailsChange({ teachingTopics: newTopics });
  };

  const handleRemoveTopic = (index: number) => {
    const newTopics = (eventDetails.teachingTopics || []).filter((_, i) => i !== index);
    handleEventDetailsChange({ teachingTopics: newTopics });
  };

  // Get appropriate topic label based on event type
  const getTopicLabel = () => {
    switch (eventDetails.type) {
      case 'challenge':
        return 'Daily Topics';
      case 'webinar':
        return 'Key Teaching Points (3 is ideal)';
      case 'workshop':
        return 'Main Exercises/Outcomes';
      case 'masterclass':
        return 'Core Teaching Points';
      default:
        return 'What You\'ll Teach';
    }
  };

  const isChallenge = eventDetails.type === 'challenge';

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
          <CardContent className="space-y-6">
            {/* Section 1: Event Basics */}
            <div className="space-y-4">
              {/* Event type */}
              <div className="space-y-2">
                <Label htmlFor="event-type">Event Type</Label>
                <Select
                  value={eventDetails.type || ''}
                  onValueChange={(value) => handleEventDetailsChange({ 
                    type: value as FreeEventDetails['type'],
                    // Reset challenge-specific if not a challenge
                    ...(value !== 'challenge' ? { 
                      challengeDuration: null,
                      hasFacebookGroup: false,
                      dailyEmails: false,
                    } : {}),
                  })}
                >
                  <SelectTrigger id="event-type">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {FREE_EVENT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="flex items-center gap-2">
                          <span>{option.icon}</span>
                          <span>{option.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Event Name */}
              <div className="space-y-2">
                <Label htmlFor="event-name">Event Name</Label>
                <Input
                  id="event-name"
                  value={eventDetails.name}
                  onChange={(e) => handleEventDetailsChange({ name: e.target.value })}
                  placeholder={isChallenge 
                    ? "e.g., The 5-Day Content Creation Challenge" 
                    : "e.g., The Content Creator Masterclass"
                  }
                />
              </div>

              {/* Event Hook/Topic */}
              <div className="space-y-2">
                <Label htmlFor="event-hook">What's the hook? (What will they learn?)</Label>
                <Textarea
                  id="event-hook"
                  value={eventDetails.hook}
                  onChange={(e) => handleEventDetailsChange({ hook: e.target.value })}
                  placeholder="e.g., How to create 30 days of content in just 2 hours per week"
                  rows={2}
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event-date">Date</Label>
                  <Input
                    id="event-date"
                    type="date"
                    value={eventDetails.date || ''}
                    onChange={(e) => handleEventDetailsChange({ date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-time">Time</Label>
                  <Input
                    id="event-time"
                    type="time"
                    value={eventDetails.time || ''}
                    onChange={(e) => handleEventDetailsChange({ time: e.target.value })}
                  />
                </div>
              </div>

              {/* Which phase */}
              <div className="space-y-3">
                <Label className="text-sm">Which phase is your event in?</Label>
                <RadioGroup
                  value={eventDetails.phase || 'pre-launch'}
                  onValueChange={(value) => handleEventDetailsChange({ 
                    phase: value as 'runway' | 'pre-launch' | 'cart-open' 
                  })}
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
            </div>

            {/* Section 2: What You're Teaching */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="font-medium">{getTopicLabel()}</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAddTopic}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              
              {(eventDetails.teachingTopics?.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground">
                  {isChallenge 
                    ? "Add daily topics for each day of your challenge" 
                    : "Add the key points you'll cover in your event"
                  }
                </p>
              )}
              
              <div className="space-y-2">
                {eventDetails.teachingTopics?.map((topic, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex items-center justify-center w-8 h-10 text-sm font-medium text-muted-foreground">
                      {isChallenge ? `Day ${index + 1}` : `${index + 1}.`}
                    </div>
                    <Input
                      value={topic}
                      onChange={(e) => handleUpdateTopic(index, e.target.value)}
                      placeholder={isChallenge 
                        ? `What's the focus of Day ${index + 1}?`
                        : `Teaching point ${index + 1}`
                      }
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveTopic(index)}
                      className="h-10 w-10 text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Registration & Attendance */}
            <div className="space-y-4 pt-2 border-t">
              <Label className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Registration & Attendance
              </Label>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="registration-goal" className="text-sm text-muted-foreground">
                    Registration Goal
                  </Label>
                  <Input
                    id="registration-goal"
                    type="number"
                    min="0"
                    value={eventDetails.registrationGoal ?? ''}
                    onChange={(e) => handleEventDetailsChange({ 
                      registrationGoal: e.target.value ? parseInt(e.target.value) : null 
                    })}
                    placeholder="e.g., 500"
                  />
                </div>
                <div className="space-y-2 flex items-end">
                  <div className="flex items-center gap-3 h-10">
                    <Switch
                      id="send-reminders"
                      checked={eventDetails.sendReminders}
                      onCheckedChange={(checked) => handleEventDetailsChange({ sendReminders: checked })}
                    />
                    <Label htmlFor="send-reminders" className="text-sm cursor-pointer">
                      Send reminder emails
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Special Offer for Attendees (Collapsible) */}
            <Collapsible open={specialOfferOpen} onOpenChange={setSpecialOfferOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-3 h-auto border-t pt-4">
                  <span className="flex items-center gap-2 font-medium">
                    <Gift className="h-4 w-4" />
                    Special Offer for Attendees
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${specialOfferOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                <div className="flex items-center gap-3">
                  <Switch
                    id="event-only-offer"
                    checked={eventDetails.hasEventOnlyOffer}
                    onCheckedChange={(checked) => handleEventDetailsChange({ hasEventOnlyOffer: checked })}
                  />
                  <Label htmlFor="event-only-offer" className="cursor-pointer">
                    Yes, I'm offering something special for attendees
                  </Label>
                </div>

                {eventDetails.hasEventOnlyOffer && (
                  <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                    <div className="space-y-2">
                      <Label htmlFor="event-offer-desc" className="text-sm">
                        What's the special offer?
                      </Label>
                      <Input
                        id="event-offer-desc"
                        value={eventDetails.eventOfferDescription}
                        onChange={(e) => handleEventDetailsChange({ eventOfferDescription: e.target.value })}
                        placeholder="e.g., Free 1:1 Strategy Call for first 20 buyers"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event-offer-discount" className="text-sm">
                        Discount or bonus
                      </Label>
                      <Input
                        id="event-offer-discount"
                        value={eventDetails.eventOfferDiscount}
                        onChange={(e) => handleEventDetailsChange({ eventOfferDiscount: e.target.value })}
                        placeholder="e.g., $200 off + bonus coaching package"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event-offer-deadline" className="text-sm">
                        When does the offer expire?
                      </Label>
                      <Input
                        id="event-offer-deadline"
                        value={eventDetails.eventOfferDeadline}
                        onChange={(e) => handleEventDetailsChange({ eventOfferDeadline: e.target.value })}
                        placeholder="e.g., 24 hours after webinar, Midnight Friday"
                      />
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Section 5: Challenge-Specific Settings (Conditional) */}
            {isChallenge && (
              <Collapsible open={challengeSettingsOpen} onOpenChange={setChallengeSettingsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-3 h-auto border-t pt-4">
                    <span className="flex items-center gap-2 font-medium">
                      <Calendar className="h-4 w-4" />
                      Challenge Settings
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${challengeSettingsOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="challenge-duration" className="text-sm">
                      Challenge Duration
                    </Label>
                    <Select
                      value={eventDetails.challengeDuration?.toString() || ''}
                      onValueChange={(value) => handleEventDetailsChange({ 
                        challengeDuration: parseInt(value) 
                      })}
                    >
                      <SelectTrigger id="challenge-duration" className="w-32">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {CHALLENGE_DURATION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value.toString()}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Switch
                        id="facebook-group"
                        checked={eventDetails.hasFacebookGroup}
                        onCheckedChange={(checked) => handleEventDetailsChange({ hasFacebookGroup: checked })}
                      />
                      <Label htmlFor="facebook-group" className="cursor-pointer flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Facebook Group for participants
                      </Label>
                    </div>

                    <div className="flex items-center gap-3">
                      <Switch
                        id="daily-emails"
                        checked={eventDetails.dailyEmails}
                        onCheckedChange={(checked) => handleEventDetailsChange({ dailyEmails: checked })}
                      />
                      <Label htmlFor="daily-emails" className="cursor-pointer flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Daily challenge emails
                      </Label>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

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
