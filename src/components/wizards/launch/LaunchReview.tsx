import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Calendar, Target, DollarSign, Mail, Megaphone, Brain } from 'lucide-react';
import { LaunchWizardData } from '@/types/launch';
import { format, parseISO } from 'date-fns';

interface LaunchReviewProps {
  data: LaunchWizardData;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

export function LaunchReview({ data }: LaunchReviewProps) {
  const totalOfferBreakdown = Object.values(data.offerBreakdown).reduce((sum, v) => sum + v, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-bold">Here's what you're committing to:</h3>
        <p className="text-muted-foreground">Look good? Lock it in and let's go.</p>
      </div>

      {/* Launch Details */}
      <div className="p-4 bg-muted/50 rounded-lg border space-y-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h4 className="font-semibold text-lg">LAUNCH DETAILS</h4>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">What:</p>
            <p className="font-medium">{data.name || '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">When:</p>
            <p className="font-medium">
              {formatDate(data.cartOpens)} → {formatDate(data.cartCloses)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Revenue Goal:</p>
            <p className="font-medium">
              {data.revenueGoal ? `$${data.revenueGoal.toLocaleString()}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Price:</p>
            <p className="font-medium">
              {data.pricePerSale ? `$${data.pricePerSale.toLocaleString()}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Sales Needed:</p>
            <p className="font-medium">{data.salesNeeded || '—'}</p>
          </div>
        </div>
      </div>

      {/* Pre-Launch */}
      <div className="p-4 bg-muted/50 rounded-lg border space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h4 className="font-semibold text-lg">PRE-LAUNCH</h4>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Waitlist:</p>
            <p className="font-medium">{data.hasWaitlist ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Lead Magnet:</p>
            <p className="font-medium">
              {data.hasLeadMagnet === 'skip'
                ? 'Skipped'
                : data.hasLeadMagnet
                ? 'Ready'
                : data.leadMagnetTopic || 'Needs creation'}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-muted-foreground">Email Sequences:</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {data.emailSequences.length > 0 ? (
                data.emailSequences.map((seq) => (
                  <Badge key={seq} variant="secondary">
                    {seq}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground">None selected</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* During Launch */}
      <div className="p-4 bg-muted/50 rounded-lg border space-y-4">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          <h4 className="font-semibold text-lg">DURING LAUNCH</h4>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Live Events:</p>
            <p className="font-medium">{data.liveEvents?.length || 0} scheduled</p>
          </div>
          <div>
            <p className="text-muted-foreground">Ads:</p>
            <p className="font-medium">
              {data.hasAds === 'maybe'
                ? 'Maybe'
                : data.hasAds
                ? `Yes, $${data.adsBudget || 0}`
                : 'No'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Social:</p>
            <p className="font-medium">{data.socialPostsPerDay} posts/day</p>
          </div>
          <div>
            <p className="text-muted-foreground">Offers Goal:</p>
            <p className="font-medium text-primary font-bold">{data.offerGoal} total offers</p>
          </div>
        </div>
        {totalOfferBreakdown > 0 && (
          <div className="text-xs text-muted-foreground">
            Breakdown: {data.offerBreakdown.emails} emails, {data.offerBreakdown.socialPosts} posts,{' '}
            {data.offerBreakdown.stories} stories, {data.offerBreakdown.dms} DMs,{' '}
            {data.offerBreakdown.salesCalls} calls, {data.offerBreakdown.liveEvents} lives
          </div>
        )}
      </div>

      {/* Post-Launch */}
      <div className="p-4 bg-muted/50 rounded-lg border space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <h4 className="font-semibold text-lg">POST-LAUNCH</h4>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Buyer onboarding:</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {data.postPurchaseFlow?.length > 0 ? (
                data.postPurchaseFlow.map((flow) => (
                  <Badge key={flow} variant="outline" className="text-xs">
                    {flow.replace(/_/g, ' ')}
                  </Badge>
                ))
              ) : (
                <span>—</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-muted-foreground">Non-buyer follow-up:</p>
            <p className="font-medium">{data.nonBuyerFollowup?.replace(/_/g, ' ') || '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Debrief:</p>
            <p className="font-medium">{formatDate(data.debriefDate)}</p>
          </div>
        </div>
      </div>

      {/* Thought Work */}
      <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 space-y-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h4 className="font-semibold text-lg">THOUGHT WORK</h4>
        </div>
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-muted-foreground">Your belief:</p>
            <p className="font-medium italic">"{data.belief || '—'}"</p>
          </div>
          <div>
            <p className="text-muted-foreground">Useful thought:</p>
            <p className="font-medium italic">"{data.usefulThought || '—'}"</p>
          </div>
        </div>
      </div>
    </div>
  );
}
