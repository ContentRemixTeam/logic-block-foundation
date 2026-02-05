import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ColumnDefinition {
  name: string;
  color: string;
}

interface FieldDefinition {
  key: string;
  name: string;
  type: string;
  required: boolean;
  showOnCard: boolean;
  options?: string[];
}

interface BoardSettings {
  defaultView: 'kanban' | 'list';
  showProgressBar: boolean;
  showDueDate: boolean;
  showRevenue: boolean;
  compactCards: boolean;
  themeColor: string;
}

interface CreateBoardRequest {
  name: string;
  columns: ColumnDefinition[];
  fields: FieldDefinition[];
  settings: BoardSettings;
  saveAsTemplate: boolean;
  templateName?: string;
  useCase: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to get user ID
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    // Parse request body
    const body: CreateBoardRequest = await req.json();
    const { name, columns, fields, settings, saveAsTemplate, templateName, useCase } = body;

    // Validate input
    if (!name?.trim()) {
      return new Response(
        JSON.stringify({ success: false, message: 'Board name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!columns || columns.length < 2) {
      return new Response(
        JSON.stringify({ success: false, message: 'At least 2 columns are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let templateId: string | null = null;

    // Step 1: Optionally create template
    if (saveAsTemplate) {
      const { data: template, error: templateError } = await supabase
        .from('project_board_templates')
        .insert({
          user_id: userId,
          name: templateName || name,
          description: `Custom template for ${useCase}`,
          use_case: useCase,
          columns: columns,
          card_fields: fields,
          settings: settings,
          is_public: false,
        })
        .select('id')
        .single();

      if (templateError) {
        console.error('Error creating template:', templateError);
        // Don't fail the whole operation if template creation fails
      } else {
        templateId = template.id;
      }
    }

    // Step 2: Create the board
    const { data: board, error: boardError } = await supabase
      .from('project_boards')
      .insert({
        user_id: userId,
        name: name.trim(),
        is_default: false,
        template_id: templateId,
        card_fields: fields,
        settings: settings,
      })
      .select('id')
      .single();

    if (boardError) {
      console.error('Error creating board:', boardError);
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to create board' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const boardId = board.id;

    // Step 3: Create columns
    const columnsToInsert = columns.map((col, idx) => ({
      board_id: boardId,
      user_id: userId,
      name: col.name,
      color: col.color,
      sort_order: idx,
    }));

    const { error: columnsError } = await supabase
      .from('project_columns')
      .insert(columnsToInsert);

    if (columnsError) {
      console.error('Error creating columns:', columnsError);
      // Clean up the board if columns failed
      await supabase.from('project_boards').delete().eq('id', boardId);
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to create columns' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Create custom field definitions
    if (fields && fields.length > 0) {
      const fieldsToInsert = fields.map((field, idx) => ({
        board_id: boardId,
        user_id: userId,
        field_name: field.name,
        field_key: field.key,
        field_type: field.type,
        options: field.options || null,
        sort_order: idx,
        is_required: field.required,
        show_on_card: field.showOnCard,
      }));

      const { error: fieldsError } = await supabase
        .from('project_card_fields')
        .insert(fieldsToInsert);

      if (fieldsError) {
        console.error('Error creating fields:', fieldsError);
        // Don't fail the whole operation if field creation fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        board_id: boardId,
        template_id: templateId,
        message: 'Board created successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-custom-board:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
