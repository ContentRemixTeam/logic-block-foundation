import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ShoppingBag, Plus, FileText, Star, ShieldCheck, AlertTriangle, Calendar } from 'lucide-react';
import { LaunchWizardData, BonusItem, SalesPageStatus, TestimonialStatus } from '@/types/launch';
import { useState } from 'react';
import { format, parseISO, isBefore, addDays } from 'date-fns';
import { BonusItemCard } from '@/components/wizards/shared/BonusItemCard';

interface LaunchSalesAssetsProps {
  data: LaunchWizardData;
  onChange: (updates: Partial<LaunchWizardData>) => void;
}

export function LaunchSalesAssets({ data, onChange }: LaunchSalesAssetsProps) {
  const [newBonusName, setNewBonusName] = useState('');

  // Bonus handlers
  const handleAddBonus = () => {
    if (!newBonusName.trim()) return;
    const newBonus: BonusItem = {
      id: crypto.randomUUID(),
      name: newBonusName.trim(),
      status: 'existing',
    };
    onChange({ bonusStack: [...(data.bonusStack || []), newBonus] });
    setNewBonusName('');
  };

  const handleUpdateBonus = (id: string, updates: Partial<BonusItem>) => {
    const updated = (data.bonusStack || []).map(b => 
      b.id === id ? { ...b, ...updates } : b
    );
    onChange({ bonusStack: updated });
  };

  const handleRemoveBonus = (id: string) => {
    onChange({ bonusStack: (data.bonusStack || []).filter(b => b.id !== id) });
  };

  // Calculate if sales page deadline is before cart opens
  const isDeadlineValid = () => {
    if (!data.salesPageDeadline || !data.cartOpens) return true;
    try {
      return isBefore(parseISO(data.salesPageDeadline), parseISO(data.cartOpens));
    } catch {
      return true;
    }
  };

  // Suggested deadline is 3 days before cart opens
  const suggestedDeadline = () => {
    if (!data.cartOpens) return '';
    try {
      const cartOpen = parseISO(data.cartOpens);
      return format(addDays(cartOpen, -3), 'yyyy-MM-dd');
    } catch {
      return '';
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  // Bonus statistics
  const bonusesNeedingCreation = (data.bonusStack || []).filter(b => b.status === 'needs-creation');

  return (
    <div className="space-y-8">
      {/* Header */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <ShoppingBag className="h-4 w-4 text-primary" />
            Sales Assets
          </CardTitle>
          <CardDescription>
            Get your sales infrastructure ready before cart opens. No scrambling on launch day.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Sales Page Status & Deadline */}
      <div className="space-y-4">
        <div>
          <Label className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Sales Page
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            What's the status of your sales page?
          </p>
        </div>

        <RadioGroup
          value={data.salesPageStatus}
          onValueChange={(value) => onChange({ salesPageStatus: value as SalesPageStatus })}
          className="space-y-2"
        >
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="existing" id="sp-existing" />
            <Label htmlFor="sp-existing" className="cursor-pointer">Already done</Label>
          </div>
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="in-progress" id="sp-in-progress" />
            <Label htmlFor="sp-in-progress" className="cursor-pointer">In progress</Label>
          </div>
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="needs-creation" id="sp-needs-creation" />
            <Label htmlFor="sp-needs-creation" className="cursor-pointer">Haven't started</Label>
          </div>
        </RadioGroup>

        {data.salesPageStatus !== 'existing' && (
          <div className="space-y-2 pl-4 border-l-2 border-primary/20">
            <Label className="text-sm">When will it be complete?</Label>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Input
                  type="date"
                  value={data.salesPageDeadline}
                  onChange={(e) => onChange({ salesPageDeadline: e.target.value })}
                />
              </div>
              {data.cartOpens && !data.salesPageDeadline && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onChange({ salesPageDeadline: suggestedDeadline() })}
                >
                  3 days before launch
                </Button>
              )}
            </div>

            {data.salesPageDeadline && !isDeadlineValid() && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-sm">Your deadline is after cart opens. Consider moving it earlier.</p>
              </div>
            )}
          </div>
        )}

        {data.salesPageStatus === 'existing' && (
          <p className="text-sm text-green-600">✓ Sales page is ready</p>
        )}
      </div>

      {/* Testimonials */}
      <div className="space-y-4">
        <div>
          <Label className="text-lg font-semibold flex items-center gap-2">
            <Star className="h-5 w-5" />
            Testimonials
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            Social proof dramatically increases conversions.
          </p>
        </div>

        <RadioGroup
          value={data.testimonialStatus}
          onValueChange={(value) => onChange({ 
            testimonialStatus: value as TestimonialStatus,
            hasTestimonials: value !== 'none',
          })}
          className="space-y-2"
        >
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="have-enough" id="test-have-enough" />
            <Label htmlFor="test-have-enough" className="cursor-pointer">I have enough testimonials</Label>
          </div>
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="need-more" id="test-need-more" />
            <Label htmlFor="test-need-more" className="cursor-pointer">I need to collect more</Label>
          </div>
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="none" id="test-none" />
            <Label htmlFor="test-none" className="cursor-pointer">I don't have any yet</Label>
          </div>
        </RadioGroup>

        {(data.testimonialStatus === 'need-more' || data.testimonialStatus === 'none') && (
          <div className="space-y-3 pl-4 border-l-2 border-primary/20">
            <div className="space-y-2">
              <Label className="text-sm">How many do you want to collect?</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={data.testimonialGoal}
                  onChange={(e) => onChange({ testimonialGoal: Number(e.target.value) })}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">testimonials</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Collection deadline
              </Label>
              <Input
                type="date"
                value={data.testimonialDeadline}
                onChange={(e) => onChange({ testimonialDeadline: e.target.value })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Aim for at least 3-5 strong testimonials. Quality over quantity.
            </p>
          </div>
        )}

        {data.testimonialStatus === 'have-enough' && (
          <p className="text-sm text-green-600">✓ Testimonials ready</p>
        )}
      </div>

      {/* Bonuses */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-lg font-semibold">Bonus Stack</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Bonuses add value and can overcome price objections.
            </p>
          </div>
          <Switch
            checked={data.hasBonuses}
            onCheckedChange={(checked) => onChange({ hasBonuses: checked })}
          />
        </div>

        {data.hasBonuses && (
          <div className="space-y-3 pl-4 border-l-2 border-primary/20">
            {/* Add bonus */}
            <div className="flex gap-2">
              <Input
                value={newBonusName}
                onChange={(e) => setNewBonusName(e.target.value)}
                placeholder="Bonus name (e.g., 'Private Q&A calls')"
                onKeyDown={(e) => e.key === 'Enter' && handleAddBonus()}
              />
              <Button onClick={handleAddBonus} disabled={!newBonusName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Bonus list */}
            {(data.bonusStack?.length ?? 0) > 0 && (
              <div className="space-y-3">
                {data.bonusStack?.map((bonus) => (
                  <BonusItemCard
                    key={bonus.id}
                    bonus={bonus}
                    onUpdate={(updates) => handleUpdateBonus(bonus.id, updates)}
                    onRemove={() => handleRemoveBonus(bonus.id)}
                    maxDeadline={data.cartOpens}
                  />
                ))}
              </div>
            )}

            {/* Summary of bonuses needing creation */}
            {bonusesNeedingCreation.length > 0 && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-sm">
                  📋 <strong>{bonusesNeedingCreation.length}</strong> bonus{bonusesNeedingCreation.length > 1 ? 'es' : ''} to create before launch
                </p>
              </div>
            )}

            {!data.bonusStack?.length && (
              <p className="text-xs text-muted-foreground">
                Add bonuses that complement your main offer and provide additional value.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Pre-launch checklist */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Sales Asset Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <ChecklistItem
              checked={data.salesPageStatus === 'existing' || !!data.salesPageDeadline}
              label={data.salesPageStatus === 'existing' ? 'Sales page ready' : 'Sales page deadline set'}
            />
            <ChecklistItem
              checked={data.testimonialStatus === 'have-enough' || (data.testimonialStatus !== 'none' && data.testimonialGoal > 0)}
              label={data.testimonialStatus === 'have-enough' ? 'Testimonials ready' : 'Testimonial collection planned'}
            />
            <ChecklistItem
              checked={!data.hasBonuses || (data.bonusStack?.length ?? 0) > 0}
              label={data.hasBonuses ? 'Bonus stack defined' : 'Bonuses (optional)'}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ChecklistItem({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {checked ? (
        <span className="text-green-600">✓</span>
      ) : (
        <span className="text-muted-foreground">○</span>
      )}
      <span className={checked ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </div>
  );
}
