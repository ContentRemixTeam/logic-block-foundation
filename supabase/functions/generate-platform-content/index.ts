import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { platform, pillars, idealCustomer, problemsSolved, promotionContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
      }),
    });

    if (!response.ok) throw new Error("AI generation failed");

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "[]";
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
