import { LOOP_LENGTHS } from '../EngineBuilderTypes';
import type { EngineBuilderData, ContentSlot } from '../EngineBuilderTypes';
import { PLATFORMS } from '../PlatformScorecardData';

interface StepRevenueLoopProps {
  data: EngineBuilderData;
  onChange: (updates: Partial<EngineBuilderData>) => void;
}

function generateDefaultContentPlan(loopLength: string, data: EngineBuilderData): ContentSlot[] {
  const platform = PLATFORMS.find((p) => p.id === data.primaryPlatform);
  const platformName = platform?.name || 'your platform';
  const weeks = loopLength === '7-day' ? 1 : loopLength === '14-day' ? 2 : loopLength === '30-day' ? 4 : 12;
  
  const slots: ContentSlot[] = [];
  for (let w = 1; w <= weeks; w++) {
    if (weeks <= 2) {
      slots.push({ week: w, type: 'discover', description: `Post on ${platformName} — attract new people` });
      slots.push({ week: w, type: 'nurture', description: 'Send email to list — deliver value' });
      if (w === weeks) {
        slots.push({ week: w, type: 'convert', description: `Make offer — ${data.offerName || 'your offer'}` });
      }
    } else {
      // For longer loops, spread the types across weeks
      const phase = w / weeks;
      if (phase <= 0.4) {
        slots.push({ week: w, type: 'discover', description: `${platformName} content — grow awareness` });
      } else if (phase <= 0.7) {
        slots.push({ week: w, type: 'nurture', description: 'Nurture email — build trust & connection' });
      } else {
        slots.push({ week: w, type: 'convert', description: `Sell ${data.offerName || 'your offer'} — close sales` });
      }
    }
  }
  return slots;
}

const TYPE_COLORS = {
  discover: 'bg-blue-100 text-blue-800 border-blue-200',
  nurture: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  convert: 'bg-primary/10 text-primary border-primary/20',
};

const TYPE_EMOJIS = { discover: '⛽', nurture: '🔧', convert: '🚀' };

export function StepRevenueLoop({ data, onChange }: StepRevenueLoopProps) {
  const handleLoopSelect = (value: string) => {
    const contentPlan = generateDefaultContentPlan(value, data);
    onChange({ loopLength: value, contentPlan });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          🔄 Set Your RPM — How fast does your engine cycle?
        </h3>
        <p className="text-sm text-muted-foreground">
          Your revenue loop is how often you go through the full cycle: Discover → Nurture → Convert. Pick the rhythm that fits your offer.
        </p>
      </div>

      {/* Loop length picker */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {LOOP_LENGTHS.map((loop) => {
          const isSelected = data.loopLength === loop.value;
          return (
            <button
              key={loop.value}
              onClick={() => handleLoopSelect(loop.value)}
              className={`
                text-left p-4 rounded-xl border-2 transition-all duration-200
                ${isSelected
                  ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20'
                  : 'border-border bg-card hover:border-primary/40'
                }
              `}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{loop.emoji}</span>
                <h5 className="font-semibold text-sm text-foreground">{loop.label}</h5>
              </div>
              <p className="text-xs text-muted-foreground">{loop.description}</p>
            </button>
          );
        })}
      </div>

      {/* Content plan grid */}
      {data.loopLength && data.contentPlan.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">
            Your {LOOP_LENGTHS.find((l) => l.value === data.loopLength)?.label} content plan:
          </h4>
          <div className="space-y-2">
            {data.contentPlan.map((slot, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg border ${TYPE_COLORS[slot.type]}`}
              >
                <span className="text-lg">{TYPE_EMOJIS[slot.type]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      Week {slot.week} · {slot.type}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={slot.description}
                    onChange={(e) => {
                      const updated = [...data.contentPlan];
                      updated[index] = { ...slot, description: e.target.value };
                      onChange({ contentPlan: updated });
                    }}
                    className="w-full bg-transparent border-none text-sm font-medium focus:outline-none mt-0.5"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
