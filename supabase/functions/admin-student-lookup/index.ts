import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StudentLookupResult {
  found: boolean;
  user: {
    id: string;
    email: string;
    created_at: string;
    last_sign_in_at: string | null;
  } | null;
  profile: {
    user_type: string;
    trial_started_at: string | null;
    trial_expires_at: string | null;
  } | null;
  entitlement: {
    tier: string;
    status: string;
    starts_at: string | null;
    ends_at: string | null;
  } | null;
  cycle: {
    exists: boolean;
    cycle_id: string | null;
    created_at: string | null;
    goal: string | null;
    fields_filled: number;
    total_fields: number;
    data: object | null;
  };
  draft: {
    exists: boolean;
    current_step: number | null;
    updated_at: string | null;
    fields_filled: number;
    total_fields: number;
    data: object | null;
  };
  strategy: { exists: boolean; count: number };
  offers: { exists: boolean; count: number };
  revenue_plan: { exists: boolean };
  month_plans: { exists: boolean; count: number };
  projects: { count: number };
  tasks: { count: number };
  habits: { count: number };
  daily_plans: { count: number };
  weekly_plans: { count: number };
  coaching_entries: { count: number };
}

// Helper to count filled fields in an object
function countFilledFields(obj: any, fieldsToCheck: string[]): { filled: number; total: number } {
  if (!obj) return { filled: 0, total: fieldsToCheck.length };
  
  let filled = 0;
  for (const field of fieldsToCheck) {
    const value = obj[field];
    if (value !== null && value !== undefined && value !== '' && 
        !(Array.isArray(value) && value.length === 0)) {
      filled++;
    }
  }
  return { filled, total: fieldsToCheck.length };
}

// Key fields to check for cycle completeness
const CYCLE_FIELDS = [
  'goal', 'why', 'identity', 'target_feeling', 'focus_area',
  'signature_message', 'audience_target', 'audience_frustration',
  'biggest_bottleneck', 'biggest_fear', 'fear_response',
  'commitment_statement', 'accountability_person',
  'metric_1_name', 'metric_2_name', 'metric_3_name',
  'office_hours_days', 'office_hours_start', 'office_hours_end',
  'weekly_planning_day', 'weekly_debrief_day'
];

// Key fields to check for draft completeness
const DRAFT_FIELDS = [
  'goal', 'why', 'identity', 'target_feeling', 'focus_area',
  'signature_message', 'audience_target', 'audience_frustration',
  'biggest_bottleneck', 'biggest_fear', 'fear_response',
  'commitment_statement', 'accountability_person',
  'metric_1_name', 'metric_2_name', 'metric_3_name',
  'offers', 'revenue_goal', 'monthly_breakdown',
  'strategy', 'office_hours'
];

