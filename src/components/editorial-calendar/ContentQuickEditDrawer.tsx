import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarItem, PLATFORM_LABELS, SCHEDULE_COLORS } from '@/lib/calendarConstants';
import { useIsMobile } from '@/hooks/use-mobile';
import { CalendarIcon, ExternalLink, Loader2, Trash2, Image, FileText, X, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useLaunches } from '@/hooks/useLaunches';
import { supabase } from '@/integrations/supabase/client';

interface ContentQuickEditDrawerProps {
  item: CalendarItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: { creationDate: string | null; publishDate: string | null }) => Promise<boolean | void>;
  onDelete?: (item: CalendarItem) => Promise<void>;
  isSaving?: boolean;
  isDeleting?: boolean;
}

export function ContentQuickEditDrawer({
  item,
  open,
  onOpenChange,
  onSave,
  onDelete,
  isSaving = false,
  isDeleting = false,
}: ContentQuickEditDrawerProps) {
  const isMobile = useIsMobile();
  const [creationDate, setCreationDate] = useState<Date | undefined>(undefined);
  const [publishDate, setPublishDate] = useState<Date | undefined>(undefined);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copyText, setCopyText] = useState('');
  const [graphicsUrls, setGraphicsUrls] = useState<string[]>([]);
  const [newGraphicUrl, setNewGraphicUrl] = useState('');
  
  const { launches, formatLaunchOption } = useLaunches();

  // Sync state when item changes
  useEffect(() => {
    if (item) {
      setCreationDate(item.creationDate ? new Date(item.creationDate) : undefined);
      setPublishDate(item.publishDate ? new Date(item.publishDate) : undefined);
      
      // Fetch current launch_id if content_item
      if (item.source === 'content_item' && item.sourceId) {
        supabase
          .from('content_items')
          .select('launch_id, body, graphics_urls')
          .eq('id', item.sourceId)
          .single()
          .then(({ data }) => {
            setSelectedCampaign(data?.launch_id || null);
            setCopyText(data?.body || '');
            setGraphicsUrls((data?.graphics_urls as string[]) || []);
          });
      } else {
        setSelectedCampaign(null);
        setCopyText('');
        setGraphicsUrls([]);
      }
    }
  }, [item]);

  const handleAddGraphicUrl = () => {
    if (newGraphicUrl.trim() && !graphicsUrls.includes(newGraphicUrl.trim())) {
      setGraphicsUrls([...graphicsUrls, newGraphicUrl.trim()]);
      setNewGraphicUrl('');
    }
  };

  const handleRemoveGraphic = (url: string) => {
    setGraphicsUrls(graphicsUrls.filter(u => u !== url));
  };

  const handleSave = async () => {
    // Update campaign if content_item
    if (item?.source === 'content_item' && item.sourceId) {
      await supabase
        .from('content_items')
        .update({ 
          launch_id: selectedCampaign,
          body: copyText || null,
          graphics_urls: graphicsUrls.length > 0 ? graphicsUrls : null,
        })
        .eq('id', item.sourceId);
    }
    
    await onSave({
      creationDate: creationDate ? format(creationDate, 'yyyy-MM-dd') : null,
      publishDate: publishDate ? format(publishDate, 'yyyy-MM-dd') : null,
    });
  };

  const content = item && (
    <div className="space-y-6 py-4">
      {/* Title (read-only for now) */}
      <div className="space-y-2">
        <Label>Title</Label>
        <div className="flex items-center gap-2">
          <Input value={item.title} readOnly className="bg-muted" />
          {item.source === 'content_item' && (
            <Button variant="outline" size="icon" asChild>
              <Link to="/content-vault" title="Open in Content Vault">
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Platform/Channel */}
      {item.channel && (
        <div className="space-y-2">
          <Label>Platform</Label>
          <Input value={PLATFORM_LABELS[item.channel.toLowerCase()] || item.channel} readOnly className="bg-muted" />
        </div>
      )}

      {/* Campaign/Launch - only for content_items */}
      {item.source === 'content_item' && (
        <div className="space-y-2">
          <Label>Campaign</Label>
          <Select
            value={selectedCampaign || 'none'}
            onValueChange={(value) => setSelectedCampaign(value === 'none' ? null : value)}
            disabled={isSaving}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select campaign..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Campaign</SelectItem>
              {launches.map((launch) => (
                <SelectItem key={launch.id} value={launch.id}>
                  {formatLaunchOption(launch)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Creation Date */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", SCHEDULE_COLORS.create.dot)} />
          Creation Date
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !creationDate && "text-muted-foreground"
              )}
              disabled={isSaving}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {creationDate ? format(creationDate, 'PPP') : 'Pick a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={creationDate}
              onSelect={setCreationDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {creationDate && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => setCreationDate(undefined)}
            disabled={isSaving}
          >
            Clear creation date
          </Button>
        )}
      </div>

      {/* Publish Date */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", SCHEDULE_COLORS.publish.dot)} />
          Publish Date
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !publishDate && "text-muted-foreground"
              )}
              disabled={isSaving}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {publishDate ? format(publishDate, 'PPP') : 'Pick a date'}
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
        {publishDate && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => setPublishDate(undefined)}
            disabled={isSaving}
          >
            Clear publish date
          </Button>
        )}
      </div>

      {/* Source info */}
      {/* Graphics/Images Section - only for content_items */}
      {item.source === 'content_item' && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Graphics
          </Label>
          
          {/* Display existing graphics */}
          {graphicsUrls.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {graphicsUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img 
                    src={url} 
                    alt={`Graphic ${index + 1}`}
                    className="w-full h-20 object-cover rounded-md border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23f0f0f0" width="100%" height="100%"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="12">Image</text></svg>';
                    }}
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveGraphic(url)}
                    disabled={isSaving}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          {/* Add new graphic URL */}
          <div className="flex gap-2">
            <Input
              placeholder="Paste image URL..."
              value={newGraphicUrl}
              onChange={(e) => setNewGraphicUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddGraphicUrl()}
              disabled={isSaving}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleAddGraphicUrl}
              disabled={isSaving || !newGraphicUrl.trim()}
            >
              <Upload className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Add image URLs for your content graphics
          </p>
        </div>
      )}

      {/* Copy/Body Text Section - only for content_items */}
      {item.source === 'content_item' && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Copy / Caption
          </Label>
          <Textarea
            placeholder="Enter your content copy, caption, or notes..."
            value={copyText}
            onChange={(e) => setCopyText(e.target.value)}
            rows={4}
            className="resize-none"
            disabled={isSaving}
          />
        </div>
      )}

      {/* Source info */}
      <div className="text-xs text-muted-foreground border-t pt-4">
        Source: {item.source === 'content_item' ? 'Content Vault' : item.source === 'content_plan_item' ? 'Content Plan' : 'Task'}
      </div>

      {/* Delete Button */}
      {onDelete && (
        <div className="pt-2">
          <Button 
            variant="ghost" 
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isSaving || isDeleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Content
          </Button>
        </div>
      )}
    </div>
  );

  const footer = (
    <div className="flex gap-2">
      <Button 
        variant="outline" 
        onClick={() => onOpenChange(false)} 
        className="flex-1"
        disabled={isSaving || isDeleting}
      >
        Cancel
      </Button>
      <Button 
        onClick={handleSave} 
        className="flex-1"
        disabled={isSaving || isDeleting}
      >
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Changes'
        )}
      </Button>
    </div>
  );

  const deleteConfirmDialog = (
    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this content?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete "{item?.title}". This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            className="bg-destructive hover:bg-destructive/90"
            disabled={isDeleting}
            onClick={async () => {
              if (item && onDelete) {
                await onDelete(item);
                setShowDeleteConfirm(false);
                onOpenChange(false);
              }
            }}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // Use Drawer on mobile, Sheet on desktop
  if (isMobile) {
    return (
      <>
        {deleteConfirmDialog}
        <Drawer open={open} onOpenChange={isSaving || isDeleting ? undefined : onOpenChange}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Edit Content Schedule</DrawerTitle>
            </DrawerHeader>
            <ScrollArea className="max-h-[60vh] px-4">{content}</ScrollArea>
            <DrawerFooter>{footer}</DrawerFooter>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      {deleteConfirmDialog}
      <Sheet open={open} onOpenChange={isSaving || isDeleting ? undefined : onOpenChange}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Content Schedule</SheetTitle>
          </SheetHeader>
          {content}
          <SheetFooter className="mt-4">{footer}</SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
