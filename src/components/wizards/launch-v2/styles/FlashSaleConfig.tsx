// Flash Sale Configuration Component
// Quick 24-72 hour promotional sale configuration

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue, 
} from '@/components/ui/select';
import { Zap, Clock, Tag, Mail, Share2 } from 'lucide-react';
import { FlashSaleConfig, DEFAULT_FLASH_SALE_CONFIG } from '@/types/launchV2';

interface FlashSaleConfigProps {
  config: FlashSaleConfig;
  onChange: (config: FlashSaleConfig) => void;
}

export function FlashSaleConfigComponent({ config, onChange }: FlashSaleConfigProps) {
  const safeConfig = { ...DEFAULT_FLASH_SALE_CONFIG, ...config };

  const handleChange = <K extends keyof FlashSaleConfig>(
    key: K,
    value: FlashSaleConfig[K]
  ) => {
    onChange({ ...safeConfig, [key]: value });
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-primary" />
          Flash Sale Configuration
        </CardTitle>
        <CardDescription>
          Quick promotion with urgency - perfect for existing audiences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sale Duration */}
        <div className="space-y-3">
          <Label className="font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Sale duration
          </Label>
          <Select
            value={safeConfig.saleDuration}
            onValueChange={(value) => handleChange('saleDuration', value as FlashSaleConfig['saleDuration'])}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12-hours">12 hours (intense!)</SelectItem>
              <SelectItem value="24-hours">24 hours</SelectItem>
              <SelectItem value="48-hours">48 hours (recommended)</SelectItem>
              <SelectItem value="72-hours">72 hours</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Shorter = more urgency, but less reach. 48 hours is the sweet spot.
          </p>
        </div>

        {/* Discount Type */}
        <div className="space-y-3">
          <Label className="font-medium flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Discount type
          </Label>
          <RadioGroup
            value={safeConfig.discountType}
            onValueChange={(value) => handleChange('discountType', value as FlashSaleConfig['discountType'])}
            className="space-y-2"
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="percent-off" id="discount-percent" />
              <Label htmlFor="discount-percent" className="cursor-pointer">
                Percentage off (e.g., 30% off)
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="dollar-off" id="discount-dollar" />
              <Label htmlFor="discount-dollar" className="cursor-pointer">
                Dollar amount off (e.g., $200 off)
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="bonus-stack" id="discount-bonus" />
              <Label htmlFor="discount-bonus" className="cursor-pointer">
                Bonus stack (no discount, extra bonuses)
              </Label>
            </div>
          </RadioGroup>

          <div className="space-y-2 mt-3">
            <Label className="text-sm">
              {safeConfig.discountType === 'percent-off' ? 'Discount percentage' :
               safeConfig.discountType === 'dollar-off' ? 'Amount off' :
               'Describe the bonus stack'}
            </Label>
            <Input
              value={safeConfig.discountAmount}
              onChange={(e) => handleChange('discountAmount', e.target.value)}
              placeholder={
                safeConfig.discountType === 'percent-off' ? 'e.g., 30%' :
                safeConfig.discountType === 'dollar-off' ? 'e.g., $200' :
                'e.g., 3 bonus templates + coaching call'
              }
            />
          </div>
        </div>

        {/* Countdown Timer */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="font-medium">Countdown timer</Label>
            <Switch
              checked={safeConfig.hasCountdownTimer}
              onCheckedChange={(checked) => handleChange('hasCountdownTimer', checked)}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Adds urgency to your sales page and emails. Highly recommended.
          </p>
        </div>

        {/* Email Count */}
        <div className="space-y-3">
          <Label className="font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email sequence
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={2}
              max={10}
              value={safeConfig.emailCount}
              onChange={(e) => handleChange('emailCount', Number(e.target.value))}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">emails during the sale</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Recommended: 5 emails (launch, 2x mid-sale, final hour, cart close)
          </p>
        </div>

        {/* Social Posts */}
        <div className="space-y-3">
          <Label className="font-medium flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Social media posts planned
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={20}
              value={safeConfig.socialPostsPlanned}
              onChange={(e) => handleChange('socialPostsPlanned', Number(e.target.value))}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">posts during the sale</span>
          </div>
        </div>

        {/* Tip Card */}
        <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Flash Sale Tip:</strong> The key to flash sales is having a warm audience. 
              Send a "heads up" email 1-2 days before the sale starts to maximize results.
            </p>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
