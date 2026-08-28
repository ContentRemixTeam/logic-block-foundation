import {
  MASTERMIND_SUCCESS_STAGES,
  getMastermindStage,
  type MastermindRoadmapStage,
  type MastermindStageId,
} from '@/lib/mastermindSuccessPath';

export type WorkspacePersona = 'planner_only' | 'monthly_mastermind' | 'annual_mastermind' | 'admin_preview';
export type WorkspaceArtifactStatus = 'Draft' | 'Ready to test' | 'Tested' | 'Using now' | 'Paused' | 'Retired';
export type WorkspaceSurface = 'Planner' | 'Mastermind' | 'Vault' | 'AI';

export interface WorkspaceCapabilities {
  plannerAccess: boolean;
  mastermindCoreAccess: boolean;
  recentReplayAccess: boolean;
  replayVaultAccess: boolean;
  mastermindAIAccess: boolean;
  adminPreview: boolean;
}

export interface WorkspaceArtifact {
  id: string;
  title: string;
  surface: WorkspaceSurface;
  type: '90-day plan' | '90-day guidance' | 'evidence' | 'offer' | 'workflow' | 'ai packet' | 'saved support';
  status: WorkspaceArtifactStatus;
  nextAction: string;
}

export interface AIWorkflowRecommendation {
  stageId: MastermindStageId;
  workflowName: string;
  employeeName: string;
  outcome: string;
  firstTestPrompt: string;
}

export interface SuccessPathGuidance {
  pathDecision: string;
  thisWeekMove: string;
  doneEnough: string;
  bringBack: string;
  askFaithWhen: string;
}

export interface QuickWinRecommendation {
  title: string;
  action: string;
  timeBox: string;
  evidence: string;
  lowEnergyVersion: string;
}

export interface CurriculumPlaylistItem {
  resourceId: string;
  title: string;
  label: 'Fundamental' | 'Recommended';
  useWhen: string;
  afterWatching: string;
  access: 'Core' | '30-day replays' | 'Vault' | 'Access review';
  portalPath?: string;
}

export interface TrainingLibrarySummary {
  title: string;
  relationship: string;
  coreCurriculum: string;
  planPlaylist: string;
  currentReplays: string;
  vaultBoundary: string;
}

export interface VaultReadinessGate {
  id: string;
  label: string;
  status: 'ready' | 'blocked' | 'needs proof';
  detail: string;
}

export interface MastermindWorkspaceDraft {
  persona: WorkspacePersona;
  personaLabel: string;
  capabilities: WorkspaceCapabilities;
  currentStage: MastermindRoadmapStage;
  ninetyDayFocus: string;
  activeMilestone: string;
  nextMoneyMove: string;
  evidenceTarget: string;
  primaryResource: string;
  successPathGuidance: SuccessPathGuidance;
  quickWin: QuickWinRecommendation;
  fundamentalsPlaylist: CurriculumPlaylistItem[];
  recommendedPlaylist: CurriculumPlaylistItem[];
  trainingLibrary: TrainingLibrarySummary;
  artifacts: WorkspaceArtifact[];
  aiWorkflow: AIWorkflowRecommendation;
  vaultGates: VaultReadinessGate[];
}

export const WORKSPACE_PERSONAS: Array<{ id: WorkspacePersona; label: string; description: string }> = [
  {
    id: 'planner_only',
    label: 'Planner only',
    description: 'Standalone planner buyer. No Mastermind curriculum, Ask Faith, or Vault metadata.',
  },
  {
    id: 'monthly_mastermind',
    label: 'Monthly Mastermind',
    description: 'Core curriculum and current replay window. No annual Vault search.',
  },
  {
    id: 'annual_mastermind',
    label: 'Annual or lifetime',
    description: 'Core curriculum, current replays, and Vault pilot access when launch gates pass.',
  },
  {
    id: 'admin_preview',
    label: 'Admin preview',
    description: 'Faith/admin review mode for hidden draft QA.',
  },
];

const CAPABILITIES_BY_PERSONA: Record<WorkspacePersona, WorkspaceCapabilities> = {
  planner_only: {
    plannerAccess: true,
    mastermindCoreAccess: false,
    recentReplayAccess: false,
    replayVaultAccess: false,
    mastermindAIAccess: false,
    adminPreview: false,
  },
  monthly_mastermind: {
    plannerAccess: true,
    mastermindCoreAccess: true,
    recentReplayAccess: true,
    replayVaultAccess: false,
    mastermindAIAccess: true,
    adminPreview: false,
  },
  annual_mastermind: {
    plannerAccess: true,
    mastermindCoreAccess: true,
    recentReplayAccess: true,
    replayVaultAccess: true,
    mastermindAIAccess: true,
    adminPreview: false,
  },
  admin_preview: {
    plannerAccess: true,
    mastermindCoreAccess: true,
    recentReplayAccess: true,
    replayVaultAccess: true,
    mastermindAIAccess: true,
    adminPreview: true,
  },
};

