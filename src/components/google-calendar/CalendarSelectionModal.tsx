import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Star, Search } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');

  // Filter calendars by search
  const filteredCalendars = useMemo(() => {
    if (!searchQuery.trim()) return calendars;
    return calendars.filter(cal =>
      cal.summary.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [calendars, searchQuery]);

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
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Select Calendar to Sync
          </DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        {calendars.length > 5 && (
          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search calendars..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {/* Scrollable Calendar List */}
        <ScrollArea className="flex-1 min-h-0 max-h-[50vh] pr-3">
          {calendars.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No calendars found. Please check your Google account permissions.
            </p>
          ) : filteredCalendars.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No calendars found matching "{searchQuery}"
            </p>
          ) : (
            <RadioGroup value={selectedId} onValueChange={setSelectedId}>
              <div className="space-y-2 py-2">
                {filteredCalendars.map((calendar) => (
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
                      className="flex-1 cursor-pointer flex items-center gap-2 min-w-0"
                    >
                      <span className="truncate">{calendar.summary}</span>
                      {calendar.primary && (
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500 flex-shrink-0" />
                      )}
                    </Label>
                    <span className="text-xs text-muted-foreground capitalize flex-shrink-0">
                      {calendar.accessRole}
                    </span>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
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
