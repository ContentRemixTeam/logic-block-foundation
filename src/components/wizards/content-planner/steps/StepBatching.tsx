import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layers, ArrowRight, Clock, Sparkles } from 'lucide-react';
import { ContentPlannerData, ContentFormat } from '@/types/contentPlanner';
import { FORMAT_METADATA, getFormatMetadata, formatDuration, calculateTotalTime } from '../utils/formatHelpers';
import { cn } from '@/lib/utils';

interface StepBatchingProps {
  data: ContentPlannerData;
  onChange: (updates: Partial<ContentPlannerData>) => void;
}

// Formats that work well as core content for batching
const CORE_FORMATS: ContentFormat[] = [
  'blog-post',
  'youtube-video',
  'webinar',
  'podcast-episode',
  'masterclass',
];

export function StepBatching({ data, onChange }: StepBatchingProps) {
  const toggleBatchFormat = (format: ContentFormat) => {
    const current = data.batchTargetFormats || [];
    const updated = current.includes(format)
      ? current.filter(f => f !== format)
      : [...current, format];
    onChange({ batchTargetFormats: updated });
  };

  // Calculate time savings
  const batchedTime = calculateTotalTime(data.batchTargetFormats);
  const individualTime = batchedTime * 1.5; // Estimate creating individually takes 50% more
  const timeSaved = Math.round(individualTime - batchedTime);

  // Get available target formats (exclude the core format and already selected ones)
  const availableFormats = FORMAT_METADATA.filter(f => 
    f.id !== data.coreContentType &&
    f.repurposeFromFormats?.includes(data.coreContentType as ContentFormat)
  );

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Content Batching</h2>
        <p className="text-muted-foreground">
          Turn 1 core piece into multiple formats
        </p>
      </div>

      {/* Toggle */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <Label htmlFor="batching-toggle" className="text-base font-semibold">
                  Enable Content Batching
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Create 1 core piece and repurpose it into multiple formats
              </p>
            </div>
            <Switch
              id="batching-toggle"
              checked={data.batchingEnabled}
              onCheckedChange={(checked) => onChange({ batchingEnabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Batching Configuration */}
      {data.batchingEnabled && (
        <div className="space-y-6">
          {/* Core Content */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Core Content</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="core-title">Title</Label>
                <Input
                  id="core-title"
                  placeholder="e.g., How to Survive THE GAP"
                  value={data.coreContentTitle}
                  onChange={(e) => onChange({ coreContentTitle: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Format</Label>
                <Select
                  value={data.coreContentType}
                  onValueChange={(value) => onChange({ 
                    coreContentType: value as ContentFormat,
                    batchTargetFormats: [], // Reset targets when core changes
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select core format" />
                  </SelectTrigger>
                  <SelectContent>
                    {CORE_FORMATS.map((format) => {
                      const metadata = getFormatMetadata(format);
                      return (
                        <SelectItem key={format} value={format}>
                          {metadata?.label || format}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Target Formats */}
          {data.coreContentType && (
            <div className="space-y-4">
              <Label className="text-base font-semibold flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                Batch Into These Formats
              </Label>
              
              {availableFormats.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableFormats.map((format) => {
                    const isSelected = data.batchTargetFormats.includes(format.id);
                    
                    return (
                      <Card
                        key={format.id}
                        className={cn(
                          "cursor-pointer transition-all hover:border-primary/50",
                          isSelected && "border-primary bg-primary/5"
                        )}
                        onClick={() => toggleBatchFormat(format.id)}
                      >
                        <CardContent className="p-4 flex items-center gap-3">
                          <Checkbox checked={isSelected} />
                          <div className="flex-1">
                            <p className="font-medium">{format.label}</p>
                            <p className="text-xs text-muted-foreground">
                              ~{formatDuration(format.estimatedMinutes)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <p>No compatible repurposing formats available for this core content type.</p>
                    <p className="text-sm mt-2">Try selecting a different core format above.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Preview */}
          {data.coreContentTitle && data.batchTargetFormats.length > 0 && (
            <Card className="bg-muted/50 border-dashed">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  <span className="font-semibold">Preview</span>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">
                  From "{data.coreContentTitle}" you'll get:
                </p>
                
                <ul className="space-y-2 text-sm">
                  {data.batchTargetFormats.map((format) => {
                    const metadata = getFormatMetadata(format);
                    return (
                      <li key={format} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        <span>{metadata?.label}</span>
                        <span className="text-muted-foreground">
                          (~{formatDuration(metadata?.estimatedMinutes || 0)} to edit)
                        </span>
                      </li>
                    );
                  })}
                </ul>
                
                <div className="flex items-center gap-4 mt-6 pt-4 border-t">
                  <Badge variant="secondary">
                    {data.batchTargetFormats.length + 1} total pieces
                  </Badge>
                  {timeSaved > 0 && (
                    <div className="flex items-center gap-1 text-sm text-green-600">
                      <Clock className="h-4 w-4" />
                      Save ~{formatDuration(timeSaved)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
