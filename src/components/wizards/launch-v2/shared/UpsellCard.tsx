// Upsell Card Component
// For adding upsells to the offer stack

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import { Upsell } from '@/types/launchV2';

interface UpsellCardProps {
  upsell: Upsell;
  onUpdate: (updates: Partial<Upsell>) => void;
  onRemove: () => void;
}

const SHOW_WHEN_OPTIONS = [
  { value: 'checkout', label: 'At checkout (before purchase)' },
  { value: 'post-purchase', label: 'After purchase (thank you page)' },
  { value: 'both', label: 'Both' },
] as const;

export function UpsellCard({ upsell, onUpdate, onRemove }: UpsellCardProps) {
  return (
    <Card className="bg-muted/30">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`upsell-name-${upsell.id}`} className="text-xs text-muted-foreground">
                  Name
                </Label>
                <Input
                  id={`upsell-name-${upsell.id}`}
                  value={upsell.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  placeholder="e.g., VIP Coaching Package"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`upsell-price-${upsell.id}`} className="text-xs text-muted-foreground">
                  Price
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    id={`upsell-price-${upsell.id}`}
                    type="number"
                    min="0"
                    step="1"
                    value={upsell.price || ''}
                    onChange={(e) => onUpdate({ price: parseFloat(e.target.value) || 0 })}
                    className="pl-7"
                    placeholder="297"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`upsell-when-${upsell.id}`} className="text-xs text-muted-foreground">
                When to show
              </Label>
              <Select
                value={upsell.showWhen}
                onValueChange={(value) => onUpdate({ showWhen: value as Upsell['showWhen'] })}
              >
                <SelectTrigger id={`upsell-when-${upsell.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHOW_WHEN_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
