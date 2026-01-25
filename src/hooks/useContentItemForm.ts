import { useState, useEffect, useCallback, useRef } from 'react';
import { ContentItem, ContentType, ContentStatus, ContentChannel, createContentItem, updateContentItem } from '@/lib/contentService';
import { toast } from 'sonner';
import { useActiveCycle } from '@/hooks/useActiveCycle';
import { supabase } from '@/integrations/supabase/client';

export interface ContentFormData {
  title: string;
  type: ContentType;
  status: ContentStatus;
  channel: ContentChannel | null;
  topic: string;
  tags: string[];
  body: string;
  hook: string;
  cta: string;
  offer: string;
  subject_line: string;
  preview_text: string;
  link_url: string;
  notes: string;
  // Podcast-specific
  guest: string;
  key_takeaway: string;
  // Ad-specific  
  angle: string;
  headline: string;
  primary_text: string;
  // Meta
  markPublishedNow: boolean;
  // Performance stats
  open_rate: string;
  click_rate: string;
  views: string;
  comments: string;
  likes: string;
  shares: string;
  saves: string;
  subscribers_gained: string;
  revenue: string;
  // Task scheduling dates
  planned_creation_date: string;
  planned_publish_date: string;
  create_tasks_for_dates: boolean;
}

const defaultFormData: ContentFormData = {
  title: '',
  type: 'Newsletter',
  status: 'Draft',
  channel: null,
  topic: '',
  tags: [],
  body: '',
  hook: '',
  cta: '',
  offer: '',
  subject_line: '',
  preview_text: '',
  link_url: '',
  notes: '',
  guest: '',
  key_takeaway: '',
  angle: '',
  headline: '',
  primary_text: '',
  markPublishedNow: false,
  // Performance stats
  open_rate: '',
  click_rate: '',
  views: '',
  comments: '',
  likes: '',
  shares: '',
  saves: '',
  subscribers_gained: '',
  revenue: '',
  // Task scheduling dates
  planned_creation_date: '',
  planned_publish_date: '',
  create_tasks_for_dates: true,
};

interface UseContentItemFormOptions {
  item?: ContentItem | null;
  onSaved?: (item: ContentItem) => void;
  onClose?: () => void;
  autosaveEnabled?: boolean;
}

