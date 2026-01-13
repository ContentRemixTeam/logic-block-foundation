import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DataRecoveredPopupProps {
  cycleId: string;
  goal: string;
  open: boolean;
  onDismiss: () => void;
}

export function DataRecoveredPopup({ cycleId, goal, open, onDismiss }: DataRecoveredPopupProps) {
  const navigate = useNavigate();

  const handleViewPlan = () => {
    onDismiss();
    navigate(`/cycle-view/${cycleId}`);
  };

  const truncatedGoal = goal.length > 120 ? `${goal.substring(0, 120)}...` : goal;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <DialogTitle className="text-xl flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Great News!
            <Sparkles className="h-5 w-5 text-amber-500" />
          </DialogTitle>
          <DialogDescription className="text-base">
            We found your 90-Day Plan
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm font-medium text-muted-foreground mb-1">Your Goal:</p>
            <p className="text-sm font-semibold text-foreground leading-relaxed">
              "{truncatedGoal}"
            </p>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            Your complete plan with strategy, offers, and schedule is ready to view.
          </p>

          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={handleViewPlan} className="w-full gap-2">
              View My Full Plan
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={onDismiss} className="w-full">
              Stay on Dashboard
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
