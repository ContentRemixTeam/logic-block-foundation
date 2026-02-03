import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useUserPlatforms } from '@/hooks/useUserPlatforms';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface CalendarQuickAddProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CONTENT_TYPES = [
  { value: 'post', label: 'Post' },
  { value: 'reel', label: 'Reel/Short' },
  { value: 'video', label: 'Video' },
  { value: 'blog-post', label: 'Blog Post' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'podcast-episode', label: 'Podcast Episode' },
  { value: 'email-single', label: 'Email' },
  { value: 'carousel', label: 'Carousel' },
  { value: 'live-stream', label: 'Live Stream' },
  { value: 'story', label: 'Story' },
];

export function CalendarQuickAdd({ open, onOpenChange }: CalendarQuickAddProps) {
  const { user } = useAuth();
  const { activePlatforms } = useUserPlatforms();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('');
  const [contentType, setContentType] = useState('');
  const [createDate, setCreateDate] = useState<Date | undefined>();
  const [publishDate, setPublishDate] = useState<Date | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle('');
    setPlatform('');
    setContentType('');
    setCreateDate(undefined);
    setPublishDate(undefined);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!user?.id) {
      toast.error('You must be logged in to add content');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('content_items').insert({
        user_id: user.id,
        title: title.trim(),
        channel: platform || null,
        type: contentType || 'post',
        status: 'idea',
        planned_creation_date: createDate ? format(createDate, 'yyyy-MM-dd') : null,
        planned_publish_date: publishDate ? format(publishDate, 'yyyy-MM-dd') : null,
      });

      if (error) throw error;

      toast.success('Content added! Drag to schedule it.');
      queryClient.invalidateQueries({ queryKey: ['editorial-calendar'] });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to add content:', error);
      toast.error('Failed to add content. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Content</DialogTitle>
          <DialogDescription>
            Create a new content item. Add dates now or drag to schedule later.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Podcast Episode 12, IG Reel about..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Platform */}
          <div className="grid gap-2">
            <Label htmlFor="platform">Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {activePlatforms.map((p) => (
                  <SelectItem key={p.platform} value={p.platform}>
                    {p.platform.charAt(0).toUpperCase() + p.platform.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content Type */}
          <div className="grid gap-2">
            <Label htmlFor="type">Content Type</Label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            {/* Create Date */}
            <div className="grid gap-2">
              <Label>Create Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'justify-start text-left font-normal',
                      !createDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {createDate ? format(createDate, 'MMM d') : 'Optional'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={createDate}
                    onSelect={setCreateDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Publish Date */}
            <div className="grid gap-2">
              <Label>Publish Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'justify-start text-left font-normal',
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
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Content
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
