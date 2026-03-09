import { BATCH_OPTIONS, DAYS_OF_WEEK } from '../EngineBuilderTypes';
import type { EngineBuilderData, WeeklySlot } from '../EngineBuilderTypes';
import { PLATFORMS } from '../PlatformScorecardData';

const BATCH_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly', description: 'Batch all content once a week', emoji: '📅' },
  { value: 'biweekly', label: 'Every 2 Weeks', description: 'Batch content every other week', emoji: '📆' },
  { value: 'monthly', label: 'Monthly', description: 'One big batch session per month', emoji: '🗓️' },
  { value: 'quarterly', label: 'Quarterly', description: 'Plan and batch a full quarter at once', emoji: '📋' },
];

interface StepEditorialCalendarProps {
  data: EngineBuilderData;
  onChange: (updates: Partial<EngineBuilderData>) => void;
}

export function StepEditorialCalendar({ data, onChange }: StepEditorialCalendarProps) {
  const platform = PLATFORMS.find((p) => p.id === data.primaryPlatform);

  const toggleDay = (day: string) => {
    const exists = data.weeklySchedule.find((s) => s.day === day);
    if (exists) {
      onChange({ weeklySchedule: data.weeklySchedule.filter((s) => s.day !== day) });
    } else {
      onChange({
        weeklySchedule: [
          ...data.weeklySchedule,
          { day, activity: '', type: 'publish' as const },
        ].sort((a, b) => DAYS_OF_WEEK.indexOf(a.day) - DAYS_OF_WEEK.indexOf(b.day)),
      });
    }
  };

  const updateSlot = (day: string, updates: Partial<WeeklySlot>) => {
    onChange({
      weeklySchedule: data.weeklySchedule.map((s) =>
        s.day === day ? { ...s, ...updates } : s
      ),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          🏁 Plan Your Laps — Your weekly schedule
        </h3>
        <p className="text-sm text-muted-foreground">
          Map out your race week. When do you create, publish, and engage?
        </p>
      </div>

      {/* Batch or live */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">How do you prefer to create content?</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {BATCH_OPTIONS.map((option) => {
            const isSelected = data.batchOrLive === option.value;
            return (
              <button
                key={option.value}
                onClick={() => onChange({ batchOrLive: option.value })}
                className={`
                  text-left p-4 rounded-xl border-2 transition-all duration-200
                  ${isSelected
                    ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20'
                    : 'border-border bg-card hover:border-primary/40'
                  }
                `}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{option.emoji}</span>
                  <h5 className="font-semibold text-sm text-foreground">{option.label}</h5>
                </div>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Batch frequency */}
      {(data.batchOrLive === 'batch' || data.batchOrLive === 'hybrid') && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">How often do you batch?</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {BATCH_FREQUENCIES.map((freq) => {
              const isSelected = data.batchFrequency === freq.value;
              return (
                <button
                  key={freq.value}
                  onClick={() => onChange({ batchFrequency: freq.value })}
                  className={`
                    text-left p-3 rounded-xl border-2 transition-all duration-200
                    ${isSelected
                      ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20'
                      : 'border-border bg-card hover:border-primary/40'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{freq.emoji}</span>
                    <h5 className="font-semibold text-sm text-foreground">{freq.label}</h5>
                  </div>
                  <p className="text-xs text-muted-foreground">{freq.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Batch day */}
      {(data.batchOrLive === 'batch' || data.batchOrLive === 'hybrid') && (
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Which day do you batch-create content?
          </label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day}
                onClick={() => onChange({ batchDay: day })}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                  ${data.batchDay === day
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary-hover'
                  }
                `}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Weekly schedule */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">
          Pick your posting days on {platform?.name || 'your platform'}:
        </h4>
        <div className="flex flex-wrap gap-2 mb-4">
          {DAYS_OF_WEEK.map((day) => {
            const isActive = data.weeklySchedule.some((s) => s.day === day);
            return (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                  ${isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary-hover'
                  }
                `}
              >
                {day.slice(0, 3)}
              </button>
            );
          })}
        </div>

        {/* Slot details */}
        {data.weeklySchedule.length > 0 && (
          <div className="space-y-2">
            {data.weeklySchedule.map((slot) => (
              <div key={slot.day} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                <span className="text-sm font-semibold text-foreground w-12">{slot.day.slice(0, 3)}</span>
                <select
                  value={slot.type}
                  onChange={(e) => updateSlot(slot.day, { type: e.target.value as WeeklySlot['type'] })}
                  className="px-2 py-1 rounded border border-border bg-background text-sm text-foreground"
                >
                  <option value="create">📦 Create</option>
                  <option value="publish">📢 Publish</option>
                  <option value="engage">💬 Engage</option>
                </select>
                <input
                  type="text"
                  value={slot.activity}
                  onChange={(e) => updateSlot(slot.day, { activity: e.target.value })}
                  placeholder="What specifically?"
                  className="flex-1 px-2 py-1 rounded border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Focus area question */}
      <div className="border-t border-border pt-6">
        <h4 className="text-sm font-semibold text-foreground mb-1">
          What part of your engine needs the most work right now?
        </h4>
        <p className="text-xs text-muted-foreground mb-3">
          This helps us prioritize your recommendations. Pick the area you want to focus on this quarter.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { value: 'discover', label: 'Discover (Lead Gen)', description: 'I need more people finding me', emoji: '⛽' },
            { value: 'nurture', label: 'Nurture (Connection)', description: 'I need to build more trust with my audience', emoji: '🔧' },
            { value: 'convert', label: 'Convert (Sales)', description: 'I need to make more offers and close more sales', emoji: '🚀' },
          ].map((area) => {
            const isSelected = data.engineFocusArea === area.value;
            return (
              <button
                key={area.value}
                onClick={() => onChange({ engineFocusArea: area.value })}
                className={`
                  text-left p-4 rounded-xl border-2 transition-all duration-200
                  ${isSelected
                    ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20'
                    : 'border-border bg-card hover:border-primary/40'
                  }
                `}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{area.emoji}</span>
                  <h5 className="font-semibold text-sm text-foreground">{area.label}</h5>
                </div>
                <p className="text-xs text-muted-foreground">{area.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
