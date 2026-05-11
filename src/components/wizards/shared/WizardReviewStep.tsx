import { ReactNode, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WizardReviewSection {
  key: string;
  title: string;
  count: number;
  description?: string;
  itemsPreview?: string[]; // up to ~6 lines of detail
  optional?: boolean; // when false, user can't toggle off
  defaultEnabled?: boolean;
}

interface WizardReviewStepProps {
  intro?: ReactNode;
  sections: WizardReviewSection[];
  enabled: Record<string, boolean>;
  onToggle: (key: string, value: boolean) => void;
  onConfirm: () => void;
  isCreating: boolean;
  confirmLabel?: string;
  reassuranceText?: string;
}

/**
 * Reusable "Add this to my planner" review step.
 * Shows checkable preview sections with counts and expand-to-detail.
 * Has a built-in double-click guard via the disabled state on the confirm button.
 */
export function WizardReviewStep({
  intro,
  sections,
  enabled,
  onToggle,
  onConfirm,
  isCreating,
  confirmLabel = 'Add to my planner',
  reassuranceText = 'Nothing will be created until you confirm. You can uncheck anything you don\u2019t want.',
}: WizardReviewStepProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const totalEnabled = sections
    .filter((s) => enabled[s.key] !== false)
    .reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Here\u2019s what we\u2019ll add to your planner</h2>
        </div>
        {intro}
        <p className="text-sm text-muted-foreground">{reassuranceText}</p>
      </div>

      <div className="space-y-3">
        {sections.map((section) => {
          const isEnabled = enabled[section.key] !== false;
          const isExpanded = expanded[section.key];
          const canToggle = section.optional !== false;

          return (
            <Card
              key={section.key}
              className={cn(
                'transition-colors',
                !isEnabled && 'opacity-60 bg-muted/30',
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isEnabled}
                    disabled={!canToggle || isCreating}
                    onCheckedChange={(v) => onToggle(section.key, v === true)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span>{section.title}</span>
                      <span className="text-sm font-normal text-muted-foreground">
                        \u00b7 {section.count}
                      </span>
                    </CardTitle>
                    {section.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {section.description}
                      </p>
                    )}
                  </div>
                  {section.itemsPreview && section.itemsPreview.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setExpanded((e) => ({ ...e, [section.key]: !e[section.key] }))
                      }
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              {isExpanded && section.itemsPreview && (
                <CardContent className="pt-0">
                  <ul className="text-sm text-muted-foreground space-y-1 ml-9 list-disc">
                    {section.itemsPreview.slice(0, 12).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                    {section.itemsPreview.length > 12 && (
                      <li className="italic">
                        \u2026and {section.itemsPreview.length - 12} more
                      </li>
                    )}
                  </ul>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          {totalEnabled === 0
            ? 'Nothing selected \u2014 you can still save your plan without adding tasks.'
            : `${totalEnabled} item${totalEnabled === 1 ? '' : 's'} will be added.`}
        </p>
        <Button
          size="lg"
          onClick={onConfirm}
          disabled={isCreating}
          className="min-w-[200px]"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Adding\u2026
            </>
          ) : (
            confirmLabel
          )}
        </Button>
      </div>
    </div>
  );
}