const AI_WORKFLOW_BY_STAGE: Record<MastermindStageId, AIWorkflowRecommendation> = {
  offer: {
    stageId: 'offer',
    workflowName: 'Buyer-language and minimum viable offer test',
    employeeName: 'Offer Clarity Assistant',
    outcome: 'Create one clear offer draft and one validation ask from real buyer language.',
    firstTestPrompt: 'Use my offer notes and buyer language to draft one minimum viable offer and one simple validation ask.',
  },
  find: {
    stageId: 'find',
    workflowName: 'Discovery content or outreach repetition',
    employeeName: 'Discovery Content Assistant',
    outcome: 'Turn one discovery lane into a repeatable weekly creation or outreach rhythm.',
    firstTestPrompt: 'Use my offer and audience notes to create three discovery prompts for one chosen channel.',
  },
  nurture: {
    stageId: 'nurture',
    workflowName: 'Email or nurture draft and review',
    employeeName: 'Nurture Draft Assistant',
    outcome: 'Draft one nurture asset that moves a buyer closer to the current offer.',
    firstTestPrompt: 'Use my buyer belief gap and offer notes to draft one email that creates readiness for the offer.',
  },
  sell: {
    stageId: 'sell',
    workflowName: 'Invitation, follow-up, and sales debrief',
    employeeName: 'Sales Follow-Up Assistant',
    outcome: 'Create one sales invitation, one follow-up, and one neutral debrief checklist.',
    firstTestPrompt: 'Use my offer, audience, and sales goal to draft one warm invitation and one follow-up message.',
  },
  deliver: {
    stageId: 'deliver',
    workflowName: 'Client progress and proof capture',
    employeeName: 'Customer Results Assistant',
    outcome: 'Define the customer first win and draft one proof-collection step.',
    firstTestPrompt: 'Use my offer promise and customer journey notes to draft one first-win check-in.',
  },
  leverage: {
    stageId: 'leverage',
    workflowName: 'SOP, QA, and reporting workflow',
    employeeName: 'Operations Assistant',
    outcome: 'Document one proven workflow with quality checks before automation.',
    firstTestPrompt: 'Use my rough process notes to turn one repeated task into a simple SOP and QA checklist.',
  },
};

const QUICK_WIN_BY_STAGE: Record<MastermindStageId, QuickWinRecommendation> = {
  offer: {
    title: 'Ask one real person to react',
    action: 'Send your rough offer sentence to one qualified person and ask what is clear, confusing, or worth paying for.',
    timeBox: '20 minutes',
    evidence: 'Exact reply, question, objection, yes, no, or no-response after the follow-up window.',
    lowEnergyVersion: 'Send the question to one person or record the offer out loud and mark the confusing sentence.',
  },
  find: {
    title: 'Publish one discovery signal',
    action: 'Post or send one specific piece that helps the right person recognize the problem your offer solves.',
    timeBox: '30 minutes',
    evidence: 'Reach, reply, opt-in, click, save, DM, or a clear lack of signal.',
    lowEnergyVersion: 'Turn one sentence from your offer into one short post or one direct message.',
  },
  nurture: {
    title: 'Send one warm-up message',
    action: 'Send one email, post, or story that shifts one belief your buyer needs before the offer makes sense.',
    timeBox: '30 minutes',
    evidence: 'Replies, clicks, questions, saves, DMs, or the belief gap that still did not move.',
    lowEnergyVersion: 'Send one honest note to your warmest segment and ask for a reply.',
  },
  sell: {
    title: 'Send one invitation and schedule the follow-up',
    action: 'Send one direct invitation or sales email to a warm lead, then put the follow-up on your calendar.',
    timeBox: '25 minutes',
    evidence: 'Invitation sent, follow-up scheduled, and the reply or silence logged.',
    lowEnergyVersion: 'Send the cleanest invitation to one person instead of rewriting the whole sales asset.',
  },
  deliver: {
    title: 'Improve one first-win step',
    action: 'Choose the first win your customer needs and improve one onboarding, check-in, or support step.',
    timeBox: '30 minutes',
    evidence: 'Customer completion, feedback, stuck point, testimonial language, or one delivery fix chosen.',
    lowEnergyVersion: 'Ask one current or past customer where they needed the most support after buying.',
  },
  leverage: {
    title: 'Simplify one repeated workflow',
    action: 'Write the real steps for one repeated task and remove, clarify, or document one friction point.',
    timeBox: '30 minutes',
    evidence: 'One simpler workflow, one saved step, one clearer handoff, or one tested SOP update.',
    lowEnergyVersion: 'List the messy steps as they actually happen. Do not automate yet.',
  },
};

