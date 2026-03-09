import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  console.log("get-monthly-theme: handler called", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    console.log("get-monthly-theme: auth header present", !!authHeader);

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
    console.log("get-monthly-theme: env vars", { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey });

    if (!supabaseUrl || !supabaseKey) {
      console.error("get-monthly-theme: missing env vars");
      return new Response(
        JSON.stringify({ active: false, template: null, error: "Missing env" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    console.log("get-monthly-theme: getting user");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("get-monthly-theme: user error", userError.message);
    }

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("get-monthly-theme: user authenticated", user.id);

    const today = new Date().toISOString().split("T")[0];
    console.log("get-monthly-theme: today", today);

    // Get current month's published template
    console.log("get-monthly-theme: fetching template");
    const { data: template, error: tErr } = await supabase
      .from("monthly_challenge_templates")
      .select("*, reward_theme:app_themes(*)")
      .eq("is_published", true)
      .lte("month_start", today)
      .gte("month_end", today)
      .maybeSingle();

    console.log("get-monthly-theme: template result", { 
      hasTemplate: !!template, 
      error: tErr?.message || null 
    });

    if (tErr) {
      console.error("get-monthly-theme: template query error", tErr);
      // If table doesn't exist or other DB error, return inactive gracefully
      return new Response(
        JSON.stringify({ active: false, template: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!template) {
      console.log("get-monthly-theme: no active template found");
      return new Response(
        JSON.stringify({ active: false, template: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("get-monthly-theme: found template", template.id);

    // Get user's challenge enrollment for this template
    const { data: challenge, error: cErr } = await supabase
      .from("user_monthly_challenges")
      .select("*")
      .eq("user_id", user.id)
      .eq("template_id", template.id)
      .maybeSingle();

    if (cErr) console.error("get-monthly-theme: challenge error", cErr.message);

    // Get user's dismissal state
    const { data: dismissal, error: dErr } = await supabase
      .from("user_monthly_theme_dismissals")
      .select("*")
      .eq("user_id", user.id)
      .eq("template_id", template.id)
      .maybeSingle();

    if (dErr) console.error("get-monthly-theme: dismissal error", dErr.message);

    // Check if theme is already unlocked
    let themeUnlocked = false;
    if (template.reward_theme_id) {
      const { data: unlock, error: uErr } = await supabase
        .from("user_theme_unlocks")
        .select("id")
        .eq("user_id", user.id)
        .eq("theme_id", template.reward_theme_id)
        .maybeSingle();
      if (uErr) console.error("get-monthly-theme: unlock error", uErr.message);
      themeUnlocked = !!unlock;
    }

    // Calculate progress if enrolled
    let progress = null;
    if (challenge && challenge.status === "active") {
      console.log("get-monthly-theme: calculating progress for challenge", challenge.id);
      const { data: progressData, error: pErr } = await supabase.rpc(
        "get_monthly_challenge_progress",
        { p_user_challenge_id: challenge.id }
      );
      if (pErr) console.error("get-monthly-theme: progress error", pErr.message);
      progress = progressData;
    }

    console.log("get-monthly-theme: returning success response");

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
    console.error("get-monthly-theme: UNHANDLED ERROR", error?.message, error?.stack);
    // Never return 500 - return inactive state so UI doesn't break
    return new Response(
      JSON.stringify({ active: false, template: null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
