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
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { checkin_id, status, coach_response, reschedule_date, create_task, commitment_id } = body;

    // Update the checkin
    const updateData: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (coach_response) {
      updateData.coach_response = coach_response;
    }

    if (reschedule_date) {
      updateData.reschedule_date = reschedule_date;
    }

    const { data: checkin, error: updateError } = await supabase
      .from('nurture_checkins')
      .update(updateData)
      .eq('id', checkin_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating checkin:', updateError);
      throw updateError;
    }

    // If rescheduling, create a task
    if (create_task && reschedule_date) {
      // Get the commitment to get cycle_id
      const { data: commitment } = await supabase
        .from('nurture_commitments')
        .select('cycle_id, commitment_type, preferred_time_block')
        .eq('id', commitment_id)
        .single();

      // Calculate time block start if preferred_time_block is set
      let timeBlockStart = null;
      if (commitment?.preferred_time_block) {
        const timeMap: Record<string, string> = {
          'morning': '09:00',
          'afternoon': '14:00',
          'evening': '18:00',
        };
        const time = timeMap[commitment.preferred_time_block];
        if (time) {
          timeBlockStart = `${reschedule_date}T${time}:00`;
        }
      }

      const taskData: Record<string, any> = {
        user_id: user.id,
        task_text: 'Write + send email',
        scheduled_date: reschedule_date,
        category: 'Nurture',
        source: 'nurture_checkin',
        priority: 'high',
        tags: ['nurture', 'email'],
      };

      if (commitment?.cycle_id) {
        taskData.cycle_id = commitment.cycle_id;
      }

      if (timeBlockStart) {
        taskData.time_block_start = timeBlockStart;
      }

      const { error: taskError } = await supabase
        .from('tasks')
        .insert(taskData);

      if (taskError) {
        console.error('Error creating task:', taskError);
        // Don't throw, just log - the checkin was still updated
      }
    }

    return new Response(
      JSON.stringify({ success: true, checkin }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in update-nurture-checkin:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
