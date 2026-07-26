import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Sparkles, RotateCcw, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

import { useMoneyMovesTracker } from '@/hooks/useMoneyMovesTracker';
import { Diagnostic } from '@/components/money-moves/Diagnostic';
import { MoveCard } from '@/components/money-moves/MoveCard';
import { ActionsChecklist } from '@/components/money-moves/ActionsChecklist';
import { TRACK_LABELS } from '@/constants/moneyMovesConfig';

export default function MoneyMovesSprintPage() {
  const { tracker, isLoading, create, update } = useMoneyMovesTracker();
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  // No tracker yet → hero + diagnostic
  if (!tracker || showDiagnostic) {
    return (
      <Layout>
        <div className="space-y-6 max-w-4xl mx-auto">
          <PageHeader
            title="Money Moves"
            description="Find your next honest money move — whenever you need one."
          />

          {!showDiagnostic ? (
            <Card className="editorial-card p-8 sm:p-12 text-center space-y-6">
              <div className="inline-flex p-4 rounded-full bg-primary/10">
                <DollarSign className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-3">
                <h2 className="font-display text-3xl sm:text-4xl text-foreground">
                  What is the next money move you can actually take this week?
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Eight quick questions. We'll show you where you are in the revenue cycle
                  and give you the lowest honest next step — not the impressive one.
                </p>
              </div>
              <Button size="lg" onClick={() => setShowDiagnostic(true)}>
                <Sparkles className="mr-2 h-4 w-4" />
                Find My Money Move
              </Button>
            </Card>
          ) : (
            <Diagnostic
              onComplete={(answers, result) => {
                create.mutate(
                  { ...result, diagnostic_answers: answers },
                  {
                    onSuccess: () => {
                      toast.success('You picked the move. Now you can focus on the right thing.');
                      setShowDiagnostic(false);
                    },
                    onError: (e) => toast.error((e as Error).message),
                  },
                );
              }}
            />
          )}
        </div>
      </Layout>
    );
  }

  // Tracker exists → dashboard
  return (
    <Layout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PageHeader
            title="Money Moves"
            description={`Track: ${TRACK_LABELS[tracker.track]} · Rung ${tracker.rung}`}
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <RotateCcw className="mr-1.5 h-4 w-4" />
                Retake diagnostic
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Retake the diagnostic?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will replace your current tracker. Action notes and progress will be lost.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => setShowDiagnostic(true)}>
                  Yes, retake
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="space-y-6">
          <MoveCard track={tracker.track} rung={tracker.rung} saleLogged={tracker.sale_logged} />
          <ActionsChecklist />

          <Card className="editorial-card p-6 space-y-3">
            <h3 className="font-display text-xl text-foreground">Log a result</h3>
            <p className="text-sm text-muted-foreground">
              Made a sale, got a yes, booked a call? Log it here.
            </p>
            <textarea
              value={tracker.result_note ?? ''}
              onChange={(e) => update.mutate({ result_note: e.target.value })}
              placeholder="What was the result?"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant={tracker.sale_logged ? 'secondary' : 'default'}
                size="sm"
                onClick={() => {
                  const wasLogged = tracker.sale_logged;
                  update.mutate({ sale_logged: !wasLogged });
                  if (!wasLogged) {
                    toast.success('You made the ask. That matters before the result does.');
                  }
                }}
              >
                {tracker.sale_logged ? 'Sale logged ✓' : 'Mark sale / result logged'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
