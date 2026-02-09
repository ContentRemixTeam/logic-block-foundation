import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LINKEDIN_TEMPLATES, getRandomLinkedInTemplate } from '@/lib/linkedin-templates';
import type { LinkedInTemplate } from '@/types/linkedinTemplates';
import { Eye, Shuffle, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LinkedInTemplateSelectorProps {
  selectedTemplate: string | null;
  onSelect: (templateId: string) => void;
}

export function LinkedInTemplateSelector({ selectedTemplate, onSelect }: LinkedInTemplateSelectorProps) {
  const [previewTemplate, setPreviewTemplate] = useState<LinkedInTemplate | null>(null);
  
  const handleSurpriseMe = () => {
    const random = getRandomLinkedInTemplate();
    onSelect(random.id);
  };
  
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Choose a Post Template
            </CardTitle>
            <CardDescription className="text-sm">
              Proven formats that drive engagement
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSurpriseMe}
            className="text-muted-foreground"
          >
            <Shuffle className="h-4 w-4 mr-1" />
            Surprise Me
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {LINKEDIN_TEMPLATES.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            isSelected={selectedTemplate === template.id}
            onSelect={() => onSelect(template.id)}
            onPreview={() => setPreviewTemplate(template)}
          />
        ))}
        
        {/* Example Preview Dialog */}
        <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>{previewTemplate?.emoji}</span>
                {previewTemplate?.name} - Example
              </DialogTitle>
              <DialogDescription>
                A gold-standard example of this template format
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                {/* Example Post */}
                <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm">
                  {previewTemplate?.example}
                </div>
                
                {/* Why It Works */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    ✨ Why This Works:
                  </h4>
                  <ul className="space-y-1">
                    {previewTemplate?.exampleWhyItWorks.map((reason, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Structure Reference */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">📋 Template Structure:</h4>
                  <ol className="space-y-1 list-decimal list-inside">
                    {previewTemplate?.structure.map((step, i) => (
                      <li key={i} className="text-sm text-muted-foreground">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </ScrollArea>
            <div className="flex justify-end pt-2">
              <Button
                onClick={() => {
                  if (previewTemplate) {
                    onSelect(previewTemplate.id);
                    setPreviewTemplate(null);
                  }
                }}
              >
                Use This Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

interface TemplateCardProps {
  template: LinkedInTemplate;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
}

function TemplateCard({ template, isSelected, onSelect, onPreview }: TemplateCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={cn(
        "relative p-3 rounded-lg border cursor-pointer transition-all",
        "hover:border-primary/50 hover:bg-primary/5",
        isSelected 
          ? "border-primary bg-primary/10 ring-2 ring-primary/20" 
          : "border-border bg-card"
      )}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <Badge variant="default" className="gap-1 text-xs">
            <Check className="h-3 w-3" />
            Selected
          </Badge>
        </div>
      )}
      
      <div className="flex items-start gap-3">
        {/* Emoji */}
        <span className="text-2xl">{template.emoji}</span>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{template.name}</h4>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {template.description}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1 italic line-clamp-1">
            Hook: "{template.hookPattern}"
          </p>
        </div>
        
        {/* Preview button */}
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
        >
          <Eye className="h-4 w-4 mr-1" />
          Example
        </Button>
      </div>
    </div>
  );
}
