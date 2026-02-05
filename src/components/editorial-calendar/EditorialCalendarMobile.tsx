import { useState, useMemo } from 'react';
import { format, addDays, subDays, startOfWeek, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays, 
  Inbox, 
  Plus,
  Pencil,
  Trash2,
  FileText, 
  Mail, 
  Linkedin, 
  Twitter, 
  Newspaper, 
  Youtube, 
  Instagram, 
  Video, 
  Radio, 
  UserCheck, 
  PlayCircle, 
  Podcast, 
  Mic, 
  Headphones, 
  Presentation, 
  Users, 
  Trophy, 
  GraduationCap, 
  FileBarChart, 
  FileDown, 
  BookOpen, 
  CheckSquare, 
  BarChart, 
  Images, 
  Quote, 
  Facebook,
  Send,
  Paintbrush,
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CalendarItem, getContentTypeIcon, getPlatformColor } from '@/lib/calendarConstants';
import { useEditorialCalendar } from '@/hooks/useEditorialCalendar';
import { ContentQuickEditDrawer } from './ContentQuickEditDrawer';
import { AddContentDialog } from './AddContentDialog';
import { toast } from 'sonner';

// Icon mapping
const ICON_MAP: Record<string, LucideIcon> = {
  FileText, Mail, Linkedin, Twitter, Newspaper, Youtube, Instagram,
  Video, Radio, UserCheck, PlayCircle, Podcast, Mic, Headphones,
  Presentation, Users, Trophy, GraduationCap, FileBarChart, FileDown,
  BookOpen, CheckSquare, BarChart, Images, Quote, Facebook,
};

interface EditorialCalendarMobileProps {
  onSwitchToDesktop?: () => void;
}

