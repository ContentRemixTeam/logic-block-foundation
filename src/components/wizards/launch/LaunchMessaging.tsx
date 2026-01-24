import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { MessageSquare, Sparkles, X, Plus, ShieldCheck } from 'lucide-react';
import { LaunchWizardData, SOCIAL_PROOF_OPTIONS } from '@/types/launch';
import { useState } from 'react';

interface LaunchMessagingProps {
  data: LaunchWizardData;
  onChange: (updates: Partial<LaunchWizardData>) => void;
}

const COMMON_OBJECTIONS = [
  "I don't have time",
  "It's too expensive",
  "I'm not ready",
  "I've tried things before that didn't work",
  "I can figure it out on my own",
  "What if it doesn't work for me?",
  "I need to think about it",
  "I'll join later",
];

const COMMON_BENEFITS = [
  "Save time",
  "Make more money",
  "Get results faster",
  "Avoid common mistakes",
  "Get support and accountability",
  "Proven framework/system",
];

export function LaunchMessaging({ data, onChange }: LaunchMessagingProps) {
  const [newBenefit, setNewBenefit] = useState('');
  const [newObjection, setNewObjection] = useState('');

  const addBenefit = () => {
    if (newBenefit.trim()) {
      onChange({ keyBenefits: [...data.keyBenefits, newBenefit.trim()] });
      setNewBenefit('');
    }
  };

  const removeBenefit = (index: number) => {
    const updated = data.keyBenefits.filter((_, i) => i !== index);
    onChange({ keyBenefits: updated });
  };

  const addQuickBenefit = (benefit: string) => {
    if (!data.keyBenefits.includes(benefit)) {
      onChange({ keyBenefits: [...data.keyBenefits, benefit] });
    }
  };

  const addObjection = () => {
    if (newObjection.trim()) {
      onChange({ objectionsToAddress: [...data.objectionsToAddress, newObjection.trim()] });
      setNewObjection('');
    }
  };

  const removeObjection = (index: number) => {
    const updated = data.objectionsToAddress.filter((_, i) => i !== index);
    onChange({ objectionsToAddress: updated });
  };

  const addQuickObjection = (objection: string) => {
    if (!data.objectionsToAddress.includes(objection)) {
      onChange({ objectionsToAddress: [...data.objectionsToAddress, objection] });
    }
  };

  const toggleSocialProof = (value: string) => {
    const current = data.socialProofType || [];
    if (current.includes(value)) {
      onChange({ socialProofType: current.filter(v => v !== value) });
    } else {
      onChange({ socialProofType: [...current, value] });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <MessageSquare className="h-4 w-4 text-primary" />
            Messaging Strategy
          </CardTitle>
          <CardDescription>
            Nail your core message before you start creating content. Everything flows from this.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Transformation Promise */}
      <div className="space-y-3">
        <div>
          <Label className="text-lg font-semibold">Your Transformation Promise</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Complete this sentence: "By the end of [your offer], you will..."
          </p>
        </div>
        <Textarea
          value={data.transformationPromise}
          onChange={(e) => onChange({ transformationPromise: e.target.value })}
          placeholder="e.g., have a clear 90-day plan and the confidence to execute it without second-guessing yourself"
          className="min-h-[100px]"
        />
        <p className="text-xs text-muted-foreground">
          💡 Focus on the outcome and feeling, not the features
        </p>
      </div>

      {/* Key Benefits */}
      <div className="space-y-4">
        <div>
          <Label className="text-lg font-semibold">Key Benefits</Label>
          <p className="text-sm text-muted-foreground mt-1">
            What are the top 3-5 benefits of your offer? Think about what your ideal customer cares about most.
          </p>
        </div>

        {/* Quick add buttons */}
        <div className="flex flex-wrap gap-2">
          {COMMON_BENEFITS.map((benefit) => (
            <Button
              key={benefit}
              variant="outline"
              size="sm"
              onClick={() => addQuickBenefit(benefit)}
              disabled={data.keyBenefits.includes(benefit)}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              {benefit}
            </Button>
          ))}
        </div>

        {/* Current benefits */}
        <div className="flex flex-wrap gap-2">
          {data.keyBenefits.map((benefit, index) => (
            <Badge key={index} variant="secondary" className="gap-1 py-1.5 px-3">
              <Sparkles className="h-3 w-3" />
              {benefit}
              <button onClick={() => removeBenefit(index)} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>

        {/* Add custom */}
        <div className="flex gap-2">
          <Input
            value={newBenefit}
            onChange={(e) => setNewBenefit(e.target.value)}
            placeholder="Add custom benefit..."
            onKeyDown={(e) => e.key === 'Enter' && addBenefit()}
          />
          <Button onClick={addBenefit} variant="secondary" disabled={!newBenefit.trim()}>
            Add
          </Button>
        </div>
      </div>

      {/* Objections */}
      <div className="space-y-4">
        <div>
          <Label className="text-lg font-semibold">Objections to Address</Label>
          <p className="text-sm text-muted-foreground mt-1">
            What will make people hesitate to buy? Address these in your content before cart opens.
          </p>
        </div>

        {/* Quick add objections */}
        <div className="flex flex-wrap gap-2">
          {COMMON_OBJECTIONS.filter(o => !data.objectionsToAddress.includes(o)).slice(0, 4).map((objection) => (
            <Button
              key={objection}
              variant="outline"
              size="sm"
              onClick={() => addQuickObjection(objection)}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              {objection}
            </Button>
          ))}
        </div>

        {/* Current objections */}
        <div className="flex flex-wrap gap-2">
          {data.objectionsToAddress.map((objection, index) => (
            <Badge key={index} variant="outline" className="gap-1 py-1.5 px-3">
              <ShieldCheck className="h-3 w-3" />
              {objection}
              <button onClick={() => removeObjection(index)} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>

        {/* Add custom */}
        <div className="flex gap-2">
          <Input
            value={newObjection}
            onChange={(e) => setNewObjection(e.target.value)}
            placeholder="Add custom objection..."
            onKeyDown={(e) => e.key === 'Enter' && addObjection()}
          />
          <Button onClick={addObjection} variant="secondary" disabled={!newObjection.trim()}>
            Add
          </Button>
        </div>
      </div>

      {/* Social Proof */}
      <div className="space-y-4">
        <div>
          <Label className="text-lg font-semibold">Social Proof You'll Use</Label>
          <p className="text-sm text-muted-foreground mt-1">
            What proof do you have (or need to collect) that your offer works?
          </p>
        </div>

        <div className="grid gap-3">
          {SOCIAL_PROOF_OPTIONS.map((option) => (
            <div
              key={option.value}
              className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                data.socialProofType?.includes(option.value)
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => toggleSocialProof(option.value)}
            >
              <Checkbox
                checked={data.socialProofType?.includes(option.value)}
                onCheckedChange={() => toggleSocialProof(option.value)}
              />
              <Label className="cursor-pointer">{option.label}</Label>
            </div>
          ))}
        </div>

        {!data.socialProofType?.length && (
          <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md">
            ⚠️ No social proof selected. Consider collecting testimonials before launch - even 1-2 can make a huge difference.
          </p>
        )}
      </div>
    </div>
  );
}