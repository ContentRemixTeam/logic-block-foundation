import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ScrollIndicator } from '@/components/ui/scroll-indicator';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, Loader2, Repeat, Clock, Rocket, Lightbulb, Settings, Library, Plus, Search } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useUserPlatforms } from '@/hooks/useUserPlatforms';
import { useUserContentTypes } from '@/hooks/useUserContentTypes';
import { useLaunches } from '@/hooks/useLaunches';
import { useCalendarSettings } from '@/hooks/useCalendarSettings';
import { useContentVaultItems } from '@/hooks/useContentVaultItems';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { PlatformConfigModal } from './PlatformConfigModal';
import { ContentTypeConfigModal } from './ContentTypeConfigModal';
import { 
  RecurrencePattern, 
  RecurrenceFrequency,
  FREQUENCY_OPTIONS, 
  DAY_OPTIONS,
  MONTH_DAY_OPTIONS,
  generateRecurrenceDates,
  getRecurrenceDescription,
} from '@/lib/recurrenceUtils';
import { useFormDraftProtection } from '@/hooks/useFormDraftProtection';
import { useIdeasForContent, IdeaForContent } from '@/hooks/useIdeasForContent';
interface AddContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date;
  initialLane?: 'create' | 'publish';
}

type DialogMode = 'new' | 'reuse' | 'from-idea';

