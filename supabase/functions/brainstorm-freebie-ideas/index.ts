// Brainstorm Freebie Ideas Edge Function
// Uses Lovable AI to generate lead magnet ideas

import { Hono } from 'https://deno.land/x/hono@v3.12.11/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BrainstormRequest {
  idealCustomer: string;
  mainProblem: string;
  paidOffer: string;
  previousIdeas?: string[];
}

const app = new Hono();

app.options('*', (c) => {
  return new Response(null, { headers: corsHeaders });
});

app.post('/', async (c) => {
  try {
    const body = await c.req.json() as BrainstormRequest;
    const { idealCustomer, mainProblem, paidOffer, previousIdeas = [] } = body;

    if (!idealCustomer || !mainProblem || !paidOffer) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const previousIdeasContext = previousIdeas.length > 0
      ? `\n\nAVOID these ideas that were already generated: ${previousIdeas.join(', ')}`
      : '';

    const systemPrompt = `You are an expert online business strategist specializing in lead magnets and list building.
Your job is to generate 5 creative, high-converting lead magnet ideas based on the user's business context.

For each idea, provide:
1. A catchy title (include numbers, benefits, or urgency)
2. The format (PDF, checklist, video, template, quiz, mini-course, etc.)
3. A compelling hook/promise (what they'll get or achieve)
4. Why it works (1-2 sentences on why this would attract their ideal customer)

Focus on:
- Quick wins that lead to their paid offer
- Specific, actionable deliverables
- High perceived value
- Something they can create in 1-2 days

IMPORTANT: Return ONLY valid JSON in this exact format:
{
  "ideas": [
    {
      "title": "The 5-Day Content Clarity Challenge",
      "format": "Email mini-course",
      "hook": "Get a month of content ideas in just 5 days",
      "whyItWorks": "Delivers quick wins while building email habit and trust"
    }
  ]
}`;

    const userPrompt = `Generate 5 lead magnet ideas for this business:

IDEAL CUSTOMER: ${idealCustomer}

MAIN PROBLEM THEY SOLVE: ${mainProblem}

PAID OFFER: ${paidOffer}${previousIdeasContext}

Return the ideas as JSON.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse the JSON from the response
    let ideas;
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*"ideas"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        ideas = parsed.ideas;
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Parse error:', parseError, 'Content:', content);
      throw new Error('Failed to parse AI response');
    }

    if (!Array.isArray(ideas) || ideas.length === 0) {
      throw new Error('Invalid ideas array in response');
    }

    return c.json({ ideas }, 200, corsHeaders);

  } catch (error) {
    console.error('Brainstorm error:', error);
    return c.json(
      { error: error.message || 'Failed to generate ideas' },
      500,
      corsHeaders
    );
  }
});

Deno.serve(app.fetch);
