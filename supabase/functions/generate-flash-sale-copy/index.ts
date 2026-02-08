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
    const {
      productName,
      originalPrice,
      salePrice,
      discountValue,
      discountType,
      targetAudience,
      painPoints,
      whyNow,
      urgencyType,
      scarcityMessage,
      earlyBirdBonus,
      flashBonus,
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const discountText = discountType === 'percentage' 
      ? `${discountValue}% OFF` 
      : `$${discountValue} OFF`;

    const prompt = `You are a direct response copywriter specializing in flash sales. Write compelling sales copy for this flash sale:

PRODUCT: ${productName}
ORIGINAL PRICE: $${originalPrice}
SALE PRICE: $${salePrice}
DISCOUNT: ${discountText}

TARGET AUDIENCE: ${targetAudience || 'Not specified'}
PAIN POINTS: ${painPoints?.join(', ') || 'Not specified'}
WHY BUY NOW: ${whyNow || 'Limited time sale'}

URGENCY TYPE: ${urgencyType}
SCARCITY MESSAGE: ${scarcityMessage || 'Sale ends soon'}
${earlyBirdBonus ? `EARLY BIRD BONUS: ${earlyBirdBonus}` : ''}
${flashBonus ? `DISAPPEARING BONUS: ${flashBonus}` : ''}

Generate the following sales copy elements:

1. HEADLINE: A powerful, benefit-driven headline that includes the discount (max 15 words)
2. SUBHEADLINE: Supporting copy that adds context (max 20 words)
3. URGENCY_HOOK: A short, punchy line that creates FOMO (max 15 words)
4. BULLETS: 4 benefit bullets (each max 10 words, start with action verbs)
5. CTA: A compelling call-to-action button text (2-5 words)

Respond ONLY with valid JSON in this exact format:
{
  "headline": "...",
  "subheadline": "...",
  "urgencyHook": "...",
  "bullets": ["...", "...", "...", "..."],
  "cta": "..."
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert direct response copywriter. Always respond with valid JSON only, no markdown." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response
    let copyData;
    try {
      // Clean up the response in case it has markdown code blocks
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      copyData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response as JSON");
    }

    return new Response(JSON.stringify(copyData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-flash-sale-copy:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
