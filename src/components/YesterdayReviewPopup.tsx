import { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, X, Sparkles } from 'lucide-react';

interface YesterdayReviewPopupProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

export function YesterdayReviewPopup({ open, onClose, userId }: YesterdayReviewPopupProps) {
  const [saving, setSaving] = useState(false);
  const [whatWorked, setWhatWorked] = useState('');
  const [whatDidnt, setWhatDidnt] = useState('');
  const [wins, setWins] = useState('');

  const yesterday = subDays(new Date(), 1);

  const saveReview = async () => {
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-daily-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          date: format(yesterday, 'yyyy-MM-dd'),
          what_worked: whatWorked,
          what_didnt: whatDidnt,
          wins,
        }),
      });

      const data = await res.json();

      if (data.error) {
        toast.error('Failed to save review');
        return;
      }

      toast.success('Yesterday\'s review saved!');
      onClose();
    } catch (error) {
      console.error('Error saving review:', error);
      toast.error('Failed to save review');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Review Yesterday
          </DialogTitle>
          <DialogDescription>
            Take a quick moment to reflect on {format(yesterday, 'EEEE, MMMM d')} before starting today.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* What did you accomplish? */}
          <div className="space-y-2">
            <Label htmlFor="popup-wins" className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              What did you accomplish?
            </Label>
            <Textarea
              id="popup-wins"
              placeholder="List your wins and accomplishments..."
              value={wins}
              onChange={(e) => setWins(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* What went well? */}
          <div className="space-y-2">
            <Label htmlFor="popup-whatWorked" className="text-sm font-medium">
              What went well?
            </Label>
            <Textarea
              id="popup-whatWorked"
              placeholder="What worked well yesterday?"
              value={whatWorked}
              onChange={(e) => setWhatWorked(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* What could have been better? */}
          <div className="space-y-2">
            <Label htmlFor="popup-whatDidnt" className="text-sm font-medium">
              What could have been better?
            </Label>
            <Textarea
              id="popup-whatDidnt"
              placeholder="What would you do differently?"
              value={whatDidnt}
              onChange={(e) => setWhatDidnt(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="ghost" onClick={handleSkip}>
            Skip for now
          </Button>
          <Button onClick={saveReview} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Save Review
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