export function AddContentDialog({ 
  open, 
  onOpenChange,
  initialDate,
  initialLane,
}: AddContentDialogProps) {
  const { user } = useAuth();
  const { activePlatforms, getPlatformLabel } = useUserPlatforms();
  const { activeContentTypes, getContentTypeLabel } = useUserContentTypes();
  const { launches, formatLaunchOption } = useLaunches();
  const { settings: calendarSettings } = useCalendarSettings();
  const queryClient = useQueryClient();

  // Mode state
  const [mode, setMode] = useState<DialogMode>('new');
  const [vaultSearch, setVaultSearch] = useState('');
  const [selectedVaultItemId, setSelectedVaultItemId] = useState<string | null>(null);
  const [ideaSearch, setIdeaSearch] = useState('');
  const [selectedIdea, setSelectedIdea] = useState<IdeaForContent | null>(null);

  // Fetch vault items for reuse mode
  const { items: vaultItems, isLoading: vaultLoading } = useContentVaultItems({
    unscheduledOnly: true,
    search: vaultSearch,
    limit: 50,
  });

  // Fetch ideas for "from idea" mode
  const { ideas, isLoading: ideasLoading } = useIdeasForContent({
    search: ideaSearch,
    limit: 30,
    enabled: mode === 'from-idea',
  });

  // Form state for new content
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('');
  const [contentType, setContentType] = useState('');
  const [createDate, setCreateDate] = useState<Date | undefined>(
    initialLane === 'create' && initialDate ? initialDate : undefined
  );
  const [publishDate, setPublishDate] = useState<Date | undefined>(
    initialLane === 'publish' && initialDate ? initialDate : undefined
  );
  const [scheduledTime, setScheduledTime] = useState('');
  const [promoting, setPromoting] = useState('');
  const [launchId, setLaunchId] = useState('');
  const [copyNotes, setCopyNotes] = useState('');
  
  // Recurring state
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('weekly');
  const [selectedDays, setSelectedDays] = useState<number[]>([1]); // Monday default
  const [monthDay, setMonthDay] = useState(1);
  const [endType, setEndType] = useState<'never' | 'on_date' | 'after_occurrences'>('after_occurrences');
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [occurrences, setOccurrences] = useState(12);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [platformConfigOpen, setPlatformConfigOpen] = useState(false);
  const [contentTypeConfigOpen, setContentTypeConfigOpen] = useState(false);

  // Draft protection for form data
  interface ContentFormDraft {
    title: string;
    platform: string;
    contentType: string;
    createDate: string | null;
    publishDate: string | null;
    scheduledTime: string;
    promoting: string;
    launchId: string;
    copyNotes: string;
    isRecurring: boolean;
  }

  const formData = useMemo<ContentFormDraft>(() => ({
    title,
    platform,
    contentType,
    createDate: createDate ? format(createDate, 'yyyy-MM-dd') : null,
    publishDate: publishDate ? format(publishDate, 'yyyy-MM-dd') : null,
    scheduledTime,
    promoting,
    launchId,
    copyNotes,
    isRecurring,
  }), [title, platform, contentType, createDate, publishDate, scheduledTime, promoting, launchId, copyNotes, isRecurring]);

  const { hasDraft, draftTimestamp, saveDraft, loadDraft, clearDraft } = useFormDraftProtection<ContentFormDraft>({
    localStorageKey: 'add-content-dialog-draft',
    enabled: open && mode === 'new',
  });

  // Auto-save draft when form data changes
  useEffect(() => {
    if (open && mode === 'new' && title.trim()) {
      saveDraft(formData);
    }
  }, [formData, open, mode, saveDraft, title]);

  // Load draft or reset form when dialog opens
  useEffect(() => {
    const initializeForm = async () => {
      if (open) {
        // Check for existing draft first
        const draft = await loadDraft();
        if (draft && draft.title) {
          setTitle(draft.title);
          setPlatform(draft.platform);
          setContentType(draft.contentType);
          setCreateDate(draft.createDate ? new Date(draft.createDate) : undefined);
          setPublishDate(draft.publishDate ? new Date(draft.publishDate) : undefined);
          setScheduledTime(draft.scheduledTime);
          setPromoting(draft.promoting);
          setLaunchId(draft.launchId);
          setCopyNotes(draft.copyNotes);
          setIsRecurring(draft.isRecurring);
          toast.info('Recovered unsaved draft', { duration: 3000 });
        } else {
          // Reset to defaults
          setTitle('');
          setPlatform('');
          setContentType('');
          setCreateDate(initialLane === 'create' && initialDate ? initialDate : undefined);
          setPublishDate(initialLane === 'publish' && initialDate ? initialDate : undefined);
          setScheduledTime('');
          setPromoting('');
          setLaunchId('');
          setCopyNotes('');
          setIsRecurring(false);
        }
        // Always reset these
        setMode('new');
        setVaultSearch('');
        setSelectedVaultItemId(null);
        setIdeaSearch('');
        setSelectedIdea(null);
        setFrequency('weekly');
        setSelectedDays([1]);
        setMonthDay(1);
        setEndType('after_occurrences');
        setEndDate(undefined);
        setOccurrences(12);
      }
    };
    initializeForm();
  }, [open, initialDate, initialLane, loadDraft]);

  const toggleDay = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const getRecurrencePreview = (): string => {
    if (!isRecurring || !publishDate) return '';
    
    const pattern: RecurrencePattern = {
      frequency,
      days: (frequency === 'weekly' || frequency === 'biweekly') ? selectedDays : undefined,
      monthDay: frequency === 'monthly' ? monthDay : undefined,
      ends: endType,
      endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
      occurrences: endType === 'after_occurrences' ? occurrences : undefined,
    };
    
    return getRecurrenceDescription(pattern);
  };

  // Helper to create tasks for content
  const createContentTasks = async (contentId: string, contentTitle: string, createDateStr: string | null, publishDateStr: string | null) => {
    if (!user?.id) return;
    
    const tasksToCreate = [];
    
    if (createDateStr) {
      tasksToCreate.push({
        user_id: user.id,
        task_text: `Create: ${contentTitle}`,
        scheduled_date: createDateStr,
        due_date: createDateStr,
        content_item_id: contentId,
        content_type: contentType || 'post',
        content_channel: platform || null,
        content_creation_date: createDateStr,
        content_publish_date: publishDateStr,
        priority: 'medium',
        status: 'scheduled',
      });
    }
    
    if (publishDateStr) {
      tasksToCreate.push({
        user_id: user.id,
        task_text: `Publish: ${contentTitle}`,
        scheduled_date: publishDateStr,
        due_date: publishDateStr,
        content_item_id: contentId,
        content_type: contentType || 'post',
        content_channel: platform || null,
        content_creation_date: createDateStr,
        content_publish_date: publishDateStr,
        priority: 'medium',
        status: 'scheduled',
      });
    }
    
    if (tasksToCreate.length > 0) {
      const { error } = await supabase.from('tasks').insert(tasksToCreate);
      if (error) {
        console.error('Failed to create content tasks:', error);
        toast.warning('Content saved, but task creation failed. You can add tasks manually.');
      }
    }
  };

  // Handle scheduling an existing vault item
  const handleReuseSubmit = async () => {
    if (!selectedVaultItemId) {
      toast.error('Please select a content item from your vault');
      return;
    }

    if (!user?.id) {
      toast.error('You must be logged in');
      return;
    }

    if (!createDate && !publishDate) {
      toast.error('Please set at least one date');
      return;
    }

    setIsSubmitting(true);

    try {
      const createDateStr = createDate ? format(createDate, 'yyyy-MM-dd') : null;
      const publishDateStr = publishDate ? format(publishDate, 'yyyy-MM-dd') : null;

      // Update the existing content item with dates
      const { error } = await supabase
        .from('content_items')
        .update({
          planned_creation_date: createDateStr,
          planned_publish_date: publishDateStr,
          launch_id: launchId || null,
        })
        .eq('id', selectedVaultItemId);

      if (error) throw error;

      // Find the selected item to get its title for tasks
      const selectedItem = vaultItems.find(item => item.id === selectedVaultItemId);

      // Auto-create tasks if enabled and dates are set
      if (calendarSettings.autoCreateContentTasks && selectedItem) {
        await createContentTasks(
          selectedVaultItemId,
          selectedItem.title,
          createDateStr,
          publishDateStr
        );
      }

      toast.success('Content scheduled!');
      await clearDraft();

      queryClient.invalidateQueries({ queryKey: ['editorial-calendar-content'] });
      queryClient.invalidateQueries({ queryKey: ['editorial-calendar-unscheduled'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['content-for-planner'] });
      queryClient.invalidateQueries({ queryKey: ['content-vault-items'] });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to schedule content:', error);
      toast.error('Failed to schedule content. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
      const baseItem = {
        user_id: user.id,
        title: title.trim(),
        channel: platform || null,
        type: contentType || 'post',
        status: 'Draft',
        planned_creation_date: createDate ? format(createDate, 'yyyy-MM-dd') : null,
        planned_publish_date: publishDate ? format(publishDate, 'yyyy-MM-dd') : null,
        scheduled_time: scheduledTime || null,
        promoting: promoting.trim() || null,
        launch_id: launchId || null,
        notes: copyNotes.trim() || null,
        is_recurring: isRecurring,
        recurrence_pattern: isRecurring ? {
          frequency,
          days: (frequency === 'weekly' || frequency === 'biweekly') ? selectedDays : undefined,
          monthDay: frequency === 'monthly' ? monthDay : undefined,
          ends: endType,
          endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
          occurrences: endType === 'after_occurrences' ? occurrences : undefined,
        } : null,
      };

      if (isRecurring && publishDate) {
        // Create parent item first
        const { data: parentData, error: parentError } = await supabase
          .from('content_items')
          .insert(baseItem)
          .select('id')
          .single();

        if (parentError) throw parentError;

        // Auto-create tasks for parent if enabled
        if (calendarSettings.autoCreateContentTasks && (createDate || publishDate)) {
          await createContentTasks(
            parentData.id,
            title.trim(),
            createDate ? format(createDate, 'yyyy-MM-dd') : null,
            publishDate ? format(publishDate, 'yyyy-MM-dd') : null
          );
        }

        // Generate child items
        const pattern: RecurrencePattern = {
          frequency,
          days: (frequency === 'weekly' || frequency === 'biweekly') ? selectedDays : undefined,
          monthDay: frequency === 'monthly' ? monthDay : undefined,
          ends: endType,
          endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
          occurrences: endType === 'after_occurrences' ? occurrences : undefined,
        };

        const dates = generateRecurrenceDates(pattern, format(publishDate, 'yyyy-MM-dd'));
        
        // Skip the first date (that's the parent) and create children
        const childItems = dates.slice(1).map(date => ({
          user_id: user.id,
          title: title.trim(),
          channel: platform || null,
          type: contentType || 'post',
          status: 'Draft',
          planned_creation_date: createDate 
            ? format(new Date(new Date(date).getTime() - (publishDate.getTime() - createDate.getTime())), 'yyyy-MM-dd')
            : null,
          planned_publish_date: date,
          scheduled_time: scheduledTime || null,
          promoting: promoting.trim() || null,
          launch_id: launchId || null,
          notes: copyNotes.trim() || null,
          is_recurring: false,
          recurring_parent_id: parentData.id,
        }));

        if (childItems.length > 0) {
          const { data: childData, error: childError } = await supabase
            .from('content_items')
            .insert(childItems)
            .select('id, planned_creation_date, planned_publish_date');

          if (childError) throw childError;

          // Auto-create tasks for child items if enabled
          if (calendarSettings.autoCreateContentTasks && childData) {
            for (const child of childData) {
              await createContentTasks(
                child.id,
                title.trim(),
                child.planned_creation_date,
                child.planned_publish_date
              );
            }
          }
        }

        toast.success(`Created recurring content (${dates.length} occurrences)`);
      } else {
        // Single item
        const { data: insertedData, error } = await supabase
          .from('content_items')
          .insert(baseItem)
          .select('id')
          .single();
          
        if (error) throw error;

        // Auto-create tasks if enabled and dates are set
        if (calendarSettings.autoCreateContentTasks && insertedData && (createDate || publishDate)) {
          await createContentTasks(
            insertedData.id,
            title.trim(),
            createDate ? format(createDate, 'yyyy-MM-dd') : null,
            publishDate ? format(publishDate, 'yyyy-MM-dd') : null
          );
        }

        toast.success('Content added!');
      }

      await clearDraft();
      queryClient.invalidateQueries({ queryKey: ['editorial-calendar-content'] });
      queryClient.invalidateQueries({ queryKey: ['editorial-calendar-unscheduled'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['content-for-planner'] });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to add content:', error);
      toast.error('Failed to add content. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Selected vault item for display
  const selectedVaultItem = vaultItems.find(item => item.id === selectedVaultItemId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add Content</DialogTitle>
          <DialogDescription>
            Create new content or schedule existing items from your vault.
          </DialogDescription>
        </DialogHeader>

        {/* Mode Tabs */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as DialogMode)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
            <TabsTrigger value="new" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create New</span>
              <span className="sm:hidden">New</span>
            </TabsTrigger>
            <TabsTrigger value="from-idea" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              <span className="hidden sm:inline">From Ideas</span>
              <span className="sm:hidden">Ideas</span>
            </TabsTrigger>
            <TabsTrigger value="reuse" className="flex items-center gap-2">
              <Library className="h-4 w-4" />
              <span className="hidden sm:inline">From Vault</span>
              <span className="sm:hidden">Vault</span>
            </TabsTrigger>
          </TabsList>

          {/* Reuse from Vault Tab */}
          <TabsContent value="reuse" className="mt-4 flex-1 min-h-0 overflow-hidden focus-visible:outline-none" tabIndex={0}>
            <ScrollIndicator className="h-full">
              <ScrollArea className="h-full -mx-2 px-2" tabIndex={0}>
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search your vault..."
                    value={vaultSearch}
                    onChange={(e) => setVaultSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Vault Items List */}
                <div className="space-y-2">
                  {vaultLoading && (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Loading...
                    </div>
                  )}
                  
                  {!vaultLoading && vaultItems.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Library className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No unscheduled content found</p>
                      <p className="text-xs mt-1">Create content in your vault first, or use "Create New"</p>
                    </div>
                  )}

                  {!vaultLoading && vaultItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedVaultItemId(item.id)}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-colors",
                        selectedVaultItemId === item.id 
                          ? "border-primary bg-primary/5" 
                          : "hover:border-muted-foreground/30"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {item.channel && <span className="capitalize">{item.channel}</span>}
                            {item.channel && item.type && <span>•</span>}
                            {item.type && <span className="capitalize">{item.type}</span>}
                          </div>
                        </div>
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2 flex-shrink-0",
                          selectedVaultItemId === item.id 
                            ? "border-primary bg-primary" 
                            : "border-muted-foreground/30"
                        )} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Date Selection for Reuse */}
                {selectedVaultItemId && (
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-semibold text-muted-foreground">Schedule "{selectedVaultItem?.title}"</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* Create Date */}
                      <div className="grid gap-2">
                        <Label className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-teal-500" />
                          Create Date
                        </Label>
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
                        <Label className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-violet-500" />
                          Publish Date
                        </Label>
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

                    {/* Launch */}
                    <div className="grid gap-2">
                      <Label className="flex items-center gap-2">
                        <Rocket className="h-3 w-3" />
                        Related to Campaign
                      </Label>
                      <Select value={launchId || 'none'} onValueChange={(v) => setLaunchId(v === 'none' ? '' : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select campaign (optional)" />
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
                )}
              </div>
              </ScrollArea>
            </ScrollIndicator>
          </TabsContent>

          {/* From Ideas Tab */}
          <TabsContent value="from-idea" className="mt-4 flex-1 min-h-0 overflow-hidden focus-visible:outline-none" tabIndex={0}>
            <ScrollIndicator className="h-full">
              <ScrollArea className="h-full -mx-2 px-2" tabIndex={0}>
                <div className="space-y-4">
                  {/* Search Ideas */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search your ideas..."
                      value={ideaSearch}
                      onChange={(e) => setIdeaSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {/* Ideas List */}
                  <div className="space-y-2">
                    {ideasLoading && (
                      <div className="flex items-center justify-center py-8 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Loading ideas...
                      </div>
                    )}
                    
                    {!ideasLoading && ideas.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No ideas found</p>
                        <p className="text-xs mt-1">Capture ideas first to use them here</p>
                      </div>
                    )}

                    {!ideasLoading && ideas.map((idea) => (
                      <div
                        key={idea.id}
                        onClick={() => {
                          setSelectedIdea(idea);
                          setTitle(idea.content.substring(0, 100)); // Prefill title
                        }}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-colors",
                          selectedIdea?.id === idea.id 
                            ? "border-primary bg-primary/5" 
                            : "hover:border-muted-foreground/30"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium line-clamp-2">{idea.content}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              {idea.category && (
                                <span className="px-1.5 py-0.5 rounded bg-muted">{idea.category}</span>
                              )}
                              <span>{format(new Date(idea.created_at), 'MMM d')}</span>
                            </div>
                          </div>
                          <div className={cn(
                            "w-4 h-4 rounded-full border-2 flex-shrink-0 mt-1",
                            selectedIdea?.id === idea.id 
                              ? "border-primary bg-primary" 
                              : "border-muted-foreground/30"
                          )} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Content Details for Selected Idea */}
                  {selectedIdea && (
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="text-sm font-semibold text-muted-foreground">Content Details</h3>
                      
                      {/* Title (prefilled from idea) */}
                      <div className="grid gap-2">
                        <Label htmlFor="idea-title">Title</Label>
                        <Input
                          id="idea-title"
                          placeholder="Content title..."
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          maxLength={200}
                        />
                      </div>

                      {/* Platform & Content Type */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>Platform</Label>
                          <Select value={platform} onValueChange={setPlatform}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select platform" />
                            </SelectTrigger>
                            <SelectContent>
                              {activePlatforms.map((p) => (
                                <SelectItem key={p.platform} value={p.platform}>
                                  {getPlatformLabel(p.platform)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>Content Type</Label>
                          <Select value={contentType} onValueChange={setContentType}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {activeContentTypes.map((type) => (
                                <SelectItem key={type.type_key} value={type.type_key}>
                                  {type.type_label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-teal-500" />
                            Create Date
                          </Label>
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

                        <div className="grid gap-2">
                          <Label className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-violet-500" />
                            Publish Date
                          </Label>
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
                  )}
                </div>
              </ScrollArea>
            </ScrollIndicator>
          </TabsContent>

          {/* Create New Tab */}
          <TabsContent value="new" className="mt-4 flex-1 min-h-0 overflow-hidden focus-visible:outline-none" tabIndex={0}>
            <ScrollIndicator className="h-full">
              <ScrollArea className="h-full -mx-2 px-2" tabIndex={0}>
                <div className="grid gap-5 py-2 pb-4">
                {/* Recurring Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="recurring" className="font-medium cursor-pointer">
                      Make this recurring
                    </Label>
                  </div>
                  <Switch
                    id="recurring"
                    checked={isRecurring}
                    onCheckedChange={setIsRecurring}
                  />
                </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Basic Info</h3>
              
              {/* Title */}
              <div className="grid gap-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Podcast Episode 12, IG Reel about..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                />
              </div>

              {/* Platform & Content Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Platform</Label>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => setPlatformConfigOpen(true)}
                      title="Configure platforms"
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                  </div>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {activePlatforms.map((p) => (
                        <SelectItem key={p.platform} value={p.platform}>
                          {getPlatformLabel(p.platform)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Content Type</Label>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => setContentTypeConfigOpen(true)}
                      title="Configure content types"
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                  </div>
                  <Select value={contentType} onValueChange={setContentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeContentTypes.map((type) => (
                        <SelectItem key={type.type_key} value={type.type_key}>
                          {type.type_label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Schedule</h3>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Create Date */}
                <div className="grid gap-2">
                  <Label className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-teal-500" />
                    Create Date
                  </Label>
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
                  <Label className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-violet-500" />
                    Publish Date
                  </Label>
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

              {/* Time */}
              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Time to Post
                </Label>
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-32"
                />
              </div>
            </div>

            {/* Recurring Options */}
            {isRecurring && (
              <div className="space-y-4 p-4 rounded-lg border bg-muted/20">
                <h3 className="text-sm font-semibold">Recurrence Pattern</h3>
                
                {/* Frequency */}
                <div className="grid gap-2">
                  <Label>Frequency</Label>
                  <Select value={frequency} onValueChange={(v) => setFrequency(v as RecurrenceFrequency)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Days (for weekly/biweekly) */}
                {(frequency === 'weekly' || frequency === 'biweekly') && (
                  <div className="grid gap-2">
                    <Label>Repeat on</Label>
                    <div className="flex gap-1">
                      {DAY_OPTIONS.map((day) => (
                        <Button
                          key={day.value}
                          type="button"
                          variant={selectedDays.includes(day.value) ? 'default' : 'outline'}
                          size="sm"
                          className="w-10 h-8 p-0"
                          onClick={() => toggleDay(day.value)}
                        >
                          {day.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Month day (for monthly) */}
                {frequency === 'monthly' && (
                  <div className="grid gap-2">
                    <Label>Repeat on day</Label>
                    <Select value={String(monthDay)} onValueChange={(v) => setMonthDay(Number(v))}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTH_DAY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={String(opt.value)}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* End condition */}
                <div className="grid gap-2">
                  <Label>Ends</Label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={endType === 'never'}
                        onChange={() => setEndType('never')}
                        className="accent-primary"
                      />
                      <span className="text-sm">Never</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={endType === 'on_date'}
                        onChange={() => setEndType('on_date')}
                        className="accent-primary"
                      />
                      <span className="text-sm">On date:</span>
                      {endType === 'on_date' && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7">
                              {endDate ? format(endDate, 'MMM d, yyyy') : 'Pick date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={endDate}
                              onSelect={setEndDate}
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={endType === 'after_occurrences'}
                        onChange={() => setEndType('after_occurrences')}
                        className="accent-primary"
                      />
                      <span className="text-sm">After</span>
                      {endType === 'after_occurrences' && (
                        <Input
                          type="number"
                          min={1}
                          max={52}
                          value={occurrences}
                          onChange={(e) => setOccurrences(Math.min(52, Math.max(1, Number(e.target.value))))}
                          className="w-16 h-7"
                        />
                      )}
                      <span className="text-sm">occurrences</span>
                    </label>
                  </div>
                </div>

                {/* Preview */}
                {publishDate && (
                  <div className="text-sm text-muted-foreground p-2 rounded bg-background">
                    📅 {getRecurrencePreview()}
                  </div>
                )}
              </div>
            )}

            {/* Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Details</h3>
              
              {/* Promoting */}
              <div className="grid gap-2">
                <Label>What's this promoting?</Label>
                <Input
                  placeholder="Product launch, affiliate offer, free resource..."
                  value={promoting}
                  onChange={(e) => setPromoting(e.target.value)}
                  maxLength={200}
                />
              </div>

              {/* Launch */}
              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <Rocket className="h-3 w-3" />
                  Related to Launch
                </Label>
                <Select value={launchId || 'none'} onValueChange={(v) => setLaunchId(v === 'none' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select launch (optional)" />
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
                {launches.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No active launches. Create one in Launch Wizard.
                  </p>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Content</h3>
              
              <div className="grid gap-2">
                <Label>Copy / Notes</Label>
                <Textarea
                  placeholder="Draft your copy, add notes, brainstorm hooks..."
                  value={copyNotes}
                  onChange={(e) => setCopyNotes(e.target.value)}
                  maxLength={2000}
                  rows={4}
                />
              </div>
            </div>
              </div>
              </ScrollArea>
            </ScrollIndicator>
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {mode === 'reuse' ? (
            <Button 
              onClick={handleReuseSubmit} 
              disabled={isSubmitting || !selectedVaultItemId}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Schedule Content
            </Button>
          ) : mode === 'from-idea' ? (
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !selectedIdea || !title.trim()}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create from Idea
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isRecurring ? 'Create Recurring' : 'Add Content'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Platform Config Modal */}
      <PlatformConfigModal
        open={platformConfigOpen}
        onOpenChange={setPlatformConfigOpen}
      />

      {/* Content Type Config Modal */}
      <ContentTypeConfigModal
        open={contentTypeConfigOpen}
        onOpenChange={setContentTypeConfigOpen}
      />
    </Dialog>
  );
}
