import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { LowBatteryPlanData, buildThreeOnes } from './lowBatteryPlanTypes';
import { Copy, Pencil, Printer } from 'lucide-react';

const PRINT_STYLES = `
@media print {
  body * { visibility: hidden !important; }
  #low-battery-plan-print, #low-battery-plan-print * { visibility: visible !important; }
  #low-battery-plan-print {
    position: absolute; left: 0; top: 0; width: 100%;
    padding: 0; margin: 0; border: none; box-shadow: none; background: #fff; color: #000;
  }
  #low-battery-plan-print .no-print { display: none !important; }
  @page { margin: 14mm; }
}
`;

function orDash(value: string): string {
  return value.trim() ? value.trim() : '—';
}

export function buildPlanText(data: LowBatteryPlanData): string {
  const ones = buildThreeOnes(data);
  const off = [...data.step5.avoidance.filter((a) => a !== 'Other')];
  if (data.step5.avoidance.includes('Other') && data.step5.avoidanceOther.trim()) {
    off.push(data.step5.avoidanceOther.trim());
  }

  return [
    'My Low-Battery Business Plan: The Next 90 Days',
    '',
    'MY THREE ONEs',
    `People find me through: ${orDash(ones.visibility)}`,
    `I stay connected through: ${orDash(ones.nurture)}`,
    `I sell ${orDash(ones.offer)} to ${orDash(ones.buyer)} through ${orDash(ones.salesMethod)}`,
    `Smallest repeatable discovery action: ${orDash(data.step3.smallestAction)}`,
    '',
    'WHAT COMES OFF',
    off.length ? off.map((item) => `- ${item}`).join('\n') : '—',
    `For 90 days, I am not responsible for: ${orDash(data.step5.notResponsibleFor)}`,
    `New ideas get parked in: ${orDash(data.step5.parkIdeasIn)}`,
    `Parking lot review: ${orDash(data.step5.reviewParkingLotOn)}`,
    '',
    'MY BATTERY FLOOR',
    `Get found — regular: ${orDash(data.step6.findRegular)}`,
    `Get found — low battery: ${orDash(data.step6.findLow)}`,
    `Nurture — regular: ${orDash(data.step6.nurtureRegular)}`,
    `Nurture — low battery: ${orDash(data.step6.nurtureLow)}`,
    `Sell — regular: ${orDash(data.step6.sellRegular)}`,
    `Sell — low battery: ${orDash(data.step6.sellLow)}`,
    '',
    'MY RECOVERY RULE',
    orDash(data.step6.recoveryRule),
    '',
    'THE THOUGHT I AM NO LONGER LETTING RUN THE PLAN',
    orDash(data.step7.thought),
    '',
    'THE USEFUL BELIEF I AM BORROWING',
    orDash(data.step7.usefulBelief),
    '',
    'MY NEXT SEVEN-DAY MONEY MOVE',
    `By ${orDash(data.step7.commitmentDate)}, I will complete: ${orDash(data.step7.moneyMove)}`,
    `If my battery is low, I will complete: ${orDash(data.step7.lowBatteryMoneyMove)}`,
    '',
    'Low capacity does not mean low ambition. Keep the ambition. Remove the full-battery dependencies. Then return to the next useful move.',
  ].join('\n');
}

function EditLink({ step, onEditStep }: { step: number; onEditStep: (step: number) => void }) {
  return (
    <button
      type="button"
      onClick={() => onEditStep(step)}
      className="no-print inline-flex min-h-[44px] items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
    >
      <Pencil className="mr-1 h-3.5 w-3.5" /> Edit this section
    </button>
  );
}

function PlanSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-1 text-base text-foreground">{children}</div>
    </section>
  );
}

interface Props {
  data: LowBatteryPlanData;
  onEditStep: (step: number) => void;
  onCopy: () => void;
}

