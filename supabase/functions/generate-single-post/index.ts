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
    const { platform, title, hook, contentIdea, pillarName, idealCustomer, promotionContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `Write a complete ${platform} post based on this content idea.

TITLE: ${title}
HOOK: ${hook}
CONTENT IDEA: ${contentIdea}
PILLAR: ${pillarName}
TARGET AUDIENCE: ${idealCustomer}
PROMOTION FOCUS: ${promotionContext?.type || 'value content'}

Write the full post copy optimized for ${platform}. Follow platform best practices for length, formatting, and engagement. Include the hook as the opening line.

Return ONLY the post copy, no explanations or formatting markers.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) throw new Error("AI generation failed");

    const result = await response.json();
    const copy = result.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ copy }), {
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
