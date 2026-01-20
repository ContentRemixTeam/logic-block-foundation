import { useState, useCallback, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { OfficeHoursDayRow } from './OfficeHoursDayRow';
import { useOfficeHours, OfficeHoursBlock } from '@/hooks/useOfficeHours';

const DAYS = [
  { dayOfWeek: 1, name: 'Monday' },
  { dayOfWeek: 2, name: 'Tuesday' },
  { dayOfWeek: 3, name: 'Wednesday' },
  { dayOfWeek: 4, name: 'Thursday' },
  { dayOfWeek: 5, name: 'Friday' },
  { dayOfWeek: 6, name: 'Saturday' },
  { dayOfWeek: 0, name: 'Sunday' },
];

interface EditableBlock {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface OfficeHoursEditorProps {
  onSave?: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
}

export function OfficeHoursEditor({ onSave, onCancel, showCancel = true }: OfficeHoursEditorProps) {
  const { officeHours, isLoading, saveBlocks, isSaving } = useOfficeHours();
  const [blocks, setBlocks] = useState<EditableBlock[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize blocks from saved data
  useEffect(() => {
    if (!isLoading && officeHours) {
      setBlocks(
        officeHours.map((block) => ({
          id: block.id,
          day_of_week: block.day_of_week,
          start_time: block.start_time,
          end_time: block.end_time,
        }))
      );
    }
  }, [officeHours, isLoading]);

  const generateId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const handleAddBlock = useCallback((dayOfWeek: number) => {
    setBlocks((prev) => [
      ...prev,
      {
        id: generateId(),
        day_of_week: dayOfWeek,
        start_time: '09:00',
        end_time: '17:00',
      },
    ]);
    setHasChanges(true);
  }, []);

  const handleUpdateBlock = useCallback((id: string, field: 'start_time' | 'end_time', value: string) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === id ? { ...block, [field]: value } : block
      )
    );
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[id];
      return newErrors;
    });
    setHasChanges(true);
  }, []);

  const handleRemoveBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((block) => block.id !== id));
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[id];
      return newErrors;
    });
    setHasChanges(true);
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    blocks.forEach((block) => {
      // Validate start < end
      if (block.start_time >= block.end_time) {
        newErrors[block.id] = 'End time must be after start time';
      }
      
      // Check for overlaps within same day
      const sameDayBlocks = blocks.filter(
        (b) => b.day_of_week === block.day_of_week && b.id !== block.id
      );
      
      sameDayBlocks.forEach((other) => {
        const thisStart = block.start_time;
        const thisEnd = block.end_time;
        const otherStart = other.start_time;
        const otherEnd = other.end_time;
        
        // Check for overlap
        if (
          (thisStart >= otherStart && thisStart < otherEnd) ||
          (thisEnd > otherStart && thisEnd <= otherEnd) ||
          (thisStart <= otherStart && thisEnd >= otherEnd)
        ) {
          newErrors[block.id] = 'Time blocks overlap';
        }
      });
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
    
    await saveBlocks(
      blocks.map((block) => ({
        day_of_week: block.day_of_week,
        start_time: block.start_time,
        end_time: block.end_time,
        timezone,
        is_active: true,
      }))
    );
    
    setHasChanges(false);
    onSave?.();
  };

  const getBlocksForDay = (dayOfWeek: number) => {
    return blocks.filter((block) => block.day_of_week === dayOfWeek);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          ⏰ Office Hours
        </CardTitle>
        <CardDescription>
          Set your working hours for each day. Tasks will be highlighted when scheduled during these times.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-0">
        {DAYS.map(({ dayOfWeek, name }) => (
          <OfficeHoursDayRow
            key={dayOfWeek}
            dayOfWeek={dayOfWeek}
            dayName={name}
            blocks={getBlocksForDay(dayOfWeek)}
            onAddBlock={handleAddBlock}
            onUpdateBlock={handleUpdateBlock}
            onRemoveBlock={handleRemoveBlock}
            errors={errors}
          />
        ))}
        
        {Object.keys(errors).length > 0 && (
          <div className="text-sm text-destructive pt-3">
            Please fix the errors above before saving.
          </div>
        )}
        
        <div className="flex gap-2 pt-4">
          {showCancel && onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Office Hours
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