export function LowBatteryPlanResult({ data, onEditStep, onCopy }: Props) {
  const ones = buildThreeOnes(data);
  const offItems = [
    ...data.step5.avoidance.filter((a) => a !== 'Other'),
    ...(data.step5.avoidance.includes('Other') && data.step5.avoidanceOther.trim()
      ? [data.step5.avoidanceOther.trim()]
      : []),
  ];

  const rows: Array<{ label: string; regular: string; low: string }> = [
    { label: 'Get found', regular: data.step6.findRegular, low: data.step6.findLow },
    { label: 'Nurture', regular: data.step6.nurtureRegular, low: data.step6.nurtureLow },
    { label: 'Sell', regular: data.step6.sellRegular, low: data.step6.sellLow },
  ];

  return (
    <div className="space-y-4">
      <style>{PRINT_STYLES}</style>

      <div className="no-print flex flex-wrap gap-2">
        <Button variant="outline" className="min-h-[44px]" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" /> Print / Save as PDF
        </Button>
        <Button variant="outline" className="min-h-[44px]" onClick={onCopy}>
          <Copy className="mr-2 h-4 w-4" /> Copy plan
        </Button>
      </div>

      <article
        id="low-battery-plan-print"
        className="space-y-6 rounded-xl border border-border bg-card p-6"
      >
        <header className="space-y-1">
          <h2 className="text-2xl font-bold text-foreground">
            My Low-Battery Business Plan: The Next 90 Days
          </h2>
        </header>

        <Separator />

        <PlanSection title="My Three ONEs">
          <p>
            People find me through <strong>{orDash(ones.visibility)}</strong>.
          </p>
          <p>
            I stay connected through <strong>{orDash(ones.nurture)}</strong>.
          </p>
          <p>
            I sell <strong>{orDash(ones.offer)}</strong> to <strong>{orDash(ones.buyer)}</strong>{' '}
            through <strong>{orDash(ones.salesMethod)}</strong>.
          </p>
          {data.step3.smallestAction.trim() && (
            <p className="text-sm text-muted-foreground">
              Smallest repeatable discovery action: {data.step3.smallestAction}
            </p>
          )}
          <EditLink step={2} onEditStep={onEditStep} />
        </PlanSection>

        <PlanSection title="What Comes Off">
          {offItems.length ? (
            <ul className="space-y-1">
              {offItems.map((item) => (
                <li key={item} className="text-muted-foreground line-through">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p>—</p>
          )}
          <p>For 90 days, I am not responsible for: {orDash(data.step5.notResponsibleFor)}</p>
          {data.step5.parkIdeasIn.trim() && (
            <p className="text-sm text-muted-foreground">
              New ideas get parked in {data.step5.parkIdeasIn}
              {data.step5.reviewParkingLotOn.trim()
                ? `, reviewed on ${data.step5.reviewParkingLotOn}`
                : ''}
              .
            </p>
          )}
          <EditLink step={5} onEditStep={onEditStep} />
        </PlanSection>

        <PlanSection title="My Battery Floor">
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="p-2 font-semibold"> </th>
                  <th className="p-2 font-semibold">Regular week</th>
                  <th className="p-2 font-semibold">Low battery</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-t border-border align-top">
                    <td className="p-2 font-medium">{row.label}</td>
                    <td className="p-2">{orDash(row.regular)}</td>
                    <td className="p-2">{orDash(row.low)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <EditLink step={6} onEditStep={onEditStep} />
        </PlanSection>

        <PlanSection title="My Recovery Rule">
          <p>{orDash(data.step6.recoveryRule)}</p>
        </PlanSection>

        <PlanSection title="The Thought I Am No Longer Letting Run the Plan">
          <p>{orDash(data.step7.thought)}</p>
        </PlanSection>

        <PlanSection title="The Useful Belief I Am Borrowing">
          <p>{orDash(data.step7.usefulBelief)}</p>
        </PlanSection>

        <PlanSection title="My Next Seven-Day Money Move">
          <p>
            By <strong>{orDash(data.step7.commitmentDate)}</strong>, I will complete{' '}
            <strong>{orDash(data.step7.moneyMove)}</strong>.
          </p>
          <p>
            If my battery is low, I will complete{' '}
            <strong>{orDash(data.step7.lowBatteryMoneyMove)}</strong> instead.
          </p>
          <EditLink step={7} onEditStep={onEditStep} />
        </PlanSection>

        <Separator />

        <p className="text-base font-medium text-foreground">
          Low capacity does not mean low ambition. Keep the ambition. Remove the full-battery
          dependencies. Then return to the next useful move.
        </p>
      </article>
    </div>
  );
}
