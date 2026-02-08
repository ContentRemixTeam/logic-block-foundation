// Step 1: Event Basics
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WebinarWizardData, WEBINAR_EVENT_TYPES, TIMEZONES } from '@/types/webinar';
import { Calendar, Clock, Video, Lightbulb } from 'lucide-react';

interface StepEventBasicsProps {
  data: WebinarWizardData;
  onChange: (updates: Partial<WebinarWizardData>) => void;
}

export function StepEventBasics({ data, onChange }: StepEventBasicsProps) {
  return (
    <div className="space-y-6">
      {/* Teaching Callout */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Pro Tip</p>
              <p className="text-sm text-muted-foreground mt-1">
                The best webinars focus on ONE specific transformation. Don't try to cover everything—
                give a quick win that makes them want more.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Type & Name */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Event Details</CardTitle>
          </div>
          <CardDescription>What type of event are you planning?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Event Type</Label>
            <Select
              value={data.eventType}
              onValueChange={(value) => onChange({ eventType: value as WebinarWizardData['eventType'] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                {WEBINAR_EVENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <span className="font-medium">{type.label}</span>
                      <span className="text-muted-foreground ml-2 text-sm">- {type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Event Name/Title</Label>
            <Input
              id="name"
              placeholder="e.g., How to Land Your First 3 Clients in 30 Days"
              value={data.name}
              onChange={(e) => onChange({ name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic">Main Topic</Label>
            <Input
              id="topic"
              placeholder="e.g., Client acquisition for new coaches"
              value={data.topic}
              onChange={(e) => onChange({ topic: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Brief Description</Label>
            <Textarea
              id="description"
              placeholder="What will attendees learn? What's the main transformation?"
              value={data.description}
              onChange={(e) => onChange({ description: e.target.value })}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Date & Time */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Date & Time</CardTitle>
          </div>
          <CardDescription>When will your event take place?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="eventDate">Event Date</Label>
              <Input
                id="eventDate"
                type="date"
                value={data.eventDate}
                onChange={(e) => onChange({ eventDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventTime">Start Time</Label>
              <Input
                id="eventTime"
                type="time"
                value={data.eventTime}
                onChange={(e) => onChange({ eventTime: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={data.timezone}
                onValueChange={(value) => onChange({ timezone: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Select
                value={String(data.durationMinutes)}
                onValueChange={(value) => onChange({ durationMinutes: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes (1 hour)</SelectItem>
                  <SelectItem value="75">75 minutes</SelectItem>
                  <SelectItem value="90">90 minutes (1.5 hours)</SelectItem>
                  <SelectItem value="120">120 minutes (2 hours)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Replay Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Replay Settings</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Live Event</Label>
              <p className="text-sm text-muted-foreground">Will you present live?</p>
            </div>
            <Switch
              checked={data.isLive}
              onCheckedChange={(checked) => onChange({ isLive: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Offer Replay</Label>
              <p className="text-sm text-muted-foreground">Will you send a recording after?</p>
            </div>
            <Switch
              checked={data.hasReplay}
              onCheckedChange={(checked) => onChange({ hasReplay: checked })}
            />
          </div>

          {data.hasReplay && (
            <div className="space-y-2">
              <Label>Replay Available For</Label>
              <Select
                value={String(data.replayDurationHours)}
                onValueChange={(value) => onChange({ replayDurationHours: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="48">48 hours</SelectItem>
                  <SelectItem value="72">72 hours</SelectItem>
                  <SelectItem value="168">7 days</SelectItem>
                  <SelectItem value="0">Unlimited</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