Deno.serve(async (req) => {
  console.log('EDGE FUNC: admin-student-lookup called');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Validate user
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    
    if (userError || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: 'Invalid authorization token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;

    // Use service role for all operations
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if user is admin
    const { data: adminCheck, error: adminError } = await supabaseClient
      .from('admin_users')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (adminError || !adminCheck) {
      return new Response(JSON.stringify({ error: 'Access denied. Admin only.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { email } = body;

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Looking up student:', email);

    // Find user by email
    const { data: usersData, error: usersError } = await supabaseClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (usersError) {
      throw usersError;
    }

    const targetUser = usersData.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!targetUser) {
      // Check if they have an entitlement even without an account
      const { data: entitlement } = await supabaseClient
        .from('entitlements')
        .select('*')
        .ilike('email', email)
        .maybeSingle();

      const result: StudentLookupResult = {
        found: false,
        user: null,
        profile: null,
        entitlement: entitlement ? {
          tier: entitlement.tier,
          status: entitlement.status,
          starts_at: entitlement.starts_at,
          ends_at: entitlement.ends_at,
        } : null,
        cycle: { exists: false, cycle_id: null, created_at: null, goal: null, fields_filled: 0, total_fields: CYCLE_FIELDS.length, data: null },
        draft: { exists: false, current_step: null, updated_at: null, fields_filled: 0, total_fields: DRAFT_FIELDS.length, data: null },
        strategy: { exists: false, count: 0 },
        offers: { exists: false, count: 0 },
        revenue_plan: { exists: false },
        month_plans: { exists: false, count: 0 },
        projects: { count: 0 },
        tasks: { count: 0 },
        habits: { count: 0 },
        daily_plans: { count: 0 },
        weekly_plans: { count: 0 },
        coaching_entries: { count: 0 },
      };

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const targetUserId = targetUser.id;
    console.log('Found user ID:', targetUserId);

    // Fetch all data in parallel
    const [
      profileResult,
      entitlementResult,
      cycleResult,
      draftResult,
      strategyResult,
      offersResult,
      revenuePlanResult,
      monthPlansResult,
      projectsResult,
      tasksResult,
      habitsResult,
      dailyPlansResult,
      weeklyPlansResult,
      coachingResult,
    ] = await Promise.all([
      supabaseClient.from('user_profiles').select('*').eq('id', targetUserId).maybeSingle(),
      supabaseClient.from('entitlements').select('*').ilike('email', email).maybeSingle(),
      supabaseClient.from('cycles_90_day').select('*').eq('user_id', targetUserId).order('created_at', { ascending: false }).limit(1),
      supabaseClient.from('cycle_drafts').select('*').eq('user_id', targetUserId).maybeSingle(),
      supabaseClient.from('cycle_strategy').select('id').eq('user_id', targetUserId),
      supabaseClient.from('cycle_offers').select('id').eq('user_id', targetUserId),
      supabaseClient.from('cycle_revenue_plan').select('id').eq('user_id', targetUserId).maybeSingle(),
      supabaseClient.from('cycle_month_plans').select('id').eq('user_id', targetUserId),
      supabaseClient.from('projects').select('id').eq('user_id', targetUserId),
      supabaseClient.from('tasks').select('task_id').eq('user_id', targetUserId),
      supabaseClient.from('habits').select('habit_id').eq('user_id', targetUserId),
      supabaseClient.from('daily_plans').select('day_id').eq('user_id', targetUserId),
      supabaseClient.from('weekly_plans').select('week_id').eq('user_id', targetUserId),
      supabaseClient.from('coaching_entries').select('id').eq('user_id', targetUserId),
    ]);

    // Process cycle data
    const cycleData = cycleResult.data?.[0] || null;
    const cycleFieldCounts = countFilledFields(cycleData, CYCLE_FIELDS);

    // Process draft data
    const draftData = draftResult.data?.draft_data || null;
    const draftFieldCounts = countFilledFields(draftData, DRAFT_FIELDS);

    const result: StudentLookupResult = {
      found: true,
      user: {
        id: targetUser.id,
        email: targetUser.email || '',
        created_at: targetUser.created_at,
        last_sign_in_at: targetUser.last_sign_in_at || null,
      },
      profile: profileResult.data ? {
        user_type: profileResult.data.user_type,
        trial_started_at: profileResult.data.trial_started_at,
        trial_expires_at: profileResult.data.trial_expires_at,
      } : null,
      entitlement: entitlementResult.data ? {
        tier: entitlementResult.data.tier,
        status: entitlementResult.data.status,
        starts_at: entitlementResult.data.starts_at,
        ends_at: entitlementResult.data.ends_at,
      } : null,
      cycle: {
        exists: !!cycleData,
        cycle_id: cycleData?.cycle_id || null,
        created_at: cycleData?.created_at || null,
        goal: cycleData?.goal || null,
        fields_filled: cycleFieldCounts.filled,
        total_fields: cycleFieldCounts.total,
        data: cycleData,
      },
      draft: {
        exists: !!draftResult.data,
        current_step: draftResult.data?.current_step || null,
        updated_at: draftResult.data?.updated_at || null,
        fields_filled: draftFieldCounts.filled,
        total_fields: draftFieldCounts.total,
        data: draftData,
      },
      strategy: {
        exists: (strategyResult.data?.length || 0) > 0,
        count: strategyResult.data?.length || 0,
      },
      offers: {
        exists: (offersResult.data?.length || 0) > 0,
        count: offersResult.data?.length || 0,
      },
      revenue_plan: {
        exists: !!revenuePlanResult.data,
      },
      month_plans: {
        exists: (monthPlansResult.data?.length || 0) > 0,
        count: monthPlansResult.data?.length || 0,
      },
      projects: { count: projectsResult.data?.length || 0 },
      tasks: { count: tasksResult.data?.length || 0 },
      habits: { count: habitsResult.data?.length || 0 },
      daily_plans: { count: dailyPlansResult.data?.length || 0 },
      weekly_plans: { count: weeklyPlansResult.data?.length || 0 },
      coaching_entries: { count: coachingResult.data?.length || 0 },
    };

    console.log('Student lookup complete:', {
      email,
      found: result.found,
      hasCycle: result.cycle.exists,
      hasDraft: result.draft.exists,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in admin-student-lookup:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
