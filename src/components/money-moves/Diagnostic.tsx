import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  DIAGNOSTIC_QUESTIONS,
  diagnose,
  type DiagnosticAnswers,
} from '@/lib/moneyMovesDiagnosis';

interface Props {
  onComplete: (answers: DiagnosticAnswers, result: ReturnType<typeof diagnose>) => void;
}

export function Diagnostic({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<DiagnosticAnswers>>({});
  const q = DIAGNOSTIC_QUESTIONS[step];
  const value = answers[q.key];
  const isLast = step === DIAGNOSTIC_QUESTIONS.length - 1;
  const progress = ((step + (value ? 1 : 0)) / DIAGNOSTIC_QUESTIONS.length) * 100;

  const choose = (v: string) => {
    const next = { ...answers, [q.key]: v as never };
    setAnswers(next);
    if (isLast) {
      const full = next as DiagnosticAnswers;
      onComplete(full, diagnose(full));
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Question {step + 1} of {DIAGNOSTIC_QUESTIONS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      <Card className="p-6 sm:p-8">
        <h2 className="font-display text-2xl sm:text-3xl mb-6 text-foreground">
          {q.question}
        </h2>
        <div className="space-y-2">
          {q.options.map(opt => (
            <button
              key={opt.value}
              onClick={() => choose(opt.value)}
              className={`w-full text-left rounded-lg border px-4 py-3 min-h-[48px] transition-colors hover:bg-accent hover:border-primary ${
                value === opt.value ? 'border-primary bg-accent' : 'border-border'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        {value && !isLast && (
          <Button onClick={() => setStep(step + 1)}>
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
