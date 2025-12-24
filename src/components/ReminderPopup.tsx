import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface ReminderPopupProps {
  reminders: string[];
  onDismiss: () => void;
}

export function ReminderPopup({ reminders, onDismiss }: ReminderPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentReminder, setCurrentReminder] = useState('');

  useEffect(() => {
    if (reminders.length === 0) return;

    // Check if we've shown a reminder in this session
    const lastShown = sessionStorage.getItem('lastReminderShown');
    if (lastShown) return;

    // Get the last index used and rotate
    const lastIndex = parseInt(localStorage.getItem('reminderIndex') || '0', 10);
    const nextIndex = (lastIndex + 1) % reminders.length;
    
    setCurrentReminder(reminders[nextIndex]);
    localStorage.setItem('reminderIndex', nextIndex.toString());
    sessionStorage.setItem('lastReminderShown', 'true');
    
    // Small delay before showing for better UX
    const timer = setTimeout(() => setIsOpen(true), 500);
    return () => clearTimeout(timer);
  }, [reminders]);

  const handleDismiss = () => {
    setIsOpen(false);
    onDismiss();
  };

  if (!currentReminder) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Keep in Mind
          </DialogTitle>
        </DialogHeader>
        <div className="py-6">
          <p className="text-lg font-medium leading-relaxed">{currentReminder}</p>
        </div>
        <Button onClick={handleDismiss} className="w-full">
          Got it!
        </Button>
      </DialogContent>
    </Dialog>
  );
}
