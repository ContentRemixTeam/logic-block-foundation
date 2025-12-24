import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getUserIdFromJWT(authHeader: string): string | null {
  try {
    const token = authHeader.replace("Bearer ", "");
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = getUserIdFromJWT(authHeader);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase configuration");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current cycle
    const today = new Date().toISOString().split("T")[0];
    const { data: cycleData, error: cycleError } = await supabase
      .rpc("get_current_cycle", { p_user_id: userId, p_today: today });

    if (cycleError) {
      console.error("Error fetching cycle:", cycleError);
      return new Response(JSON.stringify({ error: "Failed to fetch cycle" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!cycleData || cycleData.length === 0) {
      return new Response(JSON.stringify({ 
        has_cycle: false,
        message: "No active cycle found" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cycle = cycleData[0];

    // Fetch full cycle details for metric names and start values
    const { data: cycleDetails, error: cycleDetailsError } = await supabase
      .from("cycles_90_day")
      .select("metric_1_name, metric_2_name, metric_3_name, metric_1_start, metric_2_start, metric_3_start, start_date")
      .eq("cycle_id", cycle.cycle_id)
      .single();

    if (cycleDetailsError) {
      console.error("Error fetching cycle details:", cycleDetailsError);
      return new Response(JSON.stringify({ error: "Failed to fetch cycle details" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all weekly plans for this cycle
    const { data: weeklyPlans, error: plansError } = await supabase
      .from("weekly_plans")
      .select("week_id, start_of_week")
      .eq("cycle_id", cycle.cycle_id)
      .order("start_of_week", { ascending: true });

    if (plansError) {
      console.error("Error fetching weekly plans:", plansError);
      return new Response(JSON.stringify({ error: "Failed to fetch weekly plans" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all weekly reviews for these weeks
    const weekIds = weeklyPlans?.map(w => w.week_id) || [];
    
    let weeklyData: any[] = [];
    
    if (weekIds.length > 0) {
      const { data: reviews, error: reviewsError } = await supabase
        .from("weekly_reviews")
        .select("week_id, metric_1_actual, metric_2_actual, metric_3_actual")
        .in("week_id", weekIds);

      if (reviewsError) {
        console.error("Error fetching weekly reviews:", reviewsError);
      }

      // Combine weekly plans with reviews
      const reviewsMap = new Map(reviews?.map(r => [r.week_id, r]) || []);
      
      weeklyData = weeklyPlans?.map((plan, index) => {
        const review = reviewsMap.get(plan.week_id);
        return {
          week_number: index + 1,
          start_of_week: plan.start_of_week,
          metric_1_actual: review?.metric_1_actual ?? null,
          metric_2_actual: review?.metric_2_actual ?? null,
          metric_3_actual: review?.metric_3_actual ?? null,
        };
      }) || [];
    }

    // Find the latest week with any actual metrics
    let latestMetrics = {
      metric_1_actual: null as number | null,
      metric_2_actual: null as number | null,
      metric_3_actual: null as number | null,
    };

    for (let i = weeklyData.length - 1; i >= 0; i--) {
      const week = weeklyData[i];
      if (latestMetrics.metric_1_actual === null && week.metric_1_actual !== null) {
        latestMetrics.metric_1_actual = week.metric_1_actual;
      }
      if (latestMetrics.metric_2_actual === null && week.metric_2_actual !== null) {
        latestMetrics.metric_2_actual = week.metric_2_actual;
      }
      if (latestMetrics.metric_3_actual === null && week.metric_3_actual !== null) {
        latestMetrics.metric_3_actual = week.metric_3_actual;
      }
    }

    // Calculate percent changes
    const calculatePercentChange = (start: number | null, current: number | null) => {
      if (start === null || current === null || start === 0) return null;
      return ((current - start) / Math.abs(start)) * 100;
    };

    const response = {
      has_cycle: true,
      cycle_id: cycle.cycle_id,
      metrics: {
        metric_1_name: cycleDetails.metric_1_name,
        metric_2_name: cycleDetails.metric_2_name,
        metric_3_name: cycleDetails.metric_3_name,
        metric_1_start: cycleDetails.metric_1_start,
        metric_2_start: cycleDetails.metric_2_start,
        metric_3_start: cycleDetails.metric_3_start,
        metric_1_current: latestMetrics.metric_1_actual,
        metric_2_current: latestMetrics.metric_2_actual,
        metric_3_current: latestMetrics.metric_3_actual,
        metric_1_change: calculatePercentChange(cycleDetails.metric_1_start, latestMetrics.metric_1_actual),
        metric_2_change: calculatePercentChange(cycleDetails.metric_2_start, latestMetrics.metric_2_actual),
        metric_3_change: calculatePercentChange(cycleDetails.metric_3_start, latestMetrics.metric_3_actual),
      },
      weekly_data: weeklyData,
      cycle_start_date: cycleDetails.start_date,
    };

    console.log("Returning progress data:", JSON.stringify(response, null, 2));

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
