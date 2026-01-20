import { useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { CheckinType } from '@/types/course';
import { CHECKIN_TYPE_LABELS, BLOCKER_OPTIONS } from '@/types/course';
import { useCheckinMutations } from '@/hooks/useCourses';

interface CheckinFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  defaultType?: CheckinType;
}

export function CheckinFormModal({ 
  open, 
  onOpenChange, 
  courseId,
  defaultType = 'weekly',
}: CheckinFormModalProps) {
  const { createCheckin } = useCheckinMutations();

  const [checkinType, setCheckinType] = useState<CheckinType>(defaultType);
  const [onTrack, setOnTrack] = useState<boolean | null>(null);
  const [notes, setNotes] = useState('');
  const [blocker, setBlocker] = useState('');

  const handleSubmit = async () => {
    await createCheckin.mutateAsync({
      courseId,
      checkin_type: checkinType,
      on_track: onTrack,
      notes: notes || undefined,
      blocker: onTrack === false ? blocker : undefined,
    });
    onOpenChange(false);
    // Reset form
    setOnTrack(null);
    setNotes('');
    setBlocker('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Check-in</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Check-in Type</Label>
            <Select
              value={checkinType}
              onValueChange={(v) => setCheckinType(v as CheckinType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CHECKIN_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Are you on track?</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className={cn(
                  'flex-1',
                  onTrack === true && 'bg-green-500/10 border-green-500 text-green-600'
                )}
                onClick={() => setOnTrack(true)}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Yes
              </Button>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  'flex-1',
                  onTrack === null && 'bg-yellow-500/10 border-yellow-500 text-yellow-600'
                )}
                onClick={() => setOnTrack(null)}
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                Partially
              </Button>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  'flex-1',
                  onTrack === false && 'bg-red-500/10 border-red-500 text-red-600'
                )}
                onClick={() => setOnTrack(false)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Not yet
              </Button>
            </div>
          </div>

          {onTrack === false && (
            <div className="space-y-2">
              <Label>What's blocking you?</Label>
              <Select value={blocker} onValueChange={setBlocker}>
                <SelectTrigger>
                  <SelectValue placeholder="Select blocker" />
                </SelectTrigger>
                <SelectContent>
                  {BLOCKER_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="What happened? What did you learn?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createCheckin.isPending}>
            {createCheckin.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Check-in'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
