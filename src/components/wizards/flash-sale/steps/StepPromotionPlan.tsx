import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FlashSaleWizardData } from '@/types/flashSale';
import { Megaphone, DollarSign } from 'lucide-react';

interface StepProps {
  data: FlashSaleWizardData;
  setData: (updates: Partial<FlashSaleWizardData>) => void;
}

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'facebook', label: 'Facebook', icon: '👤' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { id: 'twitter', label: 'X/Twitter', icon: '🐦' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
  { id: 'pinterest', label: 'Pinterest', icon: '📌' },
  { id: 'youtube', label: 'YouTube', icon: '▶️' },
  { id: 'email', label: 'Email List', icon: '📧' },
];

export function StepPromotionPlan({ data, setData }: StepProps) {
  const togglePlatform = (platformId: string) => {
    const current = data.promotionPlatforms;
    if (current.includes(platformId)) {
      setData({ promotionPlatforms: current.filter((p) => p !== platformId) });
    } else {
      setData({ promotionPlatforms: [...current, platformId] });
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-green-500/10">
          <Megaphone className="h-8 w-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold">Promotion Plan</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Where and how will you spread the word about your sale?
        </p>
      </div>

      {/* Platform Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Where Will You Promote?</CardTitle>
          <CardDescription>
            Select all platforms where you'll share your flash sale
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PLATFORMS.map((platform) => (
              <label
                key={platform.id}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  data.promotionPlatforms.includes(platform.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Checkbox
                  checked={data.promotionPlatforms.includes(platform.id)}
                  onCheckedChange={() => togglePlatform(platform.id)}
                />
                <span className="text-lg">{platform.icon}</span>
                <span className="text-sm">{platform.label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Promotion Schedule Preview */}
      {data.promotionPlatforms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Suggested Promo Schedule</CardTitle>
            <CardDescription>
              Based on your selected platforms and sale duration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-lg">
                <span className="text-2xl">📢</span>
                <div>
                  <p className="font-medium">1 day before: Teaser post</p>
                  <p className="text-sm text-muted-foreground">
                    Build anticipation without revealing the discount
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg">
                <span className="text-2xl">🎉</span>
                <div>
                  <p className="font-medium">Sale opens: Announcement</p>
                  <p className="text-sm text-muted-foreground">
                    Big reveal post + stories + email blast
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-lg">
                <span className="text-2xl">⏰</span>
                <div>
                  <p className="font-medium">Midpoint: Reminder + social proof</p>
                  <p className="text-sm text-muted-foreground">
                    Share wins, testimonials, or sales count
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg">
                <span className="text-2xl">🔥</span>
                <div>
                  <p className="font-medium">Last hours: Final push</p>
                  <p className="text-sm text-muted-foreground">
                    Stories countdown, last chance email, live video
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              All promo tasks will be created in the Review step
            </p>
          </CardContent>
        </Card>
      )}

      {/* Paid Ads */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Paid Advertising (Optional)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Run paid ads for this sale?</Label>
              <p className="text-sm text-muted-foreground">
                Retargeting ads can boost flash sale conversions
              </p>
            </div>
            <Switch
              checked={data.useAds}
              onCheckedChange={(checked) => setData({ useAds: checked })}
            />
          </div>

          {data.useAds && (
            <div className="space-y-2">
              <Label>Ad budget ($)</Label>
              <Input
                type="number"
                placeholder="e.g., 100"
                value={data.adBudget ?? ''}
                onChange={(e) => setData({ adBudget: e.target.value ? parseFloat(e.target.value) : null })}
              />
              <p className="text-xs text-muted-foreground">
                Recommended: $5-10/day for retargeting warm audiences
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {data.promotionPlatforms.length > 0 && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="py-4">
            <p className="text-sm">
              <strong>Your promo plan:</strong> You'll promote on{' '}
              <span className="font-medium">
                {data.promotionPlatforms.length} platform{data.promotionPlatforms.length > 1 ? 's' : ''}
              </span>
              {data.useAds && data.adBudget && (
                <> with a <span className="font-medium">${data.adBudget}</span> ad budget</>
              )}
              . Tasks will be auto-generated in the next step.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
