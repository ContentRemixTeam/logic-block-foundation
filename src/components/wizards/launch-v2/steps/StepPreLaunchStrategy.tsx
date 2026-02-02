// Step 4: Pre-Launch Strategy (Q11-Q13)
// Captures reach method, email sequences, automations, content status, sales page, testimonials, and volume

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Megaphone, PenTool, Layers, Plus, X, ListChecks, Mail, Zap, FileText, 
  ArrowRight, Star, Calendar, AlertTriangle 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  LaunchWizardV2Data,
  MainReachMethod,
  ContentCreationStatus,
  ContentVolume,
  EmailSequenceTypes,
  AutomationTypes,
  SalesPageStatus,
  TestimonialStatus,
  EmailSequenceItem,
  ChallengeConfig,
  WebinarConfig,
  FlashSaleConfig,
  BetaLaunchConfig,
  MasterclassConfig,
  MAIN_REACH_METHOD_OPTIONS,
  CONTENT_CREATION_STATUS_OPTIONS,
  CONTENT_VOLUME_OPTIONS,
  EMAIL_SEQUENCE_TYPE_OPTIONS,
  AUTOMATION_TYPE_OPTIONS,
} from '@/types/launchV2';
import { format, parseISO, isBefore, addDays, isAfter } from 'date-fns';
import {
  ChallengeConfigComponent,
  WebinarConfigComponent,
  FlashSaleConfigComponent,
  BetaLaunchConfigComponent,
  MasterclassConfigComponent,
} from '../styles';

interface StepPreLaunchStrategyProps {
  data: LaunchWizardV2Data;
  onChange: (updates: Partial<LaunchWizardV2Data>) => void;
}

