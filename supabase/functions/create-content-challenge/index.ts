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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const body = await req.json();
    const { name, startDate, endDate, platforms, promotionContext, newPillars, contentByPlatform, postingTimes, createPublishingTasks } = body;

    // Create pillars first
    const createdPillarIds: string[] = [];
    if (newPillars?.length > 0) {
      const { data: pillars } = await supabase
        .from("content_pillars")
        .insert(newPillars.map((p: any, i: number) => ({
          user_id: user.id,
          name: p.name,
          description: p.description,
          color: p.color,
          emoji: p.emoji,
          sort_order: i,
        })))
        .select("id");
      if (pillars) createdPillarIds.push(...pillars.map(p => p.id));
    }

    // Create challenge
    const { data: challenge, error: challengeError } = await supabase
      .from("content_challenges")
      .insert({
        user_id: user.id,
        name,
        start_date: startDate,
        end_date: endDate,
        platforms,
        promotion_context: promotionContext,
        pillar_ids: createdPillarIds,
        status: "active",
      })
      .select()
      .single();

    if (challengeError) throw challengeError;

    // Create content items and tasks
    let contentItemsCreated = 0;
    let tasksCreated = 0;

    for (const [platform, content] of Object.entries(contentByPlatform || {})) {
      const finalizedContent = (content as any[]).filter(c => c.status === "finalized");

      for (const item of finalizedContent) {
        const publishDate = new Date(startDate);
        publishDate.setDate(publishDate.getDate() + item.dayNumber - 1);
        const publishDateStr = publishDate.toISOString().split("T")[0];

        // Create content item
        const { data: contentItem } = await supabase
          .from("content_items")
          .insert({
            user_id: user.id,
            title: item.title,
            type: "post",
            channel: platform,
            body: item.fullCopy,
            hook: item.hook,
            status: "Draft",
            planned_publish_date: publishDateStr,
            show_in_vault: true,
          })
          .select()
          .single();

        if (contentItem) {
          contentItemsCreated++;

          // Create challenge day record
          await supabase.from("content_challenge_days").insert({
            user_id: user.id,
            challenge_id: challenge.id,
            day_number: item.dayNumber,
            date: publishDateStr,
            platform,
            title: item.title,
            hook: item.hook,
            full_copy: item.fullCopy,
            content_item_id: contentItem.id,
            status: "finalized",
          });

          // Create publishing task if enabled
          if (createPublishingTasks) {
            await supabase.from("tasks").insert({
              user_id: user.id,
              task_text: `Publish: ${item.title}`,
              scheduled_date: publishDateStr,
              status: "scheduled",
              content_item_id: contentItem.id,
              content_type: "post",
              content_channel: platform,
            });
            tasksCreated++;
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      challengeId: challenge.id,
      contentItemsCreated,
      tasksCreated,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