export function useContentItemForm({
  item,
  onSaved,
  onClose,
  autosaveEnabled = true,
}: UseContentItemFormOptions) {
  const [formData, setFormData] = useState<ContentFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { data: activeCycle } = useActiveCycle();
  
  const autosaveTimeoutRef = useRef<NodeJS.Timeout>();
  const isEditing = !!item?.id;

  // Initialize form data
  useEffect(() => {
    if (item) {
      setFormData({
        title: item.title || '',
        type: item.type || 'Newsletter',
        status: item.status || 'Draft',
        channel: item.channel || null,
        topic: item.topic || '',
        tags: item.tags || [],
        body: item.body || '',
        hook: item.hook || '',
        cta: item.cta || '',
        offer: item.offer || '',
        subject_line: item.subject_line || '',
        preview_text: item.preview_text || '',
        link_url: item.link_url || '',
        notes: item.notes || '',
        guest: '',
        key_takeaway: '',
        angle: '',
        headline: '',
        primary_text: '',
        markPublishedNow: false,
        // Performance stats
        open_rate: item.open_rate?.toString() || '',
        click_rate: item.click_rate?.toString() || '',
        views: item.views?.toString() || '',
        comments: item.comments?.toString() || '',
        likes: item.likes?.toString() || '',
        shares: item.shares?.toString() || '',
        saves: item.saves?.toString() || '',
        subscribers_gained: item.subscribers_gained?.toString() || '',
        revenue: item.revenue?.toString() || '',
        // Task scheduling dates
        planned_creation_date: item.planned_creation_date || '',
        planned_publish_date: item.planned_publish_date || '',
        create_tasks_for_dates: true,
      });
      setIsDirty(false);
    } else {
      setFormData(defaultFormData);
      setIsDirty(false);
    }
  }, [item]);

  // Update field
  const updateField = useCallback(<K extends keyof ContentFormData>(
    field: K, 
    value: ContentFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }, []);

  // Debounced autosave (only for editing existing items)
  useEffect(() => {
    if (!autosaveEnabled || !isEditing || !isDirty) return;

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(async () => {
      if (!item?.id) return;
      
      try {
        setAutoSaving(true);
        await updateContentItem(item.id, {
          title: formData.title,
          type: formData.type,
          status: formData.status,
          channel: formData.channel,
          topic: formData.topic || null,
          tags: formData.tags,
          body: formData.body || null,
          hook: formData.hook || null,
          cta: formData.cta || null,
          offer: formData.offer || null,
          subject_line: formData.subject_line || null,
          preview_text: formData.preview_text || null,
          link_url: formData.link_url || null,
          notes: formData.notes || null,
          // Performance stats
          open_rate: formData.open_rate ? parseFloat(formData.open_rate) : null,
          click_rate: formData.click_rate ? parseFloat(formData.click_rate) : null,
          views: formData.views ? parseInt(formData.views) : null,
          comments: formData.comments ? parseInt(formData.comments) : null,
          likes: formData.likes ? parseInt(formData.likes) : null,
          shares: formData.shares ? parseInt(formData.shares) : null,
          saves: formData.saves ? parseInt(formData.saves) : null,
          subscribers_gained: formData.subscribers_gained ? parseInt(formData.subscribers_gained) : null,
          revenue: formData.revenue ? parseFloat(formData.revenue) : null,
        });
        setLastSaved(new Date());
        setIsDirty(false);
        toast.success('Saved', { duration: 1500 });
      } catch (error) {
        console.error('Autosave error:', error);
      } finally {
        setAutoSaving(false);
      }
    }, 2000);

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [formData, isDirty, isEditing, item?.id, autosaveEnabled]);

  // Tags management
  const addTag = useCallback((tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !formData.tags.includes(trimmed)) {
      updateField('tags', [...formData.tags, trimmed]);
    }
  }, [formData.tags, updateField]);

  const removeTag = useCallback((tag: string) => {
    updateField('tags', formData.tags.filter(t => t !== tag));
  }, [formData.tags, updateField]);

  // Validation
  const validate = useCallback(() => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return false;
    }
    
    // Email requires subject line
    if (formData.type === 'Newsletter' && !formData.subject_line.trim()) {
      toast.error('Subject line is required for emails');
      return false;
    }
    
    return true;
  }, [formData]);

  // Save
  const save = useCallback(async () => {
    if (!validate()) return null;

    setSaving(true);
    try {
      const shouldPublish = formData.markPublishedNow || formData.status === 'Published';
      
      const itemData: Partial<ContentItem> = {
        title: formData.title,
        type: formData.type,
        status: shouldPublish ? 'Published' : formData.status,
        channel: formData.channel,
        topic: formData.topic || null,
        tags: formData.tags,
        body: formData.body || null,
        hook: formData.hook || null,
        cta: formData.cta || null,
        offer: formData.offer || null,
        subject_line: formData.subject_line || null,
        preview_text: formData.preview_text || null,
        link_url: formData.link_url || null,
        notes: formData.notes || null,
        cycle_id: activeCycle?.cycle_id || null,
        published_at: shouldPublish ? new Date().toISOString() : null,
        // Performance stats
        open_rate: formData.open_rate ? parseFloat(formData.open_rate) : null,
        click_rate: formData.click_rate ? parseFloat(formData.click_rate) : null,
        views: formData.views ? parseInt(formData.views) : null,
        comments: formData.comments ? parseInt(formData.comments) : null,
        likes: formData.likes ? parseInt(formData.likes) : null,
        shares: formData.shares ? parseInt(formData.shares) : null,
        saves: formData.saves ? parseInt(formData.saves) : null,
        subscribers_gained: formData.subscribers_gained ? parseInt(formData.subscribers_gained) : null,
        revenue: formData.revenue ? parseFloat(formData.revenue) : null,
        // Task scheduling dates
        planned_creation_date: formData.planned_creation_date || null,
        planned_publish_date: formData.planned_publish_date || null,
      };

      let result: ContentItem;
      
      if (isEditing) {
        result = await updateContentItem(item!.id, itemData);
        toast.success('Content updated');
      } else {
        result = await createContentItem(itemData);
        if (shouldPublish) {
          toast.success('Saved + Published ✅');
        } else {
          toast.success('Content created');
        }
      }

      // Create tasks for dates if enabled and not editing (only on new content)
      if (formData.create_tasks_for_dates && !isEditing) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const taskPromises: Promise<any>[] = [];

          // Create "Create" task if creation date is set
          if (formData.planned_creation_date) {
            taskPromises.push(
              supabase.functions.invoke('manage-task', {
                body: {
                  action: 'create',
                  task_text: `✍️ Create: ${formData.title}`,
                  task_description: `Create content for: ${formData.title}\n\nType: ${formData.type}\nChannel: ${formData.channel || 'Not specified'}`,
                  scheduled_date: formData.planned_creation_date,
                  status: 'scheduled',
                  priority: 'medium',
                  context_tags: ['content', 'create'],
                },
              })
            );
          }

          // Create "Publish" task if publish date is set
          if (formData.planned_publish_date) {
            taskPromises.push(
              supabase.functions.invoke('manage-task', {
                body: {
                  action: 'create',
                  task_text: `📤 Publish: ${formData.title}`,
                  task_description: `Publish content: ${formData.title}\n\nType: ${formData.type}\nChannel: ${formData.channel || 'Not specified'}`,
                  scheduled_date: formData.planned_publish_date,
                  status: 'scheduled',
                  priority: 'medium',
                  context_tags: ['content', 'publish'],
                },
              })
            );
          }

          if (taskPromises.length > 0) {
            await Promise.all(taskPromises);
            toast.success(`Created ${taskPromises.length} task${taskPromises.length > 1 ? 's' : ''} for content dates`);
          }
        }
      }

      setIsDirty(false);
      onSaved?.(result);
      onClose?.();
      
      return result;
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
      return null;
    } finally {
      setSaving(false);
    }
  }, [formData, isEditing, item, activeCycle, validate, onSaved, onClose]);

  // Reset form
  const reset = useCallback(() => {
    setFormData(defaultFormData);
    setIsDirty(false);
    setLastSaved(null);
  }, []);

  return {
    formData,
    updateField,
    addTag,
    removeTag,
    saving,
    autoSaving,
    isDirty,
    lastSaved,
    isEditing,
    save,
    reset,
    validate,
  };
}
