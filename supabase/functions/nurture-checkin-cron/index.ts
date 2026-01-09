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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date and yesterday's date
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Yesterday's day of week (0 = Sunday, 6 = Saturday)
    const yesterdayDayOfWeek = yesterday.getDay();

    console.log(`Running nurture check-in cron for ${todayStr}. Yesterday was ${yesterdayStr} (day ${yesterdayDayOfWeek})`);

    // Get all enabled nurture commitments where yesterday was the commitment day
    const { data: commitments, error: commitmentsError } = await supabase
      .from('nurture_commitments')
      .select('*')
      .eq('enabled', true)
      .eq('day_of_week', yesterdayDayOfWeek);

    if (commitmentsError) {
      console.error('Error fetching commitments:', commitmentsError);
      throw commitmentsError;
    }

    console.log(`Found ${commitments?.length || 0} commitments for day ${yesterdayDayOfWeek}`);

    const results = {
      processed: 0,
      completed: 0,
      pending: 0,
      errors: [] as string[],
    };

    for (const commitment of commitments || []) {
      try {
        // Check if there's already a checkin for this expected_date
        const { data: existingCheckin } = await supabase
          .from('nurture_checkins')
          .select('*')
          .eq('commitment_id', commitment.id)
          .eq('expected_date', yesterdayStr)
          .single();

        if (existingCheckin) {
          console.log(`Checkin already exists for commitment ${commitment.id} on ${yesterdayStr}`);
          continue;
        }

        // Check if user sent content yesterday based on content_send_log
        const { data: sendLogs, error: sendLogsError } = await supabase
          .from('content_send_log')
          .select('*')
          .eq('user_id', commitment.user_id)
          .eq('type', 'Email')
          .gte('sent_at', `${yesterdayStr}T00:00:00`)
          .lt('sent_at', `${todayStr}T00:00:00`);

        if (sendLogsError) {
          console.error(`Error checking send logs for user ${commitment.user_id}:`, sendLogsError);
          results.errors.push(`Send logs error for ${commitment.user_id}`);
          continue;
        }

        const hasSentContent = sendLogs && sendLogs.length > 0;

        // Create the checkin record
        const { error: insertError } = await supabase
          .from('nurture_checkins')
          .insert({
            user_id: commitment.user_id,
            commitment_id: commitment.id,
            expected_date: yesterdayStr,
            checkin_date: todayStr,
            status: hasSentContent ? 'completed' : 'pending',
          });

        if (insertError) {
          console.error(`Error creating checkin for commitment ${commitment.id}:`, insertError);
          results.errors.push(`Insert error for ${commitment.id}`);
          continue;
        }

        results.processed++;
        if (hasSentContent) {
          results.completed++;
          console.log(`User ${commitment.user_id} completed their nurture commitment for ${yesterdayStr}`);
        } else {
          results.pending++;
          console.log(`User ${commitment.user_id} has a pending nurture checkin for ${yesterdayStr}`);
        }
      } catch (err) {
        console.error(`Error processing commitment ${commitment.id}:`, err);
        results.errors.push(`Processing error for ${commitment.id}`);
      }
    }

    console.log('Cron job completed:', results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in nurture-checkin-cron:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
