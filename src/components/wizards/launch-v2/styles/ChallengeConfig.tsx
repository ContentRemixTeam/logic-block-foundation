// Challenge Launch Configuration Component
// Deep configuration for multi-day challenges leading to offers

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue, 
} from '@/components/ui/select';
import { Users, Target, Gift, ClipboardList, Plus, X } from 'lucide-react';
import { ChallengeConfig, DEFAULT_CHALLENGE_CONFIG } from '@/types/launchV2';

interface ChallengeConfigProps {
  config: ChallengeConfig;
  onChange: (config: ChallengeConfig) => void;
}

export function ChallengeConfigComponent({ config, onChange }: ChallengeConfigProps) {
  const safeConfig = { ...DEFAULT_CHALLENGE_CONFIG, ...config };

  const handleChange = <K extends keyof ChallengeConfig>(
    key: K,
    value: ChallengeConfig[K]
  ) => {
    onChange({ ...safeConfig, [key]: value });
  };

  const handleAddTopic = () => {
    const newTopics = [...safeConfig.dailyTopics, ''];
    handleChange('dailyTopics', newTopics);
  };

  const handleRemoveTopic = (index: number) => {
    const newTopics = safeConfig.dailyTopics.filter((_, i) => i !== index);
    handleChange('dailyTopics', newTopics);
  };

  const handleTopicChange = (index: number, value: string) => {
    const newTopics = [...safeConfig.dailyTopics];
    newTopics[index] = value;
    handleChange('dailyTopics', newTopics);
  };

  // Auto-generate topic placeholders based on duration
  const ensureTopicSlots = () => {
    const duration = safeConfig.challengeDuration || 5;
    if (safeConfig.dailyTopics.length < duration) {
      const newTopics = [...safeConfig.dailyTopics];
      while (newTopics.length < duration) {
        newTopics.push('');
      }
      handleChange('dailyTopics', newTopics);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-primary" />
          Challenge Configuration
        </CardTitle>
        <CardDescription>
          Set up your multi-day challenge that leads to your offer
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Challenge Duration */}
        <div className="space-y-3">
          <Label className="font-medium">How many days is your challenge?</Label>
          <Select
            value={String(safeConfig.challengeDuration)}
            onValueChange={(value) => {
              handleChange('challengeDuration', Number(value) as 3 | 5 | 7 | 10);
              // Reset topics when duration changes
              handleChange('dailyTopics', []);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 days (compact)</SelectItem>
              <SelectItem value="5">5 days (standard)</SelectItem>
              <SelectItem value="7">7 days (extended)</SelectItem>
              <SelectItem value="10">10 days (immersive)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Daily Topics */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="font-medium">Daily Topics</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                ensureTopicSlots();
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add all days
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            What will you teach each day of the challenge?
          </p>
          <div className="space-y-2">
            {safeConfig.dailyTopics.map((topic, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-sm font-medium w-16">Day {index + 1}:</span>
                <Input
                  value={topic}
                  onChange={(e) => handleTopicChange(index, e.target.value)}
                  placeholder={`e.g., "Getting started with..."`}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveTopic(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {safeConfig.dailyTopics.length < safeConfig.challengeDuration && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddTopic}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add day
              </Button>
            )}
          </div>
        </div>

        {/* Community / Group Strategy */}
        <div className="space-y-3">
          <Label className="font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Community Strategy
          </Label>
          <RadioGroup
            value={safeConfig.groupStrategy}
            onValueChange={(value) => handleChange('groupStrategy', value as 'pop-up' | 'existing' | 'none')}
            className="space-y-2"
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="pop-up" id="group-popup" />
              <Label htmlFor="group-popup" className="cursor-pointer">
                Create a pop-up group just for this challenge
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="existing" id="group-existing" />
              <Label htmlFor="group-existing" className="cursor-pointer">
                Use my existing community
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="none" id="group-none" />
              <Label htmlFor="group-none" className="cursor-pointer">
                No community - email only
              </Label>
            </div>
          </RadioGroup>

          {safeConfig.groupStrategy === 'pop-up' && (
            <div className="pl-6 space-y-3 border-l-2 border-primary/20">
              <div className="space-y-2">
                <Label className="text-sm">Group name</Label>
                <Input
                  value={safeConfig.popUpGroupName}
                  onChange={(e) => handleChange('popUpGroupName', e.target.value)}
                  placeholder="e.g., 5-Day Content Sprint Challenge"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Platform</Label>
                <Select
                  value={safeConfig.groupPlatform}
                  onValueChange={(value) => handleChange('groupPlatform', value as ChallengeConfig['groupPlatform'])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facebook">Facebook Group</SelectItem>
                    <SelectItem value="slack">Slack</SelectItem>
                    <SelectItem value="discord">Discord</SelectItem>
                    <SelectItem value="circle">Circle</SelectItem>
                    <SelectItem value="mighty-networks">Mighty Networks</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {safeConfig.groupPlatform === 'other' && (
                  <Input
                    value={safeConfig.groupPlatformOther}
                    onChange={(e) => handleChange('groupPlatformOther', e.target.value)}
                    placeholder="Specify platform..."
                    className="mt-2"
                  />
                )}
              </div>
            </div>
          )}

          {safeConfig.groupStrategy === 'existing' && (
            <div className="pl-6 space-y-2 border-l-2 border-primary/20">
              <Label className="text-sm">Link to your community</Label>
              <Input
                value={safeConfig.existingGroupLink}
                onChange={(e) => handleChange('existingGroupLink', e.target.value)}
                placeholder="https://..."
              />
            </div>
          )}
        </div>

        {/* Completion Incentive */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="font-medium flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Completion Incentive
            </Label>
            <Switch
              checked={safeConfig.hasCompletionIncentive}
              onCheckedChange={(checked) => handleChange('hasCompletionIncentive', checked)}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Reward participants who complete all days
          </p>

          {safeConfig.hasCompletionIncentive && (
            <div className="pl-6 space-y-3 border-l-2 border-primary/20">
              <div className="space-y-2">
                <Label className="text-sm">Incentive type</Label>
                <Select
                  value={safeConfig.incentiveType}
                  onValueChange={(value) => handleChange('incentiveType', value as ChallengeConfig['incentiveType'])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select incentive type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="giveaway">Giveaway / Prize drawing</SelectItem>
                    <SelectItem value="bonus">Bonus content / resource</SelectItem>
                    <SelectItem value="certificate">Certificate of completion</SelectItem>
                    <SelectItem value="discount">Discount on your offer</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Describe the incentive</Label>
                <Input
                  value={safeConfig.incentiveDescription}
                  onChange={(e) => handleChange('incentiveDescription', e.target.value)}
                  placeholder="e.g., 30-minute strategy call, $200 off the course..."
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">How do they qualify?</Label>
                <Select
                  value={safeConfig.incentiveQualification}
                  onValueChange={(value) => handleChange('incentiveQualification', value as ChallengeConfig['incentiveQualification'])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select qualification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="complete-all-days">Complete all days</SelectItem>
                    <SelectItem value="submit-homework">Submit homework each day</SelectItem>
                    <SelectItem value="attend-live">Attend live sessions</SelectItem>
                    <SelectItem value="other">Other criteria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Daily Homework */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="font-medium flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Daily Homework
            </Label>
            <Switch
              checked={safeConfig.hasHomework}
              onCheckedChange={(checked) => handleChange('hasHomework', checked)}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Assign tasks for participants to complete each day
          </p>

          {safeConfig.hasHomework && (
            <div className="pl-6 space-y-3 border-l-2 border-primary/20">
              <div className="space-y-2">
                <Label className="text-sm">Homework type</Label>
                <Select
                  value={safeConfig.homeworkType}
                  onValueChange={(value) => handleChange('homeworkType', value as ChallengeConfig['homeworkType'])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select homework type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="worksheet">Fill out a worksheet</SelectItem>
                    <SelectItem value="video-response">Submit a video response</SelectItem>
                    <SelectItem value="group-post">Post in the group</SelectItem>
                    <SelectItem value="action-item">Complete an action item</SelectItem>
                    <SelectItem value="mixed">Mix of different types</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">How will they submit?</Label>
                <Select
                  value={safeConfig.homeworkSubmissionMethod}
                  onValueChange={(value) => handleChange('homeworkSubmissionMethod', value as ChallengeConfig['homeworkSubmissionMethod'])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select submission method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group">Post in the group</SelectItem>
                    <SelectItem value="email">Reply to email</SelectItem>
                    <SelectItem value="form">Submit via form</SelectItem>
                    <SelectItem value="dm">Send a DM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
