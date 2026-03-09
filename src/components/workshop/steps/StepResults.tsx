import { useState, useMemo } from 'react';
import { EngineLoopGraphic } from '../EngineLoopGraphic';
import { PLATFORMS } from '../PlatformScorecardData';
import { LOOP_LENGTHS, OFFER_FREQUENCIES, SALES_METHODS, EMAIL_METHODS, SECONDARY_NURTURE_OPTIONS, BATCH_OPTIONS } from '../EngineBuilderTypes';
import type { EngineBuilderData } from '../EngineBuilderTypes';
import { BundleRecommendations } from '../BundleRecommendations';
import { WorkshopTestimonialForm } from '../WorkshopTestimonialForm';
import { WizardTaskPreview } from '@/components/wizards/shared/WizardTaskPreview';
import { generateEngineBuilderTasksPreview, ENGINE_BUILDER_PHASE_CONFIG } from '@/lib/engineBuilderTaskGenerator';
import { Checkbox } from '@/components/ui/checkbox';

interface StepResultsProps {
  data: EngineBuilderData;
  onChange: (updates: Partial<EngineBuilderData>) => void;
  onDownloadPDF: () => void;
  onSaveToBossPlanner?: () => void;
  isMember?: boolean;
  isSaving?: boolean;
  onBack?: () => void;
}

function SummaryCard({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      <h4 className="font-semibold text-sm text-foreground flex items-center gap-2 mb-2">
        <span className="text-lg">{emoji}</span> {title}
      </h4>
      <div className="text-sm text-muted-foreground space-y-1">{children}</div>
    </div>
  );
}

