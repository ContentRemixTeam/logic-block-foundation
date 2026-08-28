import { useMemo, useState } from 'react';
import { Eye, ShieldCheck } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { AIWorkflowBuilderPreview } from '@/components/mastermind/AIWorkflowBuilderPreview';
import { MyWorkspaceDashboard } from '@/components/mastermind/MyWorkspaceDashboard';
import { SuccessPathExecutionPanel } from '@/components/mastermind/SuccessPathExecutionPanel';
import { VaultReadinessPanel } from '@/components/mastermind/VaultReadinessPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  WORKSPACE_PERSONAS,
  getAvailableStages,
  getMastermindWorkspaceDraft,
  type WorkspacePersona,
} from '@/lib/mastermindWorkspace';
import type { MastermindStageId } from '@/lib/mastermindSuccessPath';
import { cn } from '@/lib/utils';

type DraftTab = 'workspace' | 'success-path' | 'ai-builder' | 'vault-readiness';

const stageOptions = getAvailableStages();

export default function MastermindHiddenDraft() {
  const [persona, setPersona] = useState<WorkspacePersona>('monthly_mastermind');
  const [stageId, setStageId] = useState<MastermindStageId>('offer');
  const [activeTab, setActiveTab] = useState<DraftTab>('workspace');
  const draft = useMemo(() => getMastermindWorkspaceDraft(persona, stageId), [persona, stageId]);

  return (
    <Layout>
      <div className="mx-auto max-w-6xl space-y-5" data-mastermind-hidden-draft>
        <div className="sticky top-0 z-20 -mx-4 border-y border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm md:-mx-6 md:px-6">
          <div className="mx-auto flex max-w-6xl items-center gap-2 text-sm font-semibold">
            <Eye className="h-4 w-4 shrink-0" />
            DRAFT PREVIEW · ADMIN ONLY · SAMPLE DATA · NOTHING SAVES
          </div>
        </div>

        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <Badge variant="secondary" className="w-fit">Mastermind 2.0</Badge>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Planner-integrated workspace</h1>
              <p className="max-w-2xl text-muted-foreground">
                One 90-day result, one Success Path, one AI workflow, and protected Vault readiness.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="w-fit">
            <ShieldCheck className="mr-1 h-3.5 w-3.5" />
            Hidden route
          </Badge>
        </header>

        <section className="grid gap-3 rounded-lg border bg-card p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Preview persona</p>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {WORKSPACE_PERSONAS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPersona(item.id)}
                  className={cn(
                    'min-h-20 rounded-lg border p-3 text-left transition hover:border-primary/50 hover:bg-muted/40',
                    persona === item.id && 'border-primary bg-primary/5'
                  )}
                >
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className="mt-1 block text-xs leading-snug text-muted-foreground">{item.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Success Path focus</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {stageOptions.map((stage) => (
                <Button
                  key={stage.id}
                  type="button"
                  variant={stageId === stage.id ? 'default' : 'outline'}
                  className="min-h-10"
                  onClick={() => setStageId(stage.id)}
                >
                  {stage.label}
                </Button>
              ))}
            </div>
          </div>
        </section>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DraftTab)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="workspace">My Workspace</TabsTrigger>
            <TabsTrigger value="success-path">Success Path</TabsTrigger>
            <TabsTrigger value="ai-builder">Build AI Support</TabsTrigger>
            <TabsTrigger value="vault-readiness">Vault QA</TabsTrigger>
          </TabsList>

          <TabsContent value="workspace">
            <MyWorkspaceDashboard
              draft={draft}
              onOpenSuccessPath={() => setActiveTab('success-path')}
              onBuildAI={() => setActiveTab('ai-builder')}
              onOpenVault={() => setActiveTab('vault-readiness')}
            />
          </TabsContent>

          <TabsContent value="success-path">
            <SuccessPathExecutionPanel
              draft={draft}
              onAskFaith={() => window.open('https://airtable.com/appP01GhbZAtwT4nN/shrIRdOHFXijc8462', '_blank', 'noopener,noreferrer')}
              onBuildAI={() => setActiveTab('ai-builder')}
            />
          </TabsContent>

          <TabsContent value="ai-builder">
            <AIWorkflowBuilderPreview draft={draft} />
          </TabsContent>

          <TabsContent value="vault-readiness">
            <VaultReadinessPanel draft={draft} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
