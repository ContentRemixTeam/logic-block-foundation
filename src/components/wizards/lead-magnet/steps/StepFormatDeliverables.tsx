// Step 3: Freebie Format & Deliverables
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { LeadMagnetWizardData, LEAD_MAGNET_FORMATS, LeadMagnetFormat } from '@/types/leadMagnet';
import { Package, Plus, X, Lightbulb } from 'lucide-react';

interface StepFormatDeliverablesProps {
  data: LeadMagnetWizardData;
  onChange: (updates: Partial<LeadMagnetWizardData>) => void;
}

export function StepFormatDeliverables({ data, onChange }: StepFormatDeliverablesProps) {
  const handleAddDeliverable = () => {
    onChange({ deliverables: [...data.deliverables, ''] });
  };

  const handleRemoveDeliverable = (index: number) => {
    const updated = data.deliverables.filter((_, i) => i !== index);
    onChange({ deliverables: updated.length > 0 ? updated : [''] });
  };

  const handleDeliverableChange = (index: number, value: string) => {
    const updated = [...data.deliverables];
    updated[index] = value;
    onChange({ deliverables: updated });
  };

  return (
    <div className="space-y-6">
      {/* Teaching Callout */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Format Tip</p>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a format that matches how your audience likes to consume content. 
                PDFs and checklists are quick to create; video trainings take longer but can build deeper connection.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Format Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">What Format Will Your Freebie Be?</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={data.format}
            onValueChange={(value) => onChange({ format: value as LeadMagnetFormat })}
            className="grid grid-cols-2 sm:grid-cols-3 gap-3"
          >
            {LEAD_MAGNET_FORMATS.map((format) => (
              <div key={format.value} className="relative">
                <RadioGroupItem
                  value={format.value}
                  id={`format-${format.value}`}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`format-${format.value}`}
                  className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-colors"
                >
                  <span className="text-lg">{format.icon}</span>
                  <span className="text-sm font-medium">{format.label}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Estimated Length */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estimated Length/Size</CardTitle>
          <CardDescription>
            How long or extensive will your freebie be?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="e.g., 10 pages, 20 minutes, 5 templates"
            value={data.estimatedLength}
            onChange={(e) => onChange({ estimatedLength: e.target.value })}
          />
        </CardContent>
      </Card>

      {/* Deliverables List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What's Included?</CardTitle>
          <CardDescription>
            List the specific deliverables someone gets when they download.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.deliverables.map((deliverable, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder={`Deliverable ${index + 1}, e.g., "Step-by-step checklist"`}
                value={deliverable}
                onChange={(e) => handleDeliverableChange(index, e.target.value)}
              />
              {data.deliverables.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveDeliverable(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddDeliverable}
            className="mt-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another
          </Button>
        </CardContent>
      </Card>

      {/* Bonus Option */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add a Bonus?</CardTitle>
          <CardDescription>
            Optional: Add a bonus item to increase urgency or perceived value.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              id="has-bonus"
              checked={data.hasBonus}
              onCheckedChange={(checked) => onChange({ hasBonus: checked })}
            />
            <Label htmlFor="has-bonus" className="font-normal">
              Include a bonus with this freebie
            </Label>
          </div>
          
          {data.hasBonus && (
            <Textarea
              placeholder="Describe your bonus, e.g., 'BONUS: Swipe file of 10 proven email subject lines'"
              value={data.bonusDescription}
              onChange={(e) => onChange({ bonusDescription: e.target.value })}
              rows={2}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
