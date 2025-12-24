import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { daily_plan_id, scratch_pad_content } = await req.json();

    if (!daily_plan_id || !scratch_pad_content) {
      throw new Error('Missing required fields: daily_plan_id and scratch_pad_content');
    }

    console.log('[process-scratch-pad-tags] Processing for user:', user.id, 'plan:', daily_plan_id);

    // Verify user owns this daily plan
    const { data: dailyPlan, error: planError } = await supabase
      .from('daily_plans')
      .select('day_id, user_id, daily_wins')
      .eq('day_id', daily_plan_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (planError) {
      console.error('[process-scratch-pad-tags] Error fetching daily plan:', planError);
      throw new Error('Failed to fetch daily plan');
    }

    if (!dailyPlan) {
      throw new Error('Daily plan not found or access denied');
    }

    // Parse tags using line-by-line approach to handle tags ANYWHERE in the line
    console.log('[process-scratch-pad-tags] Content to parse:', scratch_pad_content);

    const processed = {
      tasks: 0,
      ideas: 0,
      thoughts: 0,
      offers: 0,
      wins: 0,
    };

    const errors: string[] = [];
    let currentWins = Array.isArray(dailyPlan.daily_wins) ? dailyPlan.daily_wins : [];

    // Collect items to process
    const itemsToProcess: Array<{ type: string; content: string }> = [];

    // Split content into lines and process each
    const lines = scratch_pad_content.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Check for each tag type in the line
      const hasTask = /#task\b/i.test(trimmedLine);
      const hasIdea = /#idea\b/i.test(trimmedLine);
      const hasThought = /#thought\b/i.test(trimmedLine);
      const hasOffer = /#offer\b/i.test(trimmedLine);
      const hasWin = /#win\b/i.test(trimmedLine);

      if (hasTask) {
        // Remove the #task tag and use the rest as content
        const content = trimmedLine.replace(/#task\b/gi, '').trim();
        if (content) {
          itemsToProcess.push({ type: 'task', content });
          console.log('[process-scratch-pad-tags] Found task:', content);
        }
      }

      if (hasIdea) {
        const content = trimmedLine.replace(/#idea\b/gi, '').trim();
        if (content) {
          itemsToProcess.push({ type: 'idea', content });
          console.log('[process-scratch-pad-tags] Found idea:', content);
        }
      }

      if (hasThought) {
        const content = trimmedLine.replace(/#thought\b/gi, '').trim();
        if (content) {
          itemsToProcess.push({ type: 'thought', content });
          console.log('[process-scratch-pad-tags] Found thought:', content);
        }
      }

      if (hasOffer) {
        itemsToProcess.push({ type: 'offer', content: '' });
        console.log('[process-scratch-pad-tags] Found offer');
      }

      if (hasWin) {
        const content = trimmedLine.replace(/#win\b/gi, '').trim();
        if (content) {
          itemsToProcess.push({ type: 'win', content });
          console.log('[process-scratch-pad-tags] Found win:', content);
        }
      }
    }

    console.log('[process-scratch-pad-tags] Items to process:', itemsToProcess.length);

    // Check if no valid tags found
    if (itemsToProcess.length === 0) {
      // Check if they used hashtags at all
      if (!scratch_pad_content.includes('#')) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'No hashtags found. Use #task, #idea, #thought, #offer, or #win anywhere in your text',
            processed,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Check if they used wrong/unsupported tags
      const allTags = scratch_pad_content.match(/#\w+/g);
      if (allTags && allTags.length > 0) {
        const supportedTags = ['#task', '#idea', '#thought', '#offer', '#win'];
        const invalidTags = allTags.filter((tag: string) => !supportedTags.includes(tag.toLowerCase()));
        if (invalidTags.length > 0) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Found ${invalidTags.join(', ')} but only #task, #idea, #thought, #offer, #win are supported`,
              processed,
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Tags found but no content. Add text before or after the tag like: "Email my list #task"',
          processed,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each item
    for (const item of itemsToProcess) {
      const { type: tagType, content } = item;

      try {
        switch (tagType) {
          case 'task':
            // Get the scheduled date from the daily plan
            const { data: planData } = await supabase
              .from('daily_plans')
              .select('date')
              .eq('day_id', daily_plan_id)
              .single();

            const { error: taskError } = await supabase
              .from('tasks')
              .insert({
                user_id: user.id,
                daily_plan_id: daily_plan_id,
                task_text: content,
                source: 'scratch_pad',
                scheduled_date: planData?.date || null,
              });

            if (taskError) {
              console.error('[process-scratch-pad-tags] Error inserting task:', taskError);
              errors.push(`Failed to save task: ${content.substring(0, 30)}...`);
            } else {
              processed.tasks++;
              console.log('[process-scratch-pad-tags] Saved task:', content);
            }
            break;

          case 'idea':
            const { error: ideaError } = await supabase
              .from('ideas')
              .insert({
                user_id: user.id,
                content: content,
              });

            if (ideaError) {
              console.error('[process-scratch-pad-tags] Error inserting idea:', ideaError);
              errors.push(`Failed to save idea: ${content.substring(0, 30)}...`);
            } else {
              processed.ideas++;
              console.log('[process-scratch-pad-tags] Saved idea:', content);
            }
            break;

          case 'thought':
            // Find or create "Daily Insights" category
            let categoryId: string | null = null;
            
            const { data: existingCategory } = await supabase
              .from('mindset_categories')
              .select('id')
              .eq('user_id', user.id)
              .eq('name', 'Daily Insights')
              .maybeSingle();

            if (existingCategory) {
              categoryId = existingCategory.id;
            } else {
              const { data: newCategory, error: categoryError } = await supabase
                .from('mindset_categories')
                .insert({
                  user_id: user.id,
                  name: 'Daily Insights',
                  color: '#10B8C7',
                })
                .select('id')
                .single();

              if (!categoryError && newCategory) {
                categoryId = newCategory.id;
              }
            }

            const { error: thoughtError } = await supabase
              .from('useful_thoughts')
              .insert({
                user_id: user.id,
                text: content,
                category_id: categoryId,
                is_favorite: true,
              });

            if (thoughtError) {
              console.error('[process-scratch-pad-tags] Error inserting thought:', thoughtError);
              errors.push(`Failed to save thought: ${content.substring(0, 30)}...`);
            } else {
              processed.thoughts++;
              console.log('[process-scratch-pad-tags] Saved thought:', content);
            }
            break;

          case 'offer':
            const { error: offerError } = await supabase
              .from('daily_plans')
              .update({ made_offer: true })
              .eq('day_id', daily_plan_id)
              .eq('user_id', user.id);

            if (offerError) {
              console.error('[process-scratch-pad-tags] Error updating offer:', offerError);
              errors.push('Failed to mark offer as made');
            } else {
              processed.offers++;
              console.log('[process-scratch-pad-tags] Marked offer made:', content);
            }
            break;

          case 'win':
            currentWins = [...currentWins, { text: content, created_at: new Date().toISOString() }];
            processed.wins++;
            console.log('[process-scratch-pad-tags] Added win:', content);
            break;

          default:
            console.log('[process-scratch-pad-tags] Unknown tag type:', tagType);
        }
      } catch (tagError) {
        console.error('[process-scratch-pad-tags] Error processing tag:', tagType, tagError);
        errors.push(`Failed to process #${tagType}`);
      }
    }

    // Update daily plan with wins and processed timestamp
    const { error: updateError } = await supabase
      .from('daily_plans')
      .update({
        daily_wins: currentWins,
        scratch_pad_content: scratch_pad_content,
        scratch_pad_processed_at: new Date().toISOString(),
      })
      .eq('day_id', daily_plan_id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[process-scratch-pad-tags] Error updating daily plan:', updateError);
      errors.push('Failed to update daily plan');
    }

    console.log('[process-scratch-pad-tags] Processing complete:', processed);

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        processed,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[process-scratch-pad-tags] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || 'Unknown error',
        processed: { tasks: 0, ideas: 0, thoughts: 0, offers: 0, wins: 0 }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
