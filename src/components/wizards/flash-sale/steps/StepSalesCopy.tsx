import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FlashSaleWizardData } from '@/types/flashSale';
import { Sparkles, X, Plus, Wand2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StepProps {
  data: FlashSaleWizardData;
  setData: (updates: Partial<FlashSaleWizardData>) => void;
}

export function StepSalesCopy({ data, setData }: StepProps) {
  const [newBullet, setNewBullet] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const addBullet = () => {
    if (newBullet.trim() && data.bullets.length < 5) {
      setData({ bullets: [...data.bullets, newBullet.trim()] });
      setNewBullet('');
    }
  };

  const removeBullet = (index: number) => {
    setData({ bullets: data.bullets.filter((_, i) => i !== index) });
  };

  const generateCopy = async () => {
    setIsGenerating(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('generate-flash-sale-copy', {
        body: {
          productName: data.productName,
          originalPrice: data.originalPrice,
          salePrice: data.salePrice || (data.originalPrice && data.discountValue 
            ? data.discountType === 'percentage' 
              ? data.originalPrice * (1 - data.discountValue / 100)
              : data.originalPrice - data.discountValue
            : null),
          discountValue: data.discountValue,
          discountType: data.discountType,
          targetAudience: data.targetAudience,
          painPoints: data.painPoints,
          whyNow: data.whyNow,
          urgencyType: data.urgencyType,
          scarcityMessage: data.scarcityMessage,
          earlyBirdBonus: data.earlyBirdBonus,
          flashBonus: data.flashBonus,
        },
      });

      if (error) throw error;

      if (result) {
        setData({
          headline: result.headline || data.headline,
          subheadline: result.subheadline || data.subheadline,
          urgencyHook: result.urgencyHook || data.urgencyHook,
          bullets: result.bullets || data.bullets,
          cta: result.cta || data.cta,
        });
        toast.success('Copy generated!');
      }
    } catch (error) {
      console.error('Error generating copy:', error);
      toast.error('Failed to generate copy. Try again or write manually.');
    } finally {
      setIsGenerating(false);
    }
  };

  const salePrice = data.salePrice || (data.originalPrice && data.discountValue 
    ? data.discountType === 'percentage' 
      ? data.originalPrice * (1 - data.discountValue / 100)
      : data.originalPrice - data.discountValue
    : null);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-pink-500/10">
          <Sparkles className="h-8 w-8 text-pink-500" />
        </div>
        <h2 className="text-2xl font-bold">Sales Copy</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Create compelling copy for your sales page and promotions
        </p>
      </div>

      {/* AI Generate Button */}
      <Card className="border-dashed border-2">
        <CardContent className="py-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="p-3 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20">
              <Wand2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-medium">Let AI write your sales copy</p>
              <p className="text-sm text-muted-foreground">
                Based on your product, audience, and urgency settings
              </p>
            </div>
            <Button 
              onClick={generateCopy} 
              disabled={isGenerating || !data.productName}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Generate Sales Copy
                </>
              )}
            </Button>
            {!data.productName && (
              <p className="text-xs text-muted-foreground">
                Add your product name in Step 1 first
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Headline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Main Headline</CardTitle>
          <CardDescription>
            The first thing people see - make it grab attention
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="e.g., Get [Product] for 50% OFF (48 Hours Only)"
            value={data.headline}
            onChange={(e) => setData({ headline: e.target.value })}
            rows={2}
          />
          
          <div className="space-y-2">
            <Label>Subheadline</Label>
            <Textarea
              placeholder="e.g., The complete system to [transformation] - at our lowest price ever"
              value={data.subheadline}
              onChange={(e) => setData({ subheadline: e.target.value })}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Urgency Hook */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Urgency Hook</CardTitle>
          <CardDescription>
            The line that creates FOMO and drives action
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="e.g., This price disappears in 48 hours. After that, it's back to $297."
            value={data.urgencyHook}
            onChange={(e) => setData({ urgencyHook: e.target.value })}
            rows={2}
          />
        </CardContent>
      </Card>

      {/* Bullets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Benefit Bullets</CardTitle>
          <CardDescription>
            3-5 quick wins they'll get from this offer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add a benefit..."
              value={newBullet}
              onChange={(e) => setNewBullet(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBullet())}
              disabled={data.bullets.length >= 5}
            />
            <Button 
              onClick={addBullet} 
              variant="secondary" 
              size="icon"
              disabled={data.bullets.length >= 5}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {data.bullets.length > 0 && (
            <div className="space-y-2">
              {data.bullets.map((bullet, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-muted rounded-lg"
                >
                  <span className="text-green-500">✓</span>
                  <span className="flex-1 text-sm">{bullet}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeBullet(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {data.bullets.length}/5 bullets
          </p>
        </CardContent>
      </Card>

      {/* CTA */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Call to Action Button</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="e.g., Get It Now, Claim My Discount, Yes, I Want This!"
            value={data.cta}
            onChange={(e) => setData({ cta: e.target.value })}
          />
        </CardContent>
      </Card>

      {/* Preview */}
      {(data.headline || data.bullets.length > 0) && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-red-500 to-orange-500 text-white">
            <div className="text-center">
              <span className="inline-block px-3 py-1 bg-white/20 rounded text-sm font-bold mb-2">
                🔥 FLASH SALE
              </span>
            </div>
          </CardHeader>
          <CardContent className="py-6 text-center space-y-4">
            {data.headline && (
              <h3 className="text-2xl font-bold">{data.headline}</h3>
            )}
            {data.subheadline && (
              <p className="text-muted-foreground">{data.subheadline}</p>
            )}
            
            {salePrice && data.originalPrice && (
              <div className="flex items-baseline justify-center gap-3">
                <span className="text-4xl font-bold text-green-600">
                  ${salePrice.toFixed(0)}
                </span>
                <span className="text-xl text-muted-foreground line-through">
                  ${data.originalPrice.toFixed(0)}
                </span>
              </div>
            )}

            {data.urgencyHook && (
              <p className="text-sm font-medium text-red-500">{data.urgencyHook}</p>
            )}

            {data.bullets.length > 0 && (
              <ul className="text-left max-w-sm mx-auto space-y-2">
                {data.bullets.map((bullet, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-green-500">✓</span>
                    <span className="text-sm">{bullet}</span>
                  </li>
                ))}
              </ul>
            )}

            {data.cta && (
              <Button size="lg" className="mt-4">
                {data.cta}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