const FUNDAMENTALS_PLAYLIST: CurriculumPlaylistItem[] = [
  {
    resourceId: 'success-plan-module-one',
    title: 'Mastermind Success Plan Module One',
    label: 'Fundamental',
    useWhen: 'Start here so the program feels like a supported results system, not a library to finish.',
    afterWatching: 'Confirm the one result you are using the Mastermind to create this quarter.',
    access: 'Core',
    portalPath: 'Start Here -> Mastermind Success Plan',
  },
  {
    resourceId: 'ninety-day-planning-workshop',
    title: '90-Day Goal Setting Workshop and Planner',
    label: 'Fundamental',
    useWhen: 'Use this to set or repair the plan before choosing more trainings.',
    afterWatching: 'Save the current 90-day result, weekly rhythm, and next evidence move.',
    access: 'Core',
    portalPath: 'Planner -> Build 90-Day Plan',
  },
  {
    resourceId: 'messy-action-foundation',
    title: 'Execute With Messy Action',
    label: 'Fundamental',
    useWhen: 'Use this when the member is waiting to feel ready before taking market-facing action.',
    afterWatching: 'Choose the smallest useful action to run this week and record what happens.',
    access: 'Core',
    portalPath: 'Learning -> Mindset and Implementation',
  },
  {
    resourceId: 'evaluate-without-shame',
    title: 'Evaluate Without Beating Yourself Up',
    label: 'Fundamental',
    useWhen: 'Use this when a check-in turns into shame, overthinking, or starting over.',
    afterWatching: 'Record one neutral keep, change, or test-next decision.',
    access: 'Core',
    portalPath: 'Learning -> Mindset and Evaluation',
  },
];

export function getWorkspaceCapabilities(persona: WorkspacePersona): WorkspaceCapabilities {
  return CAPABILITIES_BY_PERSONA[persona];
}

export function getRecommendedAIWorkflow(stageId: MastermindStageId): AIWorkflowRecommendation {
  return AI_WORKFLOW_BY_STAGE[stageId];
}

export function getQuickWinRecommendation(stageId: MastermindStageId): QuickWinRecommendation {
  return QUICK_WIN_BY_STAGE[stageId];
}

export function getFundamentalsPlaylist(): CurriculumPlaylistItem[] {
  return FUNDAMENTALS_PLAYLIST;
}

export function getRecommendedPlaylist(
  stage: MastermindRoadmapStage,
  capabilities: WorkspaceCapabilities,
): CurriculumPlaylistItem[] {
  return stage.resources
    .filter((resource) => resource.access !== 'Vault' || capabilities.replayVaultAccess)
    .filter((resource) => resource.access !== '30-day replays' || capabilities.recentReplayAccess)
    .slice(0, 3)
    .map((resource, index) => ({
      resourceId: resource.resourceId,
      title: resource.title,
      label: 'Recommended' as const,
      useWhen: resource.useWhen,
      afterWatching: index === 0
        ? 'Do the quick win before opening another training.'
        : 'Use only if this directly removes friction from the quick win.',
      access: resource.access,
      portalPath: resource.portalPath,
    }));
}

export function getMastermindWorkspaceDraft(
  persona: WorkspacePersona,
  stageId: MastermindStageId = 'offer',
): MastermindWorkspaceDraft {
  const currentStage = getMastermindStage(stageId);
  const capabilities = getWorkspaceCapabilities(persona);
  const primaryResource = currentStage.resources[0]?.title ?? 'Assigned resource pending approval';

  return {
    persona,
    personaLabel: WORKSPACE_PERSONAS.find((item) => item.id === persona)?.label ?? 'Preview',
    capabilities,
    currentStage,
    ninetyDayFocus: capabilities.mastermindCoreAccess
      ? 'Create a consistent income path from one clear offer.'
      : 'Choose one 90-day result and turn it into weekly evidence.',
    activeMilestone: currentStage.milestones[0]?.label ?? currentStage.milestone,
    nextMoneyMove: currentStage.nextMoneyMove,
    evidenceTarget: currentStage.definitionOfDone[0] ?? 'One observable signal from the real world.',
    primaryResource,
    successPathGuidance: makeSuccessPathGuidance(currentStage),
    quickWin: getQuickWinRecommendation(stageId),
    fundamentalsPlaylist: getFundamentalsPlaylist(),
    recommendedPlaylist: getRecommendedPlaylist(currentStage, capabilities),
    trainingLibrary: makeTrainingLibrarySummary(capabilities),
    artifacts: makeArtifacts(capabilities, currentStage),
    aiWorkflow: getRecommendedAIWorkflow(stageId),
    vaultGates: makeVaultReadinessGates(capabilities),
  };
}

