import { BatteryLow, BatteryMedium, Check, Moon, Target } from "lucide-react";

/**
 * Presentational reproduction of the planner UI for the public sales page.
 * Uses the same design tokens as the real app so it reads as the product,
 * not as generic stock art.
 */

export function WindowChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle bg-card shadow-lg">
      <div className="flex items-center gap-2 border-b border-border-subtle bg-surface-sunken px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="ml-3 truncate text-[11px] text-muted-foreground">
          plan.faithmariah.com
        </span>
      </div>
      {children}
    </div>
  );
}

const bareMinimum = [
  { label: "Send the follow-up email", done: true },
  { label: "Outline one post", done: true },
  { label: "Rest without guilt", done: false },
];

export function DashboardMock() {
  return (
    <WindowChrome>
      <div className="space-y-4 bg-background p-4 text-left sm:p-6">
        {/* greeting row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-serif text-lg leading-tight sm:text-xl">
              Good morning
            </p>
            <p className="text-xs text-muted-foreground">
              Day 34 of your 90-day cycle
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border-subtle bg-card px-3 py-1.5">
            <BatteryMedium className="h-4 w-4 text-primary" aria-hidden />
            <span className="text-xs font-medium">Half battery</span>
          </div>
        </div>

        {/* cycle progress */}
        <div className="rounded-xl border border-border-subtle bg-card p-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <p className="text-sm font-semibold">
              One focus: launch the membership
            </p>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
            <div className="h-full w-[38%] rounded-full bg-primary" />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            38% through &middot; 56 days left
          </p>
        </div>

        {/* bare minimum */}
        <div className="rounded-xl border border-border-subtle bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Today&rsquo;s bare minimum
          </p>
          <ul className="mt-3 space-y-2">
            {bareMinimum.map(({ label, done }) => (
              <li key={label} className="flex items-center gap-2.5">
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border"
                  }`}
                >
                  {done ? <Check className="h-2.5 w-2.5" aria-hidden /> : null}
                </span>
                <span
                  className={`text-sm ${
                    done ? "text-muted-foreground line-through" : ""
                  }`}
                >
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* low battery chip row */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-accent px-3 py-1.5 text-[11px] font-medium text-accent-foreground">
            <Moon className="h-3 w-3" aria-hidden />
            Low Battery Day on
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
            <BatteryLow className="h-3 w-3" aria-hidden />
            3 tasks gently moved
          </span>
        </div>
      </div>
    </WindowChrome>
  );
}

const energyRows = [
  { label: "Write the sales email", cost: "Low", tone: "bg-accent text-accent-foreground" },
  { label: "Record the workshop", cost: "High", tone: "bg-surface-sunken text-muted-foreground" },
  { label: "Reply to two DMs", cost: "Low", tone: "bg-accent text-accent-foreground" },
  { label: "Map the launch plan", cost: "Medium", tone: "bg-surface-sunken text-muted-foreground" },
];

export function TasksMock() {
  return (
    <WindowChrome>
      <div className="bg-background p-4 text-left sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          This week &middot; sorted by energy
        </p>
        <ul className="mt-3 space-y-2">
          {energyRows.map(({ label, cost, tone }) => (
            <li
              key={label}
              className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-card px-3 py-2.5"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="h-4 w-4 shrink-0 rounded-full border border-border" />
                <span className="truncate text-sm">{label}</span>
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone}`}
              >
                {cost}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </WindowChrome>
  );
}
