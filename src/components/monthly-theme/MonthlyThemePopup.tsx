/**
 * Monthly Theme Announcement Popup
 * Shows once per month when a new theme is available
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMonthlyTheme } from '@/hooks/useMonthlyTheme';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Gift, ArrowRight } from 'lucide-react';

export function MonthlyThemePopup() {
  const { data, showPopup, dismissPopup } = useMonthlyTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (showPopup) {
      // Small delay so the app loads first
      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [showPopup]);

  if (!data?.template) return null;

  const handleDismiss = async () => {
    setOpen(false);
    await dismissPopup();
  };

  const handleViewDetails = async () => {
    setOpen(false);
    await dismissPopup();
    navigate('/monthly-theme');
  };

  const theme = data.template;
  const emoji = theme.reward_theme?.preview_emoji || '🎨';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleDismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-3xl">
              {emoji}
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            {theme.announcement_title || `✨ New Theme Available: ${theme.title}`}
          </DialogTitle>
          <DialogDescription className="text-center">
            {theme.announcement_body || theme.description || 'A new theme is ready to unlock this month! Complete a challenge to earn it.'}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/50 p-4 my-2">
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <Gift className="h-4 w-4 text-primary" />
            <span>Unlock by completing a challenge</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Choose your own path — daily debriefs, weekly reviews, or a custom task checklist. Pick what fits your capacity.
          </p>
        </div>

        <div className="flex flex-col gap-2 mt-2">
          <Button onClick={handleViewDetails} className="gap-2">
            <Sparkles className="h-4 w-4" />
            View Details & Start Challenge
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" onClick={handleDismiss} className="text-muted-foreground">
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
