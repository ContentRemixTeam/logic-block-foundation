// AI Brainstorm Bot Component for Lead Magnet Ideas
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Loader2, RefreshCw, ArrowRight, Brain } from 'lucide-react';
import { BrainstormIdea } from '@/types/leadMagnet';

interface BrainstormContext {
  idealCustomer: string;
  mainProblem: string;
  paidOffer: string;
}

interface BrainstormBotProps {
  context: BrainstormContext;
  onContextChange: (updates: Partial<BrainstormContext>) => void;
  ideas: BrainstormIdea[];
  onIdeasGenerated: (ideas: BrainstormIdea[]) => void;
  onSelectIdea: (idea: BrainstormIdea) => void;
}

export function BrainstormBot({
  context,
  onContextChange,
  ideas,
  onIdeasGenerated,
  onSelectIdea,
}: BrainstormBotProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!context.idealCustomer.trim() || !context.mainProblem.trim() || !context.paidOffer.trim()) {
      toast.error('Please fill in all fields to generate ideas');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('brainstorm-freebie-ideas', {
        body: {
          idealCustomer: context.idealCustomer,
          mainProblem: context.mainProblem,
          paidOffer: context.paidOffer,
          previousIdeas: ideas.map(i => i.title),
        },
      });

      if (error) throw error;

      if (data?.ideas && Array.isArray(data.ideas)) {
        onIdeasGenerated(data.ideas);
        toast.success('Ideas generated!');
      } else {
        throw new Error('Invalid response from AI');
      }
    } catch (error) {
      console.error('Brainstorm error:', error);
      toast.error('Failed to generate ideas. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate = 
    context.idealCustomer.trim().length > 10 &&
    context.mainProblem.trim().length > 10 &&
    context.paidOffer.trim().length > 5;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Freebie Brainstorm Assistant</CardTitle>
        </div>
        <CardDescription>
          Tell me about your business and I'll generate 5 lead magnet ideas tailored to your audience.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Context Inputs */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ideal-customer">Who is your ideal customer?</Label>
            <Textarea
              id="ideal-customer"
              placeholder="e.g., Busy moms who want to start a side business from home..."
              value={context.idealCustomer}
              onChange={(e) => onContextChange({ idealCustomer: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="main-problem">What main problem do you solve for them?</Label>
            <Textarea
              id="main-problem"
              placeholder="e.g., They don't know where to start and feel overwhelmed by options..."
              value={context.mainProblem}
              onChange={(e) => onContextChange({ mainProblem: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paid-offer">What do you sell? (your paid offer)</Label>
            <Textarea
              id="paid-offer"
              placeholder="e.g., A 6-week coaching program to launch their first online business..."
              value={context.paidOffer}
              onChange={(e) => onContextChange({ paidOffer: e.target.value })}
              rows={2}
            />
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={!canGenerate || isGenerating}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Ideas...
            </>
          ) : ideas.length > 0 ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Generate More Ideas
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate 5 Freebie Ideas
            </>
          )}
        </Button>

        {/* Generated Ideas */}
        {ideas.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Your Ideas
            </h4>
            {ideas.map((idea, index) => (
              <Card key={index} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">💡</span>
                        <span className="font-medium">{idea.title}</span>
                      </div>
                      <div className="text-sm space-y-1">
                        <p>
                          <span className="text-muted-foreground">Format:</span> {idea.format}
                        </p>
                        <p>
                          <span className="text-muted-foreground">Hook:</span> "{idea.hook}"
                        </p>
                        <p className="text-muted-foreground text-xs mt-2">
                          {idea.whyItWorks}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onSelectIdea(idea)}
                      className="shrink-0"
                    >
                      Use This
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
