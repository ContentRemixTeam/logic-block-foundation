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
  type: '90-day plan' | 'success path' | 'evidence' | 'offer' | 'workflow' | 'ai packet' | 'saved support';
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

export function getWorkspaceCapabilities(persona: WorkspacePersona): WorkspaceCapabilities {
  return CAPABILITIES_BY_PERSONA[persona];
}

export function getRecommendedAIWorkflow(stageId: MastermindStageId): AIWorkflowRecommendation {
  return AI_WORKFLOW_BY_STAGE[stageId];
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
    artifacts: makeArtifacts(capabilities, currentStage),
    aiWorkflow: getRecommendedAIWorkflow(stageId),
    vaultGates: makeVaultReadinessGates(capabilities),
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
      title: `${currentStage.label} Success Path`,
      surface: 'Mastermind',
      type: 'success path',
      status: 'Using now',
      nextAction: currentStage.messyActionSprint[0] ?? currentStage.doThis,
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
