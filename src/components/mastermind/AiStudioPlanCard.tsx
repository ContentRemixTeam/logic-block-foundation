import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Bot, CheckCircle2, ClipboardCheck, Copy, Download, KeyRound, Lock, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { savePhaseOneState, usePhaseOneState, type PhaseOneWorkspaceStatus } from '@/hooks/usePhaseOneCatalog';
import {
  getAiStudioAccessSummary,
  getRecommendedAiProjectPack,
  getVisibleAiProjectPacks,
  type AiProjectPackId,
  type VisibleAiPackState,
} from '@/lib/mastermindAiStudio';
import {
  MASTERMIND_SUCCESS_STAGES,
  type MastermindPlanCycle,
  type MastermindStageId,
} from '@/lib/mastermindSuccessPath';
import { getStorageItem, setStorageItem } from '@/lib/storage';
import { cn } from '@/lib/utils';

interface AiStudioPlanCardProps {
  cycle: MastermindPlanCycle | null | undefined;
  selectedStageId: MastermindStageId;
  isMastermind: boolean;
  membershipTier: string | null;
  memberScopes?: string[];
  previewCapabilities?: string[];
  accessLoading?: boolean;
  onOpenAiSettings: () => void;
}

const visibilityLabel: Record<VisibleAiPackState, string> = {
  included: 'Included',
  recommended_unlock: 'Recommended unlock',
  locked: 'Locked',
};

const AI_STUDIO_CUSTOMIZATION_STORAGE_KEY = 'mastermind-ai-studio-customization-v1';
const AI_STUDIO_WORKSPACE_TRACKER_STORAGE_KEY = 'mastermind-ai-studio-workspace-tracker-v1';

interface AiStudioCustomization {
  installHome: string;
  businessContext: string;
  guardrails: string;
  firstAsset: string;
}

interface AiStudioWorkspaceProgress {
  setupSavedAt?: string;
  customDocsCopiedAt?: string;
  workspaceInstalledAt?: string;
  firstAssetTestedAt?: string;
}

type AiStudioWorkspaceTracker = Record<string, AiStudioWorkspaceProgress>;

const DEFAULT_CUSTOMIZATION: AiStudioCustomization = {
  installHome: 'Claude Project, ChatGPT Project, custom GPT, or Codex workspace',
  businessContext: '',
  guardrails: '',
  firstAsset: '',
};

function clean(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.toLowerCase() !== 'n' ? trimmed : fallback;
}

function formatPacket(sections: { title: string; body: string }[]) {
  return sections
    .map((section) => `## ${section.title}\n${section.body}`)
    .join('\n\n');
}

function formatList(items: string[]) {
  return items.map((item) => `- ${item}`).join('\n');
}

function slugifyFilePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'ai-workspace';
}

