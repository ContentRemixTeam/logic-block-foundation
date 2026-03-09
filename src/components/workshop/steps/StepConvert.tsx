import { SALES_METHODS } from '../EngineBuilderTypes';
import type { EngineBuilderData, SecondaryOffer } from '../EngineBuilderTypes';

const SELL_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly', description: 'You make offers every week — flash sales, promos, or weekly pitches in your emails', emoji: '📅' },
  { value: 'evergreen-urgency', label: 'Evergreen with urgency', description: 'Always available, but you create momentum with expiring bonuses, limited-time prices, or deadlines', emoji: '🌿' },
  { value: 'monthly', label: 'Monthly launches', description: '3 weeks nurture, 1 week open cart with urgency and deadline', emoji: '🗓️' },
  { value: 'quarterly', label: 'Quarterly launches', description: 'Consistent nurture all quarter, one focused launch window', emoji: '🗓️' },
  { value: 'yearly', label: '1-2x per year', description: 'Big launches, longer build-up, high urgency windows', emoji: '🎯' },
];

const SECONDARY_REVENUE_SOURCES = [
  { value: 'order-bumps', label: 'Order bumps & upsells', sublabel: 'Add-ons at checkout that increase what buyers spend', emoji: '🛒' },
  { value: 'affiliate', label: 'Affiliate income', sublabel: 'Commissions from recommending other people\'s products', emoji: '🤝' },
  { value: 'digital-shop', label: 'Digital product shop', sublabel: 'Templates, workbooks, low-ticket products available anytime', emoji: '🛍️' },
  { value: 'workshops', label: 'Workshops & events', sublabel: 'One-off paid trainings, intensives, or live events', emoji: '🎟️' },
  { value: 'vip-services', label: '1:1 services or VIP days', sublabel: 'Done-for-you work or high-touch private clients', emoji: '💎' },
  { value: 'membership', label: 'Membership or subscription', sublabel: 'Recurring monthly or annual revenue from ongoing access', emoji: '🔁' },
  { value: 'speaking', label: 'Speaking or brand deals', sublabel: 'Paid appearances, sponsorships, or brand partnerships', emoji: '🎤' },
];

interface StepConvertProps {
  data: EngineBuilderData;
  onChange: (updates: Partial<EngineBuilderData>) => void;
}

