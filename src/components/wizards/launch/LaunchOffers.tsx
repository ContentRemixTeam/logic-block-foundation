import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, TrendingUp } from 'lucide-react';
import { LaunchWizardData } from '@/types/launch';

interface LaunchOffersProps {
  data: LaunchWizardData;
  onChange: (updates: Partial<LaunchWizardData>) => void;
}

export function LaunchOffers({ data, onChange }: LaunchOffersProps) {
  const updateBreakdown = (key: keyof LaunchWizardData['offerBreakdown'], value: number) => {
    const updated = { ...data.offerBreakdown, [key]: value };
    onChange({ offerBreakdown: updated });
  };

  const totalBreakdown = Object.values(data.offerBreakdown).reduce((sum, v) => sum + v, 0);
  const isLowOfferGoal = data.offerGoal < 30;

  return (
    <div className="space-y-8">
      {/* The pitch */}
      <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
        <p className="font-semibold text-lg mb-2">
          Real talk: Making offers = revenue.
        </p>
        <p className="text-muted-foreground">
          How many times will you ask people to buy during this launch?
        </p>
        <p className="text-sm mt-2">
          For a 7-day launch, you should be making{' '}
          <span className="font-bold text-primary">50-70 offers minimum</span>.
        </p>
        <p className="text-sm text-muted-foreground mt-1">Yes, really. Don't be shy about it.</p>
      </div>

      {/* What counts */}
      <div className="space-y-2">
        <Label className="font-semibold">What counts as making an offer:</Label>
        <ul className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <Checkbox checked disabled className="pointer-events-none opacity-50" />
            Email with buy link
          </li>
          <li className="flex items-center gap-2">
            <Checkbox checked disabled className="pointer-events-none opacity-50" />
            Social post with CTA
          </li>
          <li className="flex items-center gap-2">
            <Checkbox checked disabled className="pointer-events-none opacity-50" />
            DM about your product
          </li>
          <li className="flex items-center gap-2">
            <Checkbox checked disabled className="pointer-events-none opacity-50" />
            Story with swipe-up
          </li>
          <li className="flex items-center gap-2">
            <Checkbox checked disabled className="pointer-events-none opacity-50" />
            Live where you pitch
          </li>
          <li className="flex items-center gap-2">
            <Checkbox checked disabled className="pointer-events-none opacity-50" />
            Sales call
          </li>
        </ul>
      </div>

      {/* Main offer goal */}
      <div className="space-y-3">
        <Label htmlFor="offer-goal" className="text-lg font-semibold">
          Your offer goal for this launch:
        </Label>
        <div className="flex items-center gap-4">
          <Input
            id="offer-goal"
            type="number"
            min="1"
            value={data.offerGoal}
            onChange={(e) => onChange({ offerGoal: parseInt(e.target.value) || 0 })}
            className="w-32 text-2xl font-bold text-center"
          />
          <span className="text-lg text-muted-foreground">offers</span>
        </div>
        {isLowOfferGoal && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-md text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <p className="text-sm">
              If you picked less than 30 for a week-long launch, you're leaving money on the table. Just saying.
            </p>
          </div>
        )}
      </div>

      {/* Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-semibold">How will you make these offers?</Label>
          {totalBreakdown > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span>
                Total: <strong>{totalBreakdown}</strong>
                {totalBreakdown < data.offerGoal && (
                  <span className="text-muted-foreground">
                    {' '}(need {data.offerGoal - totalBreakdown} more)
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">Break it down:</p>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <Label htmlFor="breakdown-emails">Launch emails</Label>
            <Input
              id="breakdown-emails"
              type="number"
              min="0"
              value={data.offerBreakdown.emails || ''}
              onChange={(e) => updateBreakdown('emails', parseInt(e.target.value) || 0)}
              className="w-20 text-center"
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <Label htmlFor="breakdown-social">Social posts</Label>
            <Input
              id="breakdown-social"
              type="number"
              min="0"
              value={data.offerBreakdown.socialPosts || ''}
              onChange={(e) => updateBreakdown('socialPosts', parseInt(e.target.value) || 0)}
              className="w-20 text-center"
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <Label htmlFor="breakdown-stories">Stories</Label>
            <Input
              id="breakdown-stories"
              type="number"
              min="0"
              value={data.offerBreakdown.stories || ''}
              onChange={(e) => updateBreakdown('stories', parseInt(e.target.value) || 0)}
              className="w-20 text-center"
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <Label htmlFor="breakdown-dms">DM conversations</Label>
            <Input
              id="breakdown-dms"
              type="number"
              min="0"
              value={data.offerBreakdown.dms || ''}
              onChange={(e) => updateBreakdown('dms', parseInt(e.target.value) || 0)}
              className="w-20 text-center"
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <Label htmlFor="breakdown-calls">Sales calls</Label>
            <Input
              id="breakdown-calls"
              type="number"
              min="0"
              value={data.offerBreakdown.salesCalls || ''}
              onChange={(e) => updateBreakdown('salesCalls', parseInt(e.target.value) || 0)}
              className="w-20 text-center"
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <Label htmlFor="breakdown-lives">Live events</Label>
            <Input
              id="breakdown-lives"
              type="number"
              min="0"
              value={data.offerBreakdown.liveEvents || ''}
              onChange={(e) => updateBreakdown('liveEvents', parseInt(e.target.value) || 0)}
              className="w-20 text-center"
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          Daily offer tracking: The app will give you a checkbox every day during launch:{' '}
          <em>"Did you make an offer today?"</em> Use it.
        </p>
      </div>
    </div>
  );
}
