import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
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
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const { action, page = 1, limit = 20, search = '', status = '' } = body;

    // Handle special actions
    if (action === 'weekly_progress') {
      return await getWeeklyProgress(supabase, userId, corsHeaders);
    }

    if (action === 'roi_due') {
      return await getROIDueCourses(supabase, userId, corsHeaders);
    }

    // Default: paginated list
    const offset = (page - 1) * limit;

    let query = supabase
      .from('courses')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`title.ilike.%${search}%,provider.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: courses, error: coursesError, count } = await query
      .range(offset, offset + limit - 1);

    if (coursesError) throw coursesError;

    // Get next session for each course
    const courseIds = courses?.map(c => c.id) || [];
    
    let nextSessions: Record<string, { date: string; title: string }> = {};
    
    if (courseIds.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: tasks } = await supabase
        .from('tasks')
        .select('course_id, scheduled_date, task_text')
        .in('course_id', courseIds)
        .eq('task_type', 'course_session')
        .gte('scheduled_date', today)
        .neq('status', 'done')
        .order('scheduled_date', { ascending: true });

      // Get first upcoming session per course
      if (tasks) {
        for (const task of tasks) {
          if (task.course_id && !nextSessions[task.course_id]) {
            nextSessions[task.course_id] = {
              date: task.scheduled_date,
              title: task.task_text,
            };
          }
        }
      }
    }

    const coursesWithSessions = courses?.map(course => ({
      ...course,
      next_session_date: nextSessions[course.id]?.date || null,
      next_session_title: nextSessions[course.id]?.title || null,
    })) || [];

    return new Response(
      JSON.stringify({
        courses: coursesWithSessions,
        total_count: count || 0,
        has_more: (count || 0) > offset + limit,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in get-courses:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getWeeklyProgress(supabase: any, userId: string, corsHeaders: any) {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

  const startStr = startOfWeek.toISOString().split('T')[0];
  const endStr = endOfWeek.toISOString().split('T')[0];

  // Get all active courses
  const { data: courses } = await supabase
    .from('courses')
    .select('id, title')
    .eq('user_id', userId)
    .in('status', ['in_progress', 'implementing']);

  if (!courses || courses.length === 0) {
    return new Response(
      JSON.stringify({ courses: [], total_planned: 0, total_completed: 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const courseIds = courses.map((c: any) => c.id);

  // Get study sessions for this week
  const { data: sessions } = await supabase
    .from('tasks')
    .select('course_id, status')
    .in('course_id', courseIds)
    .eq('task_type', 'course_session')
    .gte('scheduled_date', startStr)
    .lte('scheduled_date', endStr);

  // Aggregate by course
  const courseStats: Record<string, { planned: number; completed: number }> = {};
  
  for (const course of courses) {
    courseStats[course.id] = { planned: 0, completed: 0 };
  }

  for (const session of sessions || []) {
    if (session.course_id && courseStats[session.course_id]) {
      courseStats[session.course_id].planned++;
      if (session.status === 'done') {
        courseStats[session.course_id].completed++;
      }
    }
  }

  const result = courses.map((course: any) => ({
    id: course.id,
    title: course.title,
    planned: courseStats[course.id]?.planned || 0,
    completed: courseStats[course.id]?.completed || 0,
  }));

  const totalPlanned = result.reduce((sum: number, c: any) => sum + c.planned, 0);
  const totalCompleted = result.reduce((sum: number, c: any) => sum + c.completed, 0);

  return new Response(
    JSON.stringify({ 
      courses: result, 
      total_planned: totalPlanned, 
      total_completed: totalCompleted,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getROIDueCourses(supabase: any, userId: string, corsHeaders: any) {
  const today = new Date();
  const weekFromNow = new Date(today);
  weekFromNow.setDate(today.getDate() + 7);

  const todayStr = today.toISOString().split('T')[0];
  const weekStr = weekFromNow.toISOString().split('T')[0];

  // Get courses with ROI check-in due in next 7 days or overdue
  const { data: courses, error } = await supabase
    .from('courses')
    .select('*')
    .eq('user_id', userId)
    .not('roi_checkin_date', 'is', null)
    .lte('roi_checkin_date', weekStr)
    .in('status', ['in_progress', 'implementing', 'complete'])
    .order('roi_checkin_date', { ascending: true });

  if (error) throw error;

  return new Response(
    JSON.stringify({ courses: courses || [] }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