function makeSuccessPathGuidance(currentStage: MastermindRoadmapStage): SuccessPathGuidance {
  return {
    pathDecision: currentStage.useWhen,
    thisWeekMove: currentStage.nextMoneyMove,
    doneEnough: currentStage.definitionOfDone[0] ?? currentStage.doThis,
    bringBack: currentStage.definitionOfDone[0] ?? 'One reality-facing evidence signal.',
    askFaithWhen: currentStage.supportPrompt,
  };
}

function makeTrainingLibrarySummary(capabilities: WorkspaceCapabilities): TrainingLibrarySummary {
  return {
    title: 'Training Library',
    relationship: 'This is where the videos live. The 90-day plan recommends what to watch first; the library holds the approved curriculum and replay areas.',
    coreCurriculum: capabilities.mastermindCoreAccess
      ? 'Core curriculum videos are included for Mastermind members and grouped by the result they help create.'
      : 'Planner-only users do not receive Mastermind curriculum metadata.',
    planPlaylist: capabilities.mastermindCoreAccess
      ? 'The plan-based playlist pulls only the few videos that support the current quick win.'
      : 'Planner-only guidance can recommend Planner-safe help without showing Mastermind videos.',
    currentReplays: capabilities.recentReplayAccess
      ? 'Current call replays stay in the active replay window and do not unlock the old replay archive.'
      : 'No replay titles or playback appear without replay access.',
    vaultBoundary: capabilities.replayVaultAccess
      ? 'Older replay depth stays in Vault and remains hidden until search, playback, and entitlement QA pass.'
      : 'Vault metadata, transcript snippets, and playback stay hidden unless annual or lifetime access is verified.',
  };
}

function makeArtifacts(capabilities: WorkspaceCapabilities, currentStage: MastermindRoadmapStage): WorkspaceArtifact[] {
  const artifacts: WorkspaceArtifact[] = [
    {
      id: 'active-plan',
      title: 'Current 90-day plan',
      surface: 'Planner',
      type: '90-day plan',
      status: 'Using now',
      nextAction: 'Review this week and record one evidence signal.',
    },
    {
      id: 'weekly-evidence',
      title: 'Weekly evidence log',
      surface: 'Planner',
      type: 'evidence',
      status: 'Ready to test',
      nextAction: 'Add what happened after the next money move.',
    },
  ];

  if (capabilities.mastermindCoreAccess) {
    artifacts.push({
      id: 'success-path',
      title: `${currentStage.label} 90-Day Guidance`,
      surface: 'Mastermind',
      type: '90-day guidance',
      status: 'Using now',
      nextAction: currentStage.nextMoneyMove,
    });
  }

  if (capabilities.mastermindAIAccess || !capabilities.mastermindCoreAccess) {
    artifacts.push({
      id: 'ai-workflow-packet',
      title: capabilities.mastermindAIAccess ? 'Strategy-backed AI packet' : 'Planner AI context packet',
      surface: 'AI',
      type: 'ai packet',
      status: 'Draft',
      nextAction: 'Choose one workflow and run one supervised test.',
    });
  }

  if (capabilities.replayVaultAccess) {
    artifacts.push({
      id: 'vault-saved-support',
      title: 'Saved Vault moments',
      surface: 'Vault',
      type: 'saved support',
      status: 'Paused',
      nextAction: 'Keep hidden until Vault search and access QA pass.',
    });
  }

  return artifacts;
}

function makeVaultReadinessGates(capabilities: WorkspaceCapabilities): VaultReadinessGate[] {
  if (!capabilities.replayVaultAccess) {
    return [
      {
        id: 'monthly-boundary',
        label: 'Annual Vault boundary',
        status: 'ready',
        detail: 'This persona cannot see old Vault titles, snippets, tags, or playback.',
      },
      {
        id: 'recent-replays',
        label: 'Recent replay window',
        status: capabilities.recentReplayAccess ? 'needs proof' : 'blocked',
        detail: capabilities.recentReplayAccess
          ? 'Monthly members can use the active replay window after the backend proves dates and access.'
          : 'Planner-only users receive no Mastermind replay metadata.',
      },
    ];
  }

  return [
    {
      id: 'migrations',
      label: 'Migrations and functions',
      status: 'needs proof',
      detail: 'The app has Vault code, but Lovable/backend application still needs exact proof before member rollout.',
    },
    {
      id: 'search-quality',
      label: 'Searchie-comparable search',
      status: 'needs proof',
      detail: 'Benchmark queries must average 2.5+ with no entitlement leaks.',
    },
    {
      id: 'playback',
      label: 'Playback and seeking',
      status: 'needs proof',
      detail: 'Pilot videos need signed-in browser QA across desktop, mobile, Chrome, and Safari.',
    },
  ];
}

export function getAvailableStages() {
  return MASTERMIND_SUCCESS_STAGES.map((stage) => ({ id: stage.id, label: stage.label }));
}
