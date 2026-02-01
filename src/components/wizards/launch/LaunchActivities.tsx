import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Trash2 } from 'lucide-react';
import {
  LaunchWizardData,
  LaunchLiveEvent,
  LIVE_EVENT_OPTIONS,
  AD_PLATFORM_OPTIONS,
  SOCIAL_STRATEGY_OPTIONS,
} from '@/types/launch';

interface LaunchActivitiesProps {
  data: LaunchWizardData;
  onChange: (updates: Partial<LaunchWizardData>) => void;
}

export function LaunchActivities({ data, onChange }: LaunchActivitiesProps) {
  const [newEventType, setNewEventType] = useState<LaunchLiveEvent['type']>('webinar');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTopic, setNewEventTopic] = useState('');
  const [newEventCustomType, setNewEventCustomType] = useState('');

  const addLiveEvent = () => {
    if (!newEventDate || !newEventTopic) return;
    if (newEventType === 'other' && !newEventCustomType.trim()) return;
    
    const event: LaunchLiveEvent = {
      type: newEventType,
      date: newEventDate,
      topic: newEventTopic,
      ...(newEventType === 'other' && { customType: newEventCustomType.trim() }),
    };
    onChange({ liveEvents: [...(data.liveEvents || []), event] });
    setNewEventDate('');
    setNewEventTopic('');
    setNewEventCustomType('');
  };

  const removeLiveEvent = (index: number) => {
    const updated = [...(data.liveEvents || [])];
    updated.splice(index, 1);
    onChange({ liveEvents: updated });
  };

  const toggleAdPlatform = (platform: string) => {
    const current = data.adsPlatform || [];
    const updated = current.includes(platform)
      ? current.filter((p) => p !== platform)
      : [...current, platform];
    onChange({ adsPlatform: updated });
  };

  const toggleSocialStrategy = (strategy: string) => {
    const current = data.socialStrategy || [];
    const updated = current.includes(strategy)
      ? current.filter((s) => s !== strategy)
      : [...current, strategy];
    onChange({ socialStrategy: updated });
  };

  return (
    <div className="space-y-8">
      {/* Live Events */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-lg font-semibold">Live Events During Launch</Label>
          <p className="text-sm text-muted-foreground">
            Are you doing any live events during the launch?
          </p>
        </div>

        {/* Existing events */}
        {data.liveEvents && data.liveEvents.length > 0 && (
          <div className="space-y-2">
            {data.liveEvents.map((event, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">{event.topic}</p>
                  <p className="text-sm text-muted-foreground">
                    {event.type === 'other' ? event.customType || 'Other' : event.type} • {event.date}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLiveEvent(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add new event */}
        <div className="p-4 border rounded-lg space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <select
                value={newEventType}
                onChange={(e) => setNewEventType(e.target.value as LaunchLiveEvent['type'])}
                className="w-full px-3 py-2 border rounded-md bg-background"
              >
                {LIVE_EVENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Topic</Label>
              <Input
                value={newEventTopic}
                onChange={(e) => setNewEventTopic(e.target.value)}
                placeholder="What's it about?"
              />
            </div>
          </div>
          
          {/* Custom type input for "Other" */}
          {newEventType === 'other' && (
            <div className="space-y-1">
              <Label className="text-xs">What type of event?</Label>
              <Input
                value={newEventCustomType}
                onChange={(e) => setNewEventCustomType(e.target.value)}
                placeholder="e.g., AMA, Live Demo, Office Hours..."
              />
            </div>
          )}
          
          <Button
            onClick={addLiveEvent}
            variant="outline"
            size="sm"
            disabled={!newEventDate || !newEventTopic || (newEventType === 'other' && !newEventCustomType.trim())}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Event
          </Button>
        </div>
      </div>

      {/* Paid Advertising */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-lg font-semibold">Paid Advertising</Label>
          <p className="text-sm text-muted-foreground">
            Are you running ads to this launch?
          </p>
        </div>
        <RadioGroup
          value={data.hasAds === 'maybe' ? 'maybe' : data.hasAds ? 'yes' : 'no'}
          onValueChange={(v) =>
            onChange({ hasAds: v === 'maybe' ? 'maybe' : v === 'yes' })
          }
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="ads-yes" />
            <Label htmlFor="ads-yes" className="cursor-pointer">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="ads-no" />
            <Label htmlFor="ads-no" className="cursor-pointer">No</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="maybe" id="ads-maybe" />
            <Label htmlFor="ads-maybe" className="cursor-pointer">Maybe - I'm deciding</Label>
          </div>
        </RadioGroup>

        {(data.hasAds === true || data.hasAds === 'maybe') && (
          <div className="ml-6 p-4 bg-muted/50 rounded-lg space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ads-budget">Budget</Label>
              <div className="relative w-48">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="ads-budget"
                  type="number"
                  min="0"
                  value={data.adsBudget ?? ''}
                  onChange={(e) =>
                    onChange({ adsBudget: e.target.value ? parseFloat(e.target.value) : null })
                  }
                  className="pl-7"
                  placeholder="500"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Platforms</Label>
              <div className="flex flex-wrap gap-2">
                {AD_PLATFORM_OPTIONS.map((platform) => (
                  <div
                    key={platform.value}
                    className={`flex items-center gap-2 px-3 py-1.5 border rounded-full cursor-pointer transition-colors ${
                      data.adsPlatform?.includes(platform.value)
                        ? 'bg-primary/20 border-primary'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => toggleAdPlatform(platform.value)}
                  >
                    <Checkbox
                      checked={data.adsPlatform?.includes(platform.value)}
                      className="pointer-events-none h-3.5 w-3.5"
                    />
                    <span className="text-sm">{platform.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Social Media */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-lg font-semibold">Social Media During Launch</Label>
          <p className="text-sm text-muted-foreground">What's your social media plan?</p>
        </div>
        <div className="space-y-2">
          {SOCIAL_STRATEGY_OPTIONS.map((option) => (
            <div
              key={option.value}
              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                data.socialStrategy?.includes(option.value)
                  ? 'bg-primary/10 border-primary'
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => toggleSocialStrategy(option.value)}
            >
              <Checkbox
                checked={data.socialStrategy?.includes(option.value)}
                className="pointer-events-none"
              />
              <span>{option.label}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 mt-4">
          <Label htmlFor="posts-per-day" className="whitespace-nowrap">
            Posts per day:
          </Label>
          <Input
            id="posts-per-day"
            type="number"
            min="1"
            max="10"
            value={data.socialPostsPerDay}
            onChange={(e) =>
              onChange({ socialPostsPerDay: parseInt(e.target.value) || 1 })
            }
            className="w-20"
          />
        </div>
      </div>
    </div>
  );
}
