import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  AVOIDANCE_OPTIONS,
  BREAKS_FIRST_OPTIONS,
  CHANNEL_OPTIONS,
  DEFAULT_RECOVERY_RULE,
  LowBatteryPlanData,
  NURTURE_OPTIONS,
  SALES_METHOD_OPTIONS,
  THOUGHT_SUGGESTIONS,
  buildThreeOnes,
  looksBuyerFacing,
  resolveChoice,
} from './lowBatteryPlanTypes';
import {
  ChoiceList,
  HelperText,
  MultiSelectList,
  ReflectionBanner,
  TeachingNote,
  TextAreaField,
  TextField,
} from './LowBatteryPieces';
import { AlertTriangle } from 'lucide-react';

export type SectionKey = keyof LowBatteryPlanData;

export interface StepProps {
  data: LowBatteryPlanData;
  update: <K extends SectionKey>(section: K, patch: Partial<LowBatteryPlanData[K]>) => void;
  presenter: boolean;
}

function toggleIn(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function LiveSummary({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-primary/40 bg-primary/5 px-4 py-3">
      <p className="text-base font-medium text-foreground">{children}</p>
    </div>
  );
}

export function Step1({ data, update, presenter }: StepProps) {
  const s = data.step1;
  return (
    <div className="space-y-6">
      <TeachingNote presenter={presenter}>
        If one bad week can knock out your whole quarter, you’re not the problem. The plan requires a version of you who feels fine all the time.
      </TeachingNote>
      <HelperText presenter={presenter}>
        A full-battery dependency is a part of the plan that requires unusually reliable energy,
        focus, memory, confidence, or uninterrupted time.
      </HelperText>

      <MultiSelectList
        label="What breaks first on a low-battery week?"
        options={BREAKS_FIRST_OPTIONS}
        values={s.breaksFirst}
        onToggle={(option) => update('step1', { breaksFirst: toggleIn(s.breaksFirst, option) })}
      />
      {s.breaksFirst.includes('Other') && (
        <TextField
          id="breaks-first-other"
          label="Other — what breaks first?"
          value={s.breaksFirstOther}
          onChange={(v) => update('step1', { breaksFirstOther: v })}
          presenter={presenter}
        />
      )}

      <TextAreaField
        id="depends-on"
        label="My current plan depends on me being able to..."
        value={s.dependsOn}
        onChange={(v) => update('step1', { dependsOn: v })}
        placeholder="Show up live every week, remember every follow-up, write from scratch..."
        presenter={presenter}
      />

      <ReflectionBanner>A bad week should reduce the plan, not erase it.</ReflectionBanner>
    </div>
  );
}

export function Step2({ data, update, presenter }: StepProps) {
  const s = data.step2;
  const method = resolveChoice(s.salesMethod, s.salesMethodOther);
  return (
    <div className="space-y-6">
      <TeachingNote presenter={presenter}>
        Visibility without an offer becomes another avoidance project.
      </TeachingNote>
      <HelperText presenter={presenter}>
        Choose the existing offer closest to money or with the most proof. Do not invent a new offer
        today.
      </HelperText>

      <TextField
        id="offer"
        label="For the next 90 days, I am selling..."
        value={s.offer}
        onChange={(v) => update('step2', { offer: v })}
        presenter={presenter}
      />
      <TextField
        id="buyer"
        label="To..."
        value={s.buyer}
        onChange={(v) => update('step2', { buyer: v })}
        presenter={presenter}
      />
      <TextField
        id="outcome"
        label="Because it helps them..."
        value={s.outcome}
        onChange={(v) => update('step2', { outcome: v })}
        presenter={presenter}
      />

      <ChoiceList
        name="sales-method"
        label="I will primarily sell it through..."
        options={SALES_METHOD_OPTIONS}
        value={s.salesMethod}
        onChange={(v) => update('step2', { salesMethod: v })}
      />
      {s.salesMethod === 'Other' && (
        <TextField
          id="sales-method-other"
          label="Other — how will you sell it?"
          value={s.salesMethodOther}
          onChange={(v) => update('step2', { salesMethodOther: v })}
          presenter={presenter}
        />
      )}

      {(s.offer || s.buyer || method) && (
        <LiveSummary>
          For 90 days, I am selling {s.offer || '[offer]'} to {s.buyer || '[buyer]'} through{' '}
          {method || '[sales method]'}.
        </LiveSummary>
      )}
    </div>
  );
}

export function Step3({ data, update, presenter }: StepProps) {
  const s = data.step3;
  return (
    <div className="space-y-6">
      <TeachingNote presenter={presenter}>
        Choose the channel you can repeat, not the one a real business owner is supposed to use.
      </TeachingNote>

      <ChoiceList
        name="channel"
        label="ONE way people find me"
        options={CHANNEL_OPTIONS}
        value={s.channel}
        onChange={(v) => update('step3', { channel: v })}
      />
      {s.channel === 'Other' && (
        <TextField
          id="channel-other"
          label="Other — how do people find you?"
          value={s.channelOther}
          onChange={(v) => update('step3', { channelOther: v })}
          presenter={presenter}
        />
      )}

      <TextField
        id="smallest-action"
        label="My smallest repeatable discovery action is..."
        value={s.smallestAction}
        onChange={(v) => update('step3', { smallestAction: v })}
        presenter={presenter}
      />

      <HelperText presenter={presenter}>
        Other channels may exist. They are not all assignments for this 90-day cycle.
      </HelperText>
    </div>
  );
}

export function Step4({ data, update, presenter }: StepProps) {
  const s = data.step4;
  const ones = buildThreeOnes(data);
  return (
    <div className="space-y-6">
      <TeachingNote presenter={presenter}>Attention is not the same as trust.</TeachingNote>

      <ChoiceList
        name="nurture"
        label="Each week, I will stay connected through..."
        options={NURTURE_OPTIONS}
        value={s.nurture}
        onChange={(v) => update('step4', { nurture: v })}
      />
      {s.nurture === 'Other' && (
        <TextField
          id="nurture-other"
          label="Other — how will you stay connected?"
          value={s.nurtureOther}
          onChange={(v) => update('step4', { nurtureOther: v })}
          presenter={presenter}
        />
      )}

      <TextField
        id="shortest-version"
        label="The shortest version I will actually repeat is..."
        value={s.shortestVersion}
        onChange={(v) => update('step4', { shortestVersion: v })}
        presenter={presenter}
      />

      <HelperText presenter={presenter}>
        Nurture helps people understand the problem, experience your thinking, and remember the
        offer. It is not endless free teaching.
      </HelperText>

      <LiveSummary>
        People find me through {ones.visibility || '[visibility]'}. I stay connected through{' '}
        {ones.nurture || '[nurture]'}. I sell {ones.offer || '[offer]'} through{' '}
        {ones.salesMethod || '[sales method]'}.
      </LiveSummary>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-base font-medium text-foreground">
          Can a real person move through this plan and reach a buying decision?
        </legend>
        <div className="flex gap-2">
          {(['yes', 'not_yet'] as const).map((value) => (
            <Button
              key={value}
              type="button"
              variant={s.reachesDecision === value ? 'default' : 'outline'}
              className="min-h-[44px] flex-1"
              onClick={() => update('step4', { reachesDecision: value })}
            >
              {value === 'yes' ? 'Yes' : 'Not yet'}
            </Button>
          ))}
        </div>
      </fieldset>

      {s.reachesDecision === 'not_yet' && (
        <TextAreaField
          id="missing-connection"
          label="What connection is missing?"
          value={s.missingConnection}
          onChange={(v) => update('step4', { missingConnection: v })}
          helper="Look for the missing link between the three ONEs you already chose."
          presenter={presenter}
          rows={3}
        />
      )}
    </div>
  );
}

export function Step5({ data, update, presenter }: StepProps) {
  const s = data.step5;
  return (
    <div className="space-y-6">
      <TeachingNote presenter={presenter}>
        A good idea is not automatically this week&apos;s assignment.
      </TeachingNote>

      <MultiSelectList
        label="Cross off the productive-looking avoidance work"
        options={AVOIDANCE_OPTIONS}
        values={s.avoidance}
        onToggle={(option) => update('step5', { avoidance: toggleIn(s.avoidance, option) })}
        crossOff
      />
      {s.avoidance.includes('Other') && (
        <TextField
          id="avoidance-other"
          label="Other — what else comes off?"
          value={s.avoidanceOther}
          onChange={(v) => update('step5', { avoidanceOther: v })}
          presenter={presenter}
        />
      )}

      <TextAreaField
        id="not-responsible"
        label="For 90 days, I am not responsible for..."
        value={s.notResponsibleFor}
        onChange={(v) => update('step5', { notResponsibleFor: v })}
        presenter={presenter}
        rows={3}
      />
      <TextField
        id="favorite-avoidance"
        label="My favorite productive-looking avoidance task is..."
        value={s.favoriteAvoidance}
        onChange={(v) => update('step5', { favoriteAvoidance: v })}
        presenter={presenter}
      />
      <TextField
        id="park-ideas"
        label="I will park new ideas in..."
        value={s.parkIdeasIn}
        onChange={(v) => update('step5', { parkIdeasIn: v })}
        presenter={presenter}
      />
      <TextField
        id="review-parking-lot"
        label="I will review the parking lot on..."
        value={s.reviewParkingLotOn}
        onChange={(v) => update('step5', { reviewParkingLotOn: v })}
        placeholder="The first Friday of each month"
        presenter={presenter}
      />
    </div>
  );
}

function BatteryFloorWarning({ text }: { text: string }) {
  if (looksBuyerFacing(text)) return null;
  return (
    <div className="flex items-start gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <p className="text-sm text-foreground">
        The low-battery version must still touch a buyer, lead, or offer. &quot;Organize my
        files&quot; is not the low-battery sales plan.
      </p>
    </div>
  );
}

function FloorPair({
  title,
  regularId,
  regularLabel,
  regularValue,
  onRegular,
  lowId,
  lowValue,
  onLow,
  example,
  presenter,
}: {
  title: string;
  regularId: string;
  regularLabel: string;
  regularValue: string;
  onRegular: (v: string) => void;
  lowId: string;
  lowValue: string;
  onLow: (v: string) => void;
  example: string;
  presenter: boolean;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <HelperText presenter={presenter}>{example}</HelperText>
      <TextField
        id={regularId}
        label={regularLabel}
        value={regularValue}
        onChange={onRegular}
        presenter={presenter}
      />
      <TextField
        id={lowId}
        label="Low-battery version"
        value={lowValue}
        onChange={onLow}
        presenter={presenter}
      />
      <BatteryFloorWarning text={lowValue} />
    </div>
  );
}

export function Step6({ data, update, presenter }: StepProps) {
  const s = data.step6;
  return (
    <div className="space-y-6">
      <TeachingNote presenter={presenter}>
        The low-battery plan is the minimum version that keeps the money path alive.
      </TeachingNote>

      <FloorPair
        title="A. Get found"
        regularId="find-regular"
        regularLabel="Regular-week action"
        regularValue={s.findRegular}
        onRegular={(v) => update('step6', { findRegular: v })}
        lowId="find-low"
        lowValue={s.findLow}
        onLow={(v) => update('step6', { findLow: v })}
        example="Example: Publish one full video → repost one proven clip or send one collaboration pitch."
        presenter={presenter}
      />
      <FloorPair
        title="B. Nurture"
        regularId="nurture-regular"
        regularLabel="Regular-week action"
        regularValue={s.nurtureRegular}
        onRegular={(v) => update('step6', { nurtureRegular: v })}
        lowId="nurture-low"
        lowValue={s.nurtureLow}
        onLow={(v) => update('step6', { nurtureLow: v })}
        example="Example: Full weekly email → send a 150-word note, story, or useful replay."
        presenter={presenter}
      />
      <FloorPair
        title="C. Sell"
        regularId="sell-regular"
        regularLabel="Regular-week action"
        regularValue={s.sellRegular}
        onRegular={(v) => update('step6', { sellRegular: v })}
        lowId="sell-low"
        lowValue={s.sellLow}
        onLow={(v) => update('step6', { sellLow: v })}
        example="Example: Run the planned promotion → send one direct sales email or follow up with five warm leads."
        presenter={presenter}
      />

      <div className="space-y-2">
        <TextAreaField
          id="recovery-rule"
          label="When I miss a week, I will not catch up. I will restart with..."
          value={s.recoveryRule}
          onChange={(v) => update('step6', { recoveryRule: v })}
          presenter={presenter}
          rows={2}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-[44px]"
          onClick={() => update('step6', { recoveryRule: DEFAULT_RECOVERY_RULE })}
        >
          Use the suggested recovery rule
        </Button>
      </div>

      <ReflectionBanner>
        A hard week can cost you a week. It does not automatically get the whole quarter.
      </ReflectionBanner>
    </div>
  );
}

export function Step7({ data, update, presenter }: StepProps) {
  const s = data.step7;
  return (
    <div className="space-y-6">
      <TeachingNote presenter={presenter}>The simple move feels hard for a reason.</TeachingNote>

      <div className="rounded-lg border border-border bg-muted/50 px-4 py-3">
        <p className="text-sm text-foreground">
          Physical limits are real. This exercise addresses the meaning, fear, and decisions
          surrounding the action—not whether illness, ADHD, depression, or exhaustion are real.
        </p>
      </div>

      <TextField
        id="avoided-action"
        label="The action I keep avoiding is..."
        value={s.avoidedAction}
        onChange={(v) => update('step7', { avoidedAction: v })}
        presenter={presenter}
      />
      <TextAreaField
        id="thought"
        label="When I imagine doing it, I think..."
        value={s.thought}
        onChange={(v) => update('step7', { thought: v })}
        presenter={presenter}
        rows={3}
      />
      <TextField
        id="feeling"
        label="That thought makes me feel..."
        value={s.feeling}
        onChange={(v) => update('step7', { feeling: v })}
        presenter={presenter}
      />
      <TextField
        id="instead-i"
        label="And instead I..."
        value={s.insteadI}
        onChange={(v) => update('step7', { insteadI: v })}
        presenter={presenter}
      />

      <div className="rounded-lg border-l-4 border-primary bg-card px-4 py-4">
        <ol className="list-decimal space-y-2 pl-5 text-lg font-medium text-foreground">
          <li>What are you thinking about the action you keep avoiding?</li>
          <li>What would you need to believe to take the next useful step?</li>
        </ol>
      </div>

      <TextAreaField
        id="useful-belief"
        label="A more useful belief I can borrow is..."
        value={s.usefulBelief}
        onChange={(v) => update('step7', { usefulBelief: v })}
        presenter={presenter}
        rows={2}
      />

      <div className="space-y-2">
        <HelperText presenter={presenter}>Tap one to borrow it:</HelperText>
        <div className="grid gap-2">
          {THOUGHT_SUGGESTIONS.map((thought) => (
            <button
              key={thought}
              type="button"
              onClick={() => update('step7', { usefulBelief: thought })}
              className={cn(
                'min-h-[44px] rounded-lg border px-4 py-3 text-left text-base transition-colors',
                s.usefulBelief === thought
                  ? 'border-primary bg-primary/10 font-medium'
                  : 'border-border bg-card hover:bg-muted/60'
              )}
            >
              {thought}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          My next seven-day money move
        </h3>
        <TextField
          id="commitment-date"
          label="By this date..."
          type="date"
          value={s.commitmentDate}
          onChange={(v) => update('step7', { commitmentDate: v })}
          presenter={presenter}
        />
        <TextField
          id="money-move"
          label="I will complete this money move..."
          value={s.moneyMove}
          onChange={(v) => update('step7', { moneyMove: v })}
          presenter={presenter}
        />
        <TextField
          id="low-money-move"
          label="If my battery is low, I will complete this instead..."
          value={s.lowBatteryMoneyMove}
          onChange={(v) => update('step7', { lowBatteryMoneyMove: v })}
          presenter={presenter}
        />
      </div>
    </div>
  );
}
