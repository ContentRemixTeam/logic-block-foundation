import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { MastermindAction, MastermindFirstMove } from '@/hooks/useMastermindSuccessPath';
import {
  MASTERMIND_STAGE_LABELS,
  getCurriculumSlot,
  getMastermindStage,
  type MastermindPlanCycle,
  type MastermindStageId,
  type MastermindSuccessPathOutput,
} from '@/lib/mastermindSuccessPath';

interface ActionForm {
  exactMove: string;
  capacityMode: string;
  doneEnough: string;
  evidence: string;
  scheduledDate: string;
}

interface CheckInForm {
  response: string;
  evidence: string;
  friction: string;
}

interface SuccessPathPlanCardProps {
  cycle: MastermindPlanCycle;
  successPath: MastermindSuccessPathOutput;
  selectedStageId: MastermindStageId;
  confirmed: boolean;
  milestoneId: string;
  action: MastermindAction | null;
  firstMoves: MastermindFirstMove[];
  saving: boolean;
  onConfirm: (stage: MastermindStageId) => Promise<void>;
  onSchedule: (value: ActionForm) => Promise<unknown>;
  onCheckIn: (value: CheckInForm) => Promise<unknown>;
}

const MAX_ACTION_LENGTH = 500;
const MAX_CHECK_IN_LENGTH = 1000;
const CHECK_IN_RESPONSES = ['Continue', 'Improve', 'Reduce', 'Support'] as const;

function messageFromError(value: unknown, fallback: string) {
  return value instanceof Error && value.message ? value.message : fallback;
}

function supportSuggestion(value: unknown) {
  if (typeof value !== 'object' || value === null) return null;
  const suggestion = (value as Record<string, unknown>).support_suggestion;
  return typeof suggestion === 'string' && suggestion.trim() ? suggestion : null;
}

