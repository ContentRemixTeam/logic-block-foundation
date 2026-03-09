import { EMAIL_METHODS, SECONDARY_NURTURE_OPTIONS } from '../EngineBuilderTypes';
import type { EngineBuilderData } from '../EngineBuilderTypes';

interface StepNurtureProps {
  data: EngineBuilderData;
  onChange: (updates: Partial<EngineBuilderData>) => void;
}

export function StepNurture({ data, onChange }: StepNurtureProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          🔧 Build Your Engine — How do you stay connected?
        </h3>
        <p className="text-sm text-muted-foreground">
          Email is your engine block — it's the core that keeps running no matter what. Pick how you'll use it, then add a secondary method.
        </p>
      </div>

      {/* Email method */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <span className="text-base">📧</span> Email (required — your engine core)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {EMAIL_METHODS.map((method) => {
            const isSelected = data.emailMethod === method.value;
            return (
              <button
                key={method.value}
                onClick={() => onChange({ emailMethod: method.value, customEmailMethod: '' })}
                className={`
                  text-left p-4 rounded-xl border-2 transition-all duration-200
                  ${isSelected
                    ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20'
                    : 'border-border bg-card hover:border-primary/40'
                  }
                `}
              >
                <h5 className="font-semibold text-sm text-foreground">{method.label}</h5>
                <p className="text-xs text-muted-foreground mt-1">{method.description}</p>
              </button>
            );
          })}
          {/* Something else */}
          <button
            onClick={() => onChange({ emailMethod: 'other' })}
            className={`
              text-left p-4 rounded-xl border-2 transition-all duration-200
              ${data.emailMethod === 'other'
                ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20'
                : 'border-dashed border-border bg-card hover:border-primary/40'
              }
            `}
          >
            <h5 className="font-semibold text-sm text-foreground">✨ Something else</h5>
            <p className="text-xs text-muted-foreground mt-1">I use a different method</p>
          </button>
        </div>
        {data.emailMethod === 'other' && (
          <input
            type="text"
            value={data.customEmailMethod}
            onChange={(e) => onChange({ customEmailMethod: e.target.value })}
            placeholder="Describe your email approach..."
            className="mt-3 w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        )}
      </div>

      {/* Free transformation */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">
          What free transformation do you give your email subscribers?
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Your lead magnet / opt-in — what quick win do people get for joining your list?
        </p>
        <input
          type="text"
          value={data.freeTransformation}
          onChange={(e) => onChange({ freeTransformation: e.target.value })}
          placeholder="e.g., Free 5-day email course on..."
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      {/* Secondary nurture */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">
          Optional: Add a secondary nurture method
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SECONDARY_NURTURE_OPTIONS.map((option) => {
            const isSelected = data.secondaryNurture === option.value;
            return (
              <button
                key={option.value}
                onClick={() => onChange({ secondaryNurture: option.value, customNurture: '' })}
                className={`
                  flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all duration-200
                  ${isSelected
                    ? 'border-primary bg-accent shadow-sm'
                    : 'border-border bg-card hover:border-primary/40'
                  }
                `}
              >
                <span className="text-lg">{option.emoji}</span>
                <span className="text-sm font-medium text-foreground">{option.label}</span>
              </button>
            );
          })}
          {/* Something else */}
          <button
            onClick={() => onChange({ secondaryNurture: 'other' })}
            className={`
              flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all duration-200
              ${data.secondaryNurture === 'other'
                ? 'border-primary bg-accent shadow-sm'
                : 'border-dashed border-border bg-card hover:border-primary/40'
              }
            `}
          >
            <span className="text-lg">✨</span>
            <span className="text-sm font-medium text-foreground">Something else</span>
          </button>
        </div>
        {data.secondaryNurture === 'other' && (
          <input
            type="text"
            value={data.customNurture}
            onChange={(e) => onChange({ customNurture: e.target.value })}
            placeholder="What's your secondary nurture method?"
            className="mt-3 w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        )}
      </div>
    </div>
  );
}
