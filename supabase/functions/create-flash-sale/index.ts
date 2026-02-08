import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { wizardData } = await req.json();

    // Calculate sale price
    const salePrice = wizardData.salePrice || (wizardData.originalPrice && wizardData.discountValue 
      ? wizardData.discountType === 'percentage' 
        ? wizardData.originalPrice * (1 - wizardData.discountValue / 100)
        : wizardData.originalPrice - wizardData.discountValue
      : null);

    // Get user's default project board
    const { data: boards } = await supabase
      .from('project_boards')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .limit(1);

    let boardId = boards?.[0]?.id;

    // Create board if needed
    if (!boardId) {
      const { data: newBoard } = await supabase
        .from('project_boards')
        .insert({ user_id: user.id, name: 'My Projects', is_default: true })
        .select('id')
        .single();
      boardId = newBoard?.id;
    }

    // Get "In Progress" column
    const { data: columns } = await supabase
      .from('project_columns')
      .select('id')
      .eq('board_id', boardId)
      .ilike('name', '%progress%')
      .limit(1);

    const columnId = columns?.[0]?.id;

    // Create project
    const startDate = new Date(`${wizardData.startDate}T${wizardData.startTime}`);
    const endDate = new Date(`${wizardData.endDate}T${wizardData.endTime}`);

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: wizardData.saleName || `Flash Sale: ${wizardData.productName}`,
        description: `Flash sale for ${wizardData.productName}. ${wizardData.discountValue}${wizardData.discountType === 'percentage' ? '%' : '$'} off from ${wizardData.startDate} to ${wizardData.endDate}.`,
        board_id: boardId,
        column_id: columnId,
        status: 'active',
        priority: 'high',
        deadline: wizardData.startDate,
      })
      .select('id')
      .single();

    if (projectError) {
      console.error('Project creation error:', projectError);
      throw new Error('Failed to create project');
    }

    // Create flash sale record
    const { data: flashSale, error: flashSaleError } = await supabase
      .from('flash_sales')
      .insert({
        user_id: user.id,
        project_id: project.id,
        name: wizardData.saleName,
        product_name: wizardData.productName,
        product_id: wizardData.productId || null,
        original_price: wizardData.originalPrice,
        sale_price: salePrice,
        discount_type: wizardData.discountType,
        discount_value: wizardData.discountValue,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        timezone: wizardData.timezone,
        urgency_type: wizardData.urgencyType,
        limited_quantity: wizardData.limitedQuantity,
        early_bird_hours: wizardData.earlyBirdHours,
        early_bird_bonus: wizardData.earlyBirdBonus,
        flash_bonus: wizardData.flashBonus,
        target_audience: wizardData.targetAudience,
        pain_points: wizardData.painPoints,
        why_now: wizardData.whyNow,
        email_sequence_type: wizardData.emailSequenceType,
        emails_planned: wizardData.emailsPlanned,
        headline: wizardData.headline,
        subheadline: wizardData.subheadline,
        urgency_hook: wizardData.urgencyHook,
        bullets: wizardData.bullets,
        promotion_platforms: wizardData.promotionPlatforms,
        status: 'scheduled',
      })
      .select('id')
      .single();

    if (flashSaleError) {
      console.error('Flash sale creation error:', flashSaleError);
    }

    // Get current cycle for task linking
    const { data: currentCycle } = await supabase
      .from('cycles_90_day')
      .select('cycle_id')
      .eq('user_id', user.id)
      .lte('start_date', new Date().toISOString().split('T')[0])
      .gte('end_date', new Date().toISOString().split('T')[0])
      .limit(1);

    const cycleId = currentCycle?.[0]?.cycle_id;

    // Calculate pre-sale date (2 days before)
    const preSaleDate = new Date(startDate);
    preSaleDate.setDate(preSaleDate.getDate() - 2);

    // Generate tasks
    const tasks: any[] = [];
    const tasksEnabled = wizardData.tasksEnabled || {};

    // Setup tasks
    if (tasksEnabled['setup-page'] !== false) {
      tasks.push({
        user_id: user.id,
        project_id: project.id,
        cycle_id: cycleId,
        task_text: 'Set up sales page with countdown timer',
        scheduled_date: preSaleDate.toISOString().split('T')[0],
        priority: 'high',
        status: 'scheduled',
        task_type: 'flash_sale_setup',
      });
    }

    if (tasksEnabled['setup-checkout'] !== false) {
      tasks.push({
        user_id: user.id,
        project_id: project.id,
        cycle_id: cycleId,
        task_text: 'Configure discount code / checkout',
        scheduled_date: preSaleDate.toISOString().split('T')[0],
        priority: 'high',
        status: 'scheduled',
        task_type: 'flash_sale_setup',
      });
    }

    // Email tasks
    wizardData.emailsPlanned?.forEach((email: any) => {
      if (email.enabled && tasksEnabled[`email-${email.type}`] !== false) {
        tasks.push({
          user_id: user.id,
          project_id: project.id,
          cycle_id: cycleId,
          task_text: `Write & schedule: ${email.name}`,
          scheduled_date: preSaleDate.toISOString().split('T')[0],
          priority: 'high',
          status: 'scheduled',
          task_type: 'email',
          content_type: 'email',
        });
      }
    });

    // Social tasks
    if (wizardData.promotionPlatforms?.length > 0) {
      if (tasksEnabled['social-teaser'] !== false) {
        tasks.push({
          user_id: user.id,
          project_id: project.id,
          cycle_id: cycleId,
          task_text: 'Create teaser post (sale coming soon)',
          scheduled_date: preSaleDate.toISOString().split('T')[0],
          priority: 'medium',
          status: 'scheduled',
          task_type: 'social',
          content_type: 'social',
        });
      }

      if (tasksEnabled['social-announcement'] !== false) {
        tasks.push({
          user_id: user.id,
          project_id: project.id,
          cycle_id: cycleId,
          task_text: 'Post sale announcement',
          scheduled_date: wizardData.startDate,
          priority: 'high',
          status: 'scheduled',
          task_type: 'social',
          content_type: 'social',
        });
      }

      if (tasksEnabled['social-reminder'] !== false) {
        tasks.push({
          user_id: user.id,
          project_id: project.id,
          cycle_id: cycleId,
          task_text: 'Post sale reminder (halfway)',
          scheduled_date: wizardData.startDate,
          priority: 'medium',
          status: 'scheduled',
          task_type: 'social',
          content_type: 'social',
        });
      }

      if (tasksEnabled['social-lastchance'] !== false) {
        tasks.push({
          user_id: user.id,
          project_id: project.id,
          cycle_id: cycleId,
          task_text: 'Post last chance reminder',
          scheduled_date: wizardData.endDate,
          priority: 'high',
          status: 'scheduled',
          task_type: 'social',
          content_type: 'social',
        });
      }
    }

    // Ads task
    if (wizardData.useAds && tasksEnabled['ads-create'] !== false) {
      tasks.push({
        user_id: user.id,
        project_id: project.id,
        cycle_id: cycleId,
        task_text: 'Create retargeting ad for sale',
        scheduled_date: preSaleDate.toISOString().split('T')[0],
        priority: 'medium',
        status: 'scheduled',
        task_type: 'ads',
      });
    }

    // Post-sale tasks
    if (tasksEnabled['tracking-results'] !== false) {
      tasks.push({
        user_id: user.id,
        project_id: project.id,
        cycle_id: cycleId,
        task_text: 'Log final sales results',
        scheduled_date: wizardData.endDate,
        priority: 'medium',
        status: 'scheduled',
        task_type: 'tracking',
      });
    }

    if (tasksEnabled['debrief'] !== false) {
      const debriefDate = new Date(endDate);
      debriefDate.setDate(debriefDate.getDate() + 1);
      tasks.push({
        user_id: user.id,
        project_id: project.id,
        cycle_id: cycleId,
        task_text: 'Complete flash sale debrief',
        scheduled_date: debriefDate.toISOString().split('T')[0],
        priority: 'low',
        status: 'scheduled',
        task_type: 'tracking',
      });
    }

    // Insert all tasks
    if (tasks.length > 0) {
      const { error: tasksError } = await supabase.from('tasks').insert(tasks);
      if (tasksError) {
        console.error('Tasks creation error:', tasksError);
      }
    }

    // Record wizard completion
    await supabase.from('wizard_completions').insert({
      user_id: user.id,
      template_name: 'flash-sale-wizard',
      completed_at: new Date().toISOString(),
      wizard_data: wizardData,
      created_project_id: project.id,
    });

    // Clean up draft
    await supabase
      .from('wizard_drafts')
      .delete()
      .eq('user_id', user.id)
      .eq('wizard_name', 'flash-sale-wizard');

    return new Response(
      JSON.stringify({
        success: true,
        projectId: project.id,
        flashSaleId: flashSale?.id,
        tasksCreated: tasks.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in create-flash-sale:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
