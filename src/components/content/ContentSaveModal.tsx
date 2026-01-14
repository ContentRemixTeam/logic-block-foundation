import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { X, Loader2, Save, FileText, Mail, Video, Mic, PenTool, Megaphone, ExternalLink, Clock, Tag, CheckCircle } from 'lucide-react';
import { 
  ContentItem, 
  ContentType, 
  ContentStatus, 
  ContentChannel,
  CONTENT_TYPES,
  CONTENT_STATUSES,
  CONTENT_CHANNELS,
} from '@/lib/contentService';
import { useContentItemForm } from '@/hooks/useContentItemForm';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ContentSaveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: ContentItem | null;
  onSaved: () => void;
  defaultType?: ContentType;
}

const TYPE_ICONS: Record<ContentType, typeof Mail> = {
  'Newsletter': Mail,
  'Post': FileText,
  'Reel/Short': Video,
  'Video': Video,
  'Carousel': FileText,
  'Story': FileText,
  'Live Session': Video,
  'Podcast Episode': Mic,
  'Blog Article': PenTool,
  'Webinar': Video,
  'Challenge': FileText,
  'DM/Message': Mail,
  'Ad': Megaphone,
  'Landing Page': FileText,
  'Other': FileText,
};

export function ContentSaveModal({ 
  open, 
  onOpenChange, 
  item, 
  onSaved,
  defaultType,
}: ContentSaveModalProps) {
  const [tagInput, setTagInput] = useState('');
  
  const {
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
  } = useContentItemForm({
    item,
    onSaved: () => {
      onSaved();
    },
    onClose: () => onOpenChange(false),
  });

  // Set default type if provided
  useEffect(() => {
    if (open && defaultType && !item) {
      updateField('type', defaultType);
      // Auto-set channel based on type
      if (defaultType === 'Newsletter') updateField('channel', 'Email');
      if (['Post', 'Reel/Short', 'Carousel', 'Story'].includes(defaultType)) updateField('channel', 'Instagram');
      if (defaultType === 'Video') updateField('channel', 'YouTube');
      if (defaultType === 'Podcast Episode') updateField('channel', 'Podcast Platform');
      if (defaultType === 'Blog Article') updateField('channel', 'Website/Blog');
    }
  }, [open, defaultType, item, updateField]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      reset();
      setTagInput('');
    }
  }, [open, reset]);

  const handleAddTag = () => {
    if (tagInput.trim()) {
      addTag(tagInput);
      setTagInput('');
    }
  };

  const handleSave = async () => {
    await save();
  };

  const TypeIcon = TYPE_ICONS[formData.type] || FileText;
  const isEmail = formData.type === 'Newsletter';
  const isPodcast = formData.type === 'Podcast Episode';
  const isInstagram = ['Post', 'Reel/Short', 'Carousel', 'Story'].includes(formData.type);
  const isYouTube = formData.type === 'Video';
  const isAd = formData.type === 'Ad';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TypeIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">
                  {isEditing ? 'Edit Content' : 'Save Content'}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {isEditing ? 'Update your content item' : 'Add to your Content Vault'}
                </p>
              </div>
            </div>
            
            {/* Auto-save indicator */}
            <div className="flex items-center gap-2">
              {autoSaving && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </Badge>
              )}
              {lastSaved && !autoSaving && (
                <span className="text-xs text-muted-foreground">
                  Last saved {format(lastSaved, 'h:mm a')}
                </span>
              )}
              <Badge variant="outline" className="text-xs">
                ⇧N
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Main Form */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-[calc(90vh-180px)]">
              <div className="p-6">
                <Tabs defaultValue="basics" className="space-y-6">
                  <TabsList className="grid w-full grid-cols-4 h-11">
                    <TabsTrigger value="basics" className="gap-1.5">
                      <FileText className="h-4 w-4" />
                      Basics
                    </TabsTrigger>
                    <TabsTrigger value="content" className="gap-1.5">
                      <PenTool className="h-4 w-4" />
                      Content
                    </TabsTrigger>
                    <TabsTrigger value="details" className="gap-1.5">
                      <Tag className="h-4 w-4" />
                      {isEmail ? 'Email' : isPodcast ? 'Podcast' : isAd ? 'Ad' : 'Details'}
                    </TabsTrigger>
                    <TabsTrigger value="links" className="gap-1.5">
                      <ExternalLink className="h-4 w-4" />
                      Links
                    </TabsTrigger>
                  </TabsList>

                  {/* BASICS TAB */}
                  <TabsContent value="basics" className="space-y-5 mt-6">
                    {/* Content Type */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Content Type</Label>
                      <Select 
                        value={formData.type} 
                        onValueChange={(val) => updateField('type', val as ContentType)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONTENT_TYPES.map(type => {
                            const Icon = TYPE_ICONS[type];
                            return (
                              <SelectItem key={type} value={type}>
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  {type}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Title <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => updateField('title', e.target.value)}
                        placeholder={isEmail ? "Email subject or campaign name..." : "Give your content a title..."}
                        className="h-11"
                      />
                    </div>

                    {/* Status + Channel Row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Status</Label>
                        <Select 
                          value={formData.status} 
                          onValueChange={(val) => updateField('status', val as ContentStatus)}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CONTENT_STATUSES.map(status => (
                              <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Channel</Label>
                        <Select 
                          value={formData.channel || ''} 
                          onValueChange={(val) => updateField('channel', val as ContentChannel)}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select channel..." />
                          </SelectTrigger>
                          <SelectContent>
                            {CONTENT_CHANNELS.map(channel => (
                              <SelectItem key={channel} value={channel}>{channel}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Topic */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Topic</Label>
                      <Input
                        value={formData.topic}
                        onChange={(e) => updateField('topic', e.target.value)}
                        placeholder="e.g., Mindset, Sales, Content Strategy..."
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">
                        Helps organize and find content later
                      </p>
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Tags</Label>
                      <div className="flex gap-2">
                        <Input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                          placeholder="Add tag and press Enter..."
                          className="h-11"
                        />
                        <Button type="button" variant="outline" onClick={handleAddTag} className="h-11">
                          Add
                        </Button>
                      </div>
                      {formData.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {formData.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="gap-1 pl-2 pr-1 py-1">
                              {tag}
                              <button 
                                onClick={() => removeTag(tag)}
                                className="ml-1 hover:bg-muted rounded p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* CONTENT TAB */}
                  <TabsContent value="content" className="space-y-5 mt-6">
                    {/* Body */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Copy / Transcript</Label>
                      <Textarea
                        value={formData.body}
                        onChange={(e) => updateField('body', e.target.value)}
                        placeholder="Paste your full email copy, post text, script, or transcript here..."
                        className="min-h-[200px] resize-y"
                      />
                      <p className="text-xs text-muted-foreground">
                        This is the main content of your piece
                      </p>
                    </div>

                    {/* Hook */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Hook</Label>
                      <Textarea
                        value={formData.hook}
                        onChange={(e) => updateField('hook', e.target.value)}
                        placeholder="The opening line or attention grabber..."
                        rows={2}
                      />
                    </div>

                    {/* CTA */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">CTA (Call to Action)</Label>
                      <Input
                        value={formData.cta}
                        onChange={(e) => updateField('cta', e.target.value)}
                        placeholder="What do you want them to do?"
                        className="h-11"
                      />
                    </div>

                    {/* Offer */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Offer</Label>
                      <Input
                        value={formData.offer}
                        onChange={(e) => updateField('offer', e.target.value)}
                        placeholder="What are you selling or promoting?"
                        className="h-11"
                      />
                    </div>
                  </TabsContent>

                  {/* DETAILS TAB - Dynamic based on type */}
                  <TabsContent value="details" className="space-y-5 mt-6">
                    {/* Email-specific fields */}
                    {isEmail && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Subject Line <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            value={formData.subject_line}
                            onChange={(e) => updateField('subject_line', e.target.value)}
                            placeholder="Your email subject line..."
                            className="h-11"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Preview Text</Label>
                          <Input
                            value={formData.preview_text}
                            onChange={(e) => updateField('preview_text', e.target.value)}
                            placeholder="Text shown in inbox preview..."
                            className="h-11"
                          />
                          <p className="text-xs text-muted-foreground">
                            Appears after subject line in most email clients
                          </p>
                        </div>
                      </>
                    )}

                    {/* Podcast-specific fields */}
                    {isPodcast && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Guest</Label>
                          <Input
                            value={formData.guest}
                            onChange={(e) => updateField('guest', e.target.value)}
                            placeholder="Guest name (if applicable)..."
                            className="h-11"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Key Takeaway</Label>
                          <Textarea
                            value={formData.key_takeaway}
                            onChange={(e) => updateField('key_takeaway', e.target.value)}
                            placeholder="Main insight or takeaway from this episode..."
                            rows={3}
                          />
                        </div>
                      </>
                    )}

                    {/* Instagram-specific fields */}
                    {isInstagram && (
                      <>
                        <div className="p-4 rounded-lg bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20">
                          <h4 className="font-medium text-sm mb-2">Instagram Tips</h4>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            <li>• Strong hook in first 1-3 seconds</li>
                            <li>• Clear CTA (save, share, comment)</li>
                            <li>• Use trending audio for Reels</li>
                          </ul>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Hook (first line)</Label>
                          <Input
                            value={formData.hook}
                            onChange={(e) => updateField('hook', e.target.value)}
                            placeholder="Stop scrolling if..."
                            className="h-11"
                          />
                        </div>
                      </>
                    )}

                    {/* YouTube-specific fields */}
                    {isYouTube && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Video Description</Label>
                          <Textarea
                            value={formData.notes}
                            onChange={(e) => updateField('notes', e.target.value)}
                            placeholder="YouTube video description with timestamps, links..."
                            rows={4}
                          />
                        </div>
                      </>
                    )}

                    {/* Ad-specific fields */}
                    {isAd && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Angle</Label>
                          <Input
                            value={formData.angle}
                            onChange={(e) => updateField('angle', e.target.value)}
                            placeholder="The emotional or logical angle of this ad..."
                            className="h-11"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Headline</Label>
                          <Input
                            value={formData.headline}
                            onChange={(e) => updateField('headline', e.target.value)}
                            placeholder="Ad headline..."
                            className="h-11"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Primary Text</Label>
                          <Textarea
                            value={formData.primary_text}
                            onChange={(e) => updateField('primary_text', e.target.value)}
                            placeholder="Main ad copy..."
                            rows={4}
                          />
                        </div>
                      </>
                    )}

                    {/* Generic fallback */}
                    {!isEmail && !isPodcast && !isInstagram && !isYouTube && !isAd && (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No type-specific fields for {formData.type}</p>
                        <p className="text-sm mt-1">Use the Content tab for main details</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* LINKS TAB */}
                  <TabsContent value="links" className="space-y-5 mt-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Link URL</Label>
                      <Input
                        type="url"
                        value={formData.link_url}
                        onChange={(e) => updateField('link_url', e.target.value)}
                        placeholder="https://..."
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">
                        Link to the published post, email archive, or relevant page
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Notes</Label>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => updateField('notes', e.target.value)}
                        placeholder="Private notes about this content..."
                        rows={4}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          </div>

          {/* Preview Sidebar */}
          <div className="w-72 border-l bg-muted/20 p-4 hidden lg:block">
            <h4 className="text-sm font-medium mb-3">Preview</h4>
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <TypeIcon className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline" className="text-xs">{formData.type}</Badge>
                <Badge 
                  variant={formData.status === 'Published' ? 'default' : 'secondary'} 
                  className="text-xs"
                >
                  {formData.status}
                </Badge>
              </div>
              
              <div>
                <p className="font-medium text-sm truncate">
                  {formData.title || 'Untitled'}
                </p>
                {formData.topic && (
                  <p className="text-xs text-muted-foreground mt-0.5">{formData.topic}</p>
                )}
              </div>

              {formData.channel && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Channel:</span>
                  <span className="font-medium">{formData.channel}</span>
                </div>
              )}

              {formData.link_url && (
                <a 
                  href={formData.link_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  View Link
                </a>
              )}

              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {formData.tags.slice(0, 5).map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {formData.tags.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{formData.tags.length - 5}
                    </Badge>
                  )}
                </div>
              )}

              {isEmail && formData.subject_line && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">Subject:</p>
                  <p className="text-sm font-medium">{formData.subject_line}</p>
                </div>
              )}
            </Card>

            {/* Publish toggle */}
            <div className="mt-4 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <Label className="text-sm cursor-pointer" htmlFor="publish-now">
                  Mark as Published
                </Label>
                <Switch
                  id="publish-now"
                  checked={formData.markPublishedNow}
                  onCheckedChange={(checked) => updateField('markPublishedNow', checked)}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Sets status to Published and records date
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t bg-muted/30">
          <div className="text-xs text-muted-foreground">
            {isDirty && !autoSaving && <span className="text-amber-500">• Unsaved changes</span>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isEditing ? 'Save Changes' : 'Save Content'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
