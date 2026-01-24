import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Plus, X, FileText, Gift, Star, ShieldCheck, AlertTriangle } from 'lucide-react';
import { LaunchWizardData } from '@/types/launch';
import { useState } from 'react';
import { format, parseISO, isBefore, addDays } from 'date-fns';

interface LaunchSalesAssetsProps {
  data: LaunchWizardData;
  onChange: (updates: Partial<LaunchWizardData>) => void;
}

export function LaunchSalesAssets({ data, onChange }: LaunchSalesAssetsProps) {
  const [newBonus, setNewBonus] = useState('');

  const addBonus = () => {
    if (newBonus.trim()) {
      onChange({ bonuses: [...(data.bonuses || []), newBonus.trim()] });
      setNewBonus('');
    }
  };

  const removeBonus = (index: number) => {
    onChange({ bonuses: data.bonuses.filter((_, i) => i !== index) });
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

      {/* Sales Page Deadline */}
      <div className="space-y-4">
        <div>
          <Label className="text-lg font-semibold">Sales Page Deadline</Label>
          <p className="text-sm text-muted-foreground mt-1">
            When will your sales page be 100% complete? Aim for 3+ days before cart opens.
          </p>
        </div>

        <div className="flex gap-3 items-end">
          <div className="flex-1 space-y-2">
            <Label className="text-xs">Completion deadline</Label>
            <Input
              type="date"
              value={data.salesPageDeadline}
              onChange={(e) => onChange({ salesPageDeadline: e.target.value })}
            />
          </div>
          {data.cartOpens && !data.salesPageDeadline && (
            <Button
              variant="outline"
              onClick={() => onChange({ salesPageDeadline: suggestedDeadline() })}
            >
              Set to 3 days before launch
            </Button>
          )}
        </div>

        {data.salesPageDeadline && !isDeadlineValid() && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm">Your deadline is after cart opens. Consider moving it earlier.</p>
          </div>
        )}

        {data.salesPageDeadline && isDeadlineValid() && (
          <p className="text-sm text-muted-foreground">
            ✓ Sales page complete by {formatDisplayDate(data.salesPageDeadline)}
          </p>
        )}
      </div>

      {/* Testimonials */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-lg font-semibold">Testimonials</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Social proof dramatically increases conversions.
            </p>
          </div>
          <Switch
            checked={data.hasTestimonials}
            onCheckedChange={(checked) => onChange({ hasTestimonials: checked })}
          />
        </div>

        {data.hasTestimonials && (
          <div className="space-y-3 pl-4 border-l-2 border-primary/20">
            <div className="space-y-2">
              <Label className="text-sm">How many testimonials do you want to collect?</Label>
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
              <p className="text-xs text-muted-foreground">
                💡 Aim for at least 3-5 strong testimonials. Quality over quantity.
              </p>
            </div>
          </div>
        )}

        {!data.hasTestimonials && (
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="pt-4">
              <div className="flex gap-3">
                <Star className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-900 dark:text-amber-100">No testimonials yet?</p>
                  <p className="text-amber-700 dark:text-amber-300 mt-1">
                    Consider offering beta access or a pilot program to collect results before launch.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
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
                value={newBonus}
                onChange={(e) => setNewBonus(e.target.value)}
                placeholder="Bonus name (e.g., 'Private Q&A calls')"
                onKeyDown={(e) => e.key === 'Enter' && addBonus()}
              />
              <Button onClick={addBonus} disabled={!newBonus.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Bonus list */}
            {data.bonuses?.length > 0 && (
              <div className="space-y-2">
                {data.bonuses.map((bonus, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{bonus}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBonus(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {!data.bonuses?.length && (
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
              checked={!!data.salesPageDeadline}
              label="Sales page deadline set"
            />
            <ChecklistItem
              checked={data.hasTestimonials && data.testimonialGoal > 0}
              label="Testimonial collection planned"
            />
            <ChecklistItem
              checked={!data.hasBonuses || (data.bonuses?.length ?? 0) > 0}
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