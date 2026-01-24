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
      admin_users: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      app_themes: {
        Row: {
          config_json: Json
          created_at: string
          id: string
          is_published: boolean
          name: string
          preview_emoji: string | null
          slug: string
          updated_at: string
          version: number
        }
        Insert: {
          config_json: Json
          created_at?: string
          id?: string
          is_published?: boolean
          name: string
          preview_emoji?: string | null
          slug: string
          updated_at?: string
          version?: number
        }
        Update: {
          config_json?: Json
          created_at?: string
          id?: string
          is_published?: boolean
          name?: string
          preview_emoji?: string | null
          slug?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      arcade_daily_pet: {
        Row: {
          created_at: string | null
          date: string
          hatched_at: string | null
          id: string
          pet_type: string
          pets_hatched_today: number | null
          stage: string | null
          tasks_completed_today: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          hatched_at?: string | null
          id?: string
          pet_type: string
          pets_hatched_today?: number | null
          stage?: string | null
          tasks_completed_today?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          hatched_at?: string | null
          id?: string
          pet_type?: string
          pets_hatched_today?: number | null
          stage?: string | null
          tasks_completed_today?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      arcade_events: {
        Row: {
          coins_delta: number | null
          created_at: string | null
          dedupe_key: string
          event_type: string
          id: string
          metadata: Json | null
          task_id: string | null
          tokens_delta: number | null
          user_id: string
        }
        Insert: {
          coins_delta?: number | null
          created_at?: string | null
          dedupe_key: string
          event_type: string
          id?: string
          metadata?: Json | null
          task_id?: string | null
          tokens_delta?: number | null
          user_id: string
        }
        Update: {
          coins_delta?: number | null
          created_at?: string | null
          dedupe_key?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          task_id?: string | null
          tokens_delta?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arcade_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["task_id"]
          },
        ]
      }
      arcade_game_sessions: {
        Row: {
          ended_at: string | null
          game_id: string
          id: string
          score: number | null
          started_at: string | null
          user_id: string
        }
        Insert: {
          ended_at?: string | null
          game_id: string
          id?: string
          score?: number | null
          started_at?: string | null
          user_id: string
        }
        Update: {
          ended_at?: string | null
          game_id?: string
          id?: string
          score?: number | null
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arcade_game_sessions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "arcade_games"
            referencedColumns: ["id"]
          },
        ]
      }
      arcade_games: {
        Row: {
          created_at: string | null
          description: string | null
          difficulty: string | null
          id: string
          is_active: boolean | null
          title: string
          token_cost: number | null
          unlock_rule_json: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          is_active?: boolean | null
          title: string
          token_cost?: number | null
          unlock_rule_json?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
          token_cost?: number | null
          unlock_rule_json?: Json | null
        }
        Relationships: []
      }
      arcade_pomodoro_sessions: {
        Row: {
          break_minutes: number
          completed_at: string | null
          focus_minutes: number
          id: string
          started_at: string | null
          status: string | null
          task_id: string | null
          user_id: string
        }
        Insert: {
          break_minutes?: number
          completed_at?: string | null
          focus_minutes?: number
          id?: string
          started_at?: string | null
          status?: string | null
          task_id?: string | null
          user_id: string
        }
        Update: {
          break_minutes?: number
          completed_at?: string | null
          focus_minutes?: number
          id?: string
          started_at?: string | null
          status?: string | null
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arcade_pomodoro_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["task_id"]
          },
        ]
      }
      arcade_wallet: {
        Row: {
          coins_balance: number | null
          tokens_balance: number | null
          total_coins_earned: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          coins_balance?: number | null
          tokens_balance?: number | null
          total_coins_earned?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          coins_balance?: number | null
          tokens_balance?: number | null
          total_coins_earned?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
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
      coaching_entries: {
        Row: {
          action: string | null
          circumstance: string | null
          context_summary: string | null
          create_tiny_task: boolean | null
          created_at: string
          cycle_id: string | null
          feeling: string | null
          id: string
          reframe_thought: string | null
          result: string | null
          schedule_tiny_task_at: string | null
          shareable_post: string | null
          task_id: string | null
          thought: string | null
          tiny_next_action: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          action?: string | null
          circumstance?: string | null
          context_summary?: string | null
          create_tiny_task?: boolean | null
          created_at?: string
          cycle_id?: string | null
          feeling?: string | null
          id?: string
          reframe_thought?: string | null
          result?: string | null
          schedule_tiny_task_at?: string | null
          shareable_post?: string | null
          task_id?: string | null
          thought?: string | null
          tiny_next_action?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          action?: string | null
          circumstance?: string | null
          context_summary?: string | null
          create_tiny_task?: boolean | null
          created_at?: string
          cycle_id?: string | null
          feeling?: string | null
          id?: string
          reframe_thought?: string | null
          result?: string | null
          schedule_tiny_task_at?: string | null
          shareable_post?: string | null
          task_id?: string | null
          thought?: string | null
          tiny_next_action?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_entries_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles_90_day"
            referencedColumns: ["cycle_id"]
          },
          {
            foreignKeyName: "coaching_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["task_id"]
          },
        ]
      }
      content_items: {
        Row: {
          body: string | null
          channel: string | null
          click_rate: number | null
          comments: number | null
          created_at: string
          cta: string | null
          cycle_id: string | null
          hook: string | null
          id: string
          likes: number | null
          link_url: string | null
          notes: string | null
          offer: string | null
          open_rate: number | null
          preview_text: string | null
          project_id: string | null
          published_at: string | null
          revenue: number | null
          saves: number | null
          shares: number | null
          status: string
          subject_line: string | null
          subscribers_gained: number | null
          tags: string[] | null
          title: string
          topic: string | null
          type: string
          updated_at: string
          user_id: string
          views: number | null
        }
        Insert: {
          body?: string | null
          channel?: string | null
          click_rate?: number | null
          comments?: number | null
          created_at?: string
          cta?: string | null
          cycle_id?: string | null
          hook?: string | null
          id?: string
          likes?: number | null
          link_url?: string | null
          notes?: string | null
          offer?: string | null
          open_rate?: number | null
          preview_text?: string | null
          project_id?: string | null
          published_at?: string | null
          revenue?: number | null
          saves?: number | null
          shares?: number | null
          status?: string
          subject_line?: string | null
          subscribers_gained?: number | null
          tags?: string[] | null
          title: string
          topic?: string | null
          type: string
          updated_at?: string
          user_id: string
          views?: number | null
        }
        Update: {
          body?: string | null
          channel?: string | null
          click_rate?: number | null
          comments?: number | null
          created_at?: string
          cta?: string | null
          cycle_id?: string | null
          hook?: string | null
          id?: string
          likes?: number | null
          link_url?: string | null
          notes?: string | null
          offer?: string | null
          open_rate?: number | null
          preview_text?: string | null
          project_id?: string | null
          published_at?: string | null
          revenue?: number | null
          saves?: number | null
          shares?: number | null
          status?: string
          subject_line?: string | null
          subscribers_gained?: number | null
          tags?: string[] | null
          title?: string
          topic?: string | null
          type?: string
          updated_at?: string
          user_id?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_items_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles_90_day"
            referencedColumns: ["cycle_id"]
          },
          {
            foreignKeyName: "content_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      content_send_log: {
        Row: {
          channel: string
          content_item_id: string | null
          created_at: string
          cycle_id: string | null
          id: string
          sent_at: string
          topic: string | null
          type: string
          user_id: string
        }
        Insert: {
          channel: string
          content_item_id?: string | null
          created_at?: string
          cycle_id?: string | null
          id?: string
          sent_at?: string
          topic?: string | null
          type: string
          user_id: string
        }
        Update: {
          channel?: string
          content_item_id?: string | null
          created_at?: string
          cycle_id?: string | null
          id?: string
          sent_at?: string
          topic?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_send_log_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_send_log_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles_90_day"
            referencedColumns: ["cycle_id"]
          },
        ]
      }
      content_sprints: {
        Row: {
          batch_date: string | null
          content_type: string
          created_at: string | null
          creation_method: string | null
          cycle_id: string | null
          edit_date: string | null
          first_post_date: string | null
          id: string
          last_post_date: string | null
          name: string | null
          needs_help: string[] | null
          new_pieces_count: number | null
          piece_count: number
          platform: string
          posting_frequency: string | null
          reused_content_ids: string[] | null
          schedule_date: string | null
          status: string | null
          theme: string | null
          timeline: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          batch_date?: string | null
          content_type: string
          created_at?: string | null
          creation_method?: string | null
          cycle_id?: string | null
          edit_date?: string | null
          first_post_date?: string | null
          id?: string
          last_post_date?: string | null
          name?: string | null
          needs_help?: string[] | null
          new_pieces_count?: number | null
          piece_count: number
          platform: string
          posting_frequency?: string | null
          reused_content_ids?: string[] | null
          schedule_date?: string | null
          status?: string | null
          theme?: string | null
          timeline?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          batch_date?: string | null
          content_type?: string
          created_at?: string | null
          creation_method?: string | null
          cycle_id?: string | null
          edit_date?: string | null
          first_post_date?: string | null
          id?: string
          last_post_date?: string | null
          name?: string | null
          needs_help?: string[] | null
          new_pieces_count?: number | null
          piece_count?: number
          platform?: string
          posting_frequency?: string | null
          reused_content_ids?: string[] | null
          schedule_date?: string | null
          status?: string | null
          theme?: string | null
          timeline?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_sprints_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles_90_day"
            referencedColumns: ["cycle_id"]
          },
        ]
      }
      content_topics: {
        Row: {
          created_at: string | null
          id: string
          planned_date: string | null
          related_content_ids: string[] | null
          status: string | null
          topic_notes: string | null
          topic_text: string | null
          updated_at: string | null
          user_id: string
          workflow_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          planned_date?: string | null
          related_content_ids?: string[] | null
          status?: string | null
          topic_notes?: string | null
          topic_text?: string | null
          updated_at?: string | null
          user_id: string
          workflow_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          planned_date?: string | null
          related_content_ids?: string[] | null
          status?: string | null
          topic_notes?: string | null
          topic_text?: string | null
          updated_at?: string | null
          user_id?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_topics_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "user_content_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      course_checkins: {
        Row: {
          blocker: string | null
          checkin_date: string
          checkin_type: string
          course_id: string
          created_at: string
          id: string
          notes: string | null
          on_track: boolean | null
          user_id: string
        }
        Insert: {
          blocker?: string | null
          checkin_date: string
          checkin_type: string
          course_id: string
          created_at?: string
          id?: string
          notes?: string | null
          on_track?: boolean | null
          user_id: string
        }
        Update: {
          blocker?: string | null
          checkin_date?: string
          checkin_type?: string
          course_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          on_track?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_checkins_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_study_plans: {
        Row: {
          auto_generate_sessions: boolean
          course_id: string
          created_at: string
          id: string
          last_generation_op_id: string | null
          preferred_days: number[]
          session_minutes: number
          sessions_per_week: number
          start_date: string
          target_finish_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_generate_sessions?: boolean
          course_id: string
          created_at?: string
          id?: string
          last_generation_op_id?: string | null
          preferred_days?: number[]
          session_minutes?: number
          sessions_per_week?: number
          start_date: string
          target_finish_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_generate_sessions?: boolean
          course_id?: string
          created_at?: string
          id?: string
          last_generation_op_id?: string | null
          preferred_days?: number[]
          session_minutes?: number
          sessions_per_week?: number
          start_date?: string
          target_finish_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_study_plans_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          course_url: string | null
          created_at: string
          id: string
          intention: string | null
          notes: string | null
          progress_percent: number
          provider: string | null
          purchase_date: string | null
          roi_checkin_date: string | null
          roi_checkin_days: number
          roi_target: string | null
          roi_type: string | null
          start_date: string | null
          status: string
          success_criteria: string | null
          target_finish_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_url?: string | null
          created_at?: string
          id?: string
          intention?: string | null
          notes?: string | null
          progress_percent?: number
          provider?: string | null
          purchase_date?: string | null
          roi_checkin_date?: string | null
          roi_checkin_days?: number
          roi_target?: string | null
          roi_type?: string | null
          start_date?: string | null
          status?: string
          success_criteria?: string | null
          target_finish_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_url?: string | null
          created_at?: string
          id?: string
          intention?: string | null
          notes?: string | null
          progress_percent?: number
          provider?: string | null
          purchase_date?: string | null
          roi_checkin_date?: string | null
          roi_checkin_days?: number
          roi_target?: string | null
          roi_type?: string | null
          start_date?: string | null
          status?: string
          success_criteria?: string | null
          target_finish_date?: string | null
          title?: string
          updated_at?: string
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
      cycle_drafts: {
        Row: {
          created_at: string | null
          current_step: number | null
          draft_data: Json
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_step?: number | null
          draft_data?: Json
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_step?: number | null
          draft_data?: Json
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cycle_limited_offers: {
        Row: {
          created_at: string | null
          cycle_id: string
          discount: string | null
          end_date: string
          id: string
          name: string
          notes: string | null
          offer_id: string | null
          promo_type: string | null
          sort_order: number | null
          start_date: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          cycle_id: string
          discount?: string | null
          end_date: string
          id?: string
          name: string
          notes?: string | null
          offer_id?: string | null
          promo_type?: string | null
          sort_order?: number | null
          start_date: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          cycle_id?: string
          discount?: string | null
          end_date?: string
          id?: string
          name?: string
          notes?: string | null
          offer_id?: string | null
          promo_type?: string | null
          sort_order?: number | null
          start_date?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycle_limited_offers_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles_90_day"
            referencedColumns: ["cycle_id"]
          },
          {
            foreignKeyName: "cycle_limited_offers_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "cycle_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      cycle_metric_updates: {
        Row: {
          created_at: string | null
          cycle_id: string
          id: string
          logged_at: string
          metric_number: number
          notes: string | null
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string | null
          cycle_id: string
          id?: string
          logged_at?: string
          metric_number: number
          notes?: string | null
          user_id: string
          value: number
        }
        Update: {
          created_at?: string | null
          cycle_id?: string
          id?: string
          logged_at?: string
          metric_number?: number
          notes?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "cycle_metric_updates_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles_90_day"
            referencedColumns: ["cycle_id"]
          },
        ]
      }
      cycle_month_plans: {
        Row: {
          created_at: string | null
          cycle_id: string
          id: string
          main_focus: string | null
          month_name: string | null
          month_number: number
          projects_text: string | null
          sales_promos_text: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          cycle_id: string
          id?: string
          main_focus?: string | null
          month_name?: string | null
          month_number: number
          projects_text?: string | null
          sales_promos_text?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          cycle_id?: string
          id?: string
          main_focus?: string | null
          month_name?: string | null
          month_number?: number
          projects_text?: string | null
          sales_promos_text?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycle_month_plans_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles_90_day"
            referencedColumns: ["cycle_id"]
          },
        ]
      }
      cycle_offers: {
        Row: {
          created_at: string | null
          cycle_id: string
          id: string
          is_primary: boolean | null
          offer_name: string
          price: number | null
          sales_frequency: string | null
          sort_order: number | null
          transformation: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          cycle_id: string
          id?: string
          is_primary?: boolean | null
          offer_name: string
          price?: number | null
          sales_frequency?: string | null
          sort_order?: number | null
          transformation?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          cycle_id?: string
          id?: string
          is_primary?: boolean | null
          offer_name?: string
          price?: number | null
          sales_frequency?: string | null
          sort_order?: number | null
          transformation?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycle_offers_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles_90_day"
            referencedColumns: ["cycle_id"]
          },
        ]
      }
      cycle_revenue_plan: {
        Row: {
          created_at: string | null
          cycle_id: string
          id: string
          launch_schedule: string | null
          price_per_sale: number | null
          revenue_goal: number | null
          sales_needed: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          cycle_id: string
          id?: string
          launch_schedule?: string | null
          price_per_sale?: number | null
          revenue_goal?: number | null
          sales_needed?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          cycle_id?: string
          id?: string
          launch_schedule?: string | null
          price_per_sale?: number | null
          revenue_goal?: number | null
          sales_needed?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycle_revenue_plan_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: true
            referencedRelation: "cycles_90_day"
            referencedColumns: ["cycle_id"]
          },
        ]
      }
      cycle_strategy: {
        Row: {
          batch_day: string | null
          batch_frequency: string | null
          created_at: string | null
          cycle_id: string
          free_transformation: string | null
          id: string
          lead_committed_90_days: boolean | null
          lead_content_type: string | null
          lead_frequency: string | null
          lead_gen_content_audit: string | null
          lead_primary_platform: string | null
          nurture_batch_day: string | null
          nurture_batch_frequency: string | null
          nurture_content_audit: string | null
          nurture_frequency: string | null
          nurture_method: string | null
          nurture_platforms: Json | null
          nurture_posting_days: Json | null
          nurture_posting_time: string | null
          posting_days: Json | null
          posting_time: string | null
          proof_methods: Json | null
          secondary_platforms: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          batch_day?: string | null
          batch_frequency?: string | null
          created_at?: string | null
          cycle_id: string
          free_transformation?: string | null
          id?: string
          lead_committed_90_days?: boolean | null
          lead_content_type?: string | null
          lead_frequency?: string | null
          lead_gen_content_audit?: string | null
          lead_primary_platform?: string | null
          nurture_batch_day?: string | null
          nurture_batch_frequency?: string | null
          nurture_content_audit?: string | null
          nurture_frequency?: string | null
          nurture_method?: string | null
          nurture_platforms?: Json | null
          nurture_posting_days?: Json | null
          nurture_posting_time?: string | null
          posting_days?: Json | null
          posting_time?: string | null
          proof_methods?: Json | null
          secondary_platforms?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          batch_day?: string | null
          batch_frequency?: string | null
          created_at?: string | null
          cycle_id?: string
          free_transformation?: string | null
          id?: string
          lead_committed_90_days?: boolean | null
          lead_content_type?: string | null
          lead_frequency?: string | null
          lead_gen_content_audit?: string | null
          lead_primary_platform?: string | null
          nurture_batch_day?: string | null
          nurture_batch_frequency?: string | null
          nurture_content_audit?: string | null
          nurture_frequency?: string | null
          nurture_method?: string | null
          nurture_platforms?: Json | null
          nurture_posting_days?: Json | null
          nurture_posting_time?: string | null
          posting_days?: Json | null
          posting_time?: string | null
          proof_methods?: Json | null
          secondary_platforms?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycle_strategy_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: true
            referencedRelation: "cycles_90_day"
            referencedColumns: ["cycle_id"]
          },
        ]
      }
      cycles_90_day: {
        Row: {
          accountability_person: string | null
          audience_frustration: string | null
          audience_target: string | null
          biggest_bottleneck: string | null
          biggest_fear: string | null
          commitment_statement: string | null
          convert_score: number | null
          created_at: string | null
          cycle_id: string
          day1_top3: Json | null
          day1_why: string | null
          day2_top3: Json | null
          day2_why: string | null
          day3_top3: Json | null
          day3_why: string | null
          discover_score: number | null
          end_date: string
          fear_response: string | null
          focus_area: string | null
          goal: string
          identity: string | null
          limiting_thought: string | null
          metric_1_goal: number | null
          metric_1_name: string | null
          metric_1_start: number | null
          metric_2_goal: number | null
          metric_2_name: string | null
          metric_2_start: number | null
          metric_3_goal: number | null
          metric_3_name: string | null
          metric_3_start: number | null
          metric_4_goal: number | null
          metric_4_name: string | null
          metric_4_start: number | null
          metric_5_goal: number | null
          metric_5_name: string | null
          metric_5_start: number | null
          nurture_score: number | null
          office_hours_days: Json | null
          office_hours_end: string | null
          office_hours_start: string | null
          promotions: Json | null
          signature_message: string | null
          start_date: string
          supporting_projects: Json | null
          target_feeling: string | null
          things_to_remember: Json | null
          updated_at: string | null
          useful_belief: string | null
          useful_thought: string | null
          user_id: string
          weekly_debrief_day: string | null
          weekly_planning_day: string | null
          why: string | null
        }
        Insert: {
          accountability_person?: string | null
          audience_frustration?: string | null
          audience_target?: string | null
          biggest_bottleneck?: string | null
          biggest_fear?: string | null
          commitment_statement?: string | null
          convert_score?: number | null
          created_at?: string | null
          cycle_id?: string
          day1_top3?: Json | null
          day1_why?: string | null
          day2_top3?: Json | null
          day2_why?: string | null
          day3_top3?: Json | null
          day3_why?: string | null
          discover_score?: number | null
          end_date: string
          fear_response?: string | null
          focus_area?: string | null
          goal: string
          identity?: string | null
          limiting_thought?: string | null
          metric_1_goal?: number | null
          metric_1_name?: string | null
          metric_1_start?: number | null
          metric_2_goal?: number | null
          metric_2_name?: string | null
          metric_2_start?: number | null
          metric_3_goal?: number | null
          metric_3_name?: string | null
          metric_3_start?: number | null
          metric_4_goal?: number | null
          metric_4_name?: string | null
          metric_4_start?: number | null
          metric_5_goal?: number | null
          metric_5_name?: string | null
          metric_5_start?: number | null
          nurture_score?: number | null
          office_hours_days?: Json | null
          office_hours_end?: string | null
          office_hours_start?: string | null
          promotions?: Json | null
          signature_message?: string | null
          start_date: string
          supporting_projects?: Json | null
          target_feeling?: string | null
          things_to_remember?: Json | null
          updated_at?: string | null
          useful_belief?: string | null
          useful_thought?: string | null
          user_id: string
          weekly_debrief_day?: string | null
          weekly_planning_day?: string | null
          why?: string | null
        }
        Update: {
          accountability_person?: string | null
          audience_frustration?: string | null
          audience_target?: string | null
          biggest_bottleneck?: string | null
          biggest_fear?: string | null
          commitment_statement?: string | null
          convert_score?: number | null
          created_at?: string | null
          cycle_id?: string
          day1_top3?: Json | null
          day1_why?: string | null
          day2_top3?: Json | null
          day2_why?: string | null
          day3_top3?: Json | null
          day3_why?: string | null
          discover_score?: number | null
          end_date?: string
          fear_response?: string | null
          focus_area?: string | null
          goal?: string
          identity?: string | null
          limiting_thought?: string | null
          metric_1_goal?: number | null
          metric_1_name?: string | null
          metric_1_start?: number | null
          metric_2_goal?: number | null
          metric_2_name?: string | null
          metric_2_start?: number | null
          metric_3_goal?: number | null
          metric_3_name?: string | null
          metric_3_start?: number | null
          metric_4_goal?: number | null
          metric_4_name?: string | null
          metric_4_start?: number | null
          metric_5_goal?: number | null
          metric_5_name?: string | null
          metric_5_start?: number | null
          nurture_score?: number | null
          office_hours_days?: Json | null
          office_hours_end?: string | null
          office_hours_start?: string | null
          promotions?: Json | null
          signature_message?: string | null
          start_date?: string
          supporting_projects?: Json | null
          target_feeling?: string | null
          things_to_remember?: Json | null
          updated_at?: string | null
          useful_belief?: string | null
          useful_thought?: string | null
          user_id?: string
          weekly_debrief_day?: string | null
          weekly_planning_day?: string | null
          why?: string | null
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          checkin_date: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          checkin_date: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          checkin_date?: string
          created_at?: string
          id?: string
          user_id?: string
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
          goal_rewrite: string | null
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
          goal_rewrite?: string | null
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
          goal_rewrite?: string | null
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
          goal_support: string | null
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
          goal_support?: string | null
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
          goal_support?: string | null
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
      daily_top3_tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          date: string
          id: string
          position: number
          task_id: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          date?: string
          id?: string
          position: number
          task_id?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          date?: string
          id?: string
          position?: number
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_top3_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["task_id"]
          },
        ]
      }
      earned_trophies: {
        Row: {
          challenge_name: string | null
          earned_at: string | null
          id: string
          trophy_type: string
          user_id: string
        }
        Insert: {
          challenge_name?: string | null
          earned_at?: string | null
          id?: string
          trophy_type: string
          user_id: string
        }
        Update: {
          challenge_name?: string | null
          earned_at?: string | null
          id?: string
          trophy_type?: string
          user_id?: string
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          audience: string | null
          created_at: string | null
          custom_frequency: string | null
          cycle_id: string | null
          email_count: number | null
          emails_to_write: number | null
          goal: string | null
          id: string
          main_cta: string | null
          name: string
          offer_count: number | null
          problem_solved: string | null
          reused_content_ids: string[] | null
          send_frequency: string | null
          start_date: string | null
          status: string | null
          transformation: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          audience?: string | null
          created_at?: string | null
          custom_frequency?: string | null
          cycle_id?: string | null
          email_count?: number | null
          emails_to_write?: number | null
          goal?: string | null
          id?: string
          main_cta?: string | null
          name: string
          offer_count?: number | null
          problem_solved?: string | null
          reused_content_ids?: string[] | null
          send_frequency?: string | null
          start_date?: string | null
          status?: string | null
          transformation?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          audience?: string | null
          created_at?: string | null
          custom_frequency?: string | null
          cycle_id?: string | null
          email_count?: number | null
          emails_to_write?: number | null
          goal?: string | null
          id?: string
          main_cta?: string | null
          name?: string
          offer_count?: number | null
          problem_solved?: string | null
          reused_content_ids?: string[] | null
          send_frequency?: string | null
          start_date?: string | null
          status?: string | null
          transformation?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles_90_day"
            referencedColumns: ["cycle_id"]
          },
        ]
      }
      entitlements: {
        Row: {
          created_at: string
          email: string
          ends_at: string | null
          first_name: string | null
          id: string
          last_name: string | null
          starts_at: string | null
          status: string
          tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          ends_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          starts_at?: string | null
          status?: string
          tier?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          ends_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          starts_at?: string | null
          status?: string
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          component: string | null
          created_at: string
          error_message: string
          error_stack: string | null
          error_type: string
          id: string
          metadata: Json | null
          route: string | null
          user_id: string | null
        }
        Insert: {
          component?: string | null
          created_at?: string
          error_message: string
          error_stack?: string | null
          error_type: string
          id?: string
          metadata?: Json | null
          route?: string | null
          user_id?: string | null
        }
        Update: {
          component?: string | null
          created_at?: string
          error_message?: string
          error_stack?: string | null
          error_type?: string
          id?: string
          metadata?: Json | null
          route?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      feature_flags: {
        Row: {
          created_at: string
          enabled: boolean
          key: string
          rollout_percent: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          key: string
          rollout_percent?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          key?: string
          rollout_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      feature_releases: {
        Row: {
          description: string | null
          feature_name: string
          released_at: string
        }
        Insert: {
          description?: string | null
          feature_name: string
          released_at?: string
        }
        Update: {
          description?: string | null
          feature_name?: string
          released_at?: string
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
          access_token_encrypted: string | null
          created_at: string | null
          google_user_id: string
          is_active: boolean | null
          refresh_token_encrypted: string | null
          selected_calendar_id: string | null
          selected_calendar_name: string | null
          token_expiry: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token_encrypted?: string | null
          created_at?: string | null
          google_user_id: string
          is_active?: boolean | null
          refresh_token_encrypted?: string | null
          selected_calendar_id?: string | null
          selected_calendar_name?: string | null
          token_expiry?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token_encrypted?: string | null
          created_at?: string | null
          google_user_id?: string
          is_active?: boolean | null
          refresh_token_encrypted?: string | null
          selected_calendar_id?: string | null
          selected_calendar_name?: string | null
          token_expiry?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      google_calendar_secrets: {
        Row: {
          access_token_encrypted: string
          created_at: string | null
          refresh_token_encrypted: string
          token_expiry: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token_encrypted: string
          created_at?: string | null
          refresh_token_encrypted: string
          token_expiry: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token_encrypted?: string
          created_at?: string | null
          refresh_token_encrypted?: string
          token_expiry?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      google_selected_calendars: {
        Row: {
          calendar_id: string
          calendar_name: string
          color: string | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          calendar_id: string
          calendar_name: string
          color?: string | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          calendar_id?: string
          calendar_name?: string
          color?: string | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
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
          cycle_id: string | null
          deleted_at: string | null
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
          cycle_id?: string | null
          deleted_at?: string | null
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
          cycle_id?: string | null
          deleted_at?: string | null
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
        Relationships: [
          {
            foreignKeyName: "habits_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles_90_day"
            referencedColumns: ["cycle_id"]
          },
        ]
      }
      hatched_pets: {
        Row: {
          date: string
          hatched_at: string | null
          id: string
          pet_emoji: string
          pet_type: string
          user_id: string
        }
        Insert: {
          date?: string
          hatched_at?: string | null
          id?: string
          pet_emoji: string
          pet_type: string
          user_id: string
        }
        Update: {
          date?: string
          hatched_at?: string | null
          id?: string
          pet_emoji?: string
          pet_type?: string
          user_id?: string
        }
        Relationships: []
      }
      ideas: {
        Row: {
          category_id: string | null
          content: string
          created_at: string | null
          deleted_at: string | null
          id: string
          priority: string | null
          project_id: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category_id?: string | null
          content: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          priority?: string | null
          project_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category_id?: string | null
          content?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          priority?: string | null
          project_id?: string | null
          tags?: string[] | null
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
          {
            foreignKeyName: "ideas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
          project_id: string | null
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
          project_id?: string | null
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
          project_id?: string | null
          tags?: Json | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_pages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      launches: {
        Row: {
          ads_budget: number | null
          ads_platform: string[] | null
          belief: string | null
          cart_closes: string
          cart_opens: string
          created_at: string | null
          cycle_id: string | null
          debrief_date: string | null
          email_sequences: string[] | null
          has_ads: string | null
          has_lead_magnet: boolean | null
          has_waitlist: boolean | null
          id: string
          launch_duration: string | null
          lead_magnet_due_date: string | null
          lead_magnet_topic: string | null
          limiting_thought: string | null
          live_events: Json | null
          name: string
          non_buyer_followup: string | null
          offer_breakdown: Json | null
          offer_goal: number | null
          post_purchase_flow: string[] | null
          price_per_sale: number | null
          revenue_goal: number | null
          sales_needed: number | null
          selected_content_ids: string[] | null
          social_posts_per_day: number | null
          social_strategy: string[] | null
          status: string | null
          updated_at: string | null
          useful_thought: string | null
          user_id: string
          waitlist_incentive: string | null
          waitlist_opens: string | null
        }
        Insert: {
          ads_budget?: number | null
          ads_platform?: string[] | null
          belief?: string | null
          cart_closes: string
          cart_opens: string
          created_at?: string | null
          cycle_id?: string | null
          debrief_date?: string | null
          email_sequences?: string[] | null
          has_ads?: string | null
          has_lead_magnet?: boolean | null
          has_waitlist?: boolean | null
          id?: string
          launch_duration?: string | null
          lead_magnet_due_date?: string | null
          lead_magnet_topic?: string | null
          limiting_thought?: string | null
          live_events?: Json | null
          name: string
          non_buyer_followup?: string | null
          offer_breakdown?: Json | null
          offer_goal?: number | null
          post_purchase_flow?: string[] | null
          price_per_sale?: number | null
          revenue_goal?: number | null
          sales_needed?: number | null
          selected_content_ids?: string[] | null
          social_posts_per_day?: number | null
          social_strategy?: string[] | null
          status?: string | null
          updated_at?: string | null
          useful_thought?: string | null
          user_id: string
          waitlist_incentive?: string | null
          waitlist_opens?: string | null
        }
        Update: {
          ads_budget?: number | null
          ads_platform?: string[] | null
          belief?: string | null
          cart_closes?: string
          cart_opens?: string
          created_at?: string | null
          cycle_id?: string | null
          debrief_date?: string | null
          email_sequences?: string[] | null
          has_ads?: string | null
          has_lead_magnet?: boolean | null
          has_waitlist?: boolean | null
          id?: string
          launch_duration?: string | null
          lead_magnet_due_date?: string | null
          lead_magnet_topic?: string | null
          limiting_thought?: string | null
          live_events?: Json | null
          name?: string
          non_buyer_followup?: string | null
          offer_breakdown?: Json | null
          offer_goal?: number | null
          post_purchase_flow?: string[] | null
          price_per_sale?: number | null
          revenue_goal?: number | null
          sales_needed?: number | null
          selected_content_ids?: string[] | null
          social_posts_per_day?: number | null
          social_strategy?: string[] | null
          status?: string | null
          updated_at?: string | null
          useful_thought?: string | null
          user_id?: string
          waitlist_incentive?: string | null
          waitlist_opens?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "launches_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles_90_day"
            referencedColumns: ["cycle_id"]
          },
        ]
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
      monthly_challenge_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          month_end: string
          month_start: string
          reward_theme_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          month_end: string
          month_start: string
          reward_theme_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          month_end?: string
          month_start?: string
          reward_theme_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_challenge_templates_reward_theme_id_fkey"
            columns: ["reward_theme_id"]
            isOneToOne: false
            referencedRelation: "app_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_reviews: {
        Row: {
          adjustments: Json | null
          challenges: Json | null
          created_at: string | null
          custom_reflections: Json | null
          cycle_id: string | null
          habit_trends: Json | null
          lessons: Json | null
          month: number
          month_in_cycle: number | null
          month_score: number | null
          next_month_priorities: Json | null
          review_id: string
          thought_patterns: Json | null
          updated_at: string | null
          user_id: string
          wins: string | null
        }
        Insert: {
          adjustments?: Json | null
          challenges?: Json | null
          created_at?: string | null
          custom_reflections?: Json | null
          cycle_id?: string | null
          habit_trends?: Json | null
          lessons?: Json | null
          month: number
          month_in_cycle?: number | null
          month_score?: number | null
          next_month_priorities?: Json | null
          review_id?: string
          thought_patterns?: Json | null
          updated_at?: string | null
          user_id: string
          wins?: string | null
        }
        Update: {
          adjustments?: Json | null
          challenges?: Json | null
          created_at?: string | null
          custom_reflections?: Json | null
          cycle_id?: string | null
          habit_trends?: Json | null
          lessons?: Json | null
          month?: number
          month_in_cycle?: number | null
          month_score?: number | null
          next_month_priorities?: Json | null
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
      nurture_checkins: {
        Row: {
          checkin_date: string
          coach_response: string | null
          commitment_id: string | null
          created_at: string | null
          expected_date: string
          id: string
          reschedule_date: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          checkin_date: string
          coach_response?: string | null
          commitment_id?: string | null
          created_at?: string | null
          expected_date: string
          id?: string
          reschedule_date?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          checkin_date?: string
          coach_response?: string | null
          commitment_id?: string | null
          created_at?: string | null
          expected_date?: string
          id?: string
          reschedule_date?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nurture_checkins_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "nurture_commitments"
            referencedColumns: ["id"]
          },
        ]
      }
      nurture_commitments: {
        Row: {
          cadence: string
          commitment_type: string
          created_at: string | null
          cycle_id: string | null
          day_of_week: number
          enabled: boolean
          grace_days: number
          id: string
          preferred_time_block: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cadence?: string
          commitment_type?: string
          created_at?: string | null
          cycle_id?: string | null
          day_of_week: number
          enabled?: boolean
          grace_days?: number
          id?: string
          preferred_time_block?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cadence?: string
          commitment_type?: string
          created_at?: string | null
          cycle_id?: string | null
          day_of_week?: number
          enabled?: boolean
          grace_days?: number
          id?: string
          preferred_time_block?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nurture_commitments_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles_90_day"
            referencedColumns: ["cycle_id"]
          },
        ]
      }
      office_hours: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          start_time: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          start_time: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          start_time?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_board_settings: {
        Row: {
          created_at: string
          id: string
          project_id: string
          sort_by: string | null
          sort_direction: string | null
          updated_at: string
          user_id: string
          visible_columns: Json
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          sort_by?: string | null
          sort_direction?: string | null
          updated_at?: string
          user_id: string
          visible_columns?: Json
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          sort_by?: string | null
          sort_direction?: string | null
          updated_at?: string
          user_id?: string
          visible_columns?: Json
        }
        Relationships: [
          {
            foreignKeyName: "project_board_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_boards: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_columns: {
        Row: {
          board_id: string
          color: string | null
          created_at: string
          id: string
          name: string
          sort_order: number
          user_id: string
        }
        Insert: {
          board_id: string
          color?: string | null
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          user_id: string
        }
        Update: {
          board_id?: string
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_columns_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "project_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      project_custom_fields: {
        Row: {
          created_at: string | null
          field_name: string
          field_options: Json | null
          field_type: string
          id: string
          is_visible: boolean | null
          project_id: string
          sort_order: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          field_name: string
          field_options?: Json | null
          field_type: string
          id?: string
          is_visible?: boolean | null
          project_id: string
          sort_order?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          field_name?: string
          field_options?: Json | null
          field_type?: string
          id?: string
          is_visible?: boolean | null
          project_id?: string
          sort_order?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_custom_fields_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_sections: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          project_id: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          project_id: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_sections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_snapshots: {
        Row: {
          created_at: string | null
          id: string
          project_id: string
          reason: string | null
          snapshot_data: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id: string
          reason?: string | null
          snapshot_data: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string
          reason?: string | null
          snapshot_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "project_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          board_id: string | null
          board_sort_order: number | null
          color: string | null
          column_id: string | null
          created_at: string | null
          cycle_id: string | null
          description: string | null
          end_date: string | null
          has_topic_planning: boolean | null
          id: string
          is_launch: boolean
          is_template: boolean | null
          launch_end_date: string | null
          launch_start_date: string | null
          name: string
          offer_goal: number | null
          revenue_goal: number | null
          start_date: string | null
          status: string
          topic_planning_cadence: string | null
          updated_at: string | null
          upgrade_dismissed: boolean | null
          user_id: string
        }
        Insert: {
          board_id?: string | null
          board_sort_order?: number | null
          color?: string | null
          column_id?: string | null
          created_at?: string | null
          cycle_id?: string | null
          description?: string | null
          end_date?: string | null
          has_topic_planning?: boolean | null
          id?: string
          is_launch?: boolean
          is_template?: boolean | null
          launch_end_date?: string | null
          launch_start_date?: string | null
          name: string
          offer_goal?: number | null
          revenue_goal?: number | null
          start_date?: string | null
          status?: string
          topic_planning_cadence?: string | null
          updated_at?: string | null
          upgrade_dismissed?: boolean | null
          user_id: string
        }
        Update: {
          board_id?: string | null
          board_sort_order?: number | null
          color?: string | null
          column_id?: string | null
          created_at?: string | null
          cycle_id?: string | null
          description?: string | null
          end_date?: string | null
          has_topic_planning?: boolean | null
          id?: string
          is_launch?: boolean
          is_template?: boolean | null
          launch_end_date?: string | null
          launch_start_date?: string | null
          name?: string
          offer_goal?: number | null
          revenue_goal?: number | null
          start_date?: string | null
          status?: string
          topic_planning_cadence?: string | null
          updated_at?: string | null
          upgrade_dismissed?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "project_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "project_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles_90_day"
            referencedColumns: ["cycle_id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          request_count: number | null
          user_id: string
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          request_count?: number | null
          user_id: string
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          request_count?: number | null
          user_id?: string
          window_start?: string | null
        }
        Relationships: []
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
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
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
      task_custom_field_values: {
        Row: {
          created_at: string | null
          field_id: string
          id: string
          task_id: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          created_at?: string | null
          field_id: string
          id?: string
          task_id: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          created_at?: string | null
          field_id?: string
          id?: string
          task_id?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "task_custom_field_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "project_custom_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_custom_field_values_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["task_id"]
          },
        ]
      }
      task_reflections: {
        Row: {
          could_improve: string | null
          created_at: string | null
          date: string
          id: string
          task_text: string | null
          user_id: string
          went_well: string | null
        }
        Insert: {
          could_improve?: string | null
          created_at?: string | null
          date?: string
          id?: string
          task_text?: string | null
          user_id: string
          went_well?: string | null
        }
        Update: {
          could_improve?: string | null
          created_at?: string | null
          date?: string
          id?: string
          task_text?: string | null
          user_id?: string
          went_well?: string | null
        }
        Relationships: []
      }
      task_schedule_history: {
        Row: {
          change_source: string | null
          changed_at: string
          id: string
          new_due_date: string | null
          new_scheduled_at: string | null
          previous_due_date: string | null
          previous_scheduled_at: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          change_source?: string | null
          changed_at?: string
          id?: string
          new_due_date?: string | null
          new_scheduled_at?: string | null
          previous_due_date?: string | null
          previous_scheduled_at?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          change_source?: string | null
          changed_at?: string
          id?: string
          new_due_date?: string | null
          new_scheduled_at?: string | null
          previous_due_date?: string | null
          previous_scheduled_at?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_schedule_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["task_id"]
          },
        ]
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
          week_start_day: number | null
          weekly_capacity_minutes: number | null
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
          week_start_day?: number | null
          weekly_capacity_minutes?: number | null
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
          week_start_day?: number | null
          weekly_capacity_minutes?: number | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          actual_minutes: number | null
          category: string | null
          checklist_progress: Json | null
          completed_at: string | null
          content_topic_id: string | null
          context_tags: string[] | null
          course_id: string | null
          created_at: string | null
          cycle_id: string | null
          daily_plan_id: string | null
          day_order: number | null
          deleted_at: string | null
          due_date: string | null
          energy_level: string | null
          estimated_minutes: number | null
          goal_id: string | null
          is_completed: boolean | null
          is_recurring_parent: boolean | null
          is_system_generated: boolean | null
          last_rescheduled_at: string | null
          month_in_cycle: number | null
          notes: string | null
          original_due_date: string | null
          original_scheduled_at: string | null
          parent_task_id: string | null
          planned_day: string | null
          position_in_column: number | null
          priority: string | null
          priority_order: number | null
          project_column: string | null
          project_id: string | null
          recurrence_days: Json | null
          recurrence_end_date: string | null
          recurrence_interval: number | null
          recurrence_pattern: string | null
          recurrence_unit: string | null
          reschedule_count_30d: number
          reschedule_loop_active: boolean
          reschedule_nudge_dismissed_until: string | null
          scheduled_date: string | null
          section_id: string | null
          sop_id: string | null
          source: string | null
          status: string | null
          subtasks: Json | null
          system_source: string | null
          tags: Json | null
          task_description: string | null
          task_id: string
          task_text: string
          task_type: string | null
          template_key: string | null
          time_block_end: string | null
          time_block_start: string | null
          updated_at: string | null
          user_id: string
          waiting_on: string | null
          week_in_cycle: number | null
        }
        Insert: {
          actual_minutes?: number | null
          category?: string | null
          checklist_progress?: Json | null
          completed_at?: string | null
          content_topic_id?: string | null
          context_tags?: string[] | null
          course_id?: string | null
          created_at?: string | null
          cycle_id?: string | null
          daily_plan_id?: string | null
          day_order?: number | null
          deleted_at?: string | null
          due_date?: string | null
          energy_level?: string | null
          estimated_minutes?: number | null
          goal_id?: string | null
          is_completed?: boolean | null
          is_recurring_parent?: boolean | null
          is_system_generated?: boolean | null
          last_rescheduled_at?: string | null
          month_in_cycle?: number | null
          notes?: string | null
          original_due_date?: string | null
          original_scheduled_at?: string | null
          parent_task_id?: string | null
          planned_day?: string | null
          position_in_column?: number | null
          priority?: string | null
          priority_order?: number | null
          project_column?: string | null
          project_id?: string | null
          recurrence_days?: Json | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_pattern?: string | null
          recurrence_unit?: string | null
          reschedule_count_30d?: number
          reschedule_loop_active?: boolean
          reschedule_nudge_dismissed_until?: string | null
          scheduled_date?: string | null
          section_id?: string | null
          sop_id?: string | null
          source?: string | null
          status?: string | null
          subtasks?: Json | null
          system_source?: string | null
          tags?: Json | null
          task_description?: string | null
          task_id?: string
          task_text: string
          task_type?: string | null
          template_key?: string | null
          time_block_end?: string | null
          time_block_start?: string | null
          updated_at?: string | null
          user_id: string
          waiting_on?: string | null
          week_in_cycle?: number | null
        }
        Update: {
          actual_minutes?: number | null
          category?: string | null
          checklist_progress?: Json | null
          completed_at?: string | null
          content_topic_id?: string | null
          context_tags?: string[] | null
          course_id?: string | null
          created_at?: string | null
          cycle_id?: string | null
          daily_plan_id?: string | null
          day_order?: number | null
          deleted_at?: string | null
          due_date?: string | null
          energy_level?: string | null
          estimated_minutes?: number | null
          goal_id?: string | null
          is_completed?: boolean | null
          is_recurring_parent?: boolean | null
          is_system_generated?: boolean | null
          last_rescheduled_at?: string | null
          month_in_cycle?: number | null
          notes?: string | null
          original_due_date?: string | null
          original_scheduled_at?: string | null
          parent_task_id?: string | null
          planned_day?: string | null
          position_in_column?: number | null
          priority?: string | null
          priority_order?: number | null
          project_column?: string | null
          project_id?: string | null
          recurrence_days?: Json | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_pattern?: string | null
          recurrence_unit?: string | null
          reschedule_count_30d?: number
          reschedule_loop_active?: boolean
          reschedule_nudge_dismissed_until?: string | null
          scheduled_date?: string | null
          section_id?: string | null
          sop_id?: string | null
          source?: string | null
          status?: string | null
          subtasks?: Json | null
          system_source?: string | null
          tags?: Json | null
          task_description?: string | null
          task_id?: string
          task_text?: string
          task_type?: string | null
          template_key?: string | null
          time_block_end?: string | null
          time_block_start?: string | null
          updated_at?: string | null
          user_id?: string
          waiting_on?: string | null
          week_in_cycle?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_content_topic_id_fkey"
            columns: ["content_topic_id"]
            isOneToOne: false
            referencedRelation: "content_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles_90_day"
            referencedColumns: ["cycle_id"]
          },
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
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "project_sections"
            referencedColumns: ["id"]
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
      user_content_workflows: {
        Row: {
          content_type: string
          created_at: string | null
          custom_schedule: Json | null
          id: string
          is_active: boolean | null
          recurrence: string | null
          topic_planning_cadence: string | null
          updated_at: string | null
          user_id: string
          workflow_name: string
        }
        Insert: {
          content_type: string
          created_at?: string | null
          custom_schedule?: Json | null
          id?: string
          is_active?: boolean | null
          recurrence?: string | null
          topic_planning_cadence?: string | null
          updated_at?: string | null
          user_id: string
          workflow_name: string
        }
        Update: {
          content_type?: string
          created_at?: string | null
          custom_schedule?: Json | null
          id?: string
          is_active?: boolean | null
          recurrence?: string | null
          topic_planning_cadence?: string | null
          updated_at?: string | null
          user_id?: string
          workflow_name?: string
        }
        Relationships: []
      }
      user_context_tags: {
        Row: {
          created_at: string | null
          icon: string
          id: string
          label: string
          sort_order: number | null
          user_id: string
          value: string
        }
        Insert: {
          created_at?: string | null
          icon?: string
          id?: string
          label: string
          sort_order?: number | null
          user_id: string
          value: string
        }
        Update: {
          created_at?: string | null
          icon?: string
          id?: string
          label?: string
          sort_order?: number | null
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      user_custom_options: {
        Row: {
          created_at: string | null
          id: string
          option_type: string
          option_value: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_type: string
          option_value: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          option_type?: string
          option_value?: string
          user_id?: string
        }
        Relationships: []
      }
      user_feature_flags: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          key: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_feature_flags_key_fkey"
            columns: ["key"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["key"]
          },
        ]
      }
      user_mastermind_rsvps: {
        Row: {
          added_at: string | null
          event_end: string
          event_id: string
          event_start: string
          event_summary: string
          id: string
          user_id: string
        }
        Insert: {
          added_at?: string | null
          event_end: string
          event_id: string
          event_start: string
          event_summary: string
          id?: string
          user_id: string
        }
        Update: {
          added_at?: string | null
          event_end?: string
          event_id?: string
          event_start?: string
          event_summary?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_monthly_challenges: {
        Row: {
          challenge_type: string
          completed_at: string | null
          enrolled_at: string
          id: string
          project_id: string | null
          status: string
          target_value: number
          template_id: string
          user_id: string
        }
        Insert: {
          challenge_type: string
          completed_at?: string | null
          enrolled_at?: string
          id?: string
          project_id?: string | null
          status?: string
          target_value: number
          template_id: string
          user_id: string
        }
        Update: {
          challenge_type?: string
          completed_at?: string | null
          enrolled_at?: string
          id?: string
          project_id?: string | null
          status?: string
          target_value?: number
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_monthly_challenges_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_monthly_challenges_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "monthly_challenge_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          default_planning_level: string | null
          email: string | null
          id: string
          membership_status: string | null
          membership_tier: string | null
          trial_expires_at: string | null
          trial_started_at: string | null
          updated_at: string
          upgraded_at: string | null
          user_type: string
          workshop_date: string | null
        }
        Insert: {
          created_at?: string
          default_planning_level?: string | null
          email?: string | null
          id: string
          membership_status?: string | null
          membership_tier?: string | null
          trial_expires_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          upgraded_at?: string | null
          user_type?: string
          workshop_date?: string | null
        }
        Update: {
          created_at?: string
          default_planning_level?: string | null
          email?: string | null
          id?: string
          membership_status?: string | null
          membership_tier?: string | null
          trial_expires_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          upgraded_at?: string | null
          user_type?: string
          workshop_date?: string | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          active_theme_id: string | null
          ai_api_key: string | null
          arcade_enabled: boolean | null
          arcade_reduce_motion: boolean | null
          arcade_sounds_off: boolean | null
          celebrations_enabled: boolean
          created_at: string | null
          current_debrief_streak: number | null
          cycle_summary_questions: Json | null
          daily_anchor_enabled: boolean | null
          daily_review_questions: Json | null
          dashboard_widgets: Json | null
          delight_intensity: string
          habit_categories_enabled: boolean | null
          has_seen_tour: boolean | null
          last_debrief_date: string | null
          longest_debrief_streak: number | null
          minimal_mode: boolean | null
          monthly_review_questions: Json | null
          pomodoro_auto_start_break: boolean | null
          pomodoro_break_minutes: number | null
          pomodoro_focus_minutes: number | null
          potions_last_reset: string | null
          quick_mode_default: boolean | null
          reminder_preferences: Json | null
          scratch_pad_review_mode: string | null
          show_coin_counter: boolean | null
          show_income_tracker: boolean | null
          show_mastermind_calls: boolean | null
          show_pet_widget: boolean | null
          show_pomodoro_widget: boolean | null
          sound_enabled: boolean
          streak_potions_remaining: number | null
          theme_preference: string | null
          themes_enabled: boolean
          updated_at: string | null
          user_id: string
          user_level: number | null
          weekly_review_questions: Json | null
          works_weekends: boolean | null
          xp_points: number | null
        }
        Insert: {
          active_theme_id?: string | null
          ai_api_key?: string | null
          arcade_enabled?: boolean | null
          arcade_reduce_motion?: boolean | null
          arcade_sounds_off?: boolean | null
          celebrations_enabled?: boolean
          created_at?: string | null
          current_debrief_streak?: number | null
          cycle_summary_questions?: Json | null
          daily_anchor_enabled?: boolean | null
          daily_review_questions?: Json | null
          dashboard_widgets?: Json | null
          delight_intensity?: string
          habit_categories_enabled?: boolean | null
          has_seen_tour?: boolean | null
          last_debrief_date?: string | null
          longest_debrief_streak?: number | null
          minimal_mode?: boolean | null
          monthly_review_questions?: Json | null
          pomodoro_auto_start_break?: boolean | null
          pomodoro_break_minutes?: number | null
          pomodoro_focus_minutes?: number | null
          potions_last_reset?: string | null
          quick_mode_default?: boolean | null
          reminder_preferences?: Json | null
          scratch_pad_review_mode?: string | null
          show_coin_counter?: boolean | null
          show_income_tracker?: boolean | null
          show_mastermind_calls?: boolean | null
          show_pet_widget?: boolean | null
          show_pomodoro_widget?: boolean | null
          sound_enabled?: boolean
          streak_potions_remaining?: number | null
          theme_preference?: string | null
          themes_enabled?: boolean
          updated_at?: string | null
          user_id: string
          user_level?: number | null
          weekly_review_questions?: Json | null
          works_weekends?: boolean | null
          xp_points?: number | null
        }
        Update: {
          active_theme_id?: string | null
          ai_api_key?: string | null
          arcade_enabled?: boolean | null
          arcade_reduce_motion?: boolean | null
          arcade_sounds_off?: boolean | null
          celebrations_enabled?: boolean
          created_at?: string | null
          current_debrief_streak?: number | null
          cycle_summary_questions?: Json | null
          daily_anchor_enabled?: boolean | null
          daily_review_questions?: Json | null
          dashboard_widgets?: Json | null
          delight_intensity?: string
          habit_categories_enabled?: boolean | null
          has_seen_tour?: boolean | null
          last_debrief_date?: string | null
          longest_debrief_streak?: number | null
          minimal_mode?: boolean | null
          monthly_review_questions?: Json | null
          pomodoro_auto_start_break?: boolean | null
          pomodoro_break_minutes?: number | null
          pomodoro_focus_minutes?: number | null
          potions_last_reset?: string | null
          quick_mode_default?: boolean | null
          reminder_preferences?: Json | null
          scratch_pad_review_mode?: string | null
          show_coin_counter?: boolean | null
          show_income_tracker?: boolean | null
          show_mastermind_calls?: boolean | null
          show_pet_widget?: boolean | null
          show_pomodoro_widget?: boolean | null
          sound_enabled?: boolean
          streak_potions_remaining?: number | null
          theme_preference?: string | null
          themes_enabled?: boolean
          updated_at?: string | null
          user_id?: string
          user_level?: number | null
          weekly_review_questions?: Json | null
          works_weekends?: boolean | null
          xp_points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_active_theme_id_fkey"
            columns: ["active_theme_id"]
            isOneToOne: false
            referencedRelation: "app_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_theme_unlocks: {
        Row: {
          id: string
          source_user_challenge_id: string | null
          theme_id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          id?: string
          source_user_challenge_id?: string | null
          theme_id: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          id?: string
          source_user_challenge_id?: string | null
          theme_id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_theme_unlocks_source_user_challenge_id_fkey"
            columns: ["source_user_challenge_id"]
            isOneToOne: false
            referencedRelation: "user_monthly_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_theme_unlocks_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "app_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_goals: {
        Row: {
          created_at: string
          cycle_id: string | null
          id: string
          practice_thought: string | null
          updated_at: string
          user_id: string
          week_start_date: string
          weekly_goal_text: string | null
        }
        Insert: {
          created_at?: string
          cycle_id?: string | null
          id?: string
          practice_thought?: string | null
          updated_at?: string
          user_id: string
          week_start_date: string
          weekly_goal_text?: string | null
        }
        Update: {
          created_at?: string
          cycle_id?: string | null
          id?: string
          practice_thought?: string | null
          updated_at?: string
          user_id?: string
          week_start_date?: string
          weekly_goal_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_goals_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles_90_day"
            referencedColumns: ["cycle_id"]
          },
        ]
      }
      weekly_plans: {
        Row: {
          adjustments: string | null
          challenges: string | null
          created_at: string | null
          cycle_id: string
          goal_rewrite: string | null
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
          goal_rewrite?: string | null
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
          goal_rewrite?: string | null
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
      weekly_reflections: {
        Row: {
          created_at: string | null
          id: string
          include_goal: boolean | null
          include_prompts: boolean | null
          learned: string | null
          next_week_focus: string | null
          share_count: number | null
          shared_at: string | null
          updated_at: string | null
          user_id: string
          week_start_date: string
          went_well: string | null
          wins: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          include_goal?: boolean | null
          include_prompts?: boolean | null
          learned?: string | null
          next_week_focus?: string | null
          share_count?: number | null
          shared_at?: string | null
          updated_at?: string | null
          user_id: string
          week_start_date: string
          went_well?: string | null
          wins?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          include_goal?: boolean | null
          include_prompts?: boolean | null
          learned?: string | null
          next_week_focus?: string | null
          share_count?: number | null
          shared_at?: string | null
          updated_at?: string | null
          user_id?: string
          week_start_date?: string
          went_well?: string | null
          wins?: string | null
        }
        Relationships: []
      }
      weekly_reviews: {
        Row: {
          adjustments: string | null
          challenges: string | null
          created_at: string | null
          custom_reflections: Json | null
          goal_support: string | null
          habit_summary: Json | null
          metric_1_actual: number | null
          metric_2_actual: number | null
          metric_3_actual: number | null
          metric_4_actual: number | null
          metric_5_actual: number | null
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
          goal_support?: string | null
          habit_summary?: Json | null
          metric_1_actual?: number | null
          metric_2_actual?: number | null
          metric_3_actual?: number | null
          metric_4_actual?: number | null
          metric_5_actual?: number | null
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
          goal_support?: string | null
          habit_summary?: Json | null
          metric_1_actual?: number | null
          metric_2_actual?: number | null
          metric_3_actual?: number | null
          metric_4_actual?: number | null
          metric_5_actual?: number | null
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
      wizard_completions: {
        Row: {
          answers: Json
          completed_at: string | null
          created_at: string | null
          created_cycle_id: string | null
          id: string
          planning_level: string | null
          template_name: string
          user_id: string
        }
        Insert: {
          answers?: Json
          completed_at?: string | null
          created_at?: string | null
          created_cycle_id?: string | null
          id?: string
          planning_level?: string | null
          template_name: string
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          created_at?: string | null
          created_cycle_id?: string | null
          id?: string
          planning_level?: string | null
          template_name?: string
          user_id?: string
        }
        Relationships: []
      }
      wizard_drafts: {
        Row: {
          created_at: string | null
          draft_data: Json
          id: string
          updated_at: string | null
          user_id: string
          wizard_name: string
        }
        Insert: {
          created_at?: string | null
          draft_data?: Json
          id?: string
          updated_at?: string | null
          user_id: string
          wizard_name: string
        }
        Update: {
          created_at?: string | null
          draft_data?: Json
          id?: string
          updated_at?: string | null
          user_id?: string
          wizard_name?: string
        }
        Relationships: []
      }
      wizard_templates: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          estimated_time_minutes: number | null
          icon: string | null
          id: string
          questions: Json
          template_name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          estimated_time_minutes?: number | null
          icon?: string | null
          id?: string
          questions?: Json
          template_name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          estimated_time_minutes?: number | null
          icon?: string | null
          id?: string
          questions?: Json
          template_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_feature_flag: { Args: { p_key: string }; Returns: boolean }
      check_mastermind_entitlement: {
        Args: { user_email: string }
        Returns: boolean
      }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      complete_monthly_challenge_if_ready: {
        Args: { p_user_challenge_id: string }
        Returns: Json
      }
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
      create_default_project_board: {
        Args: { p_user_id: string }
        Returns: string
      }
      evaluate_habit_color: {
        Args: { p_date: string; p_user_id: string }
        Returns: string
      }
      generate_course_study_sessions: {
        Args: {
          p_client_op_id: string
          p_course_id: string
          p_from_date?: string
          p_plan_id: string
          p_weeks?: number
        }
        Returns: Json
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
      get_monthly_challenge_progress: {
        Args: { p_user_challenge_id: string }
        Returns: Json
      }
      get_user_entitlement: {
        Args: { user_email: string }
        Returns: {
          ends_at: string
          id: string
          starts_at: string
          status: string
          tier: string
        }[]
      }
      is_admin: { Args: { check_user_id: string }; Returns: boolean }
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
