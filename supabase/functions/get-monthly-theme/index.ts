import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().split("T")[0];

    // Get current month's published template
    const { data: template, error: tErr } = await supabase
      .from("monthly_challenge_templates")
      .select("*, reward_theme:app_themes(*)")
      .eq("is_published", true)
      .lte("month_start", today)
      .gte("month_end", today)
      .single();

    if (tErr || !template) {
      return new Response(
        JSON.stringify({ active: false, template: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's challenge enrollment for this template
    const { data: challenge } = await supabase
      .from("user_monthly_challenges")
      .select("*")
      .eq("user_id", user.id)
      .eq("template_id", template.id)
      .maybeSingle();

    // Get user's dismissal state
    const { data: dismissal } = await supabase
      .from("user_monthly_theme_dismissals")
      .select("*")
      .eq("user_id", user.id)
      .eq("template_id", template.id)
      .maybeSingle();

    // Check if theme is already unlocked
    let themeUnlocked = false;
    if (template.reward_theme_id) {
      const { data: unlock } = await supabase
        .from("user_theme_unlocks")
        .select("id")
        .eq("user_id", user.id)
        .eq("theme_id", template.reward_theme_id)
        .maybeSingle();
      themeUnlocked = !!unlock;
    }

    // Calculate progress if enrolled
    let progress = null;
    if (challenge && challenge.status === "active") {
      const { data: progressData } = await supabase.rpc(
        "get_monthly_challenge_progress",
        { p_user_challenge_id: challenge.id }
      );
      progress = progressData;
    }

    return new Response(
      JSON.stringify({
        active: true,
        template: {
          id: template.id,
          title: template.title,
          description: template.description,
          announcement_title: template.announcement_title,
          announcement_body: template.announcement_body,
          preview_image_url: template.preview_image_url,
          suggested_targets: template.suggested_targets,
          unlock_paths: template.unlock_paths,
          month_start: template.month_start,
          month_end: template.month_end,
          reward_theme: template.reward_theme,
        },
        challenge,
        dismissal: {
          popup_dismissed: !!dismissal?.popup_dismissed_at,
          hello_bar_dismissed: !!dismissal?.hello_bar_dismissed_at,
        },
        theme_unlocked: themeUnlocked,
        progress,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-monthly-theme:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
