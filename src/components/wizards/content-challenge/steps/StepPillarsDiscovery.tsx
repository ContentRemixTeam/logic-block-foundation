import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Sparkles, Plus, X, Palette } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useContentPillars } from '@/hooks/useContentPillars';
import { ContentChallengeWizardData, ContentPillar, PILLAR_COLORS } from '@/types/contentChallenge';
import { toast } from 'sonner';

interface StepPillarsDiscoveryProps {
  data: ContentChallengeWizardData;
  setData: (updates: Partial<ContentChallengeWizardData>) => void;
  goNext: () => void;
  goBack: () => void;
}

interface SuggestedPillar {
  name: string;
  description: string;
  emoji: string;
}

export default function StepPillarsDiscovery({ data, setData }: StepPillarsDiscoveryProps) {
  const { pillars: existingPillars, isLoading: loadingPillars } = useContentPillars();
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestedPillars, setSuggestedPillars] = useState<SuggestedPillar[]>([]);
  const [showAddNew, setShowAddNew] = useState(false);
  const [newPillar, setNewPillar] = useState({ name: '', description: '', color: PILLAR_COLORS[0], emoji: '' });

  const handleGeneratePillars = async () => {
    if (!data.idealCustomer.trim()) {
      toast.error('Please describe your ideal customer first');
      return;
    }

    setIsGenerating(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('generate-content-pillars', {
        body: {
          idealCustomer: data.idealCustomer,
          problemsSolved: data.problemsSolved,
          topicsOfInterest: data.topicsOfInterest,
          promotionContext: data.promotionContext,
        },
      });

      if (error) throw error;

      if (result?.pillars) {
        setSuggestedPillars(result.pillars);
        toast.success('Pillar suggestions generated!');
      }
    } catch (error) {
      console.error('Error generating pillars:', error);
      toast.error('Failed to generate pillar suggestions');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectExistingPillar = (pillarId: string) => {
    const current = data.selectedPillarIds || [];
    const updated = current.includes(pillarId)
      ? current.filter(id => id !== pillarId)
      : [...current, pillarId];
    setData({ selectedPillarIds: updated });
  };

  const handleAddSuggestedPillar = (suggested: SuggestedPillar) => {
    const colorIndex = data.newPillars.length % PILLAR_COLORS.length;
    setData({
      newPillars: [
        ...data.newPillars,
        {
          name: suggested.name,
          description: suggested.description,
          color: PILLAR_COLORS[colorIndex],
          emoji: suggested.emoji,
          is_active: true,
          sort_order: data.newPillars.length,
        },
      ],
    });
    setSuggestedPillars(prev => prev.filter(p => p.name !== suggested.name));
  };

  const handleRemoveNewPillar = (index: number) => {
    setData({
      newPillars: data.newPillars.filter((_, i) => i !== index),
    });
  };

  const handleAddCustomPillar = () => {
    if (!newPillar.name.trim()) {
      toast.error('Please enter a pillar name');
      return;
    }

    const colorIndex = data.newPillars.length % PILLAR_COLORS.length;
    setData({
      newPillars: [
        ...data.newPillars,
        {
          name: newPillar.name,
          description: newPillar.description,
          color: newPillar.color || PILLAR_COLORS[colorIndex],
          emoji: newPillar.emoji || null,
          is_active: true,
          sort_order: data.newPillars.length,
        },
      ],
    });
    setNewPillar({ name: '', description: '', color: PILLAR_COLORS[0], emoji: '' });
    setShowAddNew(false);
  };

  const totalSelected = (data.selectedPillarIds?.length || 0) + (data.newPillars?.length || 0);

  return (
    <div className="space-y-6">
      {/* Ideal Customer Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Who is your ideal customer?</CardTitle>
          <CardDescription>
            Describe who you're creating content for. The more specific, the better your content pillars will be.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="idealCustomer">Ideal Customer Description</Label>
            <Textarea
              id="idealCustomer"
              placeholder="e.g., Female entrepreneurs in their 30s-40s who are building online businesses while working full-time. They struggle with time management and feel overwhelmed by all the 'shoulds' in business..."
              value={data.idealCustomer}
              onChange={(e) => setData({ idealCustomer: e.target.value })}
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="problemsSolved">What problems do you solve for them?</Label>
            <Textarea
              id="problemsSolved"
              placeholder="e.g., I help them simplify their marketing strategy, create consistent content without burnout, and build a business that works around their life..."
              value={data.problemsSolved}
              onChange={(e) => setData({ problemsSolved: e.target.value })}
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="topicsOfInterest">What topics do you love talking about?</Label>
            <Textarea
              id="topicsOfInterest"
              placeholder="e.g., Mindset shifts, productivity hacks, email marketing, personal branding, work-life balance..."
              value={data.topicsOfInterest}
              onChange={(e) => setData({ topicsOfInterest: e.target.value })}
              className="min-h-[80px]"
            />
          </div>

          <Button
            onClick={handleGeneratePillars}
            disabled={isGenerating || !data.idealCustomer.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Pillar Suggestions...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Pillar Suggestions
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* AI Suggested Pillars */}
      {suggestedPillars.length > 0 && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI-Suggested Pillars
            </CardTitle>
            <CardDescription>Click to add any pillars that resonate with you</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestedPillars.map((pillar, index) => (
              <button
                key={index}
                onClick={() => handleAddSuggestedPillar(pillar)}
                className="w-full text-left p-4 rounded-lg border border-dashed border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <div className="flex items-center gap-2 font-medium">
                  <span>{pillar.emoji}</span>
                  {pillar.name}
                  <Plus className="h-4 w-4 text-primary ml-auto" />
                </div>
                <p className="text-sm text-muted-foreground mt-1">{pillar.description}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Existing Pillars */}
      {!loadingPillars && existingPillars.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Existing Pillars</CardTitle>
            <CardDescription>Select any existing pillars you want to use</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {existingPillars.map((pillar) => (
              <div
                key={pillar.id}
                className={`flex items-center gap-3 p-4 rounded-lg border transition-colors ${
                  data.selectedPillarIds?.includes(pillar.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                }`}
              >
                <Checkbox
                  checked={data.selectedPillarIds?.includes(pillar.id)}
                  onCheckedChange={() => handleSelectExistingPillar(pillar.id)}
                />
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: pillar.color }}
                />
                <div className="flex-1">
                  <div className="font-medium flex items-center gap-2">
                    {pillar.emoji && <span>{pillar.emoji}</span>}
                    {pillar.name}
                  </div>
                  {pillar.description && (
                    <p className="text-sm text-muted-foreground">{pillar.description}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* New Pillars Being Created */}
      {data.newPillars.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">New Pillars</CardTitle>
            <CardDescription>These pillars will be created with your challenge</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.newPillars.map((pillar, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-4 rounded-lg border border-primary/50 bg-primary/5"
              >
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: pillar.color }}
                />
                <div className="flex-1">
                  <div className="font-medium flex items-center gap-2">
                    {pillar.emoji && <span>{pillar.emoji}</span>}
                    {pillar.name}
                  </div>
                  {pillar.description && (
                    <p className="text-sm text-muted-foreground">{pillar.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveNewPillar(index)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Add Custom Pillar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Custom Pillar</CardTitle>
        </CardHeader>
        <CardContent>
          {showAddNew ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pillarName">Pillar Name</Label>
                  <Input
                    id="pillarName"
                    placeholder="e.g., Behind the Scenes"
                    value={newPillar.name}
                    onChange={(e) => setNewPillar({ ...newPillar, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pillarEmoji">Emoji (optional)</Label>
                  <Input
                    id="pillarEmoji"
                    placeholder="e.g., 🎬"
                    value={newPillar.emoji}
                    onChange={(e) => setNewPillar({ ...newPillar, emoji: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pillarDescription">Description (optional)</Label>
                <Textarea
                  id="pillarDescription"
                  placeholder="What kind of content falls under this pillar?"
                  value={newPillar.description}
                  onChange={(e) => setNewPillar({ ...newPillar, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {PILLAR_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewPillar({ ...newPillar, color })}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        newPillar.color === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddCustomPillar}>Add Pillar</Button>
                <Button variant="outline" onClick={() => setShowAddNew(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setShowAddNew(true)} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Custom Pillar
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
        <div>
          <span className="font-medium">{totalSelected} pillars selected</span>
          <span className="text-muted-foreground ml-2">(recommend 3-5)</span>
        </div>
        {totalSelected >= 3 && totalSelected <= 5 && (
          <Badge variant="secondary" className="bg-green-500/10 text-green-600">
            ✓ Good balance
          </Badge>
        )}
      </div>
    </div>
  );
}
