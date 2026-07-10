import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTodayBattery, BATTERY_LEVELS, type BatteryLevel } from '@/hooks/useBatteryCheckin';
import { useBatteryPromptEnabled } from '@/hooks/useBatteryPromptEnabled';
import { cn } from '@/lib/utils';

const dismissKey = (date: string) => `battery_prompt_dismissed_${date}`;

interface Props {
  /** If true, always show (from tapping the chip). If false, only show if user hasn't checked in AND hasn't skipped today. */
  force?: boolean;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}

/**
 * Auto-shows once per day on Dashboard / DailyPlan mount when the user hasn't
 * checked in or skipped. Can also be opened imperatively via the header chip.
 */
export function BatteryCheckinPrompt({ force, open: controlledOpen, onOpenChange }: Props) {
  const { hasChecked, setLevel, date, level } = useTodayBattery();
  const { enabled: promptEnabled } = useBatteryPromptEnabled();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (force) return; // controlled
    if (!promptEnabled) return; // user disabled the auto-prompt
    if (hasChecked) return;
    if (typeof window === 'undefined') return;
    const dismissed = window.localStorage.getItem(dismissKey(date));
    if (dismissed === '1') return;
    // Small delay so it doesn't slam in with the page render
    const t = window.setTimeout(() => setOpen(true), 800);
    return () => window.clearTimeout(t);
  }, [hasChecked, date, force, promptEnabled]);

  // If the user turns the setting off while the auto-prompt is showing, close it.
  useEffect(() => {
    if (!force && !promptEnabled && open) setOpen(false);
  }, [promptEnabled, force, open]);



  const isOpen = controlledOpen ?? open;
  const setIsOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v);
    else setOpen(v);
  };

  const handlePick = async (lvl: BatteryLevel) => {
    await setLevel(lvl);
    try { window.localStorage.removeItem(dismissKey(date)); } catch { /* noop */ }
    setIsOpen(false);
  };

  const handleSkip = () => {
    try { window.localStorage.setItem(dismissKey(date), '1'); } catch { /* noop */ }
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">How's your battery today?</DialogTitle>
          <DialogDescription>
            This helps your planner match your energy. Totally optional, changeable any time.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 pt-2">
          {BATTERY_LEVELS.map((b) => {
            const active = level === b.level;
            return (
              <button
                key={b.level}
                type="button"
                onClick={() => handlePick(b.level)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl border-2 p-4 text-center transition-colors',
                  'hover:border-primary/60 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/40',
                  active ? 'border-primary bg-primary/10' : 'border-border',
                )}
              >
                <span className="text-3xl" aria-hidden>{b.emoji}</span>
                <span className="text-sm font-medium">{b.label}</span>
                <span className="text-xs text-muted-foreground">{b.blurb}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            Skip for now
          </Button>
          <p className="text-xs text-muted-foreground text-right">
            No wrong answer. Rest counts.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
