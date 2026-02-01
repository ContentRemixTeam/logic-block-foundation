// Level 2 - Full 4-phase timeline editing with real-time feedback

import { useState, useEffect } from 'react';
import { format, parseISO, addDays, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronUp, Check } from 'lucide-react';
import { 
  LaunchPhaseDates, 
  validatePhaseSequence,
  calculateTotalLaunchTime,
} from '@/lib/launchHelpers';
import { LaunchWizardV2Data } from '@/types/launchV2';
import { GapOverlapResult } from '../utils/gapDetection';
import { useIsMobile } from '@/hooks/use-mobile';
import { TimelinePhaseCard } from './TimelinePhaseCard';
import { TimelineVisualBar } from './TimelineVisualBar';
import { TimelineSummary } from './TimelineSummary';
import { TimelineQuickAdjust } from './TimelineQuickAdjust';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';

interface TimelineCustomizerProps {
  data: LaunchWizardV2Data;
  onChange: (updates: Partial<LaunchWizardV2Data>) => void;
  onCollapse: () => void;
  gapResult?: GapOverlapResult | null;
  isOpen?: boolean;
}

export function TimelineCustomizer({
  data,
  onChange,
  onCollapse,
  gapResult = null,
  isOpen = true,
}: TimelineCustomizerProps) {
  const isMobile = useIsMobile();

  // Build current phases from data
  const buildPhases = (): LaunchPhaseDates | null => {
    if (!data.cartOpensDate) return null;
    
    try {
      return {
        runwayStart: parseISO(data.runwayStartDate || data.cartOpensDate),
        runwayEnd: parseISO(data.runwayEndDate || data.cartOpensDate),
        preLaunchStart: parseISO(data.preLaunchStartDate || data.cartOpensDate),
        preLaunchEnd: parseISO(data.preLaunchEndDate || data.cartOpensDate),
        cartOpens: parseISO(data.cartOpensDate),
        cartCloses: parseISO(data.cartClosesDate || data.cartOpensDate),
        postLaunchEnd: parseISO(data.postLaunchEndDate || data.cartOpensDate),
      };
    } catch {
      return null;
    }
  };

  const currentPhases = buildPhases();
  const validation = currentPhases ? validatePhaseSequence(currentPhases) : null;

  // Phase date change handlers
  const handleRunwayStartChange = (date: string) => {
    onChange({ runwayStartDate: date });
  };

  const handleRunwayEndChange = (date: string) => {
    onChange({ 
      runwayEndDate: date,
      // Auto-adjust pre-launch start to day after runway ends
      preLaunchStartDate: format(addDays(parseISO(date), 1), 'yyyy-MM-dd'),
    });
  };

  const handlePreLaunchStartChange = (date: string) => {
    onChange({ preLaunchStartDate: date });
  };

  const handlePreLaunchEndChange = (date: string) => {
    onChange({ preLaunchEndDate: date });
  };

  const handleCartOpensChange = (date: string) => {
    onChange({ cartOpensDate: date });
  };

  const handleCartClosesChange = (date: string) => {
    onChange({ cartClosesDate: date });
  };

  const handlePostLaunchEndChange = (date: string) => {
    onChange({ postLaunchEndDate: date });
  };

  // Quick adjust handlers
  const handleQuickAdjust = (adjustment: {
    runwayDays?: number;
    preLaunchDays?: number;
    cartDays?: number;
  }) => {
    if (!currentPhases) return;

    if (adjustment.runwayDays) {
      const newStart = subDays(currentPhases.runwayStart, adjustment.runwayDays);
      onChange({ runwayStartDate: format(newStart, 'yyyy-MM-dd') });
    }
    if (adjustment.preLaunchDays) {
      const newEnd = addDays(currentPhases.preLaunchEnd, adjustment.preLaunchDays);
      onChange({ preLaunchEndDate: format(newEnd, 'yyyy-MM-dd') });
    }
    if (adjustment.cartDays !== undefined) {
      // Cart days is setting total, so calculate new close
      const newClose = addDays(currentPhases.cartOpens, adjustment.cartDays - 1);
      onChange({ cartClosesDate: format(newClose, 'yyyy-MM-dd') });
    }
  };

  const handleApply = () => {
    onChange({ useCustomTimeline: true });
    onCollapse();
  };

  // Content to render in both mobile drawer and desktop inline
  const content = (
    <div className="space-y-6">
      {/* Visual bar */}
      {currentPhases && (
        <TimelineVisualBar 
          phases={currentPhases}
          gapStart={gapResult?.gapStartDate ? new Date(gapResult.gapStartDate) : null}
          gapEnd={gapResult?.gapEndDate ? new Date(gapResult.gapEndDate) : null}
        />
      )}

      {/* Phase cards */}
      <div className="space-y-4">
        <TimelinePhaseCard
          phase="runway"
          startDate={data.runwayStartDate || ''}
          endDate={data.runwayEndDate || ''}
          onStartChange={handleRunwayStartChange}
          onEndChange={handleRunwayEndChange}
          isGapAffected={gapResult?.overlaps && gapResult.overlapWeeks.length > 0}
          warnings={validation?.warnings.filter(w => w.toLowerCase().includes('runway'))}
        />

        <TimelineQuickAdjust
          onAdjust={(days) => handleQuickAdjust({ runwayDays: days })}
          label="Add 1 week runway"
          days={7}
        />

        <TimelinePhaseCard
          phase="pre-launch"
          startDate={data.preLaunchStartDate || ''}
          endDate={data.preLaunchEndDate || ''}
          onStartChange={handlePreLaunchStartChange}
          onEndChange={handlePreLaunchEndChange}
          isGapAffected={gapResult?.overlaps && gapResult.overlapWeeks.length > 0}
          warnings={validation?.warnings.filter(w => w.toLowerCase().includes('pre-launch'))}
        />

        <TimelineQuickAdjust
          onAdjust={(days) => handleQuickAdjust({ preLaunchDays: days })}
          label="Extend pre-launch by 3 days"
          days={3}
        />

        <TimelinePhaseCard
          phase="cart-open"
          startDate={data.cartOpensDate || ''}
          endDate={data.cartClosesDate || ''}
          onStartChange={handleCartOpensChange}
          onEndChange={handleCartClosesChange}
          isGapAffected={gapResult?.overlaps && gapResult.overlapWeeks.length > 0}
          warnings={validation?.warnings.filter(w => w.toLowerCase().includes('cart'))}
        />

        <TimelineQuickAdjust
          onAdjust={() => handleQuickAdjust({ cartDays: 5 })}
          label="Shorten cart to 5 days (creates urgency)"
          days={-2}
        />

        <TimelinePhaseCard
          phase="post-launch"
          startDate={format(currentPhases ? addDays(currentPhases.cartCloses, 1) : new Date(), 'yyyy-MM-dd')}
          endDate={data.postLaunchEndDate || ''}
          onStartChange={() => {}} // Post-launch start is auto-calculated
          onEndChange={handlePostLaunchEndChange}
          disabled
        />
      </div>

      {/* Summary */}
      {currentPhases && (
        <TimelineSummary 
          phases={currentPhases} 
          gapResult={gapResult}
        />
      )}

      {/* Validation errors */}
      {validation && !validation.valid && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <ul className="text-sm text-destructive space-y-1">
            {validation.errors.map((error, i) => (
              <li key={i}>• {error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  // Mobile: Render in drawer
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onCollapse()}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Customize Timeline</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto max-h-[60vh]">
            {content}
          </div>
          <DrawerFooter className="flex-row gap-3">
            <Button 
              variant="outline" 
              onClick={onCollapse}
              className="flex-1 h-11"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleApply}
              disabled={validation && !validation.valid}
              className="flex-1 h-11"
            >
              <Check className="h-4 w-4 mr-2" />
              Apply Changes
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Render inline
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Customize Your Timeline</h3>
        <Button variant="ghost" size="sm" onClick={onCollapse}>
          <ChevronUp className="h-4 w-4 mr-1" />
          Collapse
        </Button>
      </div>
      
      {content}

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onCollapse}>
          Cancel
        </Button>
        <Button 
          onClick={handleApply}
          disabled={validation && !validation.valid}
        >
          <Check className="h-4 w-4 mr-2" />
          Apply Changes
        </Button>
      </div>
    </div>
  );
}
