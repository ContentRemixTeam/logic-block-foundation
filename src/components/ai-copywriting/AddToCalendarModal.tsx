import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon, Loader2, Rocket } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useUserPlatforms } from '@/hooks/useUserPlatforms';
import { useLaunches } from '@/hooks/useLaunches';
import { useAddCopyToCalendar, getSuggestedTitle, mapContentTypeToCalendar } from '@/hooks/useAddCopyToCalendar';
import { ContentType } from '@/types/aiCopywriting';

interface AddToCalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generatedCopy: string;
  contentType: ContentType;
  generationId: string;
  onSuccess?: () => void;
}

export function AddToCalendarModal({
  open,
  onOpenChange,
  generatedCopy,
  contentType,
  generationId,
  onSuccess,
}: AddToCalendarModalProps) {
  const { activePlatforms, getPlatformLabel } = useUserPlatforms();
  const { launches, formatLaunchOption } = useLaunches();
  const addToCalendar = useAddCopyToCalendar();

  // Form state
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('');
  const [creationDate, setCreationDate] = useState<Date | undefined>(undefined);
  const [publishDate, setPublishDate] = useState<Date | undefined>(undefined);
  const [campaignId, setCampaignId] = useState('');

  // Initialize form when modal opens
  useEffect(() => {
    if (open) {
      const suggestedTitle = getSuggestedTitle(contentType);
      const { channel } = mapContentTypeToCalendar(contentType);
      
      setTitle(suggestedTitle);
      setPlatform(channel);
      setCreationDate(undefined);
      setPublishDate(undefined);
      setCampaignId('');
    }
  }, [open, contentType]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    if (!creationDate && !publishDate) return;

    await addToCalendar.mutateAsync({
      generatedCopy,
      contentType,
      generationId,
      title: title.trim(),
      platform,
      creationDate: creationDate ? format(creationDate, 'yyyy-MM-dd') : undefined,
      publishDate: publishDate ? format(publishDate, 'yyyy-MM-dd') : undefined,
      campaignId: campaignId || undefined,
    });

    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add to Editorial Calendar</DialogTitle>
          <DialogDescription>
            Schedule this copy on your content calendar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Content title..."
              maxLength={200}
            />
          </div>

          {/* Platform */}
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {activePlatforms.map((p) => (
                  <SelectItem key={String(p)} value={String(p)}>
                    {getPlatformLabel(String(p))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Creation Date */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary/70" />
                Create Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !creationDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {creationDate ? format(creationDate, 'MMM d') : 'Optional'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={creationDate}
                    onSelect={setCreationDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Publish Date */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent" />
                Publish Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !publishDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {publishDate ? format(publishDate, 'MMM d') : 'Optional'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={publishDate}
                    onSelect={setPublishDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Campaign */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Rocket className="h-3 w-3" />
              Campaign (Optional)
            </Label>
            <Select value={campaignId || 'none'} onValueChange={(v) => setCampaignId(v === 'none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {launches.map((launch) => (
                  <SelectItem key={launch.id} value={launch.id}>
                    {formatLaunchOption(launch)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!title.trim() || (!creationDate && !publishDate) || addToCalendar.isPending}
          >
            {addToCalendar.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              'Add to Calendar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
