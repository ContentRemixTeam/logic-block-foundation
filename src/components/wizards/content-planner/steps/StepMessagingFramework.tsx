import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { GripVertical, Plus, X, Lightbulb, AlertCircle, Zap, Heart, Brain } from 'lucide-react';
import { ContentPlannerData, SellingPoint, MessagingAngle } from '@/types/contentPlanner';
import { cn } from '@/lib/utils';

interface StepMessagingFrameworkProps {
  data: ContentPlannerData;
  onChange: (updates: Partial<ContentPlannerData>) => void;
}

const MESSAGING_ANGLES: { id: MessagingAngle; label: string; description: string; icon: React.ReactNode }[] = [
  { 
    id: 'fear', 
    label: 'Fear-based', 
    description: 'Highlight problems and consequences of inaction',
    icon: <AlertCircle className="h-4 w-4" />,
  },
  { 
    id: 'aspiration', 
    label: 'Aspiration', 
    description: 'Focus on goals, dreams, and positive outcomes',
    icon: <Heart className="h-4 w-4" />,
  },
  { 
    id: 'logic', 
    label: 'Logic-based', 
    description: 'Explain how your system works step-by-step',
    icon: <Brain className="h-4 w-4" />,
  },
  { 
    id: 'social-proof', 
    label: 'Social Proof', 
    description: 'Show results and testimonials from others',
    icon: <Zap className="h-4 w-4" />,
  },
];

export function StepMessagingFramework({ data, onChange }: StepMessagingFrameworkProps) {
  const [newSellingPointLabel, setNewSellingPointLabel] = useState('');

  const addSellingPoint = () => {
    if (!newSellingPointLabel.trim()) return;
    
    const newPoint: SellingPoint = {
      id: crypto.randomUUID(),
      label: newSellingPointLabel.trim(),
      description: '',
      isCore: data.sellingPoints.length < 3,
      sortOrder: data.sellingPoints.length,
    };
    
    onChange({ sellingPoints: [...data.sellingPoints, newPoint] });
    setNewSellingPointLabel('');
  };

  const updateSellingPoint = (id: string, updates: Partial<SellingPoint>) => {
    onChange({
      sellingPoints: data.sellingPoints.map(sp =>
        sp.id === id ? { ...sp, ...updates } : sp
      ),
    });
  };

  const removeSellingPoint = (id: string) => {
    onChange({
      sellingPoints: data.sellingPoints.filter(sp => sp.id !== id),
    });
  };

  const toggleMessagingAngle = (angle: MessagingAngle) => {
    const current = data.messagingAngles || [];
    const updated = current.includes(angle)
      ? current.filter(a => a !== angle)
      : [...current, angle];
    onChange({ messagingAngles: updated });
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Your Messaging Framework</h2>
        <p className="text-muted-foreground">
          Define what you're going to say before creating content
        </p>
      </div>

      {/* Core Problem */}
      <div className="space-y-3">
        <Label htmlFor="core-problem" className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Core Problem You Solve
        </Label>
        <Textarea
          id="core-problem"
          placeholder="What's the main problem your audience faces? What pain keeps them up at night?"
          value={data.coreProblem}
          onChange={(e) => onChange({ coreProblem: e.target.value })}
          className="min-h-[100px]"
        />
      </div>

      {/* Unique Solution */}
      <div className="space-y-3">
        <Label htmlFor="unique-solution" className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Your Unique Solution
        </Label>
        <Textarea
          id="unique-solution"
          placeholder="How does your offer uniquely solve this problem? What makes your approach different?"
          value={data.uniqueSolution}
          onChange={(e) => onChange({ uniqueSolution: e.target.value })}
          className="min-h-[100px]"
        />
      </div>

      {/* Target Customer */}
      <div className="space-y-3">
        <Label htmlFor="target-customer">Target Customer</Label>
        <Textarea
          id="target-customer"
          placeholder="Who is your ideal customer? Be specific about demographics, experience level, and situation."
          value={data.targetCustomer}
          onChange={(e) => onChange({ targetCustomer: e.target.value })}
          className="min-h-[80px]"
        />
      </div>

      {/* Selling Points */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Top Selling Points</Label>
          <span className="text-sm text-muted-foreground">
            {data.sellingPoints.filter(sp => sp.isCore).length}/3 core points
          </span>
        </div>
        
        <div className="space-y-3">
          {data.sellingPoints.map((sp, index) => (
            <Card key={sp.id} className={cn(sp.isCore && "border-primary/50")}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2 pt-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <span className="font-mono text-sm text-muted-foreground w-4">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input
                      value={sp.label}
                      onChange={(e) => updateSellingPoint(sp.id, { label: e.target.value })}
                      placeholder="Selling point..."
                      className="font-medium"
                    />
                    <Input
                      value={sp.description}
                      onChange={(e) => updateSellingPoint(sp.id, { description: e.target.value })}
                      placeholder="Brief description (optional)"
                      className="text-sm"
                    />
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`core-${sp.id}`}
                        checked={sp.isCore}
                        onCheckedChange={(checked) => updateSellingPoint(sp.id, { isCore: !!checked })}
                      />
                      <Label htmlFor={`core-${sp.id}`} className="text-sm text-muted-foreground">
                        Core selling point
                      </Label>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSellingPoint(sp.id)}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={newSellingPointLabel}
            onChange={(e) => setNewSellingPointLabel(e.target.value)}
            placeholder="Add a selling point..."
            onKeyDown={(e) => e.key === 'Enter' && addSellingPoint()}
          />
          <Button onClick={addSellingPoint} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
      </div>

      {/* Messaging Angles */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Messaging Angles to Test</Label>
        <p className="text-sm text-muted-foreground">
          Select which angles you want to use in your content
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {MESSAGING_ANGLES.map((angle) => (
            <Card
              key={angle.id}
              className={cn(
                "cursor-pointer transition-all hover:border-primary/50",
                data.messagingAngles.includes(angle.id) && "border-primary bg-primary/5"
              )}
              onClick={() => toggleMessagingAngle(angle.id)}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  data.messagingAngles.includes(angle.id) 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted"
                )}>
                  {angle.icon}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{angle.label}</p>
                  <p className="text-sm text-muted-foreground">{angle.description}</p>
                </div>
                <Checkbox
                  checked={data.messagingAngles.includes(angle.id)}
                  className="mt-1"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Core Narrative */}
      <div className="space-y-3">
        <Label htmlFor="core-narrative">Core Narrative / Story (Optional)</Label>
        <Textarea
          id="core-narrative"
          placeholder="What's your story? Your journey that connects with your audience..."
          value={data.coreNarrative}
          onChange={(e) => onChange({ coreNarrative: e.target.value })}
          className="min-h-[100px]"
        />
      </div>
    </div>
  );
}
