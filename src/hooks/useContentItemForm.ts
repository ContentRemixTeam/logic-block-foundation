import { useState, useEffect, useCallback, useRef } from 'react';
import { ContentItem, ContentType, ContentStatus, ContentChannel, createContentItem, updateContentItem } from '@/lib/contentService';
import { toast } from 'sonner';
import { useActiveCycle } from '@/hooks/useActiveCycle';

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
}

const defaultFormData: ContentFormData = {
  title: '',
  type: 'Email',
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
        type: item.type || 'Email',
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
    if (formData.type === 'Email' && !formData.subject_line.trim()) {
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
