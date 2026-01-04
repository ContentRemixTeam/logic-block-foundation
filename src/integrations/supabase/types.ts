export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      belief_evidence_logs: {
        Row: {
          belief_id: string
          created_at: string | null
          date: string
          evidence: string
          log_id: string
          user_id: string
        }
        Insert: {
          belief_id: string
          created_at?: string | null
          date?: string
          evidence: string
          log_id?: string
          user_id: string
        }
        Update: {
          belief_id?: string
          created_at?: string | null
          date?: string
          evidence?: string
          log_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "belief_evidence_logs_belief_id_fkey"
            columns: ["belief_id"]
            isOneToOne: false
            referencedRelation: "beliefs"
            referencedColumns: ["belief_id"]
          },
        ]
      }
      beliefs: {
        Row: {
          action_commitments: Json | null
          belief_id: string
          confidence_score: number | null
          created_at: string | null
          evidence_for_new_belief: Json | null
          limiting_belief: string
          updated_at: string | null
          upgraded_belief: string
          user_id: string
        }
        Insert: {
          action_commitments?: Json | null
          belief_id?: string
          confidence_score?: number | null
          created_at?: string | null
          evidence_for_new_belief?: Json | null
          limiting_belief: string
          updated_at?: string | null
          upgraded_belief: string
          user_id: string
        }
        Update: {
          action_commitments?: Json | null
          belief_id?: string
          confidence_score?: number | null
          created_at?: string | null
          evidence_for_new_belief?: Json | null
          limiting_belief?: string
          updated_at?: string | null
          upgraded_belief?: string
          user_id?: string
        }
        Relationships: []
      }
      ctfar: {
        Row: {
          action: string | null
          circumstance: string | null
          created_at: string | null
          cycle_id: string | null
          date: string
          feeling: string | null
          model_id: string
          result: string | null
          tags: Json | null
          thought: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action?: string | null
          circumstance?: string | null
          created_at?: string | null
          cycle_id?: string | null
          date: string
          feeling?: string | null
          model_id?: string
          result?: string | null
          tags?: Json | null
          thought?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action?: string | null
          circumstance?: string | null
          created_at?: string | null
          cycle_id?: string | null
          date?: string
          feeling?: string | null
          model_id?: string
          result?: string | null
          tags?: Json | null
          thought?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ctfar_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles_90_day"
            referencedColumns: ["cycle_id"]
          },
        ]
      }
      cycles_90_day: {
        Row: {
          convert_score: number | null
          created_at: string | null
          cycle_id: string
          discover_score: number | null
          end_date: string
          focus_area: string | null
          goal: string
          identity: string | null
          metric_1_name: string | null
          metric_1_start: number | null
          metric_2_name: string | null
          metric_2_start: number | null
          metric_3_name: string | null
          metric_3_start: number | null
          nurture_score: number | null
          start_date: string
          supporting_projects: Json | null
          target_feeling: string | null
          things_to_remember: Json | null
          updated_at: string | null
          user_id: string
          why: string | null
        }
        Insert: {
          convert_score?: number | null
          created_at?: string | null
          cycle_id?: string
          discover_score?: number | null
          end_date: string
          focus_area?: string | null
          goal: string
          identity?: string | null
          metric_1_name?: string | null
          metric_1_start?: number | null
          metric_2_name?: string | null
          metric_2_start?: number | null
          metric_3_name?: string | null
          metric_3_start?: number | null
          nurture_score?: number | null
          start_date: string
          supporting_projects?: Json | null
          target_feeling?: string | null
          things_to_remember?: Json | null
          updated_at?: string | null
          user_id: string
          why?: string | null
        }
        Update: {
          convert_score?: number | null
          created_at?: string | null
          cycle_id?: string
          discover_score?: number | null
          end_date?: string
          focus_area?: string | null
          goal?: string
          identity?: string | null
          metric_1_name?: string | null
          metric_1_start?: number | null
          metric_2_name?: string | null
          metric_2_start?: number | null
          metric_3_name?: string | null
          metric_3_start?: number | null
          nurture_score?: number | null
          start_date?: string
          supporting_projects?: Json | null
          target_feeling?: string | null
          things_to_remember?: Json | null
          updated_at?: string | null
          user_id?: string
          why?: string | null
        }
        Relationships: []
      }
      daily_plans: {
        Row: {
          created_at: string | null
          custom_reflections: Json | null
          cycle_id: string | null
          daily_wins: Json | null
          date: string
          day_id: string
          deep_mode_notes: Json | null
          feeling: string | null
          made_offer: boolean | null
          one_thing: string | null
          scratch_pad_content: string | null
          scratch_pad_processed_at: string | null
          scratch_pad_title: string | null
          selected_weekly_priorities: Json | null
          thought: string | null
          top_3_today: Json | null
          updated_at: string | null
          user_id: string
          week_id: string | null
        }
        Insert: {
          created_at?: string | null
          custom_reflections?: Json | null
          cycle_id?: string | null
          daily_wins?: Json | null
          date: string
          day_id?: string
          deep_mode_notes?: Json | null
          feeling?: string | null
          made_offer?: boolean | null
          one_thing?: string | null
          scratch_pad_content?: string | null
          scratch_pad_processed_at?: string | null
          scratch_pad_title?: string | null
          selected_weekly_priorities?: Json | null
          thought?: string | null
          top_3_today?: Json | null
          updated_at?: string | null
          user_id: string
          week_id?: string | null
        }
        Update: {
          created_at?: string | null
          custom_reflections?: Json | null
          cycle_id?: string | null
          daily_wins?: Json | null
          date?: string
          day_id?: string
          deep_mode_notes?: Json | null
          feeling?: string | null
          made_offer?: boolean | null
          one_thing?: string | null
          scratch_pad_content?: string | null
          scratch_pad_processed_at?: string | null
          scratch_pad_title?: string | null
          selected_weekly_priorities?: Json | null
          thought?: string | null
          top_3_today?: Json | null
          updated_at?: string | null
          user_id?: string
          week_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_plans_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles_90_day"
            referencedColumns: ["cycle_id"]
          },
          {
            foreignKeyName: "daily_plans_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weekly_plans"
            referencedColumns: ["week_id"]
          },
        ]
      }
      daily_reviews: {
        Row: {
          created_at: string | null
          day_id: string | null
          reflections: Json | null
          review_id: string
          updated_at: string | null
          user_id: string
          what_didnt: string | null
          what_worked: string | null
          wins: string | null
        }
        Insert: {
          created_at?: string | null
          day_id?: string | null
          reflections?: Json | null
          review_id?: string
          updated_at?: string | null
          user_id: string
          what_didnt?: string | null
          what_worked?: string | null
          wins?: string | null
        }
        Update: {
          created_at?: string | null
          day_id?: string | null
          reflections?: Json | null
          review_id?: string
          updated_at?: string | null
          user_id?: string
          what_didnt?: string | null
          what_worked?: string | null
          wins?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_reviews_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "daily_plans"
            referencedColumns: ["day_id"]
          },
        ]
      }
      event_sync_mapping: {
        Row: {
          app_block_id: string
          created_at: string | null
          google_etag: string | null
          google_event_id: string
          id: string
          last_synced_at: string | null
          sync_direction: string | null
          user_id: string
        }
        Insert: {
          app_block_id: string
          created_at?: string | null
          google_etag?: string | null
          google_event_id: string
          id?: string
          last_synced_at?: string | null
          sync_direction?: string | null
          user_id: string
        }
        Update: {
          app_block_id?: string
          created_at?: string | null
          google_etag?: string | null
          google_event_id?: string
          id?: string
          last_synced_at?: string | null
          sync_direction?: string | null
          user_id?: string
        }
        Relationships: []
      }
      feature_requests: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          priority: string
          screenshot_url: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          id?: string
          priority?: string
          screenshot_url?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          priority?: string
          screenshot_url?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_calendar_connection: {
        Row: {
          access_token_encrypted: string
          created_at: string | null
          google_user_id: string
          is_active: boolean | null
          refresh_token_encrypted: string
          selected_calendar_id: string | null
          selected_calendar_name: string | null
          token_expiry: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token_encrypted: string
          created_at?: string | null
          google_user_id: string
          is_active?: boolean | null
          refresh_token_encrypted: string
          selected_calendar_id?: string | null
          selected_calendar_name?: string | null
          token_expiry: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token_encrypted?: string
          created_at?: string | null
          google_user_id?: string
          is_active?: boolean | null
          refresh_token_encrypted?: string
          selected_calendar_id?: string | null
          selected_calendar_name?: string | null
          token_expiry?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      google_sync_state: {
        Row: {
          calendar_id: string
          last_error_message: string | null
          last_full_sync_at: string | null
          last_incremental_sync_at: string | null
          sync_status: string | null
          sync_token: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          calendar_id: string
          last_error_message?: string | null
          last_full_sync_at?: string | null
          last_incremental_sync_at?: string | null
          sync_status?: string | null
          sync_token?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          calendar_id?: string
          last_error_message?: string | null
          last_full_sync_at?: string | null
          last_incremental_sync_at?: string | null
          sync_status?: string | null
          sync_token?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          completed: boolean | null
          created_at: string | null
          cycle_id: string | null
          date: string
          day_id: string | null
          habit_id: string
          log_id: string
          user_id: string
          week_id: string | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          cycle_id?: string | null
          date: string
          day_id?: string | null
          habit_id: string
          log_id?: string
          user_id: string
          week_id?: string | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          cycle_id?: string | null
          date?: string
          day_id?: string | null
          habit_id?: string
          log_id?: string
          user_id?: string
          week_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles_90_day"
            referencedColumns: ["cycle_id"]
          },
          {
            foreignKeyName: "habit_logs_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "daily_plans"
            referencedColumns: ["day_id"]
          },
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["habit_id"]
          },
          {
            foreignKeyName: "habit_logs_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weekly_plans"
            referencedColumns: ["week_id"]
          },
        ]
      }
      habits: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          habit_id: string
          habit_name: string
          is_active: boolean | null
          is_archived: boolean | null
          success_definition: string | null
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          habit_id?: string
          habit_name: string
          is_active?: boolean | null
          is_archived?: boolean | null
          success_definition?: string | null
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          habit_id?: string
          habit_name?: string
          is_active?: boolean | null
          is_archived?: boolean | null
          success_definition?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ideas: {
        Row: {
          category_id: string | null
          content: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideas_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ideas_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas_categories: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      ideas_db: {
        Row: {
          category: string | null
          created_at: string | null
          date_added: string | null
          idea: string
          idea_id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          date_added?: string | null
          idea: string
          idea_id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          date_added?: string | null
          idea?: string
          idea_id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      identity_anchors: {
        Row: {
          created_at: string | null
          id: string
          identity_statement: string
          supporting_actions: Json | null
          supporting_habits: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          identity_statement: string
          supporting_actions?: Json | null
          supporting_habits?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          identity_statement?: string
          supporting_actions?: Json | null
          supporting_habits?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      issue_reports: {
        Row: {
          browser_info: string | null
          created_at: string
          device_info: string | null
          id: string
          page_section: string
          screenshot_url: string | null
          severity: string
          status: string
          ticket_number: string
          title: string
          updated_at: string
          user_id: string
          what_happened: string
          what_trying_to_do: string
        }
        Insert: {
          browser_info?: string | null
          created_at?: string
          device_info?: string | null
          id?: string
          page_section: string
          screenshot_url?: string | null
          severity?: string
          status?: string
          ticket_number: string
          title: string
          updated_at?: string
          user_id: string
          what_happened: string
          what_trying_to_do: string
        }
        Update: {
          browser_info?: string | null
          created_at?: string
          device_info?: string | null
          id?: string
          page_section?: string
          screenshot_url?: string | null
          severity?: string
          status?: string
          ticket_number?: string
          title?: string
          updated_at?: string
          user_id?: string
          what_happened?: string
          what_trying_to_do?: string
        }
        Relationships: []
      }
      journal_pages: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          is_archived: boolean | null
          tags: Json | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          tags?: Json | null
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          tags?: Json | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mindset_categories: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_reviews: {
        Row: {
          adjustments: Json | null
          created_at: string | null
          custom_reflections: Json | null
          cycle_id: string | null
          habit_trends: Json | null
          month: number
          review_id: string
          thought_patterns: Json | null
          updated_at: string | null
          user_id: string
          wins: string | null
        }
        Insert: {
          adjustments?: Json | null
          created_at?: string | null
          custom_reflections?: Json | null
          cycle_id?: string | null
          habit_trends?: Json | null
          month: number
          review_id?: string
          thought_patterns?: Json | null
          updated_at?: string | null
          user_id: string
          wins?: string | null
        }
        Update: {
          adjustments?: Json | null
          created_at?: string | null
          custom_reflections?: Json | null
          cycle_id?: string | null
          habit_trends?: Json | null
          month?: number
          review_id?: string
          thought_patterns?: Json | null
          updated_at?: string | null
          user_id?: string
          wins?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_reviews_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles_90_day"
            referencedColumns: ["cycle_id"]
          },
        ]
      }
      reminders: {
        Row: {
          active: boolean | null
          created_at: string | null
          delivery_method: string
          last_sent: string | null
          reminder_id: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          delivery_method: string
          last_sent?: string | null
          reminder_id?: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          delivery_method?: string
          last_sent?: string | null
          reminder_id?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sops: {
        Row: {
          checklist_items: Json | null
          created_at: string | null
          description: string | null
          links: Json | null
          notes: string | null
          sop_id: string
          sop_name: string
          times_used: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          checklist_items?: Json | null
          created_at?: string | null
          description?: string | null
          links?: Json | null
          notes?: string | null
          sop_id?: string
          sop_name: string
          times_used?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          checklist_items?: Json | null
          created_at?: string | null
          description?: string | null
          links?: Json | null
          notes?: string | null
          sop_id?: string
          sop_name?: string
          times_used?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      task_settings: {
        Row: {
          created_at: string | null
          daily_capacity_minutes: number | null
          default_task_duration: number | null
          enable_sounds: boolean | null
          enable_time_tracking: boolean | null
          id: string
          preferred_view: string | null
          show_completed_tasks: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          daily_capacity_minutes?: number | null
          default_task_duration?: number | null
          enable_sounds?: boolean | null
          enable_time_tracking?: boolean | null
          id?: string
          preferred_view?: string | null
          show_completed_tasks?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          daily_capacity_minutes?: number | null
          default_task_duration?: number | null
          enable_sounds?: boolean | null
          enable_time_tracking?: boolean | null
          id?: string
          preferred_view?: string | null
          show_completed_tasks?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          actual_minutes: number | null
          checklist_progress: Json | null
          completed_at: string | null
          context_tags: string[] | null
          created_at: string | null
          daily_plan_id: string | null
          energy_level: string | null
          estimated_minutes: number | null
          goal_id: string | null
          is_completed: boolean | null
          is_recurring_parent: boolean | null
          notes: string | null
          parent_task_id: string | null
          position_in_column: number | null
          priority: string | null
          priority_order: number | null
          recurrence_days: Json | null
          recurrence_pattern: string | null
          scheduled_date: string | null
          sop_id: string | null
          source: string | null
          status: string | null
          subtasks: Json | null
          tags: Json | null
          task_description: string | null
          task_id: string
          task_text: string
          time_block_end: string | null
          time_block_start: string | null
          user_id: string
          waiting_on: string | null
        }
        Insert: {
          actual_minutes?: number | null
          checklist_progress?: Json | null
          completed_at?: string | null
          context_tags?: string[] | null
          created_at?: string | null
          daily_plan_id?: string | null
          energy_level?: string | null
          estimated_minutes?: number | null
          goal_id?: string | null
          is_completed?: boolean | null
          is_recurring_parent?: boolean | null
          notes?: string | null
          parent_task_id?: string | null
          position_in_column?: number | null
          priority?: string | null
          priority_order?: number | null
          recurrence_days?: Json | null
          recurrence_pattern?: string | null
          scheduled_date?: string | null
          sop_id?: string | null
          source?: string | null
          status?: string | null
          subtasks?: Json | null
          tags?: Json | null
          task_description?: string | null
          task_id?: string
          task_text: string
          time_block_end?: string | null
          time_block_start?: string | null
          user_id: string
          waiting_on?: string | null
        }
        Update: {
          actual_minutes?: number | null
          checklist_progress?: Json | null
          completed_at?: string | null
          context_tags?: string[] | null
          created_at?: string | null
          daily_plan_id?: string | null
          energy_level?: string | null
          estimated_minutes?: number | null
          goal_id?: string | null
          is_completed?: boolean | null
          is_recurring_parent?: boolean | null
          notes?: string | null
          parent_task_id?: string | null
          position_in_column?: number | null
          priority?: string | null
          priority_order?: number | null
          recurrence_days?: Json | null
          recurrence_pattern?: string | null
          scheduled_date?: string | null
          sop_id?: string | null
          source?: string | null
          status?: string | null
          subtasks?: Json | null
          tags?: Json | null
          task_description?: string | null
          task_id?: string
          task_text?: string
          time_block_end?: string | null
          time_block_start?: string | null
          user_id?: string
          waiting_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_daily_plan_id_fkey"
            columns: ["daily_plan_id"]
            isOneToOne: false
            referencedRelation: "daily_plans"
            referencedColumns: ["day_id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "tasks_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "sops"
            referencedColumns: ["sop_id"]
          },
        ]
      }
      useful_thoughts: {
        Row: {
          category_id: string | null
          created_at: string | null
          id: string
          is_favorite: boolean | null
          text: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          text: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "useful_thoughts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "mindset_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          ai_api_key: string | null
          created_at: string | null
          cycle_summary_questions: Json | null
          daily_anchor_enabled: boolean | null
          daily_review_questions: Json | null
          habit_categories_enabled: boolean | null
          minimal_mode: boolean | null
          monthly_review_questions: Json | null
          quick_mode_default: boolean | null
          reminder_preferences: Json | null
          scratch_pad_review_mode: string | null
          show_income_tracker: boolean | null
          theme_preference: string | null
          updated_at: string | null
          user_id: string
          weekly_review_questions: Json | null
        }
        Insert: {
          ai_api_key?: string | null
          created_at?: string | null
          cycle_summary_questions?: Json | null
          daily_anchor_enabled?: boolean | null
          daily_review_questions?: Json | null
          habit_categories_enabled?: boolean | null
          minimal_mode?: boolean | null
          monthly_review_questions?: Json | null
          quick_mode_default?: boolean | null
          reminder_preferences?: Json | null
          scratch_pad_review_mode?: string | null
          show_income_tracker?: boolean | null
          theme_preference?: string | null
          updated_at?: string | null
          user_id: string
          weekly_review_questions?: Json | null
        }
        Update: {
          ai_api_key?: string | null
          created_at?: string | null
          cycle_summary_questions?: Json | null
          daily_anchor_enabled?: boolean | null
          daily_review_questions?: Json | null
          habit_categories_enabled?: boolean | null
          minimal_mode?: boolean | null
          monthly_review_questions?: Json | null
          quick_mode_default?: boolean | null
          reminder_preferences?: Json | null
          scratch_pad_review_mode?: string | null
          show_income_tracker?: boolean | null
          theme_preference?: string | null
          updated_at?: string | null
          user_id?: string
          weekly_review_questions?: Json | null
        }
        Relationships: []
      }
      weekly_plans: {
        Row: {
          adjustments: string | null
          challenges: string | null
          created_at: string | null
          cycle_id: string
          metric_1_target: number | null
          metric_2_target: number | null
          metric_3_target: number | null
          start_of_week: string
          top_3_priorities: Json | null
          updated_at: string | null
          user_id: string
          week_id: string
          weekly_feeling: string | null
          weekly_thought: string | null
        }
        Insert: {
          adjustments?: string | null
          challenges?: string | null
          created_at?: string | null
          cycle_id: string
          metric_1_target?: number | null
          metric_2_target?: number | null
          metric_3_target?: number | null
          start_of_week: string
          top_3_priorities?: Json | null
          updated_at?: string | null
          user_id: string
          week_id?: string
          weekly_feeling?: string | null
          weekly_thought?: string | null
        }
        Update: {
          adjustments?: string | null
          challenges?: string | null
          created_at?: string | null
          cycle_id?: string
          metric_1_target?: number | null
          metric_2_target?: number | null
          metric_3_target?: number | null
          start_of_week?: string
          top_3_priorities?: Json | null
          updated_at?: string | null
          user_id?: string
          week_id?: string
          weekly_feeling?: string | null
          weekly_thought?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_plans_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles_90_day"
            referencedColumns: ["cycle_id"]
          },
        ]
      }
      weekly_reviews: {
        Row: {
          adjustments: string | null
          challenges: string | null
          created_at: string | null
          custom_reflections: Json | null
          habit_summary: Json | null
          metric_1_actual: number | null
          metric_2_actual: number | null
          metric_3_actual: number | null
          review_id: string
          share_to_community: boolean | null
          updated_at: string | null
          user_id: string
          week_id: string | null
          wins: string | null
        }
        Insert: {
          adjustments?: string | null
          challenges?: string | null
          created_at?: string | null
          custom_reflections?: Json | null
          habit_summary?: Json | null
          metric_1_actual?: number | null
          metric_2_actual?: number | null
          metric_3_actual?: number | null
          review_id?: string
          share_to_community?: boolean | null
          updated_at?: string | null
          user_id: string
          week_id?: string | null
          wins?: string | null
        }
        Update: {
          adjustments?: string | null
          challenges?: string | null
          created_at?: string | null
          custom_reflections?: Json | null
          habit_summary?: Json | null
          metric_1_actual?: number | null
          metric_2_actual?: number | null
          metric_3_actual?: number | null
          review_id?: string
          share_to_community?: boolean | null
          updated_at?: string | null
          user_id?: string
          week_id?: string | null
          wins?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_reviews_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weekly_plans"
            referencedColumns: ["week_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_daily_plan: {
        Args: {
          p_date: string
          p_feeling: string
          p_selected_weekly_priorities?: Json
          p_thought: string
          p_top_3_today: Json
          p_user_id: string
        }
        Returns: string
      }
      evaluate_habit_color: {
        Args: { p_date: string; p_user_id: string }
        Returns: string
      }
      get_current_cycle: {
        Args: { p_today?: string; p_user_id: string }
        Returns: {
          cycle_id: string
          days_remaining: number
          end_date: string
          goal: string
          identity: string
          start_date: string
          target_feeling: string
          why: string
        }[]
      }
      get_current_week: {
        Args: { p_cycle_id: string; p_today?: string }
        Returns: {
          start_of_week: string
          top_3_priorities: Json
          week_id: string
          weekly_feeling: string
          weekly_thought: string
        }[]
      }
      get_dashboard_summary: { Args: { p_user_id: string }; Returns: Json }
      get_habit_summary_for_week: {
        Args: { p_user_id: string; p_week_id: string }
        Returns: Json
      }
      toggle_habit: {
        Args: { p_date: string; p_habit_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