export function StepResults({ data, onChange, onDownloadPDF, onSaveToBossPlanner, isMember, isSaving, onBack }: StepResultsProps) {
  const [showTaskPreview, setShowTaskPreview] = useState(false);

  const platform = PLATFORMS.find((p) => p.id === data.primaryPlatform);
  const additionalPlatformNames = data.additionalPlatforms
    .map((id) => {
      if (id === 'other') return data.customAdditionalPlatform || 'Other';
      return PLATFORMS.find((p) => p.id === id)?.name;
    })
    .filter(Boolean);
  const loopLabel = LOOP_LENGTHS.find((l) => l.value === data.loopLength)?.label;
  const emailLabel = data.emailMethod === 'other' ? (data.customEmailMethod || 'Custom') : (EMAIL_METHODS.find((e) => e.value === data.emailMethod)?.label || data.emailMethod);
  const nurtureLabel = data.secondaryNurture === 'other' ? (data.customNurture || 'Custom') : SECONDARY_NURTURE_OPTIONS.find((n) => n.value === data.secondaryNurture)?.label;
  const salesLabels = data.salesMethods.map((m) => SALES_METHODS.find((s) => s.value === m)?.label).filter(Boolean);
  const salesNeeded = data.revenueGoal && data.offerPrice && data.offerPrice > 0
    ? Math.ceil(data.revenueGoal / data.offerPrice) : null;
  const batchLabel = BATCH_OPTIONS.find(b => b.value === data.batchOrLive)?.label;

  const sellFreqLabels: Record<string, string> = {
    'weekly': 'Weekly', 'evergreen-urgency': 'Evergreen with urgency',
    'monthly': 'Monthly launches', 'quarterly': 'Quarterly launches', 'yearly': '1-2x per year',
  };
  const sellFreq = sellFreqLabels[data.offerFrequency] || data.customOfferFrequency || data.offerFrequency;

  const focusLabels: Record<string, string> = { discover: 'Lead Gen', nurture: 'Nurture', convert: 'Sales' };

  const allTasks = useMemo(() => generateEngineBuilderTasksPreview(data), [data]);
  const selectedTaskCount = allTasks.filter(t => !(data.excludedTasks || []).includes(t.id)).length;

  // Group schedule by day for display
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="space-y-6">
      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="mb-2 px-4 py-2 rounded-lg text-sm font-medium text-foreground bg-secondary hover:bg-secondary-hover transition-colors"
        >
          ← Back to Edit
        </button>
      )}

      <div className="text-center">
        <h3 className="text-xl font-bold text-foreground mb-1">
          🏆 Your Engine Blueprint
        </h3>
        <p className="text-sm text-muted-foreground">
          Your business engine is built. Here's the full picture.
        </p>
      </div>

      {/* Engine Loop Graphic */}
      <EngineLoopGraphic data={data} />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SummaryCard emoji="⛽" title="Discover (Fuel System)">
          <p><strong>Primary:</strong> {platform?.name || data.customPlatform || '—'}</p>
          <p><strong>Weekly action:</strong> {data.specificAction || '—'}</p>
          {additionalPlatformNames.length > 0 && (
            <p><strong>Additional sources:</strong> {additionalPlatformNames.join(', ')}</p>
          )}
        </SummaryCard>

        <SummaryCard emoji="🔧" title="Nurture (Engine Block)">
          <p><strong>Email:</strong> {emailLabel || '—'}</p>
          <p><strong>Main message:</strong> {data.freeTransformation || '—'}</p>
          {nurtureLabel && <p><strong>Secondary:</strong> {nurtureLabel}</p>}
          {data.secondaryNurtureFrequency && data.secondaryNurtureFrequency !== 'none' && (
            <p><strong>Secondary frequency:</strong> {data.secondaryNurtureFrequency === 'other' ? data.customNurtureFrequency : data.secondaryNurtureFrequency}</p>
          )}
        </SummaryCard>

        <SummaryCard emoji="🚀" title="Convert (Turbo Boost)">
          <p><strong>Main offer:</strong> {data.offerName || '—'}</p>
          {data.offerPrice != null && <p><strong>Price:</strong> ${data.offerPrice.toLocaleString()}</p>}
          {data.revenueGoal != null && <p><strong>90-day goal:</strong> ${data.revenueGoal.toLocaleString()}</p>}
          {salesNeeded && <p><strong>Sales needed:</strong> {salesNeeded}</p>}
          {sellFreq && <p><strong>Sell frequency:</strong> {sellFreq}</p>}
          {salesLabels.length > 0 && <p><strong>Methods:</strong> {salesLabels.join(', ')}</p>}
          {data.secondaryOffers?.length > 0 && (
            <div className="pt-1">
              <strong>Secondary offers:</strong>
              {data.secondaryOffers.map((o, i) => (
                <p key={i} className="ml-2">• {o.name}{o.price ? ` — $${o.price}` : ''}</p>
              ))}
            </div>
          )}
          {data.secondaryRevenueSources?.length > 0 && (
            <p><strong>Revenue streams:</strong> {data.secondaryRevenueSources.join(', ')}</p>
          )}
        </SummaryCard>

        <SummaryCard emoji="🔄" title="Revenue Loop (Rev Cycle)">
          <p><strong>Loop:</strong> {loopLabel || '—'}</p>
          <p><strong>Content slots:</strong> {data.contentPlan.length} items planned</p>
        </SummaryCard>
      </div>

      {/* Editorial / Batch settings */}
      {(batchLabel || data.engineFocusArea) && (
        <SummaryCard emoji="📦" title="Content Workflow">
          {batchLabel && <p><strong>Creation style:</strong> {batchLabel}</p>}
          {data.batchFrequency && (data.batchOrLive === 'batch' || data.batchOrLive === 'hybrid') && (
            <p><strong>Batch frequency:</strong> {data.batchFrequency}</p>
          )}
          {data.batchDay && (data.batchOrLive === 'batch' || data.batchOrLive === 'hybrid') && (
            <p><strong>Batch day:</strong> {data.batchDay}</p>
          )}
          {data.engineFocusArea && (
            <p><strong>Focus area:</strong> {focusLabels[data.engineFocusArea] || data.engineFocusArea}</p>
          )}
        </SummaryCard>
      )}

      {/* Weekly schedule */}
      {data.weeklySchedule.length > 0 && (
        <SummaryCard emoji="🏁" title="Weekly Schedule">
          {days.map((day) => {
            const daySlots = data.weeklySchedule.filter(s => s.day === day);
            if (daySlots.length === 0) return null;
            return daySlots.map((slot, i) => (
              <p key={`${day}-${i}`}>
                <strong>{i === 0 ? slot.day : ''}</strong>
                {i === 0 ? ': ' : '    '}
                {slot.type === 'create' ? '📦' : slot.type === 'publish' ? '📢' : '💬'} {slot.activity || slot.type}
              </p>
            ));
          })}
        </SummaryCard>
      )}

      {/* Bundle Recommendations */}
      <BundleRecommendations data={data} />

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          onClick={onDownloadPDF}
          className="flex-1 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          📄 Download PDF Blueprint
        </button>

        <button
          onClick={() => {
            if (!isMember) return;
            if (showTaskPreview) {
              onSaveToBossPlanner?.();
            } else {
              setShowTaskPreview(true);
            }
          }}
          disabled={!isMember || isSaving}
          className="flex-1 px-6 py-3 rounded-xl border-2 border-primary text-primary font-semibold text-sm hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? '✅ Saved!' : showTaskPreview
            ? `🏗️ Save ${selectedTaskCount} Tasks to Planner`
            : '🏗️ Save to Planner (Mastermind Members)'}
        </button>
      </div>

      {/* Task Preview for Mastermind Members */}
      {isMember && showTaskPreview && !isSaving && (
        <div className="space-y-4 border border-border rounded-xl p-4 bg-card">
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <span>📋</span> Choose what to add to your planner
            </h4>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={data.generateTasks !== false}
                  onCheckedChange={(checked) => onChange({ generateTasks: !!checked })}
                />
                <span className="text-sm text-foreground">Add tasks to my task list</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={data.generateContentItems !== false}
                  onCheckedChange={(checked) => onChange({ generateContentItems: !!checked })}
                />
                <span className="text-sm text-foreground">Add content items to my editorial calendar</span>
              </label>
            </div>
          </div>

          {data.generateTasks !== false && allTasks.length > 0 && (
            <WizardTaskPreview
              tasks={allTasks}
              excludedTasks={data.excludedTasks || []}
              dateOverrides={data.dateOverrides || []}
              onExcludedTasksChange={(excludedTasks) => onChange({ excludedTasks })}
              onDateOverridesChange={(dateOverrides) => onChange({ dateOverrides })}
              phaseOrder={ENGINE_BUILDER_PHASE_CONFIG}
              defaultExpandedPhases={['setup', 'schedule']}
              maxHeight="350px"
            />
          )}
        </div>
      )}

      {/* Testimonial Form */}
      <WorkshopTestimonialForm engineData={data} />
    </div>
  );
}
