import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { guardAiRequest } from "../_shared/ai_guard.ts";
import { callUserAI } from "../_shared/byok.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require an authenticated user + per-user rate limit before touching the AI gateway
  const guard = await guardAiRequest(req, "generate-platform-content", corsHeaders);
  if (!guard.ok) return guard.response;

  try {
    const { platform, pillars, idealCustomer, problemsSolved, promotionContext } = await req.json();



    const pillarNames = pillars?.map((p: any) => p.name).join(", ") || "general topics";

    const prompt = `Generate 30 content ideas for ${platform} posts.

IDEAL CUSTOMER: ${idealCustomer}
CONTENT PILLARS: ${pillarNames}
PROMOTION FOCUS: ${promotionContext?.type || 'nurturing'} ${promotionContext?.name ? `- ${promotionContext.name}` : ''}

For each day (1-30), provide:
- A compelling title
- A hook (first line that grabs attention)
- Which pillar it belongs to
- A brief content idea

Return a JSON array with exactly 30 items:
[{"dayNumber": 1, "title": "...", "hook": "...", "pillarName": "...", "contentIdea": "..."}]

Mix promotional content (20%) with value-driven content (80%). Ensure variety across pillars.`;

    const ai = await callUserAI(
      guard.supabase,
      guard.userId,
      [{ role: "user", content: prompt }],
      { temperature: 0.8, maxTokens: 8000, headers: corsHeaders }
    );
    if (!ai.ok) return ai.response;

    const content = ai.content || "[]";

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const ideas = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return new Response(JSON.stringify({ ideas }), {
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
