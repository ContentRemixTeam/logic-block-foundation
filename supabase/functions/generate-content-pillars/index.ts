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
  const guard = await guardAiRequest(req, "generate-content-pillars", corsHeaders);
  if (!guard.ok) return guard.response;

  try {
    const { idealCustomer, problemsSolved, topicsOfInterest, promotionContext } = await req.json();



    const prompt = `Based on the following business context, suggest 5-7 content pillars (themes/categories) that would resonate with the ideal customer.

IDEAL CUSTOMER: ${idealCustomer}
PROBLEMS SOLVED: ${problemsSolved}
TOPICS OF INTEREST: ${topicsOfInterest}
PROMOTION FOCUS: ${promotionContext?.type || 'general nurturing'}

Return a JSON array of pillars with this structure:
[{"name": "Pillar Name", "description": "Brief description of what content fits here", "emoji": "relevant emoji"}]

Focus on pillars that:
1. Address the customer's pain points
2. Showcase expertise in solving their problems  
3. Build trust and authority
4. Mix educational, inspirational, and promotional content`;

    const ai = await callUserAI(
      guard.supabase,
      guard.userId,
      [{ role: "user", content: prompt }],
      { temperature: 0.7, headers: corsHeaders }
    );
    if (!ai.ok) return ai.response;

    const content = ai.content || "[]";

    
    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const pillars = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return new Response(JSON.stringify({ pillars }), {
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
