import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Rocket, Zap, Calendar, Gift, Package, Heart, Sparkles } from 'lucide-react';
import { useActivePromotions } from '@/hooks/useActivePromotions';
import { ContentChallengeWizardData, PromotionContext } from '@/types/contentChallenge';
import { format, parseISO } from 'date-fns';

interface StepContextCheckProps {
  data: ContentChallengeWizardData;
  setData: (updates: Partial<ContentChallengeWizardData>) => void;
  goNext: () => void;
  goBack: () => void;
}

const PROMOTION_TYPES = [
  { type: 'launch', label: 'Product Launch', icon: Rocket, description: 'Launching a course, program, or product' },
  { type: 'flash_sale', label: 'Flash Sale / Promo', icon: Zap, description: 'Running a time-limited discount or offer' },
  { type: 'webinar', label: 'Webinar / Event', icon: Calendar, description: 'Promoting an upcoming live event' },
  { type: 'lead_magnet', label: 'Lead Magnet', icon: Gift, description: 'Growing your list with a freebie' },
  { type: 'product', label: 'Evergreen Product', icon: Package, description: 'Promoting an always-available offer' },
  { type: 'nurture', label: 'Just Nurturing', icon: Heart, description: 'Building relationship, no specific promo' },
] as const;

export default function StepContextCheck({ data, setData }: StepContextCheckProps) {
  const { data: promotions, isLoading } = useActivePromotions();

  // Auto-detect if there's an active launch or flash sale
  useEffect(() => {
    if (promotions && promotions.length > 0 && !data.hasActivePromotion) {
      const activeLaunch = promotions.find(p => p.type === 'launch');
      const activeFlashSale = promotions.find(p => p.type === 'flash_sale');
      
      if (activeLaunch || activeFlashSale) {
        const promo = activeLaunch || activeFlashSale;
        setData({
          hasActivePromotion: true,
          promotionContext: {
            type: promo!.type as PromotionContext['type'],
            id: promo!.id,
            name: promo!.name,
          },
        });
      }
    }
  }, [promotions, data.hasActivePromotion, setData]);

  const handlePromotionTypeChange = (type: string) => {
    if (type === 'custom') {
      setData({
        promotionContext: {
          type: 'custom',
          description: '',
        },
      });
    } else {
      setData({
        promotionContext: {
          type: type as PromotionContext['type'],
        },
      });
    }
  };

  const handleExistingPromotionSelect = (promo: { id: string; type: string; name: string }) => {
    setData({
      promotionContext: {
        type: promo.type as PromotionContext['type'],
        id: promo.id,
        name: promo.name,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Checking for active promotions...</span>
      </div>
    );
  }

  const activeLaunches = promotions?.filter(p => p.type === 'launch') || [];
  const activeFlashSales = promotions?.filter(p => p.type === 'flash_sale') || [];
  const products = promotions?.filter(p => p.type === 'product') || [];
  const hasActivePromotions = activeLaunches.length > 0 || activeFlashSales.length > 0;

  return (
    <div className="space-y-6">
      {/* Active Promotions Section */}
      {hasActivePromotions && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Active Promotions Detected
            </CardTitle>
            <CardDescription>
              We found active promotions in your account. Would you like to create content supporting one of these?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeLaunches.map(launch => (
              <button
                key={launch.id}
                onClick={() => handleExistingPromotionSelect(launch)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  data.promotionContext.id === launch.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <Rocket className="h-4 w-4 text-primary" />
                      {launch.name}
                    </div>
                    {launch.startDate && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {format(parseISO(launch.startDate), 'MMM d')} - {launch.endDate && format(parseISO(launch.endDate), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>
                  <Badge variant="secondary">Launch</Badge>
                </div>
              </button>
            ))}
            {activeFlashSales.map(sale => (
              <button
                key={sale.id}
                onClick={() => handleExistingPromotionSelect(sale)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  data.promotionContext.id === sale.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      {sale.name}
                    </div>
                    {sale.startDate && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {format(parseISO(sale.startDate), 'MMM d')} - {sale.endDate && format(parseISO(sale.endDate), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>
                  <Badge variant="secondary">Flash Sale</Badge>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Choose Content Focus */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {hasActivePromotions ? 'Or choose a different focus' : 'What\'s your content focus?'}
          </CardTitle>
          <CardDescription>
            Select what you want to promote over the next 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={data.promotionContext.id ? '' : data.promotionContext.type}
            onValueChange={handlePromotionTypeChange}
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            {PROMOTION_TYPES.map(({ type, label, icon: Icon, description }) => (
              <Label
                key={type}
                htmlFor={type}
                className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  data.promotionContext.type === type && !data.promotionContext.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <RadioGroupItem value={type} id={type} className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {label}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{description}</p>
                </div>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Products to Promote */}
      {products.length > 0 && data.promotionContext.type === 'product' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select a Product to Promote</CardTitle>
            <CardDescription>Choose from your existing products</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {products.map(product => (
              <button
                key={product.id}
                onClick={() => handleExistingPromotionSelect(product)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  data.promotionContext.id === product.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="font-medium">{product.name}</div>
                {product.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
                )}
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Custom Description for lead magnet, webinar, or custom */}
      {(data.promotionContext.type === 'lead_magnet' || 
        data.promotionContext.type === 'webinar' || 
        data.promotionContext.type === 'custom') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {data.promotionContext.type === 'lead_magnet' && 'Describe your lead magnet'}
              {data.promotionContext.type === 'webinar' && 'Describe your webinar or event'}
              {data.promotionContext.type === 'custom' && 'Describe what you\'re promoting'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="e.g., A free email course on productivity for busy entrepreneurs..."
              value={data.promotionContext.description || ''}
              onChange={(e) => setData({
                promotionContext: {
                  ...data.promotionContext,
                  description: e.target.value,
                },
              })}
              className="min-h-[100px]"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
