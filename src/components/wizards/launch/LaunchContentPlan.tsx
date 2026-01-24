import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layers, Plus, X, FileText, Mail, Video, Mic, MessageSquare } from 'lucide-react';
import { LaunchWizardData, ContentPiece, CONTENT_TYPE_OPTIONS } from '@/types/launch';
import { useState } from 'react';

interface LaunchContentPlanProps {
  data: LaunchWizardData;
  onChange: (updates: Partial<LaunchWizardData>) => void;
}

const CONTENT_ICONS: Record<string, React.ReactNode> = {
  blog: <FileText className="h-3 w-3" />,
  email: <Mail className="h-3 w-3" />,
  video: <Video className="h-3 w-3" />,
  podcast: <Mic className="h-3 w-3" />,
  social: <MessageSquare className="h-3 w-3" />,
};

const CONTENT_COLORS: Record<string, string> = {
  blog: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  email: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  video: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  podcast: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  social: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
};

const QUICK_ADD_TEMPLATES = [
  { type: 'email' as const, title: 'Warm-up email', week: -3 },
  { type: 'email' as const, title: 'Story email', week: -2 },
  { type: 'email' as const, title: 'Value bomb email', week: -1 },
  { type: 'social' as const, title: 'Problem awareness post', week: -4 },
  { type: 'social' as const, title: 'Transformation story', week: -2 },
  { type: 'video' as const, title: 'Teaching video', week: -3 },
];

export function LaunchContentPlan({ data, onChange }: LaunchContentPlanProps) {
  const [newContent, setNewContent] = useState<Partial<ContentPiece>>({
    type: 'email',
    title: '',
    scheduledWeek: -1,
  });

  const runwayWeeks = data.runwayWeeks || 4;
  const weekOptions = Array.from({ length: runwayWeeks + 1 }, (_, i) => {
    const week = -runwayWeeks + i;
    return {
      value: week,
      label: week === 0 ? 'Launch Week' : `Week ${week}`,
    };
  });

  const addContent = () => {
    if (!newContent.title?.trim()) return;
    
    const piece: ContentPiece = {
      id: crypto.randomUUID(),
      type: newContent.type || 'email',
      title: newContent.title.trim(),
      scheduledWeek: newContent.scheduledWeek ?? -1,
      status: 'planned',
    };
    
    onChange({ contentPieces: [...(data.contentPieces || []), piece] });
    setNewContent({ type: 'email', title: '', scheduledWeek: -1 });
  };

  const removeContent = (id: string) => {
    onChange({ contentPieces: data.contentPieces.filter(p => p.id !== id) });
  };

  const quickAddContent = (template: typeof QUICK_ADD_TEMPLATES[0]) => {
    const piece: ContentPiece = {
      id: crypto.randomUUID(),
      type: template.type,
      title: template.title,
      scheduledWeek: Math.max(template.week, -runwayWeeks),
      status: 'planned',
    };
    onChange({ contentPieces: [...(data.contentPieces || []), piece] });
  };

  // Group content by week
  const contentByWeek = weekOptions.reduce((acc, week) => {
    acc[week.value] = (data.contentPieces || []).filter(p => p.scheduledWeek === week.value);
    return acc;
  }, {} as Record<number, ContentPiece[]>);

  return (
    <div className="space-y-8">
      {/* Header */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Layers className="h-4 w-4 text-primary" />
            Content Plan
          </CardTitle>
          <CardDescription>
            Map out your pre-launch content across your {runwayWeeks}-week runway.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Quick add templates */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Quick Add Common Content</Label>
        <div className="flex flex-wrap gap-2">
          {QUICK_ADD_TEMPLATES.filter(t => t.week >= -runwayWeeks).map((template, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              onClick={() => quickAddContent(template)}
              className="text-xs gap-1"
            >
              {CONTENT_ICONS[template.type]}
              {template.title}
            </Button>
          ))}
        </div>
      </div>

      {/* Add new content */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Add Content Piece</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Type</Label>
              <Select
                value={newContent.type}
                onValueChange={(value) => setNewContent(prev => ({ ...prev, type: value as ContentPiece['type'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.icon} {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Week</Label>
              <Select
                value={String(newContent.scheduledWeek)}
                onValueChange={(value) => setNewContent(prev => ({ ...prev, scheduledWeek: Number(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weekOptions.map(opt => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">&nbsp;</Label>
              <Button onClick={addContent} disabled={!newContent.title?.trim()} className="w-full">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
          <Input
            value={newContent.title || ''}
            onChange={(e) => setNewContent(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Content title or topic..."
            onKeyDown={(e) => e.key === 'Enter' && addContent()}
          />
        </CardContent>
      </Card>

      {/* Timeline view */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold">Your Content Timeline</Label>
        
        {weekOptions.map(week => (
          <div key={week.value} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${week.value === 0 ? 'text-primary' : ''}`}>
                {week.label}
              </span>
              {week.value === 0 && <Badge variant="default">Launch!</Badge>}
            </div>
            
            <div className="pl-4 border-l-2 border-muted min-h-[40px]">
              {contentByWeek[week.value]?.length > 0 ? (
                <div className="flex flex-wrap gap-2 py-2">
                  {contentByWeek[week.value].map(piece => (
                    <Badge
                      key={piece.id}
                      variant="secondary"
                      className={`gap-1 py-1.5 px-3 ${CONTENT_COLORS[piece.type]}`}
                    >
                      {CONTENT_ICONS[piece.type]}
                      {piece.title}
                      <button
                        onClick={() => removeContent(piece.id)}
                        className="ml-1 opacity-60 hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-2">No content planned</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      {data.contentPieces?.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total pieces:</span>{' '}
                <span className="font-medium">{data.contentPieces.length}</span>
              </div>
              {CONTENT_TYPE_OPTIONS.map(type => {
                const count = data.contentPieces.filter(p => p.type === type.value).length;
                if (count === 0) return null;
                return (
                  <div key={type.value}>
                    <span className="text-muted-foreground">{type.label}s:</span>{' '}
                    <span className="font-medium">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}