function downloadMarkdownFile(filename: string, body: string) {
  const blob = new Blob([body], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildStarterPacket({
  cycle,
  selectedStageId,
  recommendedPack,
}: {
  cycle: MastermindPlanCycle | null | undefined;
  selectedStageId: MastermindStageId;
  recommendedPack: ReturnType<typeof getRecommendedAiProjectPack>;
}) {
  const stage = MASTERMIND_SUCCESS_STAGES.find((item) => item.id === selectedStageId) ?? MASTERMIND_SUCCESS_STAGES[0];
  const goal = clean(cycle?.goal, 'Use my current 90-day plan and help me choose one clear result.');
  const audience = clean(cycle?.audience_target, 'The buyer or audience from my current plan.');
  const bottleneck = clean(cycle?.biggest_bottleneck, stage.memberQuestion);
  const message = clean(cycle?.signature_message, 'Use my current offer, voice, and point of view.');
  const capacity = clean(cycle?.low_energy_version || cycle?.medium_energy_version || cycle?.high_energy_version, 'Keep the next step small enough to finish this week.');
  const why = clean(cycle?.why, 'Help me make progress without adding unnecessary complexity.');

  return [
    {
      title: 'Start Here',
      body: `You are my ${recommendedPack.title}. Help me make progress on this 90-day goal: ${goal}. Keep advice focused on one next business result, one next action, and one evidence target.`,
    },
    {
      title: 'Business Profile',
      body: `Audience: ${audience}\nCurrent focus: ${stage.label}\nLikely bottleneck: ${bottleneck}\nMessage or offer language: ${message}\nCapacity rule: ${capacity}\nWhy this matters: ${why}`,
    },
    {
      title: 'Project Instructions',
      body: `Use Faith Mariah's planning style: choose the smallest useful move, test it with real people, separate facts from interpretation, and do not suggest a full rebuild unless the evidence requires it. When I ask for help, give me one primary recommendation, one lower-capacity version, and one thing to record as evidence.`,
    },
    {
      title: 'First Test',
      body: recommendedPack.firstTest,
    },
    {
      title: 'Review Checklist',
      body: 'Before I use the output, check: Is it tied to my 90-day goal? Does it create buyer/customer evidence? Is it small enough to do this week? Does it protect what is already working? Did it avoid generic AI advice?',
    },
  ];
}

function buildCustomInstallPacket({
  cycle,
  selectedStageId,
  recommendedPack,
  customization,
}: {
  cycle: MastermindPlanCycle | null | undefined;
  selectedStageId: MastermindStageId;
  recommendedPack: ReturnType<typeof getRecommendedAiProjectPack>;
  customization: AiStudioCustomization;
}) {
  const stage = MASTERMIND_SUCCESS_STAGES.find((item) => item.id === selectedStageId) ?? MASTERMIND_SUCCESS_STAGES[0];
  const goal = clean(cycle?.goal, 'Choose one clear 90-day business result.');
  const context = clean(customization.businessContext, clean(cycle?.audience_target, 'Use the business profile and current plan before advising.'));
  const guardrails = clean(customization.guardrails, 'Do not suggest a full rebuild, a new funnel, or a complicated automation unless the evidence proves it is needed.');
  const firstAsset = clean(customization.firstAsset, recommendedPack.firstTest);
  const installHome = clean(customization.installHome, DEFAULT_CUSTOMIZATION.installHome);
  const audience = clean(cycle?.audience_target, 'The buyer or audience from my current plan.');
  const message = clean(cycle?.signature_message, 'Use my current offer, voice, and point of view.');
  const capacity = clean(cycle?.low_energy_version || cycle?.medium_energy_version || cycle?.high_energy_version, 'Keep the next step small enough to complete this week.');

  return [
    {
      title: 'Start Here',
      body: `Install this as: ${recommendedPack.title}. Use it inside: ${installHome}. Its job is to help me make progress on this 90-day result: ${goal}. It should act like a strategic implementation assistant, not a generic brainstorming tool.`,
    },
    {
      title: 'Business Profile',
      body: `Current focus: ${stage.label}\nAudience: ${audience}\nBusiness context to remember: ${context}\nMessage or offer language: ${message}\nMain constraint or bottleneck: ${clean(cycle?.biggest_bottleneck, stage.memberQuestion)}\nCapacity rule: ${capacity}`,
    },
    {
      title: 'Project Instructions',
      body: [
        `Primary job: ${recommendedPack.job}`,
        ...recommendedPack.operatingRules,
        `Member-specific guardrail: ${guardrails}`,
        'Start by restating the decision or asset I am asking for in plain language.',
        'Ask for missing context only when it would materially change the recommendation.',
        'Use this answer format: one recommendation, why it fits the 90-day plan, one lower-capacity version, one evidence target, assumptions to test, and any contradiction to bring to coaching.',
        'Label each important recommendation as plan evidence, buyer/customer evidence, member preference, or AI assumption.',
        'If the output starts becoming generic, bring it back to the current buyer, offer, capacity, and 90-day result.',
        'If my request conflicts with the saved plan, Faith\'s curriculum, or the guardrails above, name the conflict before giving advice.',
      ].map((line) => `- ${line}`).join('\n'),
    },
    {
      title: 'First Test',
      body: `${firstAsset}\n\nAfter the first answer, ask: "What part of this is based on evidence, and what part is an assumption I should test?"`,
    },
    {
      title: 'Review Checklist',
      body: [
        ...recommendedPack.outputChecks,
        'The output is specific to my business instead of generic best practices.',
        'The next action is small enough to complete before the next check-in.',
        'The evidence target tells me what to watch for after I use it.',
      ].map((check) => `- ${check}`).join('\n'),
    },
  ];
}

function buildAdvancedInstallDocs({
  cycle,
  selectedStageId,
  recommendedPack,
  customization,
}: {
  cycle: MastermindPlanCycle | null | undefined;
  selectedStageId: MastermindStageId;
  recommendedPack: ReturnType<typeof getRecommendedAiProjectPack>;
  customization: AiStudioCustomization;
}) {
  const stage = MASTERMIND_SUCCESS_STAGES.find((item) => item.id === selectedStageId) ?? MASTERMIND_SUCCESS_STAGES[0];
  const goal = clean(cycle?.goal, 'Choose one clear 90-day business result.');
  const guardrails = clean(customization.guardrails, 'Keep recommendations simple, evidence-based, and aligned with the current plan.');

  return [
    {
      title: 'Installation Steps',
      body: [
        'Create a new Claude Project, ChatGPT Project, custom GPT, or Codex workspace.',
        `Name it ${recommendedPack.title}.`,
        'Paste the Project Instructions section into the instruction area.',
        'Add the Business Profile as a project knowledge document.',
        'Add the Knowledge Docs below as separate notes when the platform allows it.',
        'Run the First Test before using it for real business decisions.',
      ].map((step, index) => `${index + 1}. ${step}`).join('\n'),
    },
    {
      title: 'Setup Interview To Answer',
      body: recommendedPack.setupQuestions.map((question) => `- ${question}`).join('\n'),
    },
    {
      title: 'Knowledge Docs To Add',
      body: [
        `90-day result: ${goal}`,
        `Current section: ${stage.label}`,
        `AI setup purpose: ${recommendedPack.job}`,
        `Member guardrails: ${guardrails}`,
        ...recommendedPack.knowledgeDocs.map((doc) => `Create a note called "${doc}" and keep it updated as real evidence comes in.`),
      ].map((item) => `- ${item}`).join('\n'),
    },
    {
      title: 'Weekly Use Prompt',
      body: `Use my current 90-day plan and this week's check-in. Give me one useful next move for ${stage.label}, one lower-capacity version, and one evidence target. Do not give me a full strategy rebuild unless the evidence says the plan is wrong.`,
    },
    {
      title: 'Troubleshooting',
      body: formatList([
        'If the answer is too broad, ask it to choose one next action for this week only.',
        'If the answer sounds generic, paste in more buyer language, offer context, or proof.',
        'If it suggests too much, ask for the low-capacity version and the first test.',
        'If the advice contradicts Faith or your plan, bring the contradiction to coaching before changing direction.',
      ]),
    },
    {
      title: 'Output Quality Benchmark',
      body: [
        'Run the same business question three ways before trusting this setup:',
        '1. Same-context baseline: ask regular ChatGPT or Claude with only the business question.',
        '2. Profile-only: paste the Business Profile, then ask the same question.',
        `3. Full pack: ask inside the installed ${recommendedPack.title}.`,
        'The full pack should win because it gives a clearer next move, protects the 90-day plan, uses buyer/customer evidence, respects guardrails, and names what to test next.',
        'If the full pack does not clearly beat the baseline, update the Business Profile and guardrails before using it for real decisions.',
      ].join('\n'),
    },
    {
      title: 'Source Labels And Contradictions',
      body: [
        'Ask the AI to label important claims as plan evidence, buyer/customer evidence, member preference, Faith/program guidance, or AI assumption.',
        'Do not let it treat a guess like a fact.',
        'When advice conflicts with Faith, the saved plan, or real market evidence, it should name the contradiction and suggest the smallest evidence test or coaching question.',
      ].join('\n'),
    },
  ];
}

export function AiStudioPlanCard({
  cycle,
  selectedStageId,
  isMastermind,
  membershipTier,
  memberScopes = [],
  previewCapabilities = [],
  accessLoading = false,
  onOpenAiSettings,
}: AiStudioPlanCardProps) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [customCopied, setCustomCopied] = useState(false);
  const [customDownloaded, setCustomDownloaded] = useState(false);
  const [answersSaved, setAnswersSaved] = useState(false);
  const [serverSyncStatus, setServerSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [customization, setCustomization] = useState<AiStudioCustomization>(DEFAULT_CUSTOMIZATION);
  const [workspaceTracker, setWorkspaceTracker] = useState<AiStudioWorkspaceTracker>({});
  const phaseOneStateQuery = usePhaseOneState(Boolean(cycle?.cycle_id));
  const access = getAiStudioAccessSummary(membershipTier, isMastermind, memberScopes, previewCapabilities);
  const recommendedPack = getRecommendedAiProjectPack(selectedStageId, cycle);
  const visiblePacks = getVisibleAiProjectPacks(access, recommendedPack.id);
  const [selectedPackId, setSelectedPackId] = useState<AiProjectPackId | null>(null);
  const selectedPack =
    visiblePacks.find((pack) => pack.id === selectedPackId && pack.visibility !== 'locked')
    ?? visiblePacks.find((pack) => pack.id === recommendedPack.id && pack.visibility !== 'locked')
    ?? visiblePacks.find((pack) => pack.access === 'planner_safe')
    ?? recommendedPack;
  const workspaceTrackerKey = `${cycle?.cycle_id || 'active-cycle'}:${selectedPack.id}`;
  const starterPacket = useMemo(
    () => buildStarterPacket({ cycle, selectedStageId, recommendedPack: selectedPack }),
    [cycle, selectedPack, selectedStageId]
  );
  const customInstallPacket = useMemo(
    () => buildCustomInstallPacket({ cycle, selectedStageId, recommendedPack: selectedPack, customization }),
    [cycle, customization, selectedPack, selectedStageId]
  );
  const advancedInstallDocs = useMemo(
    () => buildAdvancedInstallDocs({ cycle, selectedStageId, recommendedPack: selectedPack, customization }),
    [cycle, customization, selectedPack, selectedStageId]
  );
  const starterPacketText = useMemo(
    () => formatPacket(starterPacket),
    [starterPacket]
  );
  const fullInstallPacketText = useMemo(
    () =>
      [
        `# ${selectedPack.title} Install Packet`,
        `Generated from this 90-day plan in the Planner app.`,
        formatPacket(customInstallPacket),
        `## Advanced Install Docs\n${formatPacket(advancedInstallDocs)}`,
      ].join('\n\n'),
    [advancedInstallDocs, customInstallPacket, selectedPack.title]
  );

  useEffect(() => {
    const stored = getStorageItem(AI_STUDIO_CUSTOMIZATION_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<AiStudioCustomization>;
        setCustomization({
          installHome: parsed.installHome || DEFAULT_CUSTOMIZATION.installHome,
          businessContext: parsed.businessContext || '',
          guardrails: parsed.guardrails || '',
          firstAsset: parsed.firstAsset || '',
        });
      } catch {
        setCustomization(DEFAULT_CUSTOMIZATION);
      }
    }

    const storedTracker = getStorageItem(AI_STUDIO_WORKSPACE_TRACKER_STORAGE_KEY);
    if (storedTracker) {
      try {
        setWorkspaceTracker(JSON.parse(storedTracker) as AiStudioWorkspaceTracker);
      } catch {
        setWorkspaceTracker({});
      }
    }
  }, []);

  const updateWorkspaceProgress = (progress: AiStudioWorkspaceProgress) => {
    setWorkspaceTracker((current) => {
      const next = {
        ...current,
        [workspaceTrackerKey]: {
          ...current[workspaceTrackerKey],
          ...progress,
        },
      };
      setStorageItem(AI_STUDIO_WORKSPACE_TRACKER_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const syncPhaseOneWorkspace = async (workspaceStatus: PhaseOneWorkspaceStatus) => {
    if (!cycle?.cycle_id) return;
    setServerSyncStatus('saving');
    try {
      await savePhaseOneState({
        cycleId: cycle.cycle_id,
        currentStep: 'workspace',
        planReady: true,
        workspaceStatus,
      });
      await queryClient.invalidateQueries({ queryKey: ['phase-one-state'] });
      setServerSyncStatus('saved');
      window.setTimeout(() => setServerSyncStatus('idle'), 2200);
    } catch (error) {
      console.error('Unable to sync AI Studio workspace state:', error);
      setServerSyncStatus('failed');
    }
  };

  const updateCustomization = (field: keyof AiStudioCustomization, value: string) => {
    setAnswersSaved(false);
    setCustomization((current) => ({ ...current, [field]: value }));
  };

  const saveCustomization = () => {
    setStorageItem(AI_STUDIO_CUSTOMIZATION_STORAGE_KEY, JSON.stringify(customization));
    updateWorkspaceProgress({ setupSavedAt: new Date().toISOString() });
    void syncPhaseOneWorkspace('in_progress');
    setAnswersSaved(true);
    window.setTimeout(() => setAnswersSaved(false), 1800);
  };

  const copyStarterPacket = async () => {
    try {
      await navigator.clipboard.writeText(starterPacketText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const copyCustomInstallPacket = async () => {
    try {
      await navigator.clipboard.writeText(fullInstallPacketText);
      updateWorkspaceProgress({ customDocsCopiedAt: new Date().toISOString() });
      void syncPhaseOneWorkspace('in_progress');
      setCustomCopied(true);
      window.setTimeout(() => setCustomCopied(false), 1800);
    } catch {
      setCustomCopied(false);
    }
  };

  const downloadCustomInstallPacket = () => {
    downloadMarkdownFile(`${slugifyFilePart(selectedPack.title)}-install-packet.md`, fullInstallPacketText);
    updateWorkspaceProgress({ customDocsCopiedAt: new Date().toISOString() });
    void syncPhaseOneWorkspace('in_progress');
    setCustomDownloaded(true);
    window.setTimeout(() => setCustomDownloaded(false), 1800);
  };

  const markWorkspaceInstalled = () => {
    updateWorkspaceProgress({ workspaceInstalledAt: new Date().toISOString() });
    void syncPhaseOneWorkspace('ready');
  };

  const markFirstTestComplete = () => {
    updateWorkspaceProgress({ firstAssetTestedAt: new Date().toISOString() });
  };

  const localProgress = workspaceTracker[workspaceTrackerKey] ?? {};
  const serverStateApplies = Boolean(
    phaseOneStateQuery.data
      && (!cycle?.cycle_id || !phaseOneStateQuery.data.cycle_id || phaseOneStateQuery.data.cycle_id === cycle.cycle_id)
  );
  const serverSetupSavedAt = serverStateApplies
    && (phaseOneStateQuery.data?.plan_ready_at || ['in_progress', 'ready'].includes(phaseOneStateQuery.data?.workspace_status ?? ''))
    ? phaseOneStateQuery.data.plan_ready_at || phaseOneStateQuery.data.updated_at
    : undefined;
  const serverWorkspaceReadyAt = serverStateApplies && phaseOneStateQuery.data?.workspace_status === 'ready'
    ? phaseOneStateQuery.data.workspace_ready_at || phaseOneStateQuery.data.updated_at
    : undefined;
  const currentProgress = {
    ...localProgress,
    setupSavedAt: localProgress.setupSavedAt ?? serverSetupSavedAt,
    workspaceInstalledAt: localProgress.workspaceInstalledAt ?? serverWorkspaceReadyAt,
  };
  const workspaceChecklist = [
    { label: 'Setup answers saved', complete: Boolean(currentProgress.setupSavedAt) },
    { label: 'Install docs copied or downloaded', complete: Boolean(currentProgress.customDocsCopiedAt) },
    { label: 'Workspace installed', complete: Boolean(currentProgress.workspaceInstalledAt) },
    { label: 'First test run', complete: Boolean(currentProgress.firstAssetTestedAt) },
  ];
  const completedWorkspaceSteps = workspaceChecklist.filter((item) => item.complete).length;

  return (
    <Card className="border-primary/20">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="w-fit">Plan-matched setup</Badge>
          <Badge variant="outline" className="w-fit">{access.tierLabel}</Badge>
          {accessLoading && <Badge variant="outline" className="w-fit">Checking access</Badge>}
        </div>
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Bot className="h-5 w-5 text-primary" aria-hidden="true" />
            Create My AI Workspace
          </CardTitle>
          <CardDescription>
            The AI setup starts from the saved 90-day plan, then asks only for the missing business details before generating install-ready project instructions and knowledge docs.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-lg border bg-muted/25 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  {selectedPack.id === recommendedPack.id ? 'Recommended from this plan' : 'Selected setup'}
                </p>
                <h3 className="mt-1 break-words text-lg font-semibold leading-snug">{selectedPack.title}</h3>
              </div>
              <Sparkles className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{selectedPack.job}</p>
            {selectedPack.id !== recommendedPack.id && (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Selected from library. The plan-matched recommendation is {recommendedPack.title}.
              </p>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md bg-background p-3">
                <p className="text-xs font-semibold text-muted-foreground">Interview focuses on</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedPack.interviewFocus.map((item) => (
                    <Badge key={item} variant="outline" className="text-[11px] capitalize">{item}</Badge>
                  ))}
                </div>
              </div>
              <div className="rounded-md bg-background p-3">
                <p className="text-xs font-semibold text-muted-foreground">First supervised test</p>
                <p className="mt-2 text-sm leading-snug">{selectedPack.firstTest}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-background p-4">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
              <p className="text-sm font-semibold">Cost control</p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              No key is needed for templates, checklists, or install instructions. Any live coaching or document generation can use the member's own OpenAI or Claude key.
            </p>
            <Button type="button" variant="secondary" className="mt-4 w-full" onClick={onOpenAiSettings}>
              Open AI key settings
            </Button>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            <h3 className="text-sm font-semibold">What it will build</h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {selectedPack.installOutputs.map((output) => (
              <div key={output} className="rounded-lg border bg-background p-3 text-sm leading-snug">
                {output}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-background p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">Customize before installing</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Answer the missing context once, then copy the custom install docs into the member's own AI workspace.
              </p>
            </div>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={saveCustomization}>
              {answersSaved ? 'Saved' : 'Save setup answers'}
            </Button>
          </div>

          <div className="mt-4 rounded-lg border bg-muted/35 p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Setup interview</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {selectedPack.setupQuestions.map((question) => (
                <div key={question} className="rounded-md bg-background p-3 text-sm leading-relaxed">
                  {question}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <label htmlFor="ai-studio-install-home" className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground">Where I will install it</span>
              <Textarea
                id="ai-studio-install-home"
                value={customization.installHome}
                onChange={(event) => updateCustomization('installHome', event.target.value)}
                className="min-h-20"
              />
            </label>
            <label htmlFor="ai-studio-business-context" className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground">Business context this AI must remember</span>
              <Textarea
                id="ai-studio-business-context"
                value={customization.businessContext}
                onChange={(event) => updateCustomization('businessContext', event.target.value)}
                placeholder="Offer, buyer, proof, stage of business, voice notes, current constraints..."
                className="min-h-20"
              />
            </label>
            <label htmlFor="ai-studio-guardrails" className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground">What it should not change without asking</span>
              <Textarea
                id="ai-studio-guardrails"
                value={customization.guardrails}
                onChange={(event) => updateCustomization('guardrails', event.target.value)}
                placeholder="Non-negotiables, brand rules, offers to protect, team boundaries, capacity limits..."
                className="min-h-20"
              />
            </label>
            <label htmlFor="ai-studio-first-asset" className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground">First asset I want it to create</span>
              <Textarea
                id="ai-studio-first-asset"
                value={customization.firstAsset}
                onChange={(event) => updateCustomization('firstAsset', event.target.value)}
                placeholder={selectedPack.firstTest}
                className="min-h-20"
              />
            </label>
          </div>

          <div className="mt-4 rounded-lg bg-muted/35 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h4 className="text-sm font-semibold">Custom install docs</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Copy or download the install packet, then add it to the member's own AI workspace.
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={copyCustomInstallPacket}>
                  <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                  {customCopied ? 'Copied' : 'Copy install packet'}
                </Button>
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={downloadCustomInstallPacket}>
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                  {customDownloaded ? 'Downloaded' : 'Download .md'}
                </Button>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {customInstallPacket.map((section) => (
                <div key={section.title} className="rounded-md bg-background p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">{section.title}</p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{section.body}</p>
                </div>
              ))}
            </div>
            <details className="mt-4 rounded-md border bg-background p-3">
              <summary className="cursor-pointer text-sm font-semibold">Advanced install docs</summary>
              <div className="mt-3 grid gap-3">
                {advancedInstallDocs.map((section) => (
                  <div key={section.title} className="rounded-md bg-muted/35 p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">{section.title}</p>
                    <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{section.body}</p>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </div>

        <div className="rounded-lg border bg-background p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">Starter packet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Copy this into a Claude Project, ChatGPT Project, or custom GPT to create the first useful version without spending app credits.
              </p>
            </div>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={copyStarterPacket}>
              <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
              {copied ? 'Copied' : 'Copy packet'}
            </Button>
          </div>
          <div className="mt-4 grid gap-3">
            {starterPacket.map((section) => (
              <div key={section.title} className="rounded-md bg-muted/35 p-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">{section.title}</p>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{section.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-background p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">Created from this plan</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Track the AI setup pieces that came from this 90-day plan so the member can see what is actually installed and tested.
              </p>
            </div>
            <Badge variant="secondary" className="w-fit text-[11px]">
              {completedWorkspaceSteps}/4 ready
            </Badge>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {workspaceChecklist.map((item) => (
              <div key={item.label} className={cn(
                'rounded-md border p-3 text-sm leading-snug',
                item.complete ? 'bg-primary/5 text-foreground' : 'bg-muted/35 text-muted-foreground'
              )}>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className={cn('mt-0.5 h-4 w-4 shrink-0', item.complete ? 'text-primary' : 'text-muted-foreground')} aria-hidden="true" />
                  <span>{item.label}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-md bg-muted/35 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">First asset to test</p>
            <p className="mt-1 text-sm leading-relaxed">
              {customization.firstAsset.trim() || selectedPack.firstTest}
            </p>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant={currentProgress.workspaceInstalledAt ? 'secondary' : 'outline'}
              onClick={markWorkspaceInstalled}
            >
              {currentProgress.workspaceInstalledAt ? 'Workspace installed' : 'Mark workspace installed'}
            </Button>
            <Button
              type="button"
              variant={currentProgress.firstAssetTestedAt ? 'secondary' : 'outline'}
              onClick={markFirstTestComplete}
            >
              {currentProgress.firstAssetTestedAt ? 'First test complete' : 'Mark first test complete'}
            </Button>
          </div>

          <p role="status" className={cn(
            'mt-3 text-xs',
            serverSyncStatus === 'failed' ? 'text-destructive' : 'text-muted-foreground'
          )}>
            {phaseOneStateQuery.isLoading
              ? 'Checking saved workspace setup...'
              : serverSyncStatus === 'saving'
                ? 'Saving to this app account...'
                : serverSyncStatus === 'failed'
                  ? 'Saved on this device. App account sync could not finish.'
                  : serverWorkspaceReadyAt
                    ? 'Workspace ready is saved to this app account.'
                    : serverSyncStatus === 'saved'
                      ? 'Saved to this app account.'
                      : 'Setup progress is saved on this device until the workspace is marked installed.'}
          </p>
        </div>

        <div className="rounded-lg border bg-muted/25 p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">Project Pack access</h3>
              <p className="text-sm text-muted-foreground">{access.monthlyUnlockCopy}</p>
              {!access.canSeeFullLibrary && access.canUnlockMonthlyPack && (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Previewing packs, saving setup answers, copying install docs, or hitting a generation error does not use the monthly unlock. The unlock is counted only after explicit pack confirmation.
                </p>
              )}
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Full pack library access opens only when this app account has annual, lifetime, or approved full-library access.
              </p>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {visiblePacks.slice(0, 6).map((pack) => {
              const canSelectPack = pack.visibility !== 'locked';
              const isSelected = selectedPack.id === pack.id;

              return (
                <button
                  key={pack.id}
                  type="button"
                  disabled={!canSelectPack}
                  aria-pressed={isSelected}
                  onClick={() => canSelectPack && setSelectedPackId(pack.id)}
                  className={cn(
                    'flex min-h-20 items-start gap-3 rounded-lg border bg-background p-3 text-left transition',
                    canSelectPack && 'hover:border-primary/50 hover:bg-muted/35',
                    isSelected && 'border-primary bg-primary/5',
                    !canSelectPack && 'cursor-not-allowed opacity-70'
                  )}
                >
                  <div className={cn(
                    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                    pack.visibility === 'locked' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
                  )}>
                    {pack.visibility === 'locked' ? <Lock className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-words text-sm font-semibold leading-snug">{pack.title}</p>
                      <Badge variant={pack.visibility === 'locked' ? 'outline' : 'secondary'} className="text-[11px]">
                        {isSelected ? 'Selected' : visibilityLabel[pack.visibility]}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{pack.recommendedWhen}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
