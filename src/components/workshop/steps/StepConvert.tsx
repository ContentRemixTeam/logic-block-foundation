import { OFFER_FREQUENCIES, SALES_METHODS } from '../EngineBuilderTypes';
import type { EngineBuilderData } from '../EngineBuilderTypes';

interface StepConvertProps {
  data: EngineBuilderData;
  onChange: (updates: Partial<EngineBuilderData>) => void;
}

export function StepConvert({ data, onChange }: StepConvertProps) {
  const calculatedSales = data.revenueGoal && data.offerPrice && data.offerPrice > 0
    ? Math.ceil(data.revenueGoal / data.offerPrice)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          🚀 Hit the Gas — How do you make money?
        </h3>
        <p className="text-sm text-muted-foreground">
          Your turbo boost. Let's get clear on what you're selling, how much you need to make, and how you'll get there.
        </p>
      </div>

      {/* Offer details */}
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
        <div className="bg-accent/50 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
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

      {/* Offer frequency */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">How often do you sell?</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {OFFER_FREQUENCIES.map((freq) => {
            const isSelected = data.offerFrequency === freq.value;
            return (
              <button
                key={freq.value}
                onClick={() => onChange({ offerFrequency: freq.value, customOfferFrequency: '' })}
                className={`
                  flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200
                  ${isSelected
                    ? 'border-primary bg-accent shadow-md ring-2 ring-primary/20'
                    : 'border-border bg-card hover:border-primary/40'
                  }
                `}
              >
                <span className="text-xl">{freq.emoji}</span>
                <div>
                  <h5 className="font-semibold text-sm text-foreground">{freq.label}</h5>
                </div>
              </button>
            );
          })}
          {/* Something else */}
          <button
            onClick={() => onChange({ offerFrequency: 'other' })}
            className={`
              flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200
              ${data.offerFrequency === 'other'
                ? 'border-primary bg-accent shadow-md ring-2 ring-primary/20'
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
      <div>
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
                    ? 'border-primary bg-accent shadow-sm'
                    : 'border-border bg-card hover:border-primary/40'
                  }
                `}
              >
                <span className="text-lg">{method.emoji}</span>
                <span className="text-sm font-medium text-foreground">{method.label}</span>
              </button>
            );
          })}
          {/* Something else */}
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
                ? 'border-primary bg-accent shadow-sm'
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
