import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// User-friendly error messages
const ERROR_MESSAGES = {
  NO_AUTH: { code: 'AUTH_REQUIRED', message: 'Please log in to continue.' },
  INVALID_TOKEN: { code: 'SESSION_EXPIRED', message: 'Your session has expired. Please refresh the page.' },
  SOP_ID_REQUIRED: { code: 'VALIDATION_ERROR', message: 'SOP ID is required.' },
  SOP_IN_USE: (count: number) => ({ 
    code: 'SOP_IN_USE', 
    message: `This SOP is attached to ${count} task${count > 1 ? 's' : ''}. Please remove the SOP from those tasks first.` 
  }),
  SERVER_ERROR: { code: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' },
};

function errorResponse(error: { code: string; message: string }, status: number, technical?: string) {
  console.error(`[delete-sop] ${error.code}: ${technical || error.message}`);
  return new Response(
    JSON.stringify({ error: error.message, code: error.code, technical }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[delete-sop] Called');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse(ERROR_MESSAGES.NO_AUTH, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return errorResponse(ERROR_MESSAGES.INVALID_TOKEN, 401);
    }

    const { sop_id } = await req.json();

    if (!sop_id) {
      return errorResponse(ERROR_MESSAGES.SOP_ID_REQUIRED, 400);
    }

    console.log('[delete-sop] Deleting SOP:', sop_id, 'for user:', user.id);

    // Check if SOP is attached to any tasks
    const { count: taskCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('sop_id', sop_id)
      .eq('user_id', user.id);

    if (taskCount && taskCount > 0) {
      return errorResponse(ERROR_MESSAGES.SOP_IN_USE(taskCount), 400);
    }

    const { error: deleteError } = await supabase
      .from('sops')
      .delete()
      .eq('sop_id', sop_id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('[delete-sop] Error deleting SOP:', deleteError);
      return errorResponse(ERROR_MESSAGES.SERVER_ERROR, 500, deleteError.message);
    }

    console.log('[delete-sop] SOP deleted successfully:', sop_id);

    return new Response(
      JSON.stringify({ success: true, message: 'SOP deleted successfully.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[delete-sop] Unexpected error:', error);
    return errorResponse(ERROR_MESSAGES.SERVER_ERROR, 500, error?.message);
  }
});
