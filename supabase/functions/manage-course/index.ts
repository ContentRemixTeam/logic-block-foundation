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
    const { action, course_id, ...data } = body;

    switch (action) {
      case 'create': {
        // Compute roi_checkin_date if start_date provided
        let roiCheckinDate = null;
        if (data.start_date && data.roi_checkin_days) {
          const startDate = new Date(data.start_date);
          startDate.setDate(startDate.getDate() + (data.roi_checkin_days || 30));
          roiCheckinDate = startDate.toISOString().split('T')[0];
        }

        // Calculate payment amount if payment plan
        let paymentPlanAmount = null;
        if (data.cost && data.payment_plan_type === 'monthly' && data.payment_plan_payments) {
          paymentPlanAmount = data.cost / data.payment_plan_payments;
        }

        const { data: course, error } = await supabase
          .from('courses')
          .insert({
            user_id: userId,
            title: data.title,
            provider: data.provider || null,
            course_url: data.course_url || null,
            purchase_date: data.purchase_date || null,
            intention: data.intention || null,
            roi_type: data.roi_type || null,
            roi_target: data.roi_target || null,
            success_criteria: data.success_criteria || null,
            start_date: data.start_date || null,
            target_finish_date: data.target_finish_date || null,
            roi_checkin_days: data.roi_checkin_days || 30,
            roi_checkin_date: roiCheckinDate,
            // Investment fields
            cost: data.cost || null,
            cost_currency: data.cost_currency || 'USD',
            payment_plan_type: data.payment_plan_type || null,
            payment_plan_payments: data.payment_plan_payments || null,
            payment_plan_amount: paymentPlanAmount,
            add_to_expenses: data.add_to_expenses || false,
            // Check-in fields
            checkin_frequency: data.checkin_frequency || null,
            roi_deadline: data.roi_deadline || null,
          })
          .select()
          .single();

        if (error) throw error;

        // Create expense transactions if requested
        if (data.add_to_expenses && data.cost) {
          const baseDate = data.purchase_date ? new Date(data.purchase_date) : new Date();
          
          if (data.payment_plan_type === 'monthly' && data.payment_plan_payments) {
            // Create multiple transactions for payment plan
            const transactions = [];
            for (let i = 0; i < data.payment_plan_payments; i++) {
              const paymentDate = new Date(baseDate);
              paymentDate.setMonth(paymentDate.getMonth() + i);
              
              transactions.push({
                user_id: userId,
                type: 'expense',
                category: 'Education',
                amount: paymentPlanAmount,
                date: paymentDate.toISOString().split('T')[0],
                description: `Course: ${data.title} (Payment ${i + 1}/${data.payment_plan_payments})`,
                notes: data.provider ? `Provider: ${data.provider}` : null,
              });
            }
            
            const { error: txError } = await supabase
              .from('financial_transactions')
              .insert(transactions);
            
            if (txError) {
              console.error('Failed to create expense transactions:', txError);
            }
          } else {
            // Create single transaction
            const { error: txError } = await supabase
              .from('financial_transactions')
              .insert({
                user_id: userId,
                type: 'expense',
                category: 'Education',
                amount: data.cost,
                date: baseDate.toISOString().split('T')[0],
                description: `Course: ${data.title}`,
                notes: data.provider ? `Provider: ${data.provider}` : null,
              });
            
            if (txError) {
              console.error('Failed to create expense transaction:', txError);
            }
          }
        }

        // Create check-in task if frequency is set
        if (data.checkin_frequency && course.id) {
          const taskStartDate = data.start_date || new Date().toISOString().split('T')[0];
          
          const { error: taskError } = await supabase
            .from('tasks')
            .insert({
              user_id: userId,
              task_text: `Check-in: ${data.title} - Am I on track?`,
              course_id: course.id,
              task_type: 'course_checkin',
              recurrence_pattern: data.checkin_frequency,
              scheduled_date: taskStartDate,
              is_recurring_parent: true,
              status: 'scheduled',
              source: 'course_checkin',
            });
          
          if (taskError) {
            console.error('Failed to create check-in task:', taskError);
          }
        }

        return new Response(
          JSON.stringify({ course }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        if (!course_id) {
          return new Response(JSON.stringify({ error: 'course_id required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Verify ownership and get existing data for computing derived fields
        const { data: existing } = await supabase
          .from('courses')
          .select('id, start_date, roi_checkin_days, cost, payment_plan_payments')
          .eq('id', course_id)
          .eq('user_id', userId)
          .single();

        if (!existing) {
          return new Response(JSON.stringify({ error: 'Course not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Build update object
        const updates: Record<string, any> = {};
        
        const allowedFields = [
          'title', 'provider', 'course_url', 'purchase_date', 'status',
          'intention', 'roi_type', 'roi_target', 'success_criteria',
          'start_date', 'target_finish_date', 'roi_checkin_days',
          'progress_percent', 'notes',
          // Investment fields
          'cost', 'cost_currency', 'payment_plan_type', 'payment_plan_payments',
          'add_to_expenses',
          // Check-in fields
          'checkin_frequency', 'roi_deadline'
        ];

        for (const field of allowedFields) {
          if (data[field] !== undefined) {
            updates[field] = data[field];
          }
        }

        // Calculate payment amount if cost and payment plan changed
        if (updates.cost !== undefined || updates.payment_plan_payments !== undefined) {
          const finalCost = updates.cost ?? existing.cost;
          const finalPayments = updates.payment_plan_payments ?? existing.payment_plan_payments;
          if (finalCost && finalPayments) {
            updates.payment_plan_amount = finalCost / finalPayments;
          }
        }

        // Recompute roi_checkin_date if start_date or roi_checkin_days changed
        const finalStartDate = updates.start_date ?? existing.start_date;
        const finalCheckinDays = updates.roi_checkin_days ?? existing.roi_checkin_days;
        
        if (finalStartDate) {
          const startDate = new Date(finalStartDate);
          startDate.setDate(startDate.getDate() + finalCheckinDays);
          updates.roi_checkin_date = startDate.toISOString().split('T')[0];
        } else {
          updates.roi_checkin_date = null;
        }

        const { data: course, error } = await supabase
          .from('courses')
          .update(updates)
          .eq('id', course_id)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ course }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        if (!course_id) {
          return new Response(JSON.stringify({ error: 'course_id required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error } = await supabase
          .from('courses')
          .delete()
          .eq('id', course_id)
          .eq('user_id', userId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get': {
        if (!course_id) {
          return new Response(JSON.stringify({ error: 'course_id required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: course, error } = await supabase
          .from('courses')
          .select('*')
          .eq('id', course_id)
          .eq('user_id', userId)
          .single();

        if (error) throw error;

        // Get study plan
        const { data: studyPlan } = await supabase
          .from('course_study_plans')
          .select('*')
          .eq('course_id', course_id)
          .eq('user_id', userId)
          .maybeSingle();

        // Get next session
        const today = new Date().toISOString().split('T')[0];
        const { data: nextSession } = await supabase
          .from('tasks')
          .select('scheduled_date, task_text')
          .eq('course_id', course_id)
          .eq('task_type', 'course_session')
          .gte('scheduled_date', today)
          .neq('status', 'done')
          .order('scheduled_date', { ascending: true })
          .limit(1)
          .maybeSingle();

        return new Response(
          JSON.stringify({
            course: {
              ...course,
              study_plan: studyPlan,
              next_session_date: nextSession?.scheduled_date || null,
              next_session_title: nextSession?.task_text || null,
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error: any) {
    console.error('Error in manage-course:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