export function EditorialCalendarMobile({ onSwitchToDesktop }: EditorialCalendarMobileProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [unscheduledOpen, setUnscheduledOpen] = useState(false);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [addContentOpen, setAddContentOpen] = useState(false);
  const [addContentLane, setAddContentLane] = useState<'create' | 'publish'>('publish');
  const [isSaving, setIsSaving] = useState(false);
  
  // Date picker states
  const [creationDateOpen, setCreationDateOpen] = useState(false);
  const [publishDateOpen, setPublishDateOpen] = useState(false);
  
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });

  const { 
    items,
    unscheduledItems, 
    getItemsForDay, 
    updateItemDateAsync,
    deleteItemAsync,
    isUpdating,
    isDeleting,
  } = useEditorialCalendar({ weekStart });

  // Get items for current day
  const createItems = useMemo(() => getItemsForDay(currentDate, 'create'), [currentDate, items]);
  const publishItems = useMemo(() => getItemsForDay(currentDate, 'publish'), [currentDate, items]);

  // Navigation handlers
  const goToPrevDay = () => setCurrentDate(prev => subDays(prev, 1));
  const goToNextDay = () => setCurrentDate(prev => addDays(prev, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Handle item tap - show action sheet
  const handleItemTap = (item: CalendarItem) => {
    setSelectedItem(item);
    setActionSheetOpen(true);
  };

  // Handle unscheduled item tap - show date picker to schedule
  const handleUnscheduledItemTap = (item: CalendarItem) => {
    setSelectedItem(item);
    setUnscheduledOpen(false);
    setPublishDateOpen(true);
  };

  // Handle date change for creation
  const handleCreationDateChange = async (date: Date | undefined) => {
    if (!selectedItem) return;
    setIsSaving(true);
    try {
      await updateItemDateAsync({
        item: selectedItem,
        lane: 'create',
        newDate: date ? format(date, 'yyyy-MM-dd') : null,
      });
      setCreationDateOpen(false);
      setActionSheetOpen(false);
    } catch (error) {
      console.error('Failed to update creation date:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle date change for publish
  const handlePublishDateChange = async (date: Date | undefined) => {
    if (!selectedItem) return;
    setIsSaving(true);
    try {
      await updateItemDateAsync({
        item: selectedItem,
        lane: 'publish',
        newDate: date ? format(date, 'yyyy-MM-dd') : null,
      });
      setPublishDateOpen(false);
      setActionSheetOpen(false);
    } catch (error) {
      console.error('Failed to update publish date:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Move to unscheduled
  const handleMoveToUnscheduled = async () => {
    if (!selectedItem) return;
    setIsSaving(true);
    try {
      await Promise.all([
        updateItemDateAsync({ item: selectedItem, lane: 'create', newDate: null }),
        updateItemDateAsync({ item: selectedItem, lane: 'publish', newDate: null }),
      ]);
      toast.success('Moved to unscheduled');
      setActionSheetOpen(false);
    } catch (error) {
      console.error('Failed to unschedule:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete item
  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      await deleteItemAsync({ item: selectedItem });
      setActionSheetOpen(false);
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  // Save handler for edit drawer
  const handleSaveEdit = async (updates: { creationDate: string | null; publishDate: string | null }) => {
    if (!selectedItem) return false;

    setIsSaving(true);
    try {
      if (updates.creationDate !== selectedItem.creationDate) {
        await updateItemDateAsync({ item: selectedItem, lane: 'create', newDate: updates.creationDate });
      }
      if (updates.publishDate !== selectedItem.publishDate) {
        await updateItemDateAsync({ item: selectedItem, lane: 'publish', newDate: updates.publishDate });
      }
      toast.success('Content updated');
      setEditDrawerOpen(false);
      setActionSheetOpen(false);
      return true;
    } catch (error) {
      toast.error('Failed to save changes');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Handle add content
  const handleAddContent = (lane: 'create' | 'publish') => {
    setAddContentLane(lane);
    setAddContentOpen(true);
  };

  // Content card component
  const ContentCard = ({ item, onClick }: { item: CalendarItem; onClick: () => void }) => {
    const iconName = getContentTypeIcon(item.type);
    const TypeIcon = ICON_MAP[iconName] || FileText;
    const platformColor = getPlatformColor(item.channel || 'other');
    
    // Status indicator
    const getStatusColor = () => {
      switch (item.status) {
        case 'published': return 'bg-success';
        case 'scheduled': return 'bg-accent';
        case 'in-progress': return 'bg-warning';
        default: return 'bg-primary';
      }
    };

    return (
      <Card 
        className="touch-manipulation active:scale-[0.98] transition-transform cursor-pointer"
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Status dot */}
            <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0", getStatusColor())} />
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <TypeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium truncate">{item.title}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {item.channel && (
                  <Badge 
                    variant="secondary" 
                    className="text-xs"
                    style={{ 
                      backgroundColor: `${platformColor}20`,
                      color: platformColor,
                      borderColor: platformColor,
                    }}
                  >
                    {item.channel}
                  </Badge>
                )}
                {item.type && (
                  <span className="text-xs text-muted-foreground">{item.type}</span>
                )}
              </div>
            </div>
            
            {/* Tap indicator */}
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </div>
        </CardContent>
      </Card>
    );
  };

  // Day header with quick navigation
  const DayHeader = () => {
    const isCurrentDay = isToday(currentDate);
    
    return (
      <div className="flex items-center justify-between gap-4 py-4">
        {/* Navigation */}
        <Button variant="ghost" size="icon" onClick={goToPrevDay} className="h-11 w-11">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        {/* Date display */}
        <div className="flex-1 text-center">
          <div className="flex items-center justify-center gap-2">
            {isCurrentDay && (
              <Badge variant="default" className="text-xs">Today</Badge>
            )}
            <h2 className="text-xl font-bold">
              {format(currentDate, 'EEEE')}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {format(currentDate, 'MMMM d, yyyy')}
          </p>
        </div>
        
        <Button variant="ghost" size="icon" onClick={goToNextDay} className="h-11 w-11">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="bg-card border-b px-4 pb-4 pt-2 safe-area-top">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-semibold">Editorial Calendar</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={goToToday} className="h-9">
              <CalendarDays className="h-4 w-4 mr-1" />
              Today
            </Button>
          </div>
        </div>
        
        <DayHeader />
      </div>

      {/* Content Area */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6 pb-32">
          {/* Create Lane */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <h3 className="font-medium text-sm">Create Content</h3>
                <Badge variant="secondary" className="text-xs">
                  {createItems.length}
                </Badge>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9"
                onClick={() => handleAddContent('create')}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {createItems.length > 0 ? (
              <div className="space-y-2">
                {createItems.map(item => (
                  <ContentCard 
                    key={`${item.id}:create`} 
                    item={item} 
                    onClick={() => handleItemTap(item)}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-6 text-center text-muted-foreground text-sm">
                  No content to create today
                </CardContent>
              </Card>
            )}
          </div>

          {/* Publish Lane */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <h3 className="font-medium text-sm">Publish Content</h3>
                <Badge variant="secondary" className="text-xs">
                  {publishItems.length}
                </Badge>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9"
                onClick={() => handleAddContent('publish')}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {publishItems.length > 0 ? (
              <div className="space-y-2">
                {publishItems.map(item => (
                  <ContentCard 
                    key={`${item.id}:publish`} 
                    item={item} 
                    onClick={() => handleItemTap(item)}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-6 text-center text-muted-foreground text-sm">
                  No content to publish today
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Floating Unscheduled Button */}
      <Sheet open={unscheduledOpen} onOpenChange={setUnscheduledOpen}>
        <SheetTrigger asChild>
          <Button
            size="lg"
            className="fixed bottom-20 right-4 h-14 px-4 rounded-full shadow-lg z-40 gap-2"
          >
            <Inbox className="h-5 w-5" />
            <span>Unscheduled</span>
            {unscheduledItems.length > 0 && (
              <Badge variant="secondary" className="ml-1 bg-background/20 text-primary-foreground">
                {unscheduledItems.length}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[80vh] p-0">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Inbox className="h-5 w-5" />
              Unscheduled Content
              <Badge variant="secondary">{unscheduledItems.length}</Badge>
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(80vh-60px)]">
            <div className="p-4 space-y-2">
              {unscheduledItems.map(item => (
                <ContentCard 
                  key={`${item.id}:unscheduled`} 
                  item={item} 
                  onClick={() => handleUnscheduledItemTap(item)}
                />
              ))}
              {unscheduledItems.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Inbox className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">All content is scheduled!</p>
                  <p className="text-sm">Great job staying organized.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Action Sheet for Selected Item */}
      <Sheet open={actionSheetOpen} onOpenChange={setActionSheetOpen}>
        <SheetContent side="bottom" className="p-0">
          {selectedItem && (
            <>
              <SheetHeader className="px-4 py-4 border-b">
                <SheetTitle className="text-left truncate pr-8">
                  {selectedItem.title}
                </SheetTitle>
              </SheetHeader>
              <div className="p-4 space-y-2">
                {/* Edit Details */}
                <Button 
                  variant="outline" 
                  className="w-full h-12 justify-start gap-3"
                  onClick={() => {
                    setActionSheetOpen(false);
                    setEditDrawerOpen(true);
                  }}
                >
                  <Pencil className="h-5 w-5" />
                  Edit Details
                </Button>
                
                {/* Change Creation Date */}
                <Popover open={creationDateOpen} onOpenChange={setCreationDateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-12 justify-start gap-3">
                      <Paintbrush className="h-5 w-5" />
                      Change Creation Date
                      {selectedItem.creationDate && (
                        <span className="ml-auto text-muted-foreground text-sm">
                          {format(new Date(selectedItem.creationDate), 'MMM d')}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <Calendar
                      mode="single"
                      selected={selectedItem.creationDate ? new Date(selectedItem.creationDate) : undefined}
                      onSelect={handleCreationDateChange}
                      initialFocus
                    />
                    {selectedItem.creationDate && (
                      <div className="p-2 border-t">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full"
                          onClick={() => handleCreationDateChange(undefined)}
                        >
                          Clear date
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>

                {/* Change Publish Date */}
                <Popover open={publishDateOpen} onOpenChange={setPublishDateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-12 justify-start gap-3">
                      <Send className="h-5 w-5" />
                      Change Publish Date
                      {selectedItem.publishDate && (
                        <span className="ml-auto text-muted-foreground text-sm">
                          {format(new Date(selectedItem.publishDate), 'MMM d')}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <Calendar
                      mode="single"
                      selected={selectedItem.publishDate ? new Date(selectedItem.publishDate) : undefined}
                      onSelect={handlePublishDateChange}
                      initialFocus
                    />
                    {selectedItem.publishDate && (
                      <div className="p-2 border-t">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full"
                          onClick={() => handlePublishDateChange(undefined)}
                        >
                          Clear date
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>

                {/* Move to Unscheduled */}
                <Button 
                  variant="outline" 
                  className="w-full h-12 justify-start gap-3"
                  onClick={handleMoveToUnscheduled}
                  disabled={isSaving}
                >
                  <Inbox className="h-5 w-5" />
                  Move to Unscheduled
                </Button>

                {/* Delete */}
                <Button 
                  variant="outline" 
                  className="w-full h-12 justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-5 w-5" />
                  Delete
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Quick Edit Drawer */}
      <ContentQuickEditDrawer
        item={selectedItem}
        open={editDrawerOpen}
        onOpenChange={setEditDrawerOpen}
        onSave={handleSaveEdit}
        onDelete={handleDelete}
        isSaving={isSaving}
        isDeleting={isDeleting}
      />

      {/* Add Content Dialog */}
      <AddContentDialog
        open={addContentOpen}
        onOpenChange={setAddContentOpen}
        initialDate={currentDate}
        initialLane={addContentLane}
      />

      {/* Publish Date Picker for Unscheduled Items */}
      <Sheet open={publishDateOpen && !actionSheetOpen} onOpenChange={setPublishDateOpen}>
        <SheetContent side="bottom" className="p-0">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle>Schedule "{selectedItem?.title}"</SheetTitle>
          </SheetHeader>
          <div className="p-4">
            <Calendar
              mode="single"
              selected={selectedItem?.publishDate ? new Date(selectedItem.publishDate) : undefined}
              onSelect={handlePublishDateChange}
              className="mx-auto"
              initialFocus
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
