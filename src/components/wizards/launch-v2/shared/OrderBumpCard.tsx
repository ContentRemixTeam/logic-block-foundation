// Order Bump Card Component
// For adding order bumps to the offer stack

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { X } from 'lucide-react';
import { OrderBump } from '@/types/launchV2';

interface OrderBumpCardProps {
  bump: OrderBump;
  onUpdate: (updates: Partial<OrderBump>) => void;
  onRemove: () => void;
}

export function OrderBumpCard({ bump, onUpdate, onRemove }: OrderBumpCardProps) {
  return (
    <Card className="bg-muted/30">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`bump-name-${bump.id}`} className="text-xs text-muted-foreground">
                  Name
                </Label>
                <Input
                  id={`bump-name-${bump.id}`}
                  value={bump.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  placeholder="e.g., Quick Start Guide"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`bump-price-${bump.id}`} className="text-xs text-muted-foreground">
                  Price
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    id={`bump-price-${bump.id}`}
                    type="number"
                    min="0"
                    step="1"
                    value={bump.price || ''}
                    onChange={(e) => onUpdate({ price: parseFloat(e.target.value) || 0 })}
                    className="pl-7"
                    placeholder="47"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`bump-desc-${bump.id}`} className="text-xs text-muted-foreground">
                Description (shown at checkout)
              </Label>
              <Input
                id={`bump-desc-${bump.id}`}
                value={bump.description}
                onChange={(e) => onUpdate({ description: e.target.value })}
                placeholder="e.g., Get started faster with our step-by-step implementation guide"
              />
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
