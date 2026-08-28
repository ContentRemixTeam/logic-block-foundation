import { useMemo, useState } from 'react';
import { Bot, CheckCircle2, Clipboard, FileText, KeyRound, ShieldCheck } from 'lucide-react';
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
  const [setupTarget, setSetupTarget] = useState<'Claude' | 'ChatGPT' | 'Codex' | 'Zapier' | 'n8n'>('Claude');
  const [outcome, setOutcome] = useState(workflow.outcome);
  const [input, setInput] = useState('Offer notes, audience language, current 90-day plan, and one example of good output.');
  const [output, setOutput] = useState('One draft I can review, edit, and test this week.');
  const [guardrail, setGuardrail] = useState('Do not send, publish, promise results, or make strategy changes without my approval.');
  const [copyStatus, setCopyStatus] = useState('');

  const packetFiles = getPacketFiles(setupTarget);

  const packet = useMemo(() => {
    return [
      '# AI-BUSINESS-PROFILE',
      `Current 90-day focus: ${draft.ninetyDayFocus}`,
      `Current stage: ${draft.currentStage.label}`,
      `Next money move: ${draft.nextMoneyMove}`,
      '',
      '# SETUP TARGET',
      setupTarget,
      '',
      '# AI-EMPLOYEE-JOB-CARD',
      `Employee name: ${workflow.employeeName}`,
      `Workflow: ${workflow.workflowName}`,
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
      '- Did the first test save time, improve quality, or create confusion?',
      '',
      '# DECISION-LOG',
      'Decision: keep, improve, pause, or ask Faith.',
    ].join('\n');
  }, [draft.currentStage.label, draft.nextMoneyMove, draft.ninetyDayFocus, guardrail, input, outcome, output, setupTarget, workflow]);

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
            <Badge variant="secondary" className="text-[11px]">Create My AI Workspace</Badge>
            <Badge variant="outline" className="text-[11px]">{draft.currentStage.label}</Badge>
          </div>
          <CardTitle className="text-2xl leading-tight">AI Business Profile</CardTitle>
          <CardDescription>
            Turn the current 90-day focus into one custom workspace, setup guide, and supervised first test.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <BuilderState icon={ShieldCheck} title="Mode" value="Supervised first test" />
          <BuilderState icon={KeyRound} title="Cost control" value="No-key template or BYO key" />
          <BuilderState icon={FileText} title="Output" value="Custom setup packet" />
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-4 w-4 text-primary" />
              Profile interview
            </CardTitle>
            <CardDescription>Prefill from the 90-day plan, then ask only for missing context.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-sm font-semibold">Recommended assistant</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {workflow.employeeName}: {workflow.workflowName}. Show one assistant for this plan, not a full AI team.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Setup target</Label>
              <div className="flex flex-wrap gap-2">
                {(['Claude', 'ChatGPT', 'Codex', 'Zapier', 'n8n'] as const).map((target) => (
                  <Button
                    key={target}
                    type="button"
                    variant={setupTarget === target ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSetupTarget(target)}
                  >
                    {target}
                  </Button>
                ))}
              </div>
            </div>
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
            <div className="grid gap-2 sm:grid-cols-2">
              <ContextTile title="90-day plan" value="Connected to AI Business Profile" />
              <ContextTile title="Offer notes" value="Member-private upload" />
              <ContextTile title="Voice examples" value="Ready to add" />
              <ContextTile title="Customer language" value="Member-owned examples only" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clipboard className="h-4 w-4 text-primary" />
              Generated setup packet
            </CardTitle>
            <CardDescription>{setupTarget}-ready docs. Useful in no-key mode; stronger once BYO-key drafting is connected.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              {packetFiles.map((file) => (
                <div key={file.name} className="grid gap-2 rounded-lg border bg-background p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold">{file.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{file.description}</p>
                  </div>
                  <Badge variant={file.generated ? 'secondary' : 'outline'}>{file.generated ? 'Generated' : 'Draft'}</Badge>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-950">
              <p className="font-semibold">Run first test</p>
              <p className="mt-1">Use one real lead or one real workflow example, then decide: keep, improve, pause, or ask Faith.</p>
            </div>
            <Textarea value={packet} readOnly className="min-h-[220px] resize-none font-mono text-xs leading-relaxed" />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button type="button" onClick={copyPacket}>
                Copy setup packet
              </Button>
              <p className="text-sm text-muted-foreground" role="status" aria-live="polite">{copyStatus}</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function getPacketFiles(target: 'Claude' | 'ChatGPT' | 'Codex' | 'Zapier' | 'n8n') {
  const shared = [
    { name: 'AI-BUSINESS-PROFILE.md', description: 'Offer, audience, current plan, voice, examples, and approval rules.', generated: true },
    { name: 'WORKFLOW-SOP.md', description: 'The human workflow before automation.', generated: false },
    { name: 'QUALITY-CHECKLIST.md', description: 'How the member judges whether the output is good enough to use.', generated: false },
    { name: 'FIRST-TEST-PROMPT.md', description: 'The exact first prompt or manual test for this workflow.', generated: false },
    { name: 'INSTALL-GUIDE.md', description: 'Simple setup steps for the selected platform.', generated: false },
  ];

  if (target === 'Claude') {
    return [
      { name: 'CLAUDE.md', description: 'Project instructions or skill behavior for Claude.', generated: true },
      { name: 'PROJECT-KNOWLEDGE.md', description: 'Context file to upload or keep in the Claude project.', generated: true },
      ...shared,
      { name: 'SKILL.md', description: 'Optional installable skill file after the workflow is proven.', generated: false },
    ];
  }

  if (target === 'ChatGPT') {
    return [
      { name: 'GPT-INSTRUCTIONS.md', description: 'One-job Custom GPT or project instructions under the builder limit.', generated: true },
      { name: 'GPT-KNOWLEDGE.md', description: 'Reference context that belongs in uploaded knowledge, not the instructions field.', generated: true },
      { name: 'CONVERSATION-STARTERS.md', description: 'Four simple ways to start using the assistant.', generated: false },
      ...shared,
    ];
  }

  if (target === 'Codex') {
    return [
      { name: 'AGENTS.md', description: 'Codex project rules and boundaries.', generated: true },
      { name: 'README.md', description: 'Project front door and current business goal.', generated: true },
      { name: 'PROJECT-BRIEF.md', description: 'The business workflow and desired artifact.', generated: true },
      ...shared,
      { name: 'FIRST-WORK-ORDER.md', description: 'The first safe Codex task to run.', generated: false },
      { name: 'DECISION-LOG.md', description: 'What was tested, kept, changed, or paused.', generated: false },
    ];
  }

  return [
    { name: 'AUTOMATION-BRIEF.md', description: `${target} trigger/action plan. No live activation in v1.`, generated: true },
    { name: 'TRIGGER-ACTION-MAP.md', description: 'Inputs, actions, outputs, and failure cases.', generated: false },
    { name: 'APPROVAL-RULES.md', description: 'What the automation may not do without approval.', generated: true },
    { name: 'ROLLBACK-PLAN.md', description: 'How to stop or undo the workflow safely.', generated: false },
    { name: 'MANUAL-TEST-CHECKLIST.md', description: 'Run the workflow manually before automating.', generated: false },
    ...shared,
  ];
}

function ContextTile({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-3">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{value}</p>
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
