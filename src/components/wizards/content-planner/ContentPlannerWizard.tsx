// Content Planner Wizard - Main Component
import { WizardLayout } from '@/components/wizards/WizardLayout';
import { WizardProgress } from '@/components/wizards/WizardProgress';
import { WizardSaveStatus } from '@/components/wizards/WizardSaveStatus';
import { ResumeDraftDialog } from '@/components/wizards/ResumeDraftDialog';
import { useWizard } from '@/hooks/useWizard';
import { ContentPlannerData, DEFAULT_CONTENT_PLANNER_DATA } from '@/types/contentPlanner';
import { validateContentPlannerStep } from '@/lib/contentPlannerValidation';
import {
  StepModeSelection,
  StepMessagingFramework,
  StepFormatSelection,
  StepVaultReview,
  StepBatching,
  StepCalendar,
  StepReviewCreate,
} from './steps';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useState, useEffect, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ContentPlanMode } from '@/types/contentPlanner';
import { useQueryClient } from '@tanstack/react-query';

const WIZARD_STEPS = [
  { number: 1, title: 'Mode' },
  { number: 2, title: 'Messaging' },
  { number: 3, title: 'Formats' },
  { number: 4, title: 'Vault' },
  { number: 5, title: 'Batching' },
  { number: 6, title: 'Calendar' },
  { number: 7, title: 'Review' },
];

