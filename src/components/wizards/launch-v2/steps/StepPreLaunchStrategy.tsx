// Step 4: Pre-Launch Strategy (Q11-Q13)
// Captures reach method, content creation status, and volume

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Megaphone, PenTool, Layers, Plus, X, ListChecks } from 'lucide-react';
import {
  LaunchWizardV2Data,
  MainReachMethod,
  ContentCreationStatus,
  ContentVolume,
  MAIN_REACH_METHOD_OPTIONS,
  CONTENT_CREATION_STATUS_OPTIONS,
  CONTENT_VOLUME_OPTIONS,
} from '@/types/launchV2';

interface StepPreLaunchStrategyProps {
  data: LaunchWizardV2Data;
  onChange: (updates: Partial<LaunchWizardV2Data>) => void;
}

export function StepPreLaunchStrategy({ data, onChange }: StepPreLaunchStrategyProps) {
  const [newItem, setNewItem] = useState('');

  const getContentTaskEstimate = (): string => {
    if (!data.contentCreationStatus || !data.contentVolume) return '';
    
    const volumeMap = { light: 5, medium: 8, heavy: 12 };
    const statusMultiplier = { ready: 0.2, partial: 0.6, 'from-scratch': 1 };
    
    const baseCount = volumeMap[data.contentVolume as keyof typeof volumeMap] || 5;
    const multiplier = statusMultiplier[data.contentCreationStatus as keyof typeof statusMultiplier] || 1;
    const taskCount = Math.ceil(baseCount * multiplier);
    
    return `~${taskCount} content tasks`;
  };

  const handleAddItem = () => {
    if (!newItem.trim()) return;
    const currentItems = data.customPreLaunchItems || [];
    onChange({ customPreLaunchItems: [...currentItems, newItem.trim()] });
    setNewItem('');
  };

  const handleRemoveItem = (index: number) => {
    const currentItems = data.customPreLaunchItems || [];
    onChange({ customPreLaunchItems: currentItems.filter((_, i) => i !== index) });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    }
  };

  return (
    <div className="space-y-8">
      {/* Q11: Main Reach Method */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          What's your main way to reach people right now?
        </Label>
        <p className="text-sm text-muted-foreground -mt-2">
          Pick your strongest channel. We'll build tasks around it.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MAIN_REACH_METHOD_OPTIONS.map((option) => (
            <Card
              key={option.value}
              className={`cursor-pointer transition-all hover:border-primary/50 ${
                data.mainReachMethod === option.value 
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                  : 'border-border'
              }`}
              onClick={() => onChange({ mainReachMethod: option.value as MainReachMethod })}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <span className="text-xl">{option.icon}</span>
                <span className="text-sm font-medium">{option.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Social platform input */}
        {data.mainReachMethod === 'social' && (
          <div className="mt-3">
            <Label htmlFor="social-platform" className="text-sm">
              Which platform?
            </Label>
            <Input
              id="social-platform"
              value={data.socialPlatform}
              onChange={(e) => onChange({ socialPlatform: e.target.value })}
              placeholder="e.g., Instagram, LinkedIn, TikTok..."
              className="mt-1"
            />
          </div>
        )}

        {/* Combination details */}
        {data.mainReachMethod === 'combination' && (
          <div className="mt-3">
            <Label htmlFor="combination-details" className="text-sm">
              Which channels will you use?
            </Label>
            <Input
              id="combination-details"
              value={data.combinationDetails}
              onChange={(e) => onChange({ combinationDetails: e.target.value })}
              placeholder="e.g., Email + Instagram + DMs..."
              className="mt-1"
            />
          </div>
        )}

        {/* Unsure guidance */}
        {data.mainReachMethod === 'unsure' && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>No worries!</strong> We'll add a "visibility strategy" task to your plan. 
              For now, consider: Where do you already have the most engaged followers or subscribers?
            </p>
          </div>
        )}
      </div>

      {/* Q12: Content Creation Status */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold flex items-center gap-2">
          <PenTool className="h-5 w-5" />
          Do you already have pre-launch content created?
        </Label>
        
        <RadioGroup
          value={data.contentCreationStatus}
          onValueChange={(value) => onChange({ contentCreationStatus: value as ContentCreationStatus })}
          className="space-y-3"
        >
          {CONTENT_CREATION_STATUS_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-3">
              <RadioGroupItem 
                value={option.value} 
                id={`content-status-${option.value}`}
              />
              <Label 
                htmlFor={`content-status-${option.value}`} 
                className="cursor-pointer flex items-center gap-2"
              >
                {option.label}
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    option.color === 'green' ? 'border-green-500 text-green-600' :
                    option.color === 'yellow' ? 'border-yellow-500 text-yellow-600' :
                    'border-red-500 text-red-600'
                  }`}
                >
                  {option.color === 'green' ? 'Easy' :
                   option.color === 'yellow' ? 'Some work' :
                   'More tasks'}
                </Badge>
              </Label>
            </div>
          ))}
        </RadioGroup>

        {data.contentCreationStatus === 'from-scratch' && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Starting fresh?</strong> We'll add content creation tasks to your pre-launch timeline. 
              Consider batching content creation into 1-2 focused sessions.
            </p>
          </div>
        )}
      </div>

      {/* Q13: Content Volume */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold flex items-center gap-2">
          <Layers className="h-5 w-5" />
          How many pre-launch emails/content pieces?
        </Label>
        <p className="text-sm text-muted-foreground -mt-2">
          This determines your task density before cart opens.
        </p>
        
        <RadioGroup
          value={data.contentVolume}
          onValueChange={(value) => onChange({ contentVolume: value as ContentVolume })}
          className="space-y-3"
        >
          {CONTENT_VOLUME_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-start space-x-3">
              <RadioGroupItem 
                value={option.value} 
                id={`volume-${option.value}`}
                className="mt-1"
              />
              <div className="flex-1">
                <Label 
                  htmlFor={`volume-${option.value}`} 
                  className="cursor-pointer font-medium"
                >
                  {option.label}
                </Label>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
            </div>
          ))}
        </RadioGroup>

        {/* Task estimate */}
        {getContentTaskEstimate() && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
            <p className="text-sm">
              📋 Estimated pre-launch tasks: <strong>{getContentTaskEstimate()}</strong>
            </p>
          </div>
        )}
      </div>

      {/* Custom Pre-Launch Checklist Items */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold flex items-center gap-2">
          <ListChecks className="h-5 w-5" />
          Anything else you need to do before launch?
        </Label>
        <p className="text-sm text-muted-foreground -mt-2">
          Add your own checklist items (e.g., "Update sales page", "Test checkout flow")
        </p>

        {/* Input for new item */}
        <div className="flex gap-2">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a task and press Enter..."
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleAddItem}
            disabled={!newItem.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* List of custom items */}
        {(data.customPreLaunchItems?.length ?? 0) > 0 && (
          <div className="space-y-2">
            {data.customPreLaunchItems?.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border group"
              >
                <span className="text-sm flex-1">{item}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveItem(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Strategy Summary */}
      {data.mainReachMethod && data.contentCreationStatus && data.contentVolume && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-2">Your pre-launch strategy:</p>
            <p className="text-sm text-muted-foreground">
              {data.contentCreationStatus === 'ready' 
                ? 'Focus on promotion and scheduling. '
                : data.contentCreationStatus === 'partial'
                ? 'Mix of creation and promotion. '
                : 'Content creation first, then promotion. '}
              Using{' '}
              {data.mainReachMethod === 'email' ? 'email as your main channel'
                : data.mainReachMethod === 'social' ? `${data.socialPlatform || 'social media'} as your main channel`
                : data.mainReachMethod === 'direct-outreach' ? 'direct conversations to drive sales'
                : data.mainReachMethod === 'combination' ? 'multiple channels together'
                : 'a strategy we\'ll figure out together'}.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
