import { SECONDARY_NURTURE_OPTIONS } from '../EngineBuilderTypes';
import type { EngineBuilderData } from '../EngineBuilderTypes';

const EMAIL_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly', emoji: '📅' },
  { value: 'biweekly', label: 'Every 2 Weeks', emoji: '📆' },
  { value: 'monthly', label: 'Monthly', emoji: '🗓️' },
  { value: 'daily', label: 'Daily', emoji: '⚡' },
];

interface StepNurtureProps {
  data: EngineBuilderData;
  onChange: (updates: Partial<EngineBuilderData>) => void;
}

export function StepNurture({ data, onChange }: StepNurtureProps) {
  const filteredNurtureOptions = SECONDARY_NURTURE_OPTIONS.filter(
    (option) => option.value !== 'dm'
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          🔧 Build Your Engine — How do you stay connected?
        </h3>
        <p className="text-sm text-muted-foreground">
          Email is your engine block — it's the core that keeps running no matter what.
        </p>
      </div>

      {/* Email frequency */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <span className="text-base">📧</span> How often do you send your email newsletter?
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {EMAIL_FREQUENCIES.map((freq) => {
            const isSelected = data.emailMethod === freq.value;
            return (
              <button
                key={freq.value}
                onClick={() => onChange({ emailMethod: freq.value, customEmailMethod: '' })}
                className={`
                  flex items-center gap-2 p-4 rounded-xl border-2 text-left transition-all duration-200
                  ${isSelected
                    ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20'
                    : 'border-border bg-card hover:border-primary/40'
                  }
                `}
              >
                <span className="text-lg">{freq.emoji}</span>
                <span className="text-sm font-semibold text-foreground">{freq.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main messaging */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">
          What's the main message of your newsletter?
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          What do you help people with? What transformation do you deliver?
        </p>
        <input
          type="text"
          value={data.freeTransformation}
          onChange={(e) => onChange({ freeTransformation: e.target.value })}
          placeholder="e.g., I help coaches get consistent clients without burnout"
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      {/* Secondary nurture */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">
          Optional: Add a secondary nurture method
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {filteredNurtureOptions.map((option) => {
            const isSelected = data.secondaryNurture === option.value;
            return (
              <button
                key={option.value}
                onClick={() => onChange({ secondaryNurture: option.value, customNurture: '' })}
                className={`
                  flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all duration-200
                  ${isSelected
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border bg-card hover:border-primary/40'
                  }
                `}
              >
                <span className="text-lg">{option.emoji}</span>
                <span className="text-sm font-medium text-foreground">{option.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => onChange({ secondaryNurture: 'other' })}
            className={`
              flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all duration-200
              ${data.secondaryNurture === 'other'
                ? 'border-primary bg-primary/10 shadow-sm'
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
