import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Calendar, Star } from 'lucide-react';
import type { GoogleCalendar } from '@/hooks/useGoogleCalendar';

interface CalendarSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendars: GoogleCalendar[];
  onSelect: (calendarId: string, calendarName: string) => void;
}

export function CalendarSelectionModal({
  open,
  onOpenChange,
  calendars,
  onSelect,
}: CalendarSelectionModalProps) {
  const [selectedId, setSelectedId] = useState<string>('');

  const handleSave = () => {
    const selected = calendars.find(c => c.id === selectedId);
    if (selected) {
      onSelect(selected.id, selected.summary);
    }
  };

  // Pre-select primary calendar if none selected
  if (!selectedId && calendars.length > 0) {
    const primary = calendars.find(c => c.primary);
    if (primary) {
      setSelectedId(primary.id);
    } else {
      setSelectedId(calendars[0].id);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Select Calendar to Sync
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {calendars.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No calendars found. Please check your Google account permissions.
            </p>
          ) : (
            <RadioGroup value={selectedId} onValueChange={setSelectedId}>
              <div className="space-y-3">
                {calendars.map((calendar) => (
                  <div
                    key={calendar.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedId === calendar.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedId(calendar.id)}
                  >
                    <RadioGroupItem value={calendar.id} id={calendar.id} />
                    <Label
                      htmlFor={calendar.id}
                      className="flex-1 cursor-pointer flex items-center gap-2"
                    >
                      <span>{calendar.summary}</span>
                      {calendar.primary && (
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                      )}
                    </Label>
                    <span className="text-xs text-muted-foreground capitalize">
                      {calendar.accessRole}
                    </span>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!selectedId}>
            Save Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
