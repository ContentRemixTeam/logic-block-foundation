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
      slots.push({ week: w, type: 'nurture', description: `Nurture — email + ${platformName} value content` });
      if (w === weeks) {
        slots.push({ week: w, type: 'convert', description: `Sell — ${data.offerName || 'your offer'} (flash sale, promo, launch)` });
      }
    } else {
      const phase = w / weeks;
      if (phase <= 0.6) {
        slots.push({ week: w, type: 'nurture', description: `Nurture — build trust, deliver value, email + content` });
      } else {
        slots.push({ week: w, type: 'convert', description: `Sell — ${data.offerName || 'your offer'} (promos, urgency, offers)` });
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
          🔄 Set Your RPM — Your Revenue Loop
        </h3>
        <p className="text-sm text-muted-foreground">
          Your business runs on a loop: <strong>Nurture → Sell → Nurture → Sell</strong>. Lead gen brings new people in, but the loop is what makes the money. Pick how long each cycle takes.
        </p>
      </div>

      {/* Visual loop diagram */}
      <div className="rounded-xl border-2 border-border bg-card p-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lead Gen</div>
          <div className="text-sm text-foreground font-medium">People find you</div>
          <div className="text-primary text-2xl">↓</div>
          <div className="text-sm text-foreground font-medium">Join your email list</div>
          <div className="text-primary text-2xl">↓</div>

          {/* The loop */}
          <div className="relative w-full max-w-xs mt-2">
            <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
              <div className="text-lg font-bold text-foreground">NURTURE</div>
              <div className="text-xs text-muted-foreground">Email, content, connection</div>
            </div>
            <div className="flex items-center justify-between mt-2 px-4">
              <div className="text-primary text-2xl">↓</div>
              <div className="text-muted-foreground text-2xl">↑</div>
            </div>
            <div className="rounded-2xl border-2 border-muted bg-muted/30 p-4 mt-2">
              <div className="text-xs text-muted-foreground">Flash sales, launches, promotions</div>
              <div className="text-lg font-bold text-foreground">MAKE OFFERS</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-3 italic">
            This loop runs continuously. Lead gen dumps new people into it.
          </div>
        </div>
      </div>

      {/* Loop length picker */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-1">How long is one loop cycle?</h4>
        <p className="text-xs text-muted-foreground mb-3">
          This is the time between one sales push and the next. In between, you're nurturing.
        </p>
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
      </div>

      {/* Content plan grid */}
      {data.loopLength && data.contentPlan.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-1">
            Your {LOOP_LENGTHS.find((l) => l.value === data.loopLength)?.label} breakdown:
          </h4>
          <p className="text-xs text-muted-foreground mb-3">
            Here's how one loop looks. Edit the descriptions to match what you'll actually do.
          </p>
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
                      Week {slot.week} · {slot.type === 'convert' ? 'sell' : slot.type}
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