export function StepPreLaunchStrategy({ data, onChange }: StepPreLaunchStrategyProps) {
  const [newItem, setNewItem] = useState('');
  const [newEmailSequence, setNewEmailSequence] = useState('');
  const [newAutomation, setNewAutomation] = useState('');

  const getContentTaskEstimate = (): string => {
    if (!data.contentCreationStatus || !data.contentVolume) return '';
    
    const volumeMap = { light: 5, medium: 8, heavy: 12 };
    const statusMultiplier = { ready: 0.2, partial: 0.6, 'from-scratch': 1 };
    
    const baseCount = volumeMap[data.contentVolume as keyof typeof volumeMap] || 5;
    const multiplier = statusMultiplier[data.contentCreationStatus as keyof typeof statusMultiplier] || 1;
    const taskCount = Math.ceil(baseCount * multiplier);
    
    return `~${taskCount} content tasks`;
  };

  // Suggested deadline is 3 days before cart opens
  const suggestedDeadline = () => {
    if (!data.cartOpensDate) return '';
    try {
      const cartOpen = parseISO(data.cartOpensDate);
      return format(addDays(cartOpen, -3), 'yyyy-MM-dd');
    } catch {
      return '';
    }
  };

  // Check if sales page deadline is valid
  const isSalesPageDeadlineValid = () => {
    if (!data.salesPageDeadline || !data.cartOpensDate) return true;
    try {
      return isBefore(parseISO(data.salesPageDeadline), parseISO(data.cartOpensDate));
    } catch {
      return true;
    }
  };

  // Custom pre-launch items handlers
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

  // Email sequence handlers with status tracking
  const toggleEmailSequenceType = (key: keyof EmailSequenceTypes) => {
    const current = data.emailSequenceTypes || {
      warmUp: false,
      launch: false,
      cartClose: false,
      postPurchase: false,
    };
    const newValue = !current[key];
    
    // Update legacy format
    onChange({
      emailSequenceTypes: {
        ...current,
        [key]: newValue,
      },
    });
    
    // Also update new format with status tracking
    const emailSequences = data.emailSequences || [];
    if (newValue) {
      // Add new sequence
      const newSeq: EmailSequenceItem = {
        type: key,
        status: 'needs-creation', // Default to needs creation
      };
      onChange({ emailSequences: [...emailSequences, newSeq] });
    } else {
      // Remove sequence
      onChange({ emailSequences: emailSequences.filter(s => s.type !== key) });
    }
  };

  // Update email sequence status
  const updateEmailSequenceStatus = (type: string, status: 'existing' | 'needs-creation', deadline?: string) => {
    const emailSequences = data.emailSequences || [];
    const updated = emailSequences.map(s => 
      s.type === type ? { ...s, status, deadline } : s
    );
    onChange({ emailSequences: updated });
  };

  const handleAddCustomEmailSequence = () => {
    if (!newEmailSequence.trim()) return;
    const current = data.customEmailSequences || [];
    onChange({ customEmailSequences: [...current, newEmailSequence.trim()] });
    
    // Also add to new format
    const emailSequences = data.emailSequences || [];
    const newSeq: EmailSequenceItem = {
      type: 'custom',
      customName: newEmailSequence.trim(),
      status: 'needs-creation',
    };
    onChange({ emailSequences: [...emailSequences, newSeq] });
    setNewEmailSequence('');
  };

  const handleRemoveCustomEmailSequence = (index: number) => {
    const current = data.customEmailSequences || [];
    const removedName = current[index];
    onChange({ customEmailSequences: current.filter((_, i) => i !== index) });
    
    // Also remove from new format
    const emailSequences = data.emailSequences || [];
    onChange({ 
      emailSequences: emailSequences.filter(s => 
        !(s.type === 'custom' && s.customName === removedName)
      ) 
    });
  };

  const handleEmailSequenceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustomEmailSequence();
    }
  };

  // Automation handlers
  const toggleAutomationType = (key: keyof AutomationTypes) => {
    const current = data.automationTypes || {
      tagging: false,
      abandonedCart: false,
      purchaseConfirmation: false,
      waitlistToSales: false,
      deadlineUrgency: false,
      leadMagnetDelivery: false,
      skipAutomations: false,
    };
    
    // If toggling skipAutomations ON, clear other automations
    if (key === 'skipAutomations' && !current.skipAutomations) {
      onChange({
        automationTypes: {
          tagging: false,
          abandonedCart: false,
          purchaseConfirmation: false,
          waitlistToSales: false,
          deadlineUrgency: false,
          leadMagnetDelivery: false,
          skipAutomations: true,
        },
        customAutomations: [],
      });
      return;
    }
    
    // If selecting any automation, turn off skipAutomations
    const updates: Partial<AutomationTypes> = { [key]: !current[key] };
    if (key !== 'skipAutomations' && current.skipAutomations) {
      updates.skipAutomations = false;
    }
    
    onChange({
      automationTypes: {
        ...current,
        ...updates,
      },
    });
  };

  const handleAddCustomAutomation = () => {
    if (!newAutomation.trim()) return;
    const current = data.customAutomations || [];
    onChange({ customAutomations: [...current, newAutomation.trim()] });
    setNewAutomation('');
  };

  const handleRemoveCustomAutomation = (index: number) => {
    const current = data.customAutomations || [];
    onChange({ customAutomations: current.filter((_, i) => i !== index) });
  };

  const handleAutomationKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustomAutomation();
    }
  };

  // Get email sequence from new format
  const getEmailSequence = (type: string): EmailSequenceItem | undefined => {
    return (data.emailSequences || []).find(s => s.type === type);
  };

  // Count sequences needing creation
  const sequencesNeedingCreation = (data.emailSequences || []).filter(s => s.status === 'needs-creation').length;

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

      {/* Sales Page Status */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Sales Page
        </Label>
        <p className="text-sm text-muted-foreground -mt-2">
          What's the status of your sales page?
        </p>

        <RadioGroup
          value={data.salesPageStatus}
          onValueChange={(value) => onChange({ salesPageStatus: value as SalesPageStatus })}
          className="space-y-2"
        >
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="existing" id="sp-existing" />
            <Label htmlFor="sp-existing" className="cursor-pointer">Already done</Label>
          </div>
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="in-progress" id="sp-in-progress" />
            <Label htmlFor="sp-in-progress" className="cursor-pointer">In progress</Label>
          </div>
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="needs-creation" id="sp-needs-creation" />
            <Label htmlFor="sp-needs-creation" className="cursor-pointer">Haven't started</Label>
          </div>
        </RadioGroup>

        {data.salesPageStatus !== 'existing' && (
          <div className="space-y-2 pl-4 border-l-2 border-primary/20">
            <Label className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              When will it be complete?
            </Label>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Input
                  type="date"
                  value={data.salesPageDeadline}
                  onChange={(e) => onChange({ salesPageDeadline: e.target.value })}
                />
              </div>
              {data.cartOpensDate && !data.salesPageDeadline && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onChange({ salesPageDeadline: suggestedDeadline() })}
                >
                  3 days before launch
                </Button>
              )}
            </div>

            {data.salesPageDeadline && !isSalesPageDeadlineValid() && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-sm">Your deadline is after cart opens.</p>
              </div>
            )}
          </div>
        )}

        {data.salesPageStatus === 'existing' && (
          <p className="text-sm text-green-600">✓ Sales page is ready</p>
        )}
      </div>

      {/* Testimonials */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold flex items-center gap-2">
          <Star className="h-5 w-5" />
          Testimonials
        </Label>
        <p className="text-sm text-muted-foreground -mt-2">
          Social proof dramatically increases conversions.
        </p>

        <RadioGroup
          value={data.testimonialStatus}
          onValueChange={(value) => onChange({ testimonialStatus: value as TestimonialStatus })}
          className="space-y-2"
        >
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="have-enough" id="test-have-enough" />
            <Label htmlFor="test-have-enough" className="cursor-pointer">I have enough testimonials</Label>
          </div>
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="need-more" id="test-need-more" />
            <Label htmlFor="test-need-more" className="cursor-pointer">I need to collect more</Label>
          </div>
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="none" id="test-none" />
            <Label htmlFor="test-none" className="cursor-pointer">I don't have any yet (but want to collect)</Label>
          </div>
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="skip-this-launch" id="test-skip" />
            <Label htmlFor="test-skip" className="cursor-pointer">I don't have any and don't plan to collect for this launch</Label>
          </div>
        </RadioGroup>

        {(data.testimonialStatus === 'need-more' || data.testimonialStatus === 'none') && (
          <div className="space-y-3 pl-4 border-l-2 border-primary/20">
            <div className="space-y-2">
              <Label className="text-sm">How many do you want to collect?</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={data.testimonialGoal}
                  onChange={(e) => onChange({ testimonialGoal: Number(e.target.value) })}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">testimonials</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Collection deadline
              </Label>
              <Input
                type="date"
                value={data.testimonialDeadline}
                onChange={(e) => onChange({ testimonialDeadline: e.target.value })}
              />
            </div>
          </div>
        )}

        {data.testimonialStatus === 'have-enough' && (
          <p className="text-sm text-green-600">✓ Testimonials ready</p>
        )}

        {data.testimonialStatus === 'skip-this-launch' && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>That's okay!</strong> First launches often don't have testimonials. Focus on delivering great results this time, and you'll have stories to share for your next launch.
            </p>
          </div>
        )}
      </div>

      {/* Email Sequences Section */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Which email sequences do you need?
        </Label>
        <p className="text-sm text-muted-foreground -mt-2">
          Select all that apply. For each, tell us if it's ready or needs to be written.
        </p>

        <div className="space-y-3">
          {EMAIL_SEQUENCE_TYPE_OPTIONS.map((option) => {
            const isSelected = data.emailSequenceTypes?.[option.key as keyof EmailSequenceTypes] || false;
            const sequence = getEmailSequence(option.key);
            
            return (
              <div key={option.key} className="space-y-2">
                <div
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    isSelected ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/30'
                  }`}
                  onClick={() => toggleEmailSequenceType(option.key as keyof EmailSequenceTypes)}
                >
                  <Checkbox
                    id={`email-seq-${option.key}`}
                    checked={isSelected}
                    onCheckedChange={() => toggleEmailSequenceType(option.key as keyof EmailSequenceTypes)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <Label htmlFor={`email-seq-${option.key}`} className="cursor-pointer font-medium">
                      {option.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </div>
                
                {/* Status selector when selected */}
                {isSelected && (
                  <div className="ml-8 pl-4 border-l-2 border-primary/20 space-y-2">
                    <RadioGroup
                      value={sequence?.status || 'needs-creation'}
                      onValueChange={(value) => updateEmailSequenceStatus(option.key, value as 'existing' | 'needs-creation')}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="existing" id={`${option.key}-existing`} />
                        <Label htmlFor={`${option.key}-existing`} className="cursor-pointer text-sm">
                          Already written
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="needs-creation" id={`${option.key}-needs-creation`} />
                        <Label htmlFor={`${option.key}-needs-creation`} className="cursor-pointer text-sm">
                          Need to write
                        </Label>
                      </div>
                    </RadioGroup>
                    
                    {sequence?.status === 'needs-creation' && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Deadline (optional)</Label>
                        <Input
                          type="date"
                          value={sequence?.deadline || ''}
                          onChange={(e) => updateEmailSequenceStatus(option.key, 'needs-creation', e.target.value)}
                          className="w-auto"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Custom email sequences */}
        <div className="mt-4 space-y-3">
          <Label className="text-sm text-muted-foreground">Add custom sequence:</Label>
          <div className="flex gap-2">
            <Input
              value={newEmailSequence}
              onChange={(e) => setNewEmailSequence(e.target.value)}
              onKeyDown={handleEmailSequenceKeyDown}
              placeholder="e.g., VIP early access series..."
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleAddCustomEmailSequence}
              disabled={!newEmailSequence.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {(data.customEmailSequences?.length ?? 0) > 0 && (
            <div className="space-y-2 mt-2">
              {data.customEmailSequences?.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border group"
                >
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm flex-1">{item}</span>
                  <Badge variant="outline" className="text-xs">Need to write</Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveCustomEmailSequence(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sequences summary */}
        {sequencesNeedingCreation > 0 && (
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-sm">
              📋 <strong>{sequencesNeedingCreation}</strong> email sequence{sequencesNeedingCreation > 1 ? 's' : ''} to write
            </p>
          </div>
        )}
      </div>

      {/* Automations Section */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Which automations do you need to set up?
        </Label>
        <p className="text-sm text-muted-foreground -mt-2">
          These are tech tasks we'll add to your pre-launch checklist.
        </p>

        {/* Skip automations option */}
        <div
          className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
            data.automationTypes?.skipAutomations 
              ? 'bg-muted/50 border-primary' 
              : 'hover:bg-muted/30'
          }`}
          onClick={() => toggleAutomationType('skipAutomations')}
        >
          <Checkbox
            id="automation-skip"
            checked={data.automationTypes?.skipAutomations || false}
            onCheckedChange={() => toggleAutomationType('skipAutomations')}
            className="mt-0.5"
          />
          <div className="flex-1">
            <Label htmlFor="automation-skip" className="cursor-pointer font-medium">
              I'm not setting up automations for this launch
            </Label>
            <p className="text-sm text-muted-foreground">
              Skip this section — you'll handle everything manually or don't need automations
            </p>
          </div>
        </div>

        {/* Automation options - hidden when skipping */}
        {!data.automationTypes?.skipAutomations && (
          <>
            <div className="space-y-3">
              {AUTOMATION_TYPE_OPTIONS.map((option) => (
                <div
                  key={option.key}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => toggleAutomationType(option.key as keyof AutomationTypes)}
                >
                  <Checkbox
                    id={`automation-${option.key}`}
                    checked={data.automationTypes?.[option.key as keyof AutomationTypes] || false}
                    onCheckedChange={() => toggleAutomationType(option.key as keyof AutomationTypes)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <Label htmlFor={`automation-${option.key}`} className="cursor-pointer font-medium">
                      {option.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Custom automations */}
            <div className="mt-4 space-y-3">
              <Label className="text-sm text-muted-foreground">Add custom automation:</Label>
              <div className="flex gap-2">
                <Input
                  value={newAutomation}
                  onChange={(e) => setNewAutomation(e.target.value)}
                  onKeyDown={handleAutomationKeyDown}
                  placeholder="e.g., Webinar replay sequence..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAddCustomAutomation}
                  disabled={!newAutomation.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {(data.customAutomations?.length ?? 0) > 0 && (
                <div className="space-y-2 mt-2">
                  {data.customAutomations?.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border group"
                    >
                      <Zap className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm flex-1">{item}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveCustomAutomation(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
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

      {/* Content Prep Integration Note */}
      <Card className="border-dashed border-2 border-muted-foreground/30">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="font-semibold">Content Prep</h4>
              <p className="text-sm text-muted-foreground">
                Based on your choices above, we'll generate content creation tasks. 
                After completing this wizard, you can use the <strong>Content Planner</strong> to:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li>Define your messaging framework</li>
                <li>Plan specific content pieces</li>
                <li>Repurpose existing content</li>
                <li>Schedule creation tasks by launch phase</li>
              </ul>
              <Link 
                to="/wizards/content-planner" 
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
              >
                Go to Content Planner <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Launch Style-Specific Configuration */}
      {data.launchStyle === 'challenge' && (
        <ChallengeConfigComponent
          config={data.challengeConfig}
          onChange={(config: ChallengeConfig) => onChange({ challengeConfig: config })}
        />
      )}

      {data.launchStyle === 'webinar' && (
        <WebinarConfigComponent
          config={data.webinarConfig}
          onChange={(config: WebinarConfig) => onChange({ webinarConfig: config })}
        />
      )}

      {data.launchStyle === 'flash-sale' && (
        <FlashSaleConfigComponent
          config={data.flashSaleConfig}
          onChange={(config: FlashSaleConfig) => onChange({ flashSaleConfig: config })}
        />
      )}

      {data.launchStyle === 'beta' && (
        <BetaLaunchConfigComponent
          config={data.betaLaunchConfig}
          onChange={(config: BetaLaunchConfig) => onChange({ betaLaunchConfig: config })}
        />
      )}

      {data.launchStyle === 'masterclass' && (
        <MasterclassConfigComponent
          config={data.masterclassConfig}
          onChange={(config: MasterclassConfig) => onChange({ masterclassConfig: config })}
        />
      )}

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
