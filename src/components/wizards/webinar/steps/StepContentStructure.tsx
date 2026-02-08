// Step 3: Content Structure
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WebinarWizardData, ContentOutlineItem, OFFER_TIMING_OPTIONS, CONTENT_STYLES } from '@/types/webinar';
import { BookOpen, Lightbulb, Plus, Trash2, GripVertical } from 'lucide-react';

interface StepContentStructureProps {
  data: WebinarWizardData;
  onChange: (updates: Partial<WebinarWizardData>) => void;
}

export function StepContentStructure({ data, onChange }: StepContentStructureProps) {
  const addOutlineItem = () => {
    const newItem: ContentOutlineItem = {
      id: crypto.randomUUID(),
      title: '',
      duration: 10,
      type: 'teaching',
    };
    onChange({ contentOutline: [...data.contentOutline, newItem] });
  };

  const updateOutlineItem = (id: string, updates: Partial<ContentOutlineItem>) => {
    onChange({
      contentOutline: data.contentOutline.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    });
  };

  const removeOutlineItem = (id: string) => {
    onChange({ contentOutline: data.contentOutline.filter((item) => item.id !== id) });
  };

  const totalMinutes = data.contentOutline.reduce((sum, item) => sum + item.duration, 0) +
    (data.includeQa ? data.qaDurationMinutes : 0);

  return (
    <div className="space-y-6">
      {/* Teaching Callout */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Content Structure Tips</p>
              <p className="text-sm text-muted-foreground mt-1">
                A great webinar has 3-5 main teaching points, not 10. Each point should build toward 
                why they need your paid offer. End with Q&A to handle objections live.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Style */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Presentation Style</CardTitle>
          </div>
          <CardDescription>How will you deliver your content?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Content Style</Label>
            <Select
              value={data.contentStyle}
              onValueChange={(value) => onChange({ contentStyle: value as WebinarWizardData['contentStyle'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_STYLES.map((style) => (
                  <SelectItem key={style.value} value={style.value}>
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Offer/Pitch Timing</Label>
            <Select
              value={data.offerTiming}
              onValueChange={(value) => onChange({ offerTiming: value as WebinarWizardData['offerTiming'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OFFER_TIMING_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <span className="font-medium">{option.label}</span>
                      <span className="text-muted-foreground ml-2 text-sm">- {option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content Outline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Content Outline</CardTitle>
              <CardDescription>Map out your teaching points (aim for 3-5)</CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              Total: {totalMinutes} min / {data.durationMinutes} min
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.contentOutline.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No content sections yet</p>
              <p className="text-sm">Add your first teaching point below</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.contentOutline.map((item, index) => (
                <div key={item.id} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium text-muted-foreground w-6">{index + 1}.</span>
                  <Input
                    placeholder="Teaching point title..."
                    value={item.title}
                    onChange={(e) => updateOutlineItem(item.id, { title: e.target.value })}
                    className="flex-1"
                  />
                  <Select
                    value={item.type}
                    onValueChange={(value) => updateOutlineItem(item.id, { type: value as ContentOutlineItem['type'] })}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teaching">Teaching</SelectItem>
                      <SelectItem value="demo">Demo</SelectItem>
                      <SelectItem value="story">Story</SelectItem>
                      <SelectItem value="exercise">Exercise</SelectItem>
                      <SelectItem value="transition">Transition</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={item.duration}
                    onChange={(e) => updateOutlineItem(item.id, { duration: parseInt(e.target.value) || 0 })}
                    className="w-16"
                    min={1}
                  />
                  <span className="text-sm text-muted-foreground">min</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOutlineItem(item.id)}
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button variant="outline" onClick={addOutlineItem} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Teaching Point
          </Button>
        </CardContent>
      </Card>

      {/* Q&A Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Q&A Session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Include Q&A</Label>
              <p className="text-sm text-muted-foreground">Live Q&A after your presentation</p>
            </div>
            <Switch
              checked={data.includeQa}
              onCheckedChange={(checked) => onChange({ includeQa: checked })}
            />
          </div>

          {data.includeQa && (
            <div className="space-y-2">
              <Label>Q&A Duration</Label>
              <Select
                value={String(data.qaDurationMinutes)}
                onValueChange={(value) => onChange({ qaDurationMinutes: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="20">20 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