export function SuccessPathPlanCard({
  cycle,
  successPath,
  selectedStageId,
  confirmed,
  milestoneId,
  action,
  firstMoves,
  saving,
  onConfirm,
  onSchedule,
  onCheckIn,
}: SuccessPathPlanCardProps) {
  const [showStageChoices, setShowStageChoices] = useState(false);
  const [form, setForm] = useState<ActionForm>({
    exactMove: '',
    capacityMode: 'standard',
    doneEnough: '',
    evidence: '',
    scheduledDate: '',
  });
  const [checkIn, setCheckIn] = useState<CheckInForm>({
    response: 'Continue',
    evidence: '',
    friction: '',
  });
  const [actionStatus, setActionStatus] = useState('');
  const [checkInStatus, setCheckInStatus] = useState('');
  const [localError, setLocalError] = useState('');

  const stage = getMastermindStage(selectedStageId);
  const milestone = getCurriculumSlot(milestoneId) ?? stage.milestones[0];
  const verifiedFirstMoves = firstMoves
    .map((move) => move.task_text.trim())
    .filter(Boolean)
    .slice(0, 3);
  const lowBatteryVersion = cycle.low_energy_version?.trim();

  const updateForm = (key: keyof ActionForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const confirm = async (stageId: MastermindStageId) => {
    setLocalError('');
    try {
      await onConfirm(stageId);
    } catch (caught) {
      setLocalError(messageFromError(caught, 'We could not confirm that focus. Please try again.'));
    }
  };

  const schedule = async () => {
    setLocalError('');
    setActionStatus('');
    const fields = [form.exactMove, form.doneEnough, form.evidence];
    if (fields.some((value) => !value.trim()) || !form.scheduledDate) {
      setLocalError('Complete the action, done-enough, evidence, and date fields.');
      return;
    }
    if (fields.some((value) => value.trim().length > MAX_ACTION_LENGTH)) {
      setLocalError(`Keep each action answer to ${MAX_ACTION_LENGTH} characters or fewer.`);
      return;
    }
    try {
      await onSchedule({
        ...form,
        exactMove: form.exactMove.trim(),
        doneEnough: form.doneEnough.trim(),
        evidence: form.evidence.trim(),
      });
      setActionStatus('Task saved to My Plan.');
    } catch (caught) {
      setLocalError(messageFromError(caught, 'We could not save this task. Please try again.'));
    }
  };

  const saveCheckIn = async () => {
    setLocalError('');
    setCheckInStatus('');
    if (!checkIn.evidence.trim()) {
      setLocalError('Add a short note about what happened before saving your check-in.');
      return;
    }
    if (
      checkIn.evidence.trim().length > MAX_CHECK_IN_LENGTH ||
      checkIn.friction.trim().length > MAX_CHECK_IN_LENGTH
    ) {
      setLocalError(`Keep each check-in answer to ${MAX_CHECK_IN_LENGTH} characters or fewer.`);
      return;
    }
    try {
      const receipt = await onCheckIn({
        ...checkIn,
        evidence: checkIn.evidence.trim(),
        friction: checkIn.friction.trim(),
      });
      setCheckInStatus(
        supportSuggestion(receipt) ?? 'Check-in saved. Your focus stayed the same.',
      );
    } catch (caught) {
      setLocalError(messageFromError(caught, 'We could not save this check-in. Please try again.'));
    }
  };

  return (
    <Card className="overflow-hidden border-primary/30">
      <CardHeader>
        <div className="flex flex-wrap gap-2">
          <Badge>Your focus</Badge>
          <Badge variant="outline">{stage.label}</Badge>
          <Badge variant="outline">{successPath.confidence} confidence</Badge>
        </div>
        <CardTitle className="break-words">{cycle.goal}</CardTitle>
        <CardDescription>{successPath.reason}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {!confirmed ? (
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="font-semibold">
              Does {MASTERMIND_STAGE_LABELS[successPath.stageId]} feel like the first broken link?
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your recommendation is not your path until you confirm it.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button
                className="min-h-11"
                disabled={saving}
                onClick={() => void confirm(successPath.stageId)}
              >
                Confirm this focus
              </Button>
              <Button
                className="min-h-11"
                variant="outline"
                onClick={() => setShowStageChoices(true)}
              >
                Change focus
              </Button>
            </div>
          </div>
        ) : (
          <p role="status" className="text-sm">
            Focus confirmed by you. It will not change from a check-in.
          </p>
        )}

        {(showStageChoices || confirmed) && (
          <details open={showStageChoices} className="rounded-lg border p-4">
            <summary className="min-h-11 cursor-pointer font-medium">
              Deliberately change focus
            </summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(MASTERMIND_STAGE_LABELS).map(([id, label]) => (
                <Button
                  key={id}
                  variant={id === selectedStageId ? 'default' : 'outline'}
                  className="min-h-11"
                  disabled={saving}
                  onClick={() => void confirm(id as MastermindStageId)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </details>
        )}

        {verifiedFirstMoves.length > 0 && (
          <div>
            <p className="text-sm font-semibold">Your verified first moves</p>
            <ol className="mt-2 space-y-2">
              {verifiedFirstMoves.map((move) => (
                <li key={move} className="rounded-md border bg-background px-3 py-2 text-sm">
                  {move}
                </li>
              ))}
            </ol>
          </div>
        )}

        {lowBatteryVersion && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Low-battery version
            </p>
            <p className="mt-1 text-sm">{cycle.low_energy_version}</p>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            One active milestone
          </p>
          <h3 className="mt-1 text-xl font-bold">{milestone.label}</h3>
          <p className="text-sm text-muted-foreground">{milestone.output}</p>
        </div>

        <div className="rounded-lg border border-dashed p-4">
          <Badge variant="secondary">{milestone.status}</Badge>
          <p className="mt-2 font-medium">{milestone.sourceTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This resource is not available here yet. The source still needs milestone-level
            verification. Bring your exact attempt and result to support; no unverified link is
            exposed.
          </p>
        </div>

        {confirmed && (
          <div className="space-y-4 border-t pt-5">
            <h3 className="font-semibold">Schedule the smallest useful action</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="exactMove">Exact move</Label>
                <Input
                  id="exactMove"
                  className="min-h-11"
                  maxLength={MAX_ACTION_LENGTH}
                  value={form.exactMove}
                  onChange={(event) => updateForm('exactMove', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doneEnough">What counts as done enough?</Label>
                <Input
                  id="doneEnough"
                  className="min-h-11"
                  maxLength={MAX_ACTION_LENGTH}
                  value={form.doneEnough}
                  onChange={(event) => updateForm('doneEnough', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="actionEvidence">What evidence will you collect?</Label>
                <Input
                  id="actionEvidence"
                  className="min-h-11"
                  maxLength={MAX_ACTION_LENGTH}
                  value={form.evidence}
                  onChange={(event) => updateForm('evidence', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduledDate">Date</Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  className="min-h-11"
                  value={form.scheduledDate}
                  onChange={(event) => updateForm('scheduledDate', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacityMode">Capacity mode</Label>
                <select
                  id="capacityMode"
                  className="min-h-11 w-full rounded-md border bg-background px-3"
                  value={form.capacityMode}
                  onChange={(event) => updateForm('capacityMode', event.target.value)}
                >
                  <option value="minimum">Minimum</option>
                  <option value="standard">Standard</option>
                  <option value="stretch">Stretch</option>
                </select>
              </div>
            </div>
            <Button className="min-h-11" disabled={saving} onClick={() => void schedule()}>
              Save to my plan
            </Button>
            {(actionStatus || action) && (
              <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
                {actionStatus || 'Task saved to My Plan.'}
              </p>
            )}
          </div>
        )}

        {action && (
          <div className="space-y-4 border-t pt-5">
            <div>
              <h3 className="font-semibold">30–60 second check-in</h3>
              <p className="text-sm text-muted-foreground">
                This records support evidence. It never reroutes your focus.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CHECK_IN_RESPONSES.map((response) => (
                <Button
                  className="min-h-11"
                  key={response}
                  variant={checkIn.response === response ? 'default' : 'outline'}
                  onClick={() => setCheckIn((current) => ({ ...current, response }))}
                >
                  {response}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkEvidence">What happened?</Label>
              <Input
                id="checkEvidence"
                className="min-h-11"
                maxLength={MAX_CHECK_IN_LENGTH}
                value={checkIn.evidence}
                onChange={(event) =>
                  setCheckIn((current) => ({ ...current, evidence: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="friction">What made the move difficult?</Label>
              <Input
                id="friction"
                className="min-h-11"
                maxLength={MAX_CHECK_IN_LENGTH}
                value={checkIn.friction}
                onChange={(event) =>
                  setCheckIn((current) => ({ ...current, friction: event.target.value }))
                }
              />
            </div>
            <Button className="min-h-11" disabled={saving} onClick={() => void saveCheckIn()}>
              Save check-in
            </Button>
            {checkInStatus && (
              <p role="status" aria-live="polite" className="text-sm">
                {checkInStatus}
              </p>
            )}
          </div>
        )}

        {localError && (
          <p role="alert" aria-live="assertive" className="text-sm text-destructive">
            {localError}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
