import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Copy, ArrowRight, Sparkles, Mail, Video, Layout, FileText, Loader2 } from 'lucide-react';
import { ContentItem, getContentItems } from '@/lib/contentService';
import { toast } from 'sonner';

const repurposePrompts = [
  {
    id: 'email',
    label: 'Turn into an Email',
    icon: Mail,
    prompt: (item: ContentItem) => `
Transform this content into a nurture email:

ORIGINAL CONTENT:
Title: ${item.title}
${item.hook ? `Hook: ${item.hook}` : ''}
${item.body ? `Body: ${item.body}` : ''}
${item.cta ? `CTA: ${item.cta}` : ''}

Create an email with:
1. A compelling subject line
2. Preview text
3. Opening hook that creates curiosity
4. Main body that delivers value
5. Clear call-to-action
6. P.S. line

Keep the tone conversational and personal.
    `.trim(),
  },
  {
    id: 'reels',
    label: '3 Reel Hooks',
    icon: Video,
    prompt: (item: ContentItem) => `
Create 3 scroll-stopping Reel/TikTok hooks based on this content:

ORIGINAL CONTENT:
Title: ${item.title}
${item.hook ? `Hook: ${item.hook}` : ''}
${item.body ? `Body: ${item.body}` : ''}

Give me:
1. A controversial/pattern-interrupt hook
2. A curiosity-driven hook  
3. A relatable/pain-point hook

Each hook should be 1-2 sentences that makes someone stop scrolling.
Keep them punchy and direct.
    `.trim(),
  },
  {
    id: 'carousel',
    label: 'Carousel Outline',
    icon: Layout,
    prompt: (item: ContentItem) => `
Create a carousel post outline (8-10 slides) from this content:

ORIGINAL CONTENT:
Title: ${item.title}
${item.hook ? `Hook: ${item.hook}` : ''}
${item.body ? `Body: ${item.body}` : ''}
${item.cta ? `CTA: ${item.cta}` : ''}

Structure:
- Slide 1: Hook/Title that stops the scroll
- Slides 2-8: Key points (one clear idea per slide)
- Slide 9: Summary or transformation
- Slide 10: CTA

Keep text minimal per slide. Focus on visual clarity.
    `.trim(),
  },
  {
    id: 'blog',
    label: 'Blog Post Outline',
    icon: FileText,
    prompt: (item: ContentItem) => `
Create a blog post outline from this content:

ORIGINAL CONTENT:
Title: ${item.title}
${item.hook ? `Hook: ${item.hook}` : ''}
${item.body ? `Body: ${item.body}` : ''}

Create:
1. SEO-friendly title options (3)
2. Meta description
3. H2 headings (5-7)
4. Key points under each heading
5. Conclusion with CTA

Focus on value delivery and searchability.
    `.trim(),
  },
];

export function RepurposePanel() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);

  useEffect(() => {
    const loadItems = async () => {
      setLoading(true);
      try {
        const data = await getContentItems();
        // Filter to items with body content
        setItems(data.filter(item => item.body?.trim()));
      } catch (error) {
        console.error('Error loading items:', error);
      } finally {
        setLoading(false);
      }
    };
    loadItems();
  }, []);

  const copyPrompt = async (prompt: string) => {
    await navigator.clipboard.writeText(prompt);
    toast.success('Prompt copied!', {
      description: 'Paste into ChatGPT, Claude, or your favorite AI',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Content Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Repurpose Helper
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Select a content piece from your vault to generate repurpose prompts. 
            Copy the prompt and paste it into your favorite AI tool.
          </p>

          <Select
            value={selectedItem?.id || ''}
            onValueChange={(id) => setSelectedItem(items.find(i => i.id === id) || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select content to repurpose..." />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {item.type}
                    </Badge>
                    <span className="truncate">{item.title}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Prompt Templates */}
      {selectedItem ? (
        <div className="grid gap-4 md:grid-cols-2">
          {repurposePrompts.map((template) => {
            const Icon = template.icon;
            return (
              <Card key={template.id} className="group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <h3 className="font-medium">{template.label}</h3>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyPrompt(template.prompt(selectedItem))}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Copy
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {template.prompt(selectedItem).slice(0, 150)}...
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ArrowRight className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Select content above to see repurpose prompts</p>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No content with body text found</p>
            <p className="text-sm">Create content items with body text to repurpose them</p>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground text-center">
        These are AI prompts, not AI-generated content. Copy and paste into your preferred AI tool.
      </p>
    </div>
  );
}
