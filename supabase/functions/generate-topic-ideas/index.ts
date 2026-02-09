import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLATFORM_CONTEXT: Record<string, string> = {
  instagram_post: "Instagram (visual-first, personal, casual, emotional hooks, 100-300 words)",
  linkedin_post: "LinkedIn (professional, thought leadership, business insights, 150-400 words)",
  twitter_thread: "Twitter/X (punchy, quotable, thread-friendly, concise)",
  social_post: "General social media (engaging, shareable, clear point)",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { platform } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Get auth header to fetch user context
    const authHeader = req.headers.get("authorization");
    let userContext = "";
    
    if (authHeader) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        // Fetch brand profile for context
        const { data: brandProfile } = await supabase
          .from("brand_profiles")
          .select("business_name, industry, target_customer, what_you_sell, content_philosophies")
          .eq("user_id", user.id)
          .single();
        
        if (brandProfile) {
          userContext = `
Business: ${brandProfile.business_name || "Online business"}
Industry: ${brandProfile.industry || "Coaching/Consulting"}
Target Customer: ${brandProfile.target_customer || "Entrepreneurs and business owners"}
What They Sell: ${brandProfile.what_you_sell || "Digital products and services"}
Content Philosophy: ${(brandProfile.content_philosophies || []).slice(0, 2).join(", ") || "Value-first content"}
`;
        }
      }
    }

    const platformContext = PLATFORM_CONTEXT[platform] || PLATFORM_CONTEXT.social_post;

    const prompt = `You are a content strategist for an online business owner. Generate 3 unique, specific topic ideas for a ${platformContext} post.

${userContext ? `ABOUT THIS BUSINESS:\n${userContext}` : ""}

For each topic, provide:
1. topic: A specific topic title (not generic)
2. angle: The unique perspective or approach to take
3. hook: A compelling opening line that would stop someone scrolling

REQUIREMENTS:
- Topics should be SPECIFIC and actionable, not generic
- Each should tap into emotions or curiosity
- Mix of value-giving, story-telling, and insight-sharing
- Avoid clichés like "game-changer", "unlock your potential", "level up"
- Make hooks conversational and authentic

Return ONLY valid JSON in this format:
{
  "topics": [
    {
      "topic": "The specific topic",
      "angle": "The unique angle or approach",
      "hook": "An example opening line"
    }
  ]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error("Failed to generate topic ideas");
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    let topics = [];
    try {
      // Try to extract JSON from markdown code blocks or raw JSON
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1]?.trim() || content.trim();
      const parsed = JSON.parse(jsonStr);
      topics = parsed.topics || [];
    } catch (parseError) {
      console.error("Failed to parse topics:", parseError, content);
      // Fallback topics
      topics = [
        {
          topic: "Behind the scenes of your work",
          angle: "Show the messy middle, not just the polished result",
          hook: "Nobody talks about this part..."
        },
        {
          topic: "A lesson from a recent mistake",
          angle: "Turn a failure into a teaching moment",
          hook: "I messed up. Here's what I learned:"
        },
        {
          topic: "Answer a common question",
          angle: "Address what people DM you about most",
          hook: "I get asked this all the time, so let's talk about it..."
        }
      ];
    }

    return new Response(JSON.stringify({ topics }), {
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
