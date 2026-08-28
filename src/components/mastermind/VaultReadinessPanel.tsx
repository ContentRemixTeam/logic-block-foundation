import { AlertTriangle, CheckCircle2, Search, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { MastermindWorkspaceDraft, VaultReadinessGate } from '@/lib/mastermindWorkspace';

interface VaultReadinessPanelProps {
  draft: MastermindWorkspaceDraft;
}

const benchmarkRows = [
  ['Exact title', '90 Day Goal Setting Workshop', 'Correct asset appears first.'],
  ['Member problem', "I don't know what to sell", 'Offer clarity resources outrank old archive content.'],
  ['Misspelling', 'transcrtips and curriclumm', 'Likely results still appear without leaking locked metadata.'],
  ['Locked content', 'January 2025 coaching call', 'Monthly users see no annual Vault titles or snippets.'],
] as const;

export function VaultReadinessPanel({ draft }: VaultReadinessPanelProps) {
  return (
    <div className="space-y-4" data-vault-hidden-readiness>
      <Card className="border-amber-300 bg-amber-50 text-amber-950">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-amber-700 text-amber-950">Hidden readiness</Badge>
            <Badge variant="outline" className="border-amber-700 text-amber-950">Search flag off</Badge>
          </div>
          <CardTitle className="text-2xl leading-tight">Vault stays private until Searchie parity is proven.</CardTitle>
          <CardDescription className="text-amber-900">
            This draft checks the member experience, access boundaries, and QA plan without exposing replay metadata.
          </CardDescription>
        </CardHeader>
      </Card>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Access state
            </CardTitle>
            <CardDescription>{draft.personaLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {draft.vaultGates.map((gate) => (
              <GateRow key={gate.id} gate={gate} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-4 w-4 text-primary" />
              Search benchmark
            </CardTitle>
            <CardDescription>Search must find the next useful resource, not just a matching file.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {benchmarkRows.map(([type, query, pass]) => (
              <div key={type} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-[11px]">{type}</Badge>
                  <p className="break-words text-sm font-semibold">{query}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{pass}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function GateRow({ gate }: { gate: VaultReadinessGate }) {
  const Icon = gate.status === 'ready' ? CheckCircle2 : AlertTriangle;

  return (
    <div className="flex gap-3 rounded-lg border p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">{gate.label}</p>
          <Badge variant={gate.status === 'ready' ? 'secondary' : 'outline'} className="text-[11px]">{gate.status}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{gate.detail}</p>
      </div>
    </div>
  );
}
