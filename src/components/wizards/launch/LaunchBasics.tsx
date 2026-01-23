import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { LaunchWizardData, LAUNCH_DURATION_OPTIONS } from '@/types/launch';
import { formatCurrency } from '@/lib/wizardHelpers';

interface LaunchBasicsProps {
  data: LaunchWizardData;
  onChange: (updates: Partial<LaunchWizardData>) => void;
}

export function LaunchBasics({ data, onChange }: LaunchBasicsProps) {
  const calculateSalesNeeded = (revenue: number | null, price: number | null) => {
    if (!revenue || !price || price <= 0) return 0;
    return Math.ceil(revenue / price);
  };

  const handleRevenueChange = (value: string) => {
    const revenue = value ? parseFloat(value) : null;
    onChange({
      revenueGoal: revenue,
      salesNeeded: calculateSalesNeeded(revenue, data.pricePerSale),
    });
  };

  const handlePriceChange = (value: string) => {
    const price = value ? parseFloat(value) : null;
    onChange({
      pricePerSale: price,
      salesNeeded: calculateSalesNeeded(data.revenueGoal, price),
    });
  };

  return (
    <div className="space-y-8">
      {/* What are you launching */}
      <div className="space-y-3">
        <Label htmlFor="launch-name" className="text-lg font-semibold">
          What are you launching?
        </Label>
        <Input
          id="launch-name"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g., Group Coaching Program, Digital Course, 1:1 Offer"
          className="text-lg"
        />
      </div>

      {/* Cart dates */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold">When's the launch?</Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cart-opens" className="text-sm text-muted-foreground">
              Cart opens
            </Label>
            <Input
              id="cart-opens"
              type="date"
              value={data.cartOpens}
              onChange={(e) => onChange({ cartOpens: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cart-closes" className="text-sm text-muted-foreground">
              Cart closes
            </Label>
            <Input
              id="cart-closes"
              type="date"
              value={data.cartCloses}
              onChange={(e) => onChange({ cartCloses: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Launch duration */}
      <div className="space-y-3">
        <Label className="text-lg font-semibold">How long is it open?</Label>
        <RadioGroup
          value={data.launchDuration}
          onValueChange={(value) => onChange({ launchDuration: value as LaunchWizardData['launchDuration'] })}
          className="grid grid-cols-2 md:grid-cols-3 gap-3"
        >
          {LAUNCH_DURATION_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={`duration-${option.value}`} />
              <Label htmlFor={`duration-${option.value}`} className="cursor-pointer">
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Revenue goal */}
      <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
        <Label className="text-lg font-semibold">Revenue Goal (optional but recommended)</Label>
        <p className="text-sm text-muted-foreground">
          How much do you want to make from this launch?
          <br />
          <span className="italic">(Yes, pick a number. It's okay if you're guessing. We can adjust later.)</span>
        </p>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="revenue-goal" className="text-sm">
              Revenue goal
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="revenue-goal"
                type="number"
                min="0"
                step="100"
                value={data.revenueGoal ?? ''}
                onChange={(e) => handleRevenueChange(e.target.value)}
                className="pl-7"
                placeholder="10,000"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="price-per-sale" className="text-sm">
              Price per sale
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="price-per-sale"
                type="number"
                min="0"
                step="10"
                value={data.pricePerSale ?? ''}
                onChange={(e) => handlePriceChange(e.target.value)}
                className="pl-7"
                placeholder="997"
              />
            </div>
          </div>
        </div>

        {data.salesNeeded > 0 && (
          <div className="mt-4 p-3 bg-primary/10 rounded-md">
            <p className="text-sm font-medium">
              Sales needed to hit goal:{' '}
              <span className="text-lg font-bold text-primary">{data.salesNeeded} sales</span>
            </p>
            {data.salesNeeded > 50 && (
              <p className="text-xs text-muted-foreground mt-1">
                If that number makes you want to throw up, adjust your goal or your price. Math doesn't lie.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
