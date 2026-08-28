import { useMemo, useState } from 'react';
import { Bot, Clipboard, FileText, KeyRound, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { MastermindWorkspaceDraft } from '@/lib/mastermindWorkspace';

interface AIWorkflowBuilderPreviewProps {
  draft: MastermindWorkspaceDraft;
}

export function AIWorkflowBuilderPreview({ draft }: AIWorkflowBuilderPreviewProps) {
  const workflow = draft.aiWorkflow;
  const [outcome, setOutcome] = useState(workflow.outcome);
  const [input, setInput] = useState('Offer notes, audience language, current 90-day plan, and one example of good output.');
  const [output, setOutput] = useState('One draft I can review, edit, and test this week.');
  const [guardrail, setGuardrail] = useState('Do not send, publish, promise results, or make strategy changes without my approval.');
  const [copyStatus, setCopyStatus] = useState('');

  const packet = useMemo(() => {
    return [
      '# START-HERE',
      `Use this workspace for: ${workflow.workflowName}.`,
      '',
      '# BUSINESS-STRATEGY',
      `Current 90-day focus: ${draft.ninetyDayFocus}`,
      `Current 90-day focus: ${draft.currentStage.label}`,
      `Next money move: ${draft.nextMoneyMove}`,
      '',
      '# AI-EMPLOYEE-JOB-CARD',
      `Employee name: ${workflow.employeeName}`,
      `Outcome: ${outcome}`,
      `Inputs: ${input}`,
      `Finished output: ${output}`,
      '',
      '# APPROVAL-RULES',
      guardrail,
      '',
      '# FIRST-TEST-PROMPT',
      workflow.firstTestPrompt,
      '',
      '# QUALITY-CHECKLIST',
      '- Does this support the current money move?',
      '- Is the output specific enough to use this week?',
      '- What needs human judgment before this repeats?',
      '',
      '# DECISION-LOG',
      'Decision: keep, improve, pause, or ask Faith.',
    ].join('\n');
  }, [draft.currentStage.label, draft.nextMoneyMove, draft.ninetyDayFocus, guardrail, input, outcome, output, workflow]);

  const copyPacket = async () => {
    try {
      await navigator.clipboard.writeText(packet);
      setCopyStatus('Packet copied.');
    } catch {
      setCopyStatus('Copy unavailable. Select the packet text manually.');
    }
  };

  return (
    <div className="space-y-4" data-ai-workflow-builder-preview>
      <Card className="border-primary/25 bg-primary/5">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-[11px]">Build AI Support</Badge>
            <Badge variant="outline" className="text-[11px]">{draft.currentStage.label}</Badge>
          </div>
          <CardTitle className="text-2xl leading-tight">{workflow.employeeName}</CardTitle>
          <CardDescription>{workflow.workflowName}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <BuilderState icon={ShieldCheck} title="Mode" value="Supervised first test" />
          <BuilderState icon={KeyRound} title="AI key" value="Optional BYO key later" />
          <BuilderState icon={FileText} title="Output" value="Workspace packet" />
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-4 w-4 text-primary" />
              Workflow interview
            </CardTitle>
            <CardDescription>Answer only what the packet needs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="What should this workflow produce?">
              <Textarea value={outcome} onChange={(event) => setOutcome(event.target.value)} className="min-h-24" />
            </Field>
            <Field label="What input does AI need?">
              <Textarea value={input} onChange={(event) => setInput(event.target.value)} className="min-h-24" />
            </Field>
            <Field label="What should the finished output look like?">
              <Input value={output} onChange={(event) => setOutput(event.target.value)} />
            </Field>
            <Field label="What must require approval?">
              <Textarea value={guardrail} onChange={(event) => setGuardrail(event.target.value)} className="min-h-24" />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clipboard className="h-4 w-4 text-primary" />
              Packet preview
            </CardTitle>
            <CardDescription>Useful in no-key mode; stronger once BYO-key drafting is connected.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={packet} readOnly className="min-h-[420px] resize-none font-mono text-xs leading-relaxed" />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button type="button" onClick={copyPacket}>
                Copy packet
              </Button>
              <p className="text-sm text-muted-foreground" role="status" aria-live="polite">{copyStatus}</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function BuilderState({ icon: Icon, title, value }: { icon: React.ComponentType<{ className?: string }>; title: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background/85 p-3">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-2 text-xs font-semibold text-muted-foreground">{title}</p>
      <p className="mt-1 text-sm font-semibold leading-snug">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
