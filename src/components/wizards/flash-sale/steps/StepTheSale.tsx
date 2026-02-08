import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FlashSaleWizardData, SALE_DURATIONS } from '@/types/flashSale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Zap, DollarSign, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface StepProps {
  data: FlashSaleWizardData;
  setData: (updates: Partial<FlashSaleWizardData>) => void;
}

interface Product {
  id: string;
  product_name: string;
  price: number | null;
}

export function StepTheSale({ data, setData }: StepProps) {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const loadProducts = async () => {
      if (!user) return;
      const { data: productsData } = await supabase
        .from('user_products')
        .select('id, product_name, price')
        .eq('user_id', user.id)
        .order('product_name');
      
      if (productsData) {
        setProducts(productsData);
      }
    };
    loadProducts();
  }, [user]);

  const handleDurationChange = (duration: string) => {
    setData({ saleDuration: duration as FlashSaleWizardData['saleDuration'] });
    
    // Auto-calculate end date based on duration
    if (data.startDate && duration !== 'custom') {
      const durationConfig = SALE_DURATIONS.find(d => d.value === duration);
      if (durationConfig && durationConfig.hours > 0) {
        const start = new Date(data.startDate);
        const end = new Date(start.getTime() + durationConfig.hours * 60 * 60 * 1000);
        setData({ 
          endDate: format(end, 'yyyy-MM-dd'),
          endTime: format(end, 'HH:mm'),
        });
      }
    }
  };

  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setData({
        productId,
        productName: product.product_name,
        originalPrice: product.price,
      });
    }
  };

  const calculateSalePrice = () => {
    if (!data.originalPrice || !data.discountValue) return null;
    
    if (data.discountType === 'percentage') {
      return data.originalPrice * (1 - data.discountValue / 100);
    } else {
      return data.originalPrice - data.discountValue;
    }
  };

  const salePrice = calculateSalePrice();

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10">
          <Zap className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Set Up Your Flash Sale</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Define what you're selling, the discount, and when the sale runs
        </p>
      </div>

      {/* Sale Name */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sale Name</CardTitle>
          <CardDescription>Internal name for this flash sale</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="e.g., February Flash Sale, Birthday Blowout"
            value={data.saleName}
            onChange={(e) => setData({ saleName: e.target.value })}
          />
        </CardContent>
      </Card>

      {/* Product Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            What Are You Selling?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {products.length > 0 && (
            <div className="space-y-2">
              <Label>Select from your products</Label>
              <Select value={data.productId} onValueChange={handleProductSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a product..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.product_name} {product.price && `($${product.price})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Or enter product name manually</Label>
            <Input
              placeholder="Product/offer name"
              value={data.productName}
              onChange={(e) => setData({ productName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Original Price ($)</Label>
              <Input
                type="number"
                placeholder="297"
                value={data.originalPrice ?? ''}
                onChange={(e) => setData({ originalPrice: e.target.value ? parseFloat(e.target.value) : null })}
              />
            </div>
            <div className="space-y-2">
              <Label>Discount</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder={data.discountType === 'percentage' ? '30' : '50'}
                  value={data.discountValue ?? ''}
                  onChange={(e) => setData({ discountValue: e.target.value ? parseFloat(e.target.value) : null })}
                  className="flex-1"
                />
                <Select
                  value={data.discountType}
                  onValueChange={(v) => setData({ discountType: v as 'percentage' | 'fixed' })}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">%</SelectItem>
                    <SelectItem value="fixed">$</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {salePrice !== null && data.originalPrice && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm text-muted-foreground">Sale Price</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">${salePrice.toFixed(2)}</span>
                <span className="text-muted-foreground line-through">${data.originalPrice.toFixed(2)}</span>
                {data.discountType === 'percentage' && (
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">({data.discountValue}% OFF)</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sale Duration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Sale Duration
          </CardTitle>
          <CardDescription>Shorter sales create more urgency</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={data.saleDuration}
            onValueChange={handleDurationChange}
            className="grid grid-cols-2 md:grid-cols-3 gap-3"
          >
            {SALE_DURATIONS.map((duration) => (
              <Label
                key={duration.value}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  data.saleDuration === duration.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <RadioGroupItem value={duration.value} />
                <span className="text-sm">{duration.label}</span>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Date/Time Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Sale Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={data.startDate}
                onChange={(e) => {
                  setData({ startDate: e.target.value });
                  // Auto-calculate end date
                  if (data.saleDuration !== 'custom') {
                    const durationConfig = SALE_DURATIONS.find(d => d.value === data.saleDuration);
                    if (durationConfig && durationConfig.hours > 0) {
                      const start = new Date(e.target.value);
                      const end = new Date(start.getTime() + durationConfig.hours * 60 * 60 * 1000);
                      setData({ endDate: format(end, 'yyyy-MM-dd') });
                    }
                  }
                }}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={data.startTime}
                onChange={(e) => setData({ startTime: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={data.endDate}
                onChange={(e) => setData({ endDate: e.target.value })}
                min={data.startDate || format(new Date(), 'yyyy-MM-dd')}
                disabled={data.saleDuration !== 'custom'}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={data.endTime}
                onChange={(e) => setData({ endTime: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select
              value={data.timezone}
              onValueChange={(v) => setData({ timezone: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="America/New_York">Eastern (ET)</SelectItem>
                <SelectItem value="America/Chicago">Central (CT)</SelectItem>
                <SelectItem value="America/Denver">Mountain (MT)</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific (PT)</SelectItem>
                <SelectItem value="Europe/London">London (GMT)</SelectItem>
                <SelectItem value="Australia/Sydney">Sydney (AEST)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
