import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const wizardData = await req.json();
    console.log('[CreateCycleFromWizard] Received wizard data for user:', user.id);

    const startDate = new Date();
    const endDate = addDays(startDate, 90);

    // 1. Create the cycle in cycles_90_day
    const { data: cycle, error: cycleError } = await supabase
      .from('cycles_90_day')
      .insert({
        user_id: user.id,
        goal: wizardData.goal || 'My 90-Day Goal',
        why: wizardData.whyItMatters || null,
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        is_active: true,
        // Business diagnostic data
        discover_score: wizardData.diagnosticScores?.discover ?? 5,
        nurture_score: wizardData.diagnosticScores?.nurture ?? 5,
        convert_score: wizardData.diagnosticScores?.convert ?? 5,
        focus_area: wizardData.focusArea || null,
        diagnostic_scores: wizardData.diagnosticScores || null,
        // Revenue & metrics
        revenue_goal: wizardData.revenueGoal || null,
        offers_goal: wizardData.offersGoal ?? 90,
        // Weekly rhythm
        weekly_planning_day: wizardData.weeklyPlanningDay || null,
        weekly_debrief_day: wizardData.weeklyReviewDay || null,
        office_hours_start: wizardData.officeHoursStart || null,
        office_hours_end: wizardData.officeHoursEnd || null,
        office_hours_days: wizardData.officeHoursDays || null,
        // Thought work
        useful_belief: wizardData.usefulBelief || null,
        limiting_thought: wizardData.limitingThought || null,
        useful_thought: wizardData.usefulThought || null,
        // Accountability
        accountability_person: wizardData.accountabilityPerson || null,
        things_to_remember: wizardData.reminders || null,
      })
      .select()
      .single();

    if (cycleError) {
      console.error('[CreateCycleFromWizard] Error creating cycle:', cycleError);
      throw new Error(`Failed to create cycle: ${cycleError.message}`);
    }

    console.log('[CreateCycleFromWizard] Created cycle:', cycle.cycle_id);

    // 2. Deactivate any other active cycles
    const { error: deactivateError } = await supabase
      .from('cycles_90_day')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .neq('cycle_id', cycle.cycle_id);

    if (deactivateError) {
      console.warn('[CreateCycleFromWizard] Error deactivating other cycles:', deactivateError);
    }

    // 3. Save wizard completion record
    const { error: completionError } = await supabase
      .from('wizard_completions')
      .insert({
        user_id: user.id,
        template_name: 'cycle-90-day',
        answers: wizardData,
        planning_level: wizardData.planningLevel || 'simple',
        created_cycle_id: cycle.cycle_id,
        completed_at: new Date().toISOString(),
      });

    if (completionError) {
      console.error('[CreateCycleFromWizard] Error saving wizard completion:', completionError);
      // Don't throw - the cycle was created successfully
    }

    // 4. Update user's default planning level
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({ default_planning_level: wizardData.planningLevel || 'simple' })
      .eq('user_id', user.id);

    if (profileError) {
      console.warn('[CreateCycleFromWizard] Error updating user profile:', profileError);
      // Don't throw - the cycle was created successfully
    }

    // 5. Create custom metrics if provided
    if (wizardData.customMetrics && wizardData.customMetrics.length > 0) {
      const metricsToUpdate: Record<string, unknown> = {};
      wizardData.customMetrics.slice(0, 3).forEach((metric: { name: string; startValue: number; goalValue: number }, idx: number) => {
        const metricNum = idx + 1;
        metricsToUpdate[`metric_${metricNum}_name`] = metric.name;
        metricsToUpdate[`metric_${metricNum}_start`] = metric.startValue;
        metricsToUpdate[`metric_${metricNum}_goal`] = metric.goalValue;
      });

      if (Object.keys(metricsToUpdate).length > 0) {
        const { error: metricsError } = await supabase
          .from('cycles_90_day')
          .update(metricsToUpdate)
          .eq('cycle_id', cycle.cycle_id);

        if (metricsError) {
          console.warn('[CreateCycleFromWizard] Error saving metrics:', metricsError);
        }
      }
    }

    // 6. Link selected content items if provided
    if (wizardData.selectedContentIds && wizardData.selectedContentIds.length > 0) {
      // Store in a separate field or create content_topics entries
      const topicsToCreate = wizardData.selectedContentIds.map((contentId: string) => ({
        user_id: user.id,
        related_content_ids: [contentId],
        status: 'planned',
      }));

      const { error: topicsError } = await supabase
        .from('content_topics')
        .insert(topicsToCreate);

      if (topicsError) {
        console.warn('[CreateCycleFromWizard] Error creating content topics:', topicsError);
      }
    }

    console.log('[CreateCycleFromWizard] Successfully created cycle:', cycle.cycle_id);

    return new Response(
      JSON.stringify({
        success: true,
        cycle_id: cycle.cycle_id,
        message: 'Cycle created successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[CreateCycleFromWizard] Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
