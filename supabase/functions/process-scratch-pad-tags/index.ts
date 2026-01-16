import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getAuthenticatedUserId(req: Request): Promise<{ userId: string | null; error: string | null }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { userId: null, error: 'No authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  const authClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data, error } = await authClient.auth.getClaims(token);
  
  if (error || !data?.claims) {
    console.error('[process-scratch-pad-tags] JWT validation failed:', error);
    return { userId: null, error: 'Invalid or expired token' };
  }

  return { userId: data.claims.sub as string, error: null };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const processed = {
    tasks: 0,
    ideas: 0,
    thoughts: 0,
    offers: 0,
    wins: 0,
  };

  const createdIds = {
    taskIds: [] as string[],
    ideaIds: [] as string[],
    thoughtIds: [] as string[],
  };

  try {
    const { userId, error: authError } = await getAuthenticatedUserId(req);
    
    if (authError || !userId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: authError || 'Unauthorized',
          processed,
          createdIds,
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { daily_plan_id, scratch_pad_content } = await req.json();

    if (!daily_plan_id) {
      throw new Error('Missing required field: daily_plan_id');
    }

    if (!scratch_pad_content || typeof scratch_pad_content !== 'string' || scratch_pad_content.trim() === '') {
      throw new Error('Missing or empty scratch_pad_content');
    }

    console.log('[process-scratch-pad-tags] Processing for user:', userId, 'plan:', daily_plan_id);

    // Verify user owns this daily plan
    const { data: dailyPlan, error: planError } = await supabase
      .from('daily_plans')
      .select('day_id, user_id, daily_wins, date')
      .eq('day_id', daily_plan_id)
      .eq('user_id', userId)
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

    const errors: string[] = [];
    let currentWins = Array.isArray(dailyPlan.daily_wins) ? dailyPlan.daily_wins : [];

    // Collect items to process
    const itemsToProcess: Array<{ type: string; content: string }> = [];

    // Split content into lines and process each
    const lines = scratch_pad_content.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Check for each tag type in the line (case-insensitive)
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
            createdIds,
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
              createdIds,
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
          createdIds,
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
            const { data: taskData, error: taskError } = await supabase
              .from('tasks')
              .insert({
                user_id: userId,
                daily_plan_id: daily_plan_id,
                task_text: content,
                source: 'scratch_pad',
                scheduled_date: dailyPlan.date || null,
                is_completed: false,
              })
              .select('task_id')
              .single();

            if (taskError) {
              console.error('[process-scratch-pad-tags] Error inserting task:', taskError);
              errors.push(`Failed to save task: ${content.substring(0, 30)}...`);
            } else {
              processed.tasks++;
              if (taskData?.task_id) {
                createdIds.taskIds.push(taskData.task_id);
              }
              console.log('[process-scratch-pad-tags] Saved task:', content, 'ID:', taskData?.task_id);
            }
            break;

          case 'idea':
            const { data: ideaData, error: ideaError } = await supabase
              .from('ideas')
              .insert({
                user_id: userId,
                content: content,
              })
              .select('id')
              .single();

            if (ideaError) {
              console.error('[process-scratch-pad-tags] Error inserting idea:', ideaError);
              errors.push(`Failed to save idea: ${content.substring(0, 30)}...`);
            } else {
              processed.ideas++;
              if (ideaData?.id) {
                createdIds.ideaIds.push(ideaData.id);
              }
              console.log('[process-scratch-pad-tags] Saved idea:', content, 'ID:', ideaData?.id);
            }
            break;

          case 'thought':
            // Find or create "Daily Insights" category
            let categoryId: string | null = null;
            
            const { data: existingCategory } = await supabase
              .from('mindset_categories')
              .select('id')
              .eq('user_id', userId)
              .eq('name', 'Daily Insights')
              .maybeSingle();

            if (existingCategory) {
              categoryId = existingCategory.id;
            } else {
              const { data: newCategory, error: categoryError } = await supabase
                .from('mindset_categories')
                .insert({
                  user_id: userId,
                  name: 'Daily Insights',
                  color: '#10B8C7',
                })
                .select('id')
                .single();

              if (!categoryError && newCategory) {
                categoryId = newCategory.id;
              }
            }

            const { data: thoughtData, error: thoughtError } = await supabase
              .from('useful_thoughts')
              .insert({
                user_id: userId,
                text: content,
                category_id: categoryId,
                is_favorite: true,
              })
              .select('id')
              .single();

            if (thoughtError) {
              console.error('[process-scratch-pad-tags] Error inserting thought:', thoughtError);
              errors.push(`Failed to save thought: ${content.substring(0, 30)}...`);
            } else {
              processed.thoughts++;
              if (thoughtData?.id) {
                createdIds.thoughtIds.push(thoughtData.id);
              }
              console.log('[process-scratch-pad-tags] Saved thought:', content, 'ID:', thoughtData?.id);
            }
            break;

          case 'offer':
            const { error: offerError } = await supabase
              .from('daily_plans')
              .update({ made_offer: true })
              .eq('day_id', daily_plan_id)
              .eq('user_id', userId);

            if (offerError) {
              console.error('[process-scratch-pad-tags] Error updating offer:', offerError);
              errors.push('Failed to mark offer as made');
            } else {
              processed.offers++;
              console.log('[process-scratch-pad-tags] Marked offer made');
            }
            break;

          case 'win':
            currentWins = [...currentWins, { 
              text: content, 
              captured_at: new Date().toISOString() 
            }];
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
      .eq('user_id', userId);

    if (updateError) {
      console.error('[process-scratch-pad-tags] Error updating daily plan:', updateError);
      errors.push('Failed to update daily plan');
    }

    console.log('[process-scratch-pad-tags] Processing complete:', {
      processed,
      createdIds,
      taskIds: createdIds.taskIds,
      ideaIds: createdIds.ideaIds,
      thoughtIds: createdIds.thoughtIds,
    });

    // Return partial success if some items processed but others failed
    const totalProcessed = processed.tasks + processed.ideas + processed.thoughts + processed.offers + processed.wins;
    
    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        processed,
        createdIds,
        errors: errors.length > 0 ? errors : undefined,
        partialSuccess: errors.length > 0 && totalProcessed > 0,
      }),
      { 
        status: errors.length === 0 ? 200 : (totalProcessed > 0 ? 207 : 500),
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    console.error('[process-scratch-pad-tags] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || 'Unknown error',
        processed,
        createdIds,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
