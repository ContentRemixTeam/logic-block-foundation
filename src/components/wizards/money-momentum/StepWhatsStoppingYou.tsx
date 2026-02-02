import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Brain, ArrowRight, Lightbulb } from 'lucide-react';
import { MoneyMomentumData } from '@/types/moneyMomentum';

interface StepWhatsStoppingYouProps {
  data: MoneyMomentumData;
  onChange: (updates: Partial<MoneyMomentumData>) => void;
}

export function StepWhatsStoppingYou({ data, onChange }: StepWhatsStoppingYouProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">What's stopping you?</h2>
        <p className="text-muted-foreground">
          Let's address the mental blocks that might get in your way during this sprint.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">The Thought Model (CTFAR)</CardTitle>
          </div>
          <CardDescription>
            Our thoughts create our feelings, which drive our actions, which produce our results.
            Let's examine what might be blocking you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Pattern */}
          <div className="space-y-4">
            <h3 className="font-medium text-muted-foreground uppercase text-sm tracking-wide">
              Current Pattern
            </h3>
            
            <div className="space-y-4 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
              <div>
                <Label htmlFor="blocking-thought" className="block mb-2">
                  <span className="text-destructive font-medium">T</span>hought - What's the thought stopping you from going all in?
                </Label>
                <Textarea
                  id="blocking-thought"
                  placeholder="e.g., 'I don't want to be salesy', 'No one will buy', 'It's not the right time'"
                  value={data.blockingThought}
                  onChange={(e) => onChange({ blockingThought: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-center">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>

              <div>
                <Label htmlFor="blocking-feeling" className="block mb-2">
                  <span className="text-destructive font-medium">F</span>eeling - When you think that thought, how do you feel?
                </Label>
                <Textarea
                  id="blocking-feeling"
                  placeholder="e.g., 'Anxious', 'Embarrassed', 'Doubtful', 'Overwhelmed'"
                  value={data.blockingFeeling}
                  onChange={(e) => onChange({ blockingFeeling: e.target.value })}
                  rows={1}
                />
              </div>

              <div className="flex items-center justify-center">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>

              <div>
                <Label htmlFor="blocking-action" className="block mb-2">
                  <span className="text-destructive font-medium">A</span>ction - What do you do (or not do) when you feel that way?
                </Label>
                <Textarea
                  id="blocking-action"
                  placeholder="e.g., 'I procrastinate', 'I water down my message', 'I don't make the offer'"
                  value={data.blockingAction}
                  onChange={(e) => onChange({ blockingAction: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-center">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>

              <div>
                <Label htmlFor="blocking-result" className="block mb-2">
                  <span className="text-destructive font-medium">R</span>esult - What's the result of those actions?
                </Label>
                <Textarea
                  id="blocking-result"
                  placeholder="e.g., 'I don't make sales', 'I stay stuck at the same revenue'"
                  value={data.blockingResult}
                  onChange={(e) => onChange({ blockingResult: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* New Pattern */}
          <div className="space-y-4">
            <h3 className="font-medium text-muted-foreground uppercase text-sm tracking-wide flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              New Pattern
            </h3>
            
            <div className="space-y-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div>
                <Label htmlFor="new-thought" className="block mb-2">
                  <span className="text-primary font-medium">New Thought</span> - What thought would help you take action?
                </Label>
                <Textarea
                  id="new-thought"
                  placeholder="e.g., 'Making offers is serving people', 'I help people when I sell', 'My offer genuinely helps people'"
                  value={data.newThought}
                  onChange={(e) => onChange({ newThought: e.target.value })}
                  rows={2}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This should be something you can genuinely believe, even if it's a stretch.
                </p>
              </div>

              <div>
                <Label htmlFor="counter-evidence" className="block mb-2">
                  <span className="text-primary font-medium">Evidence</span> - What evidence do you have that this new thought is true?
                </Label>
                <Textarea
                  id="counter-evidence"
                  placeholder="e.g., 'Past clients thanked me', 'My product has helped X people', 'I got results myself'"
                  value={data.counterEvidence}
                  onChange={(e) => onChange({ counterEvidence: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        This step is optional but can be powerful. You can always come back to it.
      </p>
    </div>
  );
}
