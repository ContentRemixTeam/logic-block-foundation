// Step 1: Brainstorm & Select Your Freebie Idea
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { LeadMagnetWizardData } from '@/types/leadMagnet';
import { BrainstormBot } from '../BrainstormBot';
import { Lightbulb, Sparkles } from 'lucide-react';

interface StepIdeaBrainstormProps {
  data: LeadMagnetWizardData;
  onChange: (updates: Partial<LeadMagnetWizardData>) => void;
}

export function StepIdeaBrainstorm({ data, onChange }: StepIdeaBrainstormProps) {
  const handleHasIdeaChange = (checked: boolean) => {
    onChange({ hasIdea: checked });
  };

  const handleSelectIdea = (idea: { title: string; format: string; hook: string; whyItWorks: string }) => {
    onChange({
      hasIdea: true,
      name: idea.title,
      description: idea.hook,
    });
  };

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
                Your freebie should give a quick win that leads naturally to your paid offer. 
                The best lead magnets solve a specific, urgent problem your ideal customer faces.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Toggle: Do you have an idea? */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Do you already have a freebie idea?</CardTitle>
          <CardDescription>
            If you're not sure what to create, our AI brainstorm assistant can help generate ideas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch
              id="has-idea"
              checked={data.hasIdea}
              onCheckedChange={handleHasIdeaChange}
            />
            <Label htmlFor="has-idea" className="font-normal">
              {data.hasIdea ? 'Yes, I know what I want to create' : 'No, help me brainstorm'}
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* If has idea: show form fields */}
      {data.hasIdea ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Your Lead Magnet Idea</CardTitle>
            </div>
            <CardDescription>
              Tell us about the freebie you want to create.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Freebie Name / Title</Label>
              <Input
                id="name"
                placeholder="e.g., The 5-Day Content Clarity Challenge"
                value={data.name}
                onChange={(e) => onChange({ name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Brief Description</Label>
              <Textarea
                id="description"
                placeholder="What will people get from this freebie? What problem does it solve?"
                value={data.description}
                onChange={(e) => onChange({ description: e.target.value })}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This will help us generate tasks and copy suggestions later.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* If no idea: show brainstorm bot */
        <BrainstormBot
          context={data.brainstormContext}
          onContextChange={(updates) => onChange({ 
            brainstormContext: { ...data.brainstormContext, ...updates } 
          })}
          ideas={data.generatedIdeas}
          onIdeasGenerated={(ideas) => onChange({ generatedIdeas: ideas })}
          onSelectIdea={handleSelectIdea}
        />
      )}
    </div>
  );
}
