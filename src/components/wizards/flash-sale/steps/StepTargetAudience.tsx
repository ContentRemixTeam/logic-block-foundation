import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FlashSaleWizardData } from '@/types/flashSale';
import { Users, Target, AlertCircle, X, Plus } from 'lucide-react';

interface StepProps {
  data: FlashSaleWizardData;
  setData: (updates: Partial<FlashSaleWizardData>) => void;
}

export function StepTargetAudience({ data, setData }: StepProps) {
  const [newPainPoint, setNewPainPoint] = useState('');
  const [newObjection, setNewObjection] = useState('');

  const addPainPoint = () => {
    if (newPainPoint.trim()) {
      setData({ painPoints: [...data.painPoints, newPainPoint.trim()] });
      setNewPainPoint('');
    }
  };

  const removePainPoint = (index: number) => {
    setData({ painPoints: data.painPoints.filter((_, i) => i !== index) });
  };

  const addObjection = () => {
    if (newObjection.trim()) {
      setData({ objections: [...data.objections, newObjection.trim()] });
      setNewObjection('');
    }
  };

  const removeObjection = (index: number) => {
    setData({ objections: data.objections.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-blue-500/10">
          <Users className="h-8 w-8 text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold">Target Audience</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Who is this flash sale for? The more specific, the better your copy
        </p>
      </div>

      {/* Target Audience */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5" />
            Who Is This Sale For?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="e.g., Service providers who've been wanting to try my program but have been on the fence about the investment. They know they need help with [X] but haven't pulled the trigger yet."
            value={data.targetAudience}
            onChange={(e) => setData({ targetAudience: e.target.value })}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Pain Points */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What Pain Points Does This Solve?</CardTitle>
          <CardDescription>
            What problems are they experiencing that this offer addresses?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add a pain point..."
              value={newPainPoint}
              onChange={(e) => setNewPainPoint(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPainPoint())}
            />
            <Button onClick={addPainPoint} variant="secondary" size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {data.painPoints.length > 0 && (
            <div className="space-y-2">
              {data.painPoints.map((point, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-muted rounded-lg"
                >
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                  <span className="flex-1 text-sm">{point}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removePainPoint(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">Example pain points:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Overwhelmed by trying to figure it out alone</li>
              <li>Inconsistent income month to month</li>
              <li>Spending too much time on tasks that don't move the needle</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Why Now */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Why Should They Buy NOW?</CardTitle>
          <CardDescription>
            Beyond the discount - why is this the right time for them?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="e.g., Q1 is the perfect time to invest in your business. Start the year strong with the systems you need. The sooner you start, the sooner you'll see results."
            value={data.whyNow}
            onChange={(e) => setData({ whyNow: e.target.value })}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Objections */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Common Objections to Address</CardTitle>
          <CardDescription>
            What might stop them from buying? (We'll address these in your emails)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add an objection..."
              value={newObjection}
              onChange={(e) => setNewObjection(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addObjection())}
            />
            <Button onClick={addObjection} variant="secondary" size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {data.objections.length > 0 && (
            <div className="space-y-2">
              {data.objections.map((objection, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-muted rounded-lg"
                >
                  <span className="flex-1 text-sm">{objection}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeObjection(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">Common objections:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>"I don't have time right now"</li>
              <li>"I've tried similar things before"</li>
              <li>"I need to think about it"</li>
              <li>"It's still too expensive"</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