export function ContentPlannerWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [hasCheckedDraft, setHasCheckedDraft] = useState(false);

  // Check for launch ID in URL (from post-launch prompt)
  const launchIdFromUrl = searchParams.get('launchId');

  // Memoize defaultData to prevent render loops
  const defaultData = useMemo(() => ({
    ...DEFAULT_CONTENT_PLANNER_DATA,
    mode: (launchIdFromUrl ? 'launch' : '') as ContentPlanMode | '',
    launchId: launchIdFromUrl,
  }), [launchIdFromUrl]);

  const {
    step,
    data,
    setData,
    goNext,
    goBack,
    goToStep,
    canProceed,
    saveDraft,
    isSaving,
    isLoading,
    clearDraft,
    totalSteps,
    hasDraft,
    lastServerSync,
    syncError,
    draftUpdatedAt,
  } = useWizard<ContentPlannerData>({
    templateName: 'content-planner',
    totalSteps: 7,
    defaultData,
    validateStep: validateContentPlannerStep,
  });

  // Check for existing draft on mount
  useEffect(() => {
    if (!isLoading && !hasCheckedDraft) {
      setHasCheckedDraft(true);
      if (hasDraft && draftUpdatedAt) {
        setShowResumeDialog(true);
      }
    }
  }, [isLoading, hasDraft, draftUpdatedAt, hasCheckedDraft]);

  const handleResumeDraft = () => setShowResumeDialog(false);
  const handleStartFresh = async () => {
    setShowResumeDialog(false);
    await clearDraft();
  };
  
  const getDraftAgeText = () => 
    draftUpdatedAt ? formatDistanceToNow(draftUpdatedAt, { addSuffix: false }) : null;
  
  const handleChange = (updates: Partial<ContentPlannerData>) => setData(updates);
  
  const handleSaveAndExit = async () => {
    await saveDraft();
    navigate('/wizards');
  };

  const handleCreatePlan = async () => {
    if (isCreating || !user) return;
    
    setIsCreating(true);
    try {
      // Create messaging framework first if we have messaging data
      let frameworkId: string | null = null;
      
      if (data.coreProblem || data.uniqueSolution || data.sellingPoints.length > 0) {
        const { data: framework, error: frameworkError } = await supabase
          .from('messaging_frameworks')
          .insert({
            user_id: user.id,
            name: data.mode === 'launch' ? 'Launch Framework' : 'Content Framework',
            core_problem: data.coreProblem || null,
            unique_solution: data.uniqueSolution || null,
            target_customer: data.targetCustomer || null,
            core_narrative: data.coreNarrative || null,
            launch_id: data.launchId || null,
          })
          .select('id')
          .single();
        
        if (frameworkError) throw frameworkError;
        frameworkId = framework.id;

        // Create selling points
        if (data.sellingPoints.length > 0) {
          const sellingPointsData = data.sellingPoints.map((sp, index) => ({
            user_id: user.id,
            framework_id: frameworkId,
            label: sp.label,
            description: sp.description || null,
            is_core: sp.isCore,
            sort_order: index,
          }));

          const { error: spError } = await supabase
            .from('selling_points')
            .insert(sellingPointsData);
          
          if (spError) throw spError;
        }
      }

      // Create content plan
      const { data: plan, error: planError } = await supabase
        .from('content_plans')
        .insert({
          user_id: user.id,
          name: data.mode === 'launch' ? 'Launch Content Plan' : 'Content Plan',
          mode: data.mode || 'regular',
          start_date: data.customStartDate || null,
          end_date: data.customEndDate || null,
          selected_formats: data.selectedFormats,
          batching_enabled: data.batchingEnabled,
          launch_id: data.launchId || null,
          framework_id: frameworkId,
          status: 'active',
        })
        .select('id')
        .single();

      if (planError) throw planError;

      // Track counts for success message
      let contentItemsCreated = 0;
      let tasksCreated = 0;

      // Create content items AND linked tasks for each planned item
      if (data.plannedItems.length > 0) {
        for (const item of data.plannedItems) {
          // Determine channel from type
          const channelMap: Record<string, string> = {
            'email-sequence': 'Email',
            'email-single': 'Email',
            'newsletter': 'Email',
            'blog-post': 'Blog',
            'linkedin-post': 'LinkedIn',
            'twitter-thread': 'Twitter/X',
            'instagram-post': 'Instagram',
            'instagram-reel': 'Instagram',
            'facebook-post': 'Facebook',
            'youtube-video': 'YouTube',
            'youtube-short': 'YouTube',
            'tiktok': 'TikTok',
            'podcast-episode': 'Podcast',
            'webinar': 'Webinar',
          };
          
          const typeMap: Record<string, string> = {
            'email-sequence': 'Newsletter',
            'email-single': 'Newsletter',
            'newsletter': 'Newsletter',
            'blog-post': 'Blog Post',
            'linkedin-post': 'Social Post',
            'twitter-thread': 'Social Post',
            'instagram-post': 'Social Post',
            'instagram-reel': 'Video',
            'facebook-post': 'Social Post',
            'youtube-video': 'Video',
            'youtube-short': 'Video',
            'tiktok': 'Video',
            'podcast-episode': 'Podcast',
            'webinar': 'Webinar',
          };

          const mappedChannel = channelMap[item.type] || 'Other';
          const mappedType = typeMap[item.type] || item.type;

          // Create content item
          const { data: contentItem, error: contentError } = await supabase
            .from('content_items')
            .insert({
              user_id: user.id,
              title: item.title,
              type: mappedType,
              channel: mappedChannel,
              status: 'Draft',
              project_id: data.launchId || null,
              planned_creation_date: item.date ? item.date : null, // Use item date as creation date
              planned_publish_date: item.date || null,
              messaging_angle: item.messagingAngle || null,
              selling_point_ids: item.sellingPointIds.length > 0 ? item.sellingPointIds : null,
            })
            .select('id')
            .single();

          if (contentError) {
            console.error('Content item creation error:', contentError);
            continue;
          }
          
          contentItemsCreated++;

          // Create content plan item linking to the content item
          await supabase.from('content_plan_items').insert({
            user_id: user.id,
            plan_id: plan.id,
            content_item_id: contentItem.id,
            title: item.title,
            content_type: item.type,
            planned_date: item.date || null,
            phase: item.phase || null,
            selling_point_ids: item.sellingPointIds.length > 0 ? item.sellingPointIds : null,
            messaging_angle: item.messagingAngle || null,
            is_repurposed: item.isRepurposed,
            status: 'planned',
          });

          // Generate tasks if enabled
          if (data.generateTasks) {
            // Create "Create" task
            const { error: createTaskError } = await supabase.from('tasks').insert({
              user_id: user.id,
              task_text: `Create: ${item.title}`,
              scheduled_date: item.date || null,
              content_item_id: contentItem.id,
              content_type: mappedType,
              content_channel: mappedChannel,
              content_creation_date: item.date || null,
              content_publish_date: item.date || null,
              project_id: data.launchId || null,
              is_system_generated: true,
              system_source: 'content_planner',
              task_type: 'content_creation',
              status: item.date ? 'scheduled' : 'backlog',
            });

            if (!createTaskError) tasksCreated++;

            // Create "Publish" task if different publish date or always for clarity
            if (item.date) {
              const { error: publishTaskError } = await supabase.from('tasks').insert({
                user_id: user.id,
                task_text: `Publish: ${item.title}`,
                scheduled_date: item.date,
                content_item_id: contentItem.id,
                content_type: mappedType,
                content_channel: mappedChannel,
                content_creation_date: item.date || null,
                content_publish_date: item.date,
                project_id: data.launchId || null,
                is_system_generated: true,
                system_source: 'content_planner',
                task_type: 'content_publish',
                status: 'scheduled',
              });

              if (!publishTaskError) tasksCreated++;
            }
          }
        }
      }

      await clearDraft();
      
      const message = data.generateTasks 
        ? `Created ${contentItemsCreated} content items and ${tasksCreated} tasks!`
        : `Content plan created with ${contentItemsCreated} items!`;
      
      toast.success(message);
      
      // Invalidate queries to ensure calendar and task views are updated
      queryClient.invalidateQueries({ queryKey: ['editorial-calendar-content'] });
      queryClient.invalidateQueries({ queryKey: ['editorial-calendar-plans'] });
      queryClient.invalidateQueries({ queryKey: ['editorial-calendar-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['editorial-calendar-unscheduled'] });
       queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['content-for-planner'] });
      
      // Navigate to editorial calendar or project page
      if (data.launchId) {
        navigate(`/projects/${data.launchId}`);
      } else {
        navigate('/editorial-calendar');
      }
    } catch (error) {
      console.error('Create content plan error:', error);
      toast.error('Failed to create content plan. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleNext = () => step === totalSteps ? handleCreatePlan() : goNext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading your draft...</p>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 1: return <StepModeSelection data={data} onChange={handleChange} />;
      case 2: return <StepMessagingFramework data={data} onChange={handleChange} />;
      case 3: return <StepFormatSelection data={data} onChange={handleChange} />;
      case 4: return <StepVaultReview data={data} onChange={handleChange} />;
      case 5: return <StepBatching data={data} onChange={handleChange} />;
      case 6: return <StepCalendar data={data} onChange={handleChange} />;
      case 7: return <StepReviewCreate data={data} onChange={handleChange} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <WizardProgress
        steps={WIZARD_STEPS}
        currentStep={step}
        onStepClick={goToStep}
        className="mb-6"
      />

      <WizardLayout
        title="Content Planner"
        stepTitle={WIZARD_STEPS[step - 1]?.title || ''}
        currentStep={step}
        totalSteps={totalSteps}
        onBack={goBack}
        onNext={handleNext}
        onSave={handleSaveAndExit}
        canProceed={canProceed}
        isSaving={isSaving || isCreating}
        isLastStep={step === totalSteps}
        lastStepButtonText="Create Content Plan"
        statusIndicator={
          <WizardSaveStatus
            isSaving={isSaving}
            lastSaved={lastServerSync}
            syncError={syncError}
          />
        }
      >
        {renderStep()}
      </WizardLayout>

      <ResumeDraftDialog
        isOpen={showResumeDialog}
        draftAge={getDraftAgeText()}
        onResume={handleResumeDraft}
        onStartFresh={handleStartFresh}
      />
    </div>
  );
}

export default ContentPlannerWizard;
