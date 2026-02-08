import { LearningInsights } from '@/types/learningInsights';
import { Lightbulb } from 'lucide-react';

interface LearningNoticeProps {
  insights: LearningInsights;
}

export function LearningNotice({ insights }: LearningNoticeProps) {
  if (!insights.hasEnoughData || insights.keyAdjustments.length === 0) {
    return null;
  }
  
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
      <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-primary">Based on your feedback, I'll adjust for:</p>
        <ul className="text-xs text-muted-foreground space-y-0.5">
          {insights.keyAdjustments.slice(0, 3).map((adjustment, i) => (
            <li key={i}>• {adjustment}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
