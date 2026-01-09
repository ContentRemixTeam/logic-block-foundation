import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { X, Loader2, Save } from 'lucide-react';
import { 
  ContentItem, 
  ContentType, 
  ContentStatus, 
  ContentChannel,
  CONTENT_TYPES,
  CONTENT_STATUSES,
  CONTENT_CHANNELS,
  createContentItem,
  updateContentItem,
} from '@/lib/contentService';
import { toast } from 'sonner';

interface ContentEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: ContentItem | null;
  cycleId?: string | null;
  onSaved: () => void;
}

const defaultItem: Partial<ContentItem> = {
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
};

export function ContentEditorModal({ open, onOpenChange, item, cycleId, onSaved }: ContentEditorModalProps) {
  const [formData, setFormData] = useState<Partial<ContentItem>>(defaultItem);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);

  const isEditing = !!item?.id;

  useEffect(() => {
    if (item) {
      setFormData(item);
    } else {
      setFormData({ ...defaultItem, cycle_id: cycleId });
    }
  }, [item, cycleId, open]);

  const updateField = <K extends keyof ContentItem>(field: K, value: ContentItem[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags?.includes(tag)) {
      updateField('tags', [...(formData.tags || []), tag]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    updateField('tags', (formData.tags || []).filter(t => t !== tag));
  };

  const handleSave = async () => {
    if (!formData.title?.trim()) {
      toast.error('Title is required');
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await updateContentItem(item!.id, formData);
        toast.success('Content updated');
      } else {
        await createContentItem(formData);
        toast.success('Content created');
      }
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const isEmail = formData.type === 'Email';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? 'Edit Content' : 'New Content'}
            {autoSaving && (
              <Badge variant="secondary" className="text-xs">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Saving...
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basics" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basics">Basics</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            {isEmail && <TabsTrigger value="email">Email</TabsTrigger>}
            <TabsTrigger value="links">Links & Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="basics" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Give your content a title..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => updateField('type', value as ContentType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => updateField('status', value as ContentStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_STATUSES.map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select 
                  value={formData.channel || ''} 
                  onValueChange={(value) => updateField('channel', value as ContentChannel)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select channel..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_CHANNELS.map(channel => (
                      <SelectItem key={channel} value={channel}>{channel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Topic</Label>
                <Input
                  value={formData.topic || ''}
                  onChange={(e) => updateField('topic', e.target.value)}
                  placeholder="e.g., Mindset, Sales, Content..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add tag and press Enter..."
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  Add
                </Button>
              </div>
              {formData.tags && formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button onClick={() => removeTag(tag)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Hook</Label>
              <Textarea
                value={formData.hook || ''}
                onChange={(e) => updateField('hook', e.target.value)}
                placeholder="The opening line or hook..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea
                value={formData.body || ''}
                onChange={(e) => updateField('body', e.target.value)}
                placeholder="Main content body..."
                rows={8}
              />
            </div>

            <div className="space-y-2">
              <Label>CTA (Call to Action)</Label>
              <Input
                value={formData.cta || ''}
                onChange={(e) => updateField('cta', e.target.value)}
                placeholder="What do you want them to do?"
              />
            </div>

            <div className="space-y-2">
              <Label>Offer</Label>
              <Input
                value={formData.offer || ''}
                onChange={(e) => updateField('offer', e.target.value)}
                placeholder="What are you selling/promoting?"
              />
            </div>
          </TabsContent>

          {isEmail && (
            <TabsContent value="email" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Subject Line</Label>
                <Input
                  value={formData.subject_line || ''}
                  onChange={(e) => updateField('subject_line', e.target.value)}
                  placeholder="Email subject line..."
                />
              </div>

              <div className="space-y-2">
                <Label>Preview Text</Label>
                <Input
                  value={formData.preview_text || ''}
                  onChange={(e) => updateField('preview_text', e.target.value)}
                  placeholder="Preview text shown in inbox..."
                />
              </div>
            </TabsContent>
          )}

          <TabsContent value="links" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Link URL</Label>
              <Input
                type="url"
                value={formData.link_url || ''}
                onChange={(e) => updateField('link_url', e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Private notes about this content..."
                rows={4}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            {isEditing ? 'Save Changes' : 'Create Content'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
