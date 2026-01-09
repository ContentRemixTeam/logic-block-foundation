import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  console.log('EDGE FUNC: admin-get-data called');

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
    const { action, limit = 100 } = body;

    let result: any = {};

    switch (action) {
      case 'get_users': {
        // Get all users from auth.users
        const { data: users, error } = await supabaseClient.auth.admin.listUsers({
          page: 1,
          perPage: limit,
        });
        
        if (error) throw error;
        
        // Get admin status for each user
        const { data: admins } = await supabaseClient
          .from('admin_users')
          .select('user_id');
        
        const adminUserIds = new Set((admins || []).map(a => a.user_id));
        
        result = {
          users: users.users.map(u => ({
            id: u.id,
            email: u.email,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
            is_admin: adminUserIds.has(u.id),
          })),
        };
        break;
      }

      case 'get_error_logs': {
        const { data: logs, error } = await supabaseClient
          .from('error_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (error) throw error;
        result = { error_logs: logs };
        break;
      }

      case 'get_issue_reports': {
        const { data: reports, error } = await supabaseClient
          .from('issue_reports')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (error) throw error;
        result = { issue_reports: reports };
        break;
      }

      case 'get_feature_requests': {
        const { data: requests, error } = await supabaseClient
          .from('feature_requests')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (error) throw error;
        result = { feature_requests: requests };
        break;
      }

      case 'delete_user': {
        const { target_user_id } = body;
        if (!target_user_id) {
          return new Response(JSON.stringify({ error: 'target_user_id required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Prevent self-deletion
        if (target_user_id === userId) {
          return new Response(JSON.stringify({ error: 'Cannot delete yourself' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error } = await supabaseClient.auth.admin.deleteUser(target_user_id);
        if (error) throw error;
        
        result = { success: true, message: 'User deleted' };
        break;
      }

      case 'add_admin': {
        const { target_user_id } = body;
        if (!target_user_id) {
          return new Response(JSON.stringify({ error: 'target_user_id required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error } = await supabaseClient
          .from('admin_users')
          .insert({ user_id: target_user_id, created_by: userId });
        
        if (error) throw error;
        result = { success: true, message: 'Admin added' };
        break;
      }

      case 'remove_admin': {
        const { target_user_id } = body;
        if (!target_user_id) {
          return new Response(JSON.stringify({ error: 'target_user_id required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Prevent removing self
        if (target_user_id === userId) {
          return new Response(JSON.stringify({ error: 'Cannot remove yourself as admin' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error } = await supabaseClient
          .from('admin_users')
          .delete()
          .eq('user_id', target_user_id);
        
        if (error) throw error;
        result = { success: true, message: 'Admin removed' };
        break;
      }

      case 'create_user': {
        const { email, password } = body;
        if (!email || !password) {
          return new Response(JSON.stringify({ error: 'email and password required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data, error } = await supabaseClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        
        if (error) throw error;
        result = { success: true, user: { id: data.user.id, email: data.user.email } };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in admin-get-data:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});