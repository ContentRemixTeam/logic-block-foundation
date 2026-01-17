import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Star, Search } from 'lucide-react';
import type { GoogleCalendar } from '@/hooks/useGoogleCalendar';

interface SelectedCalendar {
  id: string;
  name: string;
  isEnabled: boolean;
  color?: string;
}

interface CalendarSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendars: GoogleCalendar[];
  onSelect: (calendars: SelectedCalendar[]) => void;
  initialSelected?: SelectedCalendar[];
}

const CALENDAR_COLORS = [
  '#4285f4', // Blue
  '#ea4335', // Red
  '#34a853', // Green
  '#fbbc04', // Yellow
  '#9c27b0', // Purple
  '#00acc1', // Cyan
  '#ff7043', // Orange
  '#8e24aa', // Deep Purple
];

export function CalendarSelectionModal({
  open,
  onOpenChange,
  calendars,
  onSelect,
  initialSelected = [],
}: CalendarSelectionModalProps) {
  const [selectedCalendars, setSelectedCalendars] = useState<Map<string, SelectedCalendar>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize selections from initialSelected or pre-select primary
  useEffect(() => {
    if (open && calendars.length > 0) {
      const newSelected = new Map<string, SelectedCalendar>();
      
      if (initialSelected.length > 0) {
        // Use existing selections
        initialSelected.forEach(cal => {
          newSelected.set(cal.id, cal);
        });
      } else {
        // Pre-select primary calendar
        const primary = calendars.find(c => c.primary);
        if (primary) {
          newSelected.set(primary.id, {
            id: primary.id,
            name: primary.summary,
            isEnabled: true,
            color: CALENDAR_COLORS[0],
          });
        }
      }
      
      setSelectedCalendars(newSelected);
    }
  }, [open, calendars, initialSelected]);

  // Filter calendars by search
  const filteredCalendars = useMemo(() => {
    if (!searchQuery.trim()) return calendars;
    return calendars.filter(cal =>
      cal.summary.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [calendars, searchQuery]);

  const toggleCalendar = (calendar: GoogleCalendar) => {
    setSelectedCalendars(prev => {
      const newMap = new Map(prev);
      if (newMap.has(calendar.id)) {
        newMap.delete(calendar.id);
      } else {
        // Assign a color based on position
        const colorIndex = newMap.size % CALENDAR_COLORS.length;
        newMap.set(calendar.id, {
          id: calendar.id,
          name: calendar.summary,
          isEnabled: true,
          color: CALENDAR_COLORS[colorIndex],
        });
      }
      return newMap;
    });
  };

  const handleSave = () => {
    const selected = Array.from(selectedCalendars.values());
    if (selected.length > 0) {
      onSelect(selected);
    }
  };

  const selectedCount = selectedCalendars.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Select Calendars to Sync
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            You can select multiple calendars. Events from all selected calendars will appear on your timeline.
          </p>
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
            <div className="space-y-2 py-2">
              {filteredCalendars.map((calendar) => {
                const isSelected = selectedCalendars.has(calendar.id);
                const selectedCal = selectedCalendars.get(calendar.id);
                
                return (
                  <div
                    key={calendar.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => toggleCalendar(calendar)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleCalendar(calendar)}
                      id={calendar.id}
                    />
                    {/* Color indicator */}
                    {isSelected && selectedCal?.color && (
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: selectedCal.color }}
                      />
                    )}
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
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <div className="flex-1 text-sm text-muted-foreground">
            {selectedCount} calendar{selectedCount !== 1 ? 's' : ''} selected
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={selectedCount === 0}>
            Save Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Re-export for backward compatibility with single selection usage
export function CalendarSelectionModalSingle({
  open,
  onOpenChange,
  calendars,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendars: GoogleCalendar[];
  onSelect: (calendarId: string, calendarName: string) => void;
}) {
  const handleSelect = (selected: SelectedCalendar[]) => {
    if (selected.length > 0) {
      onSelect(selected[0].id, selected[0].name);
    }
  };

  return (
    <CalendarSelectionModal
      open={open}
      onOpenChange={onOpenChange}
      calendars={calendars}
      onSelect={handleSelect}
    />
  );
}