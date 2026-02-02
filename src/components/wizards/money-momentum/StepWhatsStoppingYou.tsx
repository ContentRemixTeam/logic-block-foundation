import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Brain, ArrowRight, Lightbulb, ChevronDown, AlertCircle } from 'lucide-react';
import { MoneyMomentumData } from '@/types/moneyMomentum';

interface StepWhatsStoppingYouProps {
  data: MoneyMomentumData;
  onChange: (updates: Partial<MoneyMomentumData>) => void;
}

const COMMON_BLOCKS = [
  { id: 'pushy', label: "I don't want to be pushy/salesy" },
  { id: 'nobody', label: "Nobody will buy from me" },
  { id: 'not-good', label: "I'm not good enough yet" },
  { id: 'perfect', label: "I need to perfect my offer first" },
  { id: 'desperate', label: "People will think I'm desperate" },
  { id: 'rejection', label: "What if they say no?" },
  { id: 'afford', label: "People can't afford what I'm selling" },
  { id: 'custom', label: "Something else..." },
];

const NEW_THOUGHT_EXAMPLES = [
  "Making offers is serving people who need help",
  "One yes is worth 10 nos",
  "If I don't offer, they can't buy",
  "My offer solves real problems",
  "People want what I'm selling",
];

export function StepWhatsStoppingYou({ data, onChange }: StepWhatsStoppingYouProps) {
  const [showExamples, setShowExamples] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState(
    COMMON_BLOCKS.find(b => data.blockingThought === b.label)?.id || 'custom'
  );
  const [customThought, setCustomThought] = useState(
    COMMON_BLOCKS.some(b => b.label === data.blockingThought) ? '' : data.blockingThought
  );

  const handleBlockSelect = (id: string) => {
    setSelectedBlock(id);
    const block = COMMON_BLOCKS.find(b => b.id === id);
    if (block && id !== 'custom') {
      onChange({ blockingThought: block.label });
    } else if (id === 'custom') {
      onChange({ blockingThought: customThought });
    }
  };

  const handleCustomThoughtChange = (value: string) => {
    setCustomThought(value);
    if (selectedBlock === 'custom') {
      onChange({ blockingThought: value });
    }
  };

  // Check if CTFAR is complete
  const ctfarComplete = data.blockingThought && data.blockingFeeling && 
                        data.blockingAction && data.blockingResult;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Deal with the real block. It's not about strategy.</h2>
        <p className="text-muted-foreground">
          You know what to do. You have the actions. But something stops you from executing.
          Let's figure out what that is.
        </p>
      </div>

      {/* Section 1: Identify the Block */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-lg">What thought is making this feel hard?</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={selectedBlock}
            onValueChange={handleBlockSelect}
            className="space-y-2"
          >
            {COMMON_BLOCKS.map(({ id, label }) => (
              <Label 
                key={id}
                htmlFor={`block-${id}`}
                className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors min-h-[48px] [&:has(:checked)]:border-destructive [&:has(:checked)]:bg-destructive/5"
              >
                <RadioGroupItem value={id} id={`block-${id}`} />
                <span>{label}</span>
              </Label>
            ))}
          </RadioGroup>

          {selectedBlock === 'custom' && (
            <div className="mt-4">
              <Label htmlFor="custom-block" className="block mb-2">
                What's the thought?
              </Label>
              <Textarea
                id="custom-block"
                placeholder="Write the thought that stops you from taking action..."
                value={customThought}
                onChange={(e) => handleCustomThoughtChange(e.target.value)}
                rows={2}
                maxLength={300}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: CTFAR Breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Let's trace what this thought creates</CardTitle>
          </div>
          <CardDescription>
            Thought → Feeling → Action → Result
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
            {/* Feeling */}
            <div>
              <Label htmlFor="blocking-feeling" className="block mb-2">
                <span className="text-destructive font-medium">Feeling:</span>
                <span className="text-sm text-muted-foreground ml-2">What emotion does this thought create?</span>
              </Label>
              <Textarea
                id="blocking-feeling"
                placeholder="Anxious, scared, uncertain, embarrassed..."
                value={data.blockingFeeling}
                onChange={(e) => onChange({ blockingFeeling: e.target.value })}
                rows={1}
                maxLength={200}
              />
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>

            {/* Action */}
            <div>
              <Label htmlFor="blocking-action" className="block mb-2">
                <span className="text-destructive font-medium">Action (or inaction):</span>
                <span className="text-sm text-muted-foreground ml-2">What do you do or NOT do because of this feeling?</span>
              </Label>
              <Textarea
                id="blocking-action"
                placeholder="Don't post about offer, avoid sales calls, stay quiet in DMs..."
                value={data.blockingAction}
                onChange={(e) => onChange({ blockingAction: e.target.value })}
                rows={2}
                maxLength={300}
              />
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>

            {/* Result */}
            <div>
              <Label htmlFor="blocking-result" className="block mb-2">
                <span className="text-destructive font-medium">Result:</span>
                <span className="text-sm text-muted-foreground ml-2">What's the outcome of your action/inaction?</span>
              </Label>
              <Textarea
                id="blocking-result"
                placeholder="No offers made, no sales, proving my thought right..."
                value={data.blockingResult}
                onChange={(e) => onChange({ blockingResult: e.target.value })}
                rows={2}
                maxLength={300}
              />
            </div>
          </div>

          {/* Insight box */}
          {ctfarComplete && (
            <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400">
              <AlertDescription>
                <strong>See the pattern?</strong> Your thought creates the exact result you're afraid of.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Section 3: New Thought */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">What would you need to think to take action instead?</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Collapsible open={showExamples} onOpenChange={setShowExamples}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm text-primary hover:underline">
              <ChevronDown className={`h-4 w-4 transition-transform ${showExamples ? 'rotate-180' : ''}`} />
              Show examples
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <p className="text-sm font-medium mb-2">Examples:</p>
                {NEW_THOUGHT_EXAMPLES.map((example, i) => (
                  <p key={i} className="text-sm text-muted-foreground">• {example}</p>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="space-y-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div>
              <Label htmlFor="new-thought" className="block mb-2">
                <span className="text-primary font-medium">New thought:</span>
                <span className="text-sm text-muted-foreground ml-2">(required)</span>
              </Label>
              <Textarea
                id="new-thought"
                placeholder="Enter the thought that would get you moving..."
                value={data.newThought}
                onChange={(e) => onChange({ newThought: e.target.value })}
                rows={2}
                maxLength={300}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Counter Evidence */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">When HAVE you made offers and it went well?</CardTitle>
          <CardDescription>
            This helps reinforce the new thought with proof.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-3">
              Think of times you:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 mb-4">
              <li>Made an offer and someone said yes</li>
              <li>Posted about your work and got positive responses</li>
              <li>Had past clients thank you</li>
              <li>Sold something successfully</li>
            </ul>
            <Textarea
              id="counter-evidence"
              placeholder="Write your evidence here... (optional but encouraged)"
              value={data.counterEvidence}
              onChange={(e) => onChange({ counterEvidence: e.target.value })}
              rows={4}
              maxLength={500}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
