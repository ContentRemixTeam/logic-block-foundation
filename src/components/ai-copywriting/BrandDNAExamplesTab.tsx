import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ContentExamples } from '@/types/brandDNA';
import { Mail, MessageSquare, Target, FileText } from 'lucide-react';

interface BrandDNAExamplesTabProps {
  contentExamples: ContentExamples;
  onChange: (examples: ContentExamples) => void;
}

const EXAMPLE_CATEGORIES = [
  {
    key: 'email' as const,
    icon: Mail,
    title: 'Email Examples',
    description: 'Paste examples of emails you\'ve written that capture your voice (welcome emails, promos, newsletters)',
    placeholder: 'Paste an email you\'ve sent that represents your voice well...',
    rows: 8
  },
  {
    key: 'social' as const,
    icon: MessageSquare,
    title: 'Social Media Examples',
    description: 'Share social posts that performed well (any platform - Instagram, LinkedIn, Twitter/X)',
    placeholder: 'Paste a social post that got good engagement...',
    rows: 5
  },
  {
    key: 'sales' as const,
    icon: Target,
    title: 'Sales Copy Examples',
    description: 'Paste sales page sections, landing page copy, or promotional content',
    placeholder: 'Paste sales or landing page copy that converts well...',
    rows: 6
  },
  {
    key: 'longform' as const,
    icon: FileText,
    title: 'Long-form Examples',
    description: 'Blog post intros, video script excerpts, or longer written content',
    placeholder: 'Paste a blog intro or video script excerpt...',
    rows: 8
  }
];

export function BrandDNAExamplesTab({ contentExamples, onChange }: BrandDNAExamplesTabProps) {
  const updateExample = (category: keyof ContentExamples, index: number, value: string) => {
    const newExamples = { ...contentExamples };
    newExamples[category] = [...(newExamples[category] || ['', ''])];
    newExamples[category][index] = value;
    onChange(newExamples);
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <p className="font-medium mb-1">🧠 Why examples matter:</p>
        <p>Adding 1-2 examples per category helps the AI learn your specific writing patterns, 
        sentence structure, and personality. This dramatically improves output quality through "few-shot learning".</p>
      </div>

      {EXAMPLE_CATEGORIES.map((category) => {
        const Icon = category.icon;
        const examples = contentExamples[category.key] || ['', ''];
        
        return (
          <Card key={category.key}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{category.title}</CardTitle>
              </div>
              <CardDescription className="text-sm">{category.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Example 1</Label>
                <Textarea
                  placeholder={category.placeholder}
                  value={examples[0] || ''}
                  onChange={(e) => updateExample(category.key, 0, e.target.value)}
                  rows={category.rows}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Example 2 (optional)</Label>
                <Textarea
                  placeholder={category.placeholder}
                  value={examples[1] || ''}
                  onChange={(e) => updateExample(category.key, 1, e.target.value)}
                  rows={category.rows}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}