export function StepConvert({ data, onChange }: StepConvertProps) {
  const calculatedSales = data.revenueGoal && data.offerPrice && data.offerPrice > 0
    ? Math.ceil(data.revenueGoal / data.offerPrice)
    : null;

  const addSecondaryOffer = () => {
    onChange({ secondaryOffers: [...data.secondaryOffers, { name: '', price: '' }] });
  };

  const updateSecondaryOffer = (index: number, field: keyof SecondaryOffer, value: string) => {
    const updated = [...data.secondaryOffers];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ secondaryOffers: updated });
  };

  const removeSecondaryOffer = (index: number) => {
    onChange({ secondaryOffers: data.secondaryOffers.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          🚀 Hit the Gas — How do you make money?
        </h3>
        <p className="text-sm text-muted-foreground">
          Your turbo boost. This is where the money lives — your offer, your goal, and the system you're using to sell it consistently.
        </p>
      </div>

      {/* Main Offer details */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Your Main Offer</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              What's your main offer?
            </label>
            <input
              type="text"
              value={data.offerName}
              onChange={(e) => onChange({ offerName: e.target.value })}
              placeholder="e.g., 1:1 Coaching, Course, Membership..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              Price per sale ($)
            </label>
            <input
              type="number"
              value={data.offerPrice ?? ''}
              onChange={(e) => onChange({ offerPrice: e.target.value ? Number(e.target.value) : null })}
              placeholder="997"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Revenue goal */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">
          90-day revenue goal ($)
        </label>
        <input
          type="number"
          value={data.revenueGoal ?? ''}
          onChange={(e) => onChange({ revenueGoal: e.target.value ? Number(e.target.value) : null })}
          placeholder="10000"
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      {/* Auto-calculated sales needed */}
      {calculatedSales !== null && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">🎯</span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              You need {calculatedSales} sale{calculatedSales !== 1 ? 's' : ''} in 90 days
            </p>
            <p className="text-xs text-muted-foreground">
              That's roughly {Math.ceil(calculatedSales / 12)} sale{Math.ceil(calculatedSales / 12) !== 1 ? 's' : ''} per week
              {' '}or {Math.ceil(calculatedSales / 3)} per month
            </p>
          </div>
        </div>
      )}

      {/* Secondary Offers */}
      <div className="border-t border-border pt-6">
        <h4 className="text-sm font-semibold text-foreground mb-1">Secondary Offers</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Do you have other offers you actively sell? Add them here. These won't drive your revenue loop — but they'll show up on your blueprint.
        </p>
        {data.secondaryOffers.map((offer, index) => (
          <div key={index} className="flex items-center gap-3 mb-2">
            <input
              type="text"
              value={offer.name}
              onChange={(e) => updateSecondaryOffer(index, 'name', e.target.value)}
              placeholder="Offer name"
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <input
              type="text"
              value={offer.price}
              onChange={(e) => updateSecondaryOffer(index, 'price', e.target.value)}
              placeholder="Price"
              className="w-24 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <button
              onClick={() => removeSecondaryOffer(index)}
              className="text-muted-foreground hover:text-destructive transition-colors text-sm px-2"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={addSecondaryOffer}
          className="text-sm text-primary font-medium hover:underline mt-1"
        >
          + Add another offer
        </button>
      </div>

      {/* Secondary Revenue Sources */}
      <div className="border-t border-border pt-6">
        <h4 className="text-sm font-semibold text-foreground mb-1">Secondary Revenue Sources</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Your main offer is your focus. But money comes from multiple places — even if these are smaller or less frequent. Check everything that applies to your business right now.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SECONDARY_REVENUE_SOURCES.map((source) => {
            const isSelected = data.secondaryRevenueSources.includes(source.value);
            return (
              <button
                key={source.value}
                onClick={() => {
                  const updated = isSelected
                    ? data.secondaryRevenueSources.filter((s) => s !== source.value)
                    : [...data.secondaryRevenueSources, source.value];
                  onChange({ secondaryRevenueSources: updated });
                }}
                className={`
                  flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all duration-200
                  ${isSelected
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border bg-card hover:border-primary/40'
                  }
                `}
              >
                <span className="text-lg">{source.emoji}</span>
                <div>
                  <span className="text-sm font-medium text-foreground">{source.label}</span>
                  <p className="text-xs text-muted-foreground">{source.sublabel}</p>
                </div>
              </button>
            );
          })}
          <button
            onClick={() => {
              const updated = data.secondaryRevenueSources.includes('other')
                ? data.secondaryRevenueSources.filter((s) => s !== 'other')
                : [...data.secondaryRevenueSources, 'other'];
              onChange({ secondaryRevenueSources: updated });
            }}
            className={`
              flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all duration-200
              ${data.secondaryRevenueSources.includes('other')
                ? 'border-primary bg-primary/10 shadow-sm'
                : 'border-dashed border-border bg-card hover:border-primary/40'
              }
            `}
          >
            <span className="text-lg">✨</span>
            <div>
              <span className="text-sm font-medium text-foreground">Something else</span>
            </div>
          </button>
        </div>
        {data.secondaryRevenueSources.includes('other') && (
          <input
            type="text"
            value={data.customRevenueSource}
            onChange={(e) => onChange({ customRevenueSource: e.target.value })}
            placeholder="Describe your other revenue source..."
            className="mt-3 w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        )}
        {data.secondaryRevenueSources.length > 0 && (
          <div className="mt-4">
            <label className="text-sm font-medium text-foreground mb-1 block">
              Which of these do you want to grow this quarter?
            </label>
            <input
              type="text"
              value={data.revenueSourceGrowthGoal}
              onChange={(e) => onChange({ revenueSourceGrowthGoal: e.target.value })}
              placeholder="e.g. I want to add an order bump to my checkout and start promoting one affiliate offer"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        )}
      </div>

      {/* Offer frequency */}
      <div className="border-t border-border pt-6">
        <h4 className="text-sm font-semibold text-foreground mb-1">How often do you sell?</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Even evergreen offers should have urgency. A bonus that expires, a limited-time price, a reason to buy today — that's what moves people from "interested" to "bought."
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SELL_FREQUENCIES.map((freq) => {
            const isSelected = data.offerFrequency === freq.value;
            return (
              <button
                key={freq.value}
                onClick={() => onChange({ offerFrequency: freq.value, customOfferFrequency: '' })}
                className={`
                  flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200
                  ${isSelected
                    ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20'
                    : 'border-border bg-card hover:border-primary/40'
                  }
                `}
              >
                <span className="text-xl">{freq.emoji}</span>
                <div>
                  <h5 className="font-semibold text-sm text-foreground">{freq.label}</h5>
                  <p className="text-xs text-muted-foreground">{freq.description}</p>
                </div>
              </button>
            );
          })}
          <button
            onClick={() => onChange({ offerFrequency: 'other' })}
            className={`
              flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200
              ${data.offerFrequency === 'other'
                ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20'
                : 'border-dashed border-border bg-card hover:border-primary/40'
              }
            `}
          >
            <span className="text-xl">✨</span>
            <div>
              <h5 className="font-semibold text-sm text-foreground">Something else</h5>
              <p className="text-xs text-muted-foreground">Custom frequency</p>
            </div>
          </button>
        </div>
        {data.offerFrequency === 'other' && (
          <input
            type="text"
            value={data.customOfferFrequency}
            onChange={(e) => onChange({ customOfferFrequency: e.target.value })}
            placeholder="Describe your selling frequency..."
            className="mt-3 w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        )}
      </div>

      {/* Sales methods */}
      <div className="border-t border-border pt-6">
        <h4 className="text-sm font-semibold text-foreground mb-3">How do you close sales? (pick all that apply)</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SALES_METHODS.map((method) => {
            const isSelected = data.salesMethods.includes(method.value);
            return (
              <button
                key={method.value}
                onClick={() => {
                  const updated = isSelected
                    ? data.salesMethods.filter((m) => m !== method.value)
                    : [...data.salesMethods, method.value];
                  onChange({ salesMethods: updated });
                }}
                className={`
                  flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all duration-200
                  ${isSelected
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border bg-card hover:border-primary/40'
                  }
                `}
              >
                <span className="text-lg">{method.emoji}</span>
                <span className="text-sm font-medium text-foreground">{method.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => {
              const updated = data.salesMethods.includes('other')
                ? data.salesMethods.filter((m) => m !== 'other')
                : [...data.salesMethods, 'other'];
              onChange({ salesMethods: updated });
            }}
            className={`
              flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all duration-200
              ${data.salesMethods.includes('other')
                ? 'border-primary bg-primary/10 shadow-sm'
                : 'border-dashed border-border bg-card hover:border-primary/40'
              }
            `}
          >
            <span className="text-lg">✨</span>
            <span className="text-sm font-medium text-foreground">Something else</span>
          </button>
        </div>
        {data.salesMethods.includes('other') && (
          <input
            type="text"
            value={data.customSalesMethod}
            onChange={(e) => onChange({ customSalesMethod: e.target.value })}
            placeholder="Describe your sales method..."
            className="mt-3 w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        )}
      </div>
    </div>
  );
}
