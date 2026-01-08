import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Info, Loader2, PenLine } from 'lucide-react';

interface GoalRewritePromptProps {
  context: 'daily' | 'weekly';
  currentRewrite: string;
  previousRewrite?: string;
  cycleGoal: string;
  onSave: (text: string) => void;
  saving?: boolean;
}

export function GoalRewritePrompt({
  context,
  currentRewrite,
  previousRewrite,
  cycleGoal,
  onSave,
  saving = false,
}: GoalRewritePromptProps) {
  const [value, setValue] = useState('');
  const [hasEdited, setHasEdited] = useState(false);

  useEffect(() => {
    // Priority: current rewrite > previous rewrite > cycle goal
    if (currentRewrite) {
      setValue(currentRewrite);
    } else if (previousRewrite) {
      setValue(previousRewrite);
    } else {
      setValue(cycleGoal || '');
    }
  }, [currentRewrite, previousRewrite, cycleGoal]);

  const handleChange = (newValue: string) => {
    setValue(newValue);
    setHasEdited(true);
  };

  const handleSave = () => {
    onSave(value);
  };

  const isDaily = context === 'daily';
  const header = isDaily 
    ? "Rewrite your 90-day goal (quickly)" 
    : "Rewrite your 90-day goal for this week";
  const subtext = isDaily
    ? "This takes 10 seconds and keeps your brain pointed at what matters."
    : "You're more likely to follow through when you restate it in your own words.";
  const buttonText = isDaily ? "Save & Plan My Day" : "Save & Plan My Week";

  return (
    <Card className="bg-muted/30 border-muted">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <PenLine className="h-4 w-4 text-primary" />
          {header}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{subtext}</p>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <Textarea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Type your goal in your own words..."
          className="min-h-[60px] resize-none text-sm"
          rows={2}
        />
        
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            <span>Fun fact: studies show writing your goals down increases follow-through.</span>
          </div>
          <Button 
            size="sm" 
            onClick={handleSave} 
            disabled={saving || !value.trim()}
            className="shrink-0"
          >
            {saving ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Saving...
              </>
            ) : (
              buttonText
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
