import { BrandWizardData } from '@/types/aiCopywriting';
import { CheckCircle2, Sparkles } from 'lucide-react';

interface StepCompleteProps {
  data: BrandWizardData;
}

export function StepComplete({ data }: StepCompleteProps) {
  return (
    <div className="text-center space-y-6 py-8">
      <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
        <CheckCircle2 className="h-8 w-8 text-green-500" />
      </div>
      
      <div>
        <h2 className="text-2xl font-bold mb-2">Your AI Copywriter is Ready!</h2>
        <p className="text-muted-foreground">
          You're all set to start generating elite copy
        </p>
      </div>

      <div className="space-y-2 text-left max-w-sm mx-auto">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>Voice profile created</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>{data.products.length} products added</span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>Ready to generate elite copy</span>
        </div>
      </div>
    </div>
  );
}
