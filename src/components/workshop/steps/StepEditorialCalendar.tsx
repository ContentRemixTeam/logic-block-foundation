import { useState } from 'react';
import { BATCH_OPTIONS, DAYS_OF_WEEK } from '../EngineBuilderTypes';
import type { EngineBuilderData, WeeklySlot } from '../EngineBuilderTypes';
import { PLATFORMS } from '../PlatformScorecardData';
import { Plus, X } from 'lucide-react';

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
  const [addingDay, setAddingDay] = useState<string | null>(null);

  const addSlot = (day: string, type: WeeklySlot['type'] = 'publish') => {
    onChange({
      weeklySchedule: [
        ...data.weeklySchedule,
        { day, activity: '', type },
      ].sort((a, b) => {
        const dayDiff = DAYS_OF_WEEK.indexOf(a.day) - DAYS_OF_WEEK.indexOf(b.day);
        return dayDiff !== 0 ? dayDiff : 0;
      }),
    });
    setAddingDay(null);
  };

  const removeSlot = (index: number) => {
    onChange({
      weeklySchedule: data.weeklySchedule.filter((_, i) => i !== index),
    });
  };

  const updateSlot = (index: number, updates: Partial<WeeklySlot>) => {
    onChange({
      weeklySchedule: data.weeklySchedule.map((s, i) =>
        i === index ? { ...s, ...updates } : s
      ),
    });
  };

  // Group slots by day for display
  const slotsByDay = DAYS_OF_WEEK.reduce((acc, day) => {
    acc[day] = data.weeklySchedule
      .map((slot, index) => ({ ...slot, originalIndex: index }))
      .filter(s => s.day === day);
    return acc;
  }, {} as Record<string, (WeeklySlot & { originalIndex: number })[]>);

  const activeDays = DAYS_OF_WEEK.filter(day => slotsByDay[day].length > 0);

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
                    ? 'engine-selected'
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
                      ? 'engine-selected'
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
                    ? 'engine-primary-btn'
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

      {/* Weekly schedule — multiple slots per day */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">
          Pick your posting days on {platform?.name || 'your platform'}:
        </h4>
        
        {/* Day selector — tap to add first slot */}
        <div className="flex flex-wrap gap-2 mb-4">
          {DAYS_OF_WEEK.map((day) => {
            const hasSlots = slotsByDay[day].length > 0;
            return (
              <button
                key={day}
                onClick={() => {
                  if (!hasSlots) {
                    addSlot(day, 'publish');
                  }
                }}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                  ${hasSlots
                    ? 'engine-primary-btn'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary-hover'
                  }
                `}
              >
                {day.slice(0, 3)} {hasSlots && `(${slotsByDay[day].length})`}
              </button>
            );
          })}
        </div>

        {/* Slot details grouped by day */}
        {activeDays.length > 0 && (
          <div className="space-y-3">
            {activeDays.map((day) => (
              <div key={day} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                  <span className="text-sm font-semibold text-foreground">{day}</span>
                  <button
                    onClick={() => addSlot(day)}
                    className="flex items-center gap-1 text-xs font-medium hover:opacity-80 transition-opacity"
                    style={{ color: 'hsl(32 95% 44%)' }}
                  >
                    <Plus className="h-3 w-3" />
                    Add slot
                  </button>
                </div>
                <div className="divide-y divide-border">
                  {slotsByDay[day].map((slot) => (
                    <div key={slot.originalIndex} className="flex items-center gap-3 px-3 py-2">
                      <select
                        value={slot.type}
                        onChange={(e) => updateSlot(slot.originalIndex, { type: e.target.value as WeeklySlot['type'] })}
                        className="px-2 py-1 rounded border border-border bg-background text-sm text-foreground"
                      >
                        <option value="create">📦 Create</option>
                        <option value="publish">📢 Publish</option>
                        <option value="engage">💬 Engage</option>
                      </select>
                      <input
                        type="text"
                        value={slot.activity}
                        onChange={(e) => updateSlot(slot.originalIndex, { activity: e.target.value })}
                        placeholder="What specifically?"
                        className="flex-1 px-2 py-1 rounded border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <button
                        onClick={() => removeSlot(slot.originalIndex)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
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
                    ? 'engine-selected'
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
