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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          category: Database["public"]["Enums"]["achievement_category"]
          created_at: string
          description: string | null
          icon_name: string
          id: string
          is_active: boolean
          name: string
          rarity: Database["public"]["Enums"]["achievement_rarity"]
          trigger_type: Database["public"]["Enums"]["achievement_trigger"]
          trigger_value: Json
          xp_reward: number
        }
        Insert: {
          category?: Database["public"]["Enums"]["achievement_category"]
          created_at?: string
          description?: string | null
          icon_name?: string
          id?: string
          is_active?: boolean
          name: string
          rarity?: Database["public"]["Enums"]["achievement_rarity"]
          trigger_type: Database["public"]["Enums"]["achievement_trigger"]
          trigger_value?: Json
          xp_reward?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["achievement_category"]
          created_at?: string
          description?: string | null
          icon_name?: string
          id?: string
          is_active?: boolean
          name?: string
          rarity?: Database["public"]["Enums"]["achievement_rarity"]
          trigger_type?: Database["public"]["Enums"]["achievement_trigger"]
          trigger_value?: Json
          xp_reward?: number
        }
        Relationships: []
      }
      ai_model_configs: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_default: boolean
          is_enabled: boolean
          max_tokens: number
          model_id: string
          provider: string
          updated_at: string
          use_for: string[]
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          is_default?: boolean
          is_enabled?: boolean
          max_tokens?: number
          model_id: string
          provider: string
          updated_at?: string
          use_for?: string[]
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_default?: boolean
          is_enabled?: boolean
          max_tokens?: number
          model_id?: string
          provider?: string
          updated_at?: string
          use_for?: string[]
        }
        Relationships: []
      }
      ai_persona_configs: {
        Row: {
          context_type: string
          created_at: string
          id: string
          is_active: boolean
          model_override: string | null
          persona_name: string
          system_prompt: string
          updated_at: string
        }
        Insert: {
          context_type: string
          created_at?: string
          id?: string
          is_active?: boolean
          model_override?: string | null
          persona_name: string
          system_prompt: string
          updated_at?: string
        }
        Update: {
          context_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          model_override?: string | null
          persona_name?: string
          system_prompt?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_platform_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      authorized_apps: {
        Row: {
          allowed_origins: string[]
          api_key_hash: string
          app_name: string
          app_slug: string
          can_issue_credentials: boolean
          can_read_credentials: boolean
          created_at: string
          credential_types_allowed: string[]
          id: string
          is_active: boolean
          owner_id: string | null
          updated_at: string
        }
        Insert: {
          allowed_origins?: string[]
          api_key_hash: string
          app_name: string
          app_slug: string
          can_issue_credentials?: boolean
          can_read_credentials?: boolean
          created_at?: string
          credential_types_allowed?: string[]
          id?: string
          is_active?: boolean
          owner_id?: string | null
          updated_at?: string
        }
        Update: {
          allowed_origins?: string[]
          api_key_hash?: string
          app_name?: string
          app_slug?: string
          can_issue_credentials?: boolean
          can_read_credentials?: boolean
          created_at?: string
          credential_types_allowed?: string[]
          id?: string
          is_active?: boolean
          owner_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          accent_color: string
          category: string
          created_at: string
          description: string | null
          game_title: Database["public"]["Enums"]["game_title"] | null
          icon_name: string
          id: string
          name: string
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          accent_color?: string
          category?: string
          created_at?: string
          description?: string | null
          game_title?: Database["public"]["Enums"]["game_title"] | null
          icon_name: string
          id?: string
          name: string
          requirement_type: string
          requirement_value?: number
        }
        Update: {
          accent_color?: string
          category?: string
          created_at?: string
          description?: string | null
          game_title?: Database["public"]["Enums"]["game_title"] | null
          icon_name?: string
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      channel_posts: {
        Row: {
          channel_game: Database["public"]["Enums"]["game_title"]
          content: string
          created_at: string
          id: string
          likes_count: number
          media_urls: string[] | null
          user_id: string
        }
        Insert: {
          channel_game: Database["public"]["Enums"]["game_title"]
          content: string
          created_at?: string
          id?: string
          likes_count?: number
          media_urls?: string[] | null
          user_id: string
        }
        Update: {
          channel_game?: Database["public"]["Enums"]["game_title"]
          content?: string
          created_at?: string
          id?: string
          likes_count?: number
          media_urls?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      channel_subscriptions: {
        Row: {
          created_at: string
          game_title: Database["public"]["Enums"]["game_title"]
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          game_title: Database["public"]["Enums"]["game_title"]
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          game_title?: Database["public"]["Enums"]["game_title"]
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      community_memberships: {
        Row: {
          id: string
          joined_at: string
          request_status: Database["public"]["Enums"]["membership_request_status"]
          requested_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          role: Database["public"]["Enums"]["community_membership_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          request_status?: Database["public"]["Enums"]["membership_request_status"]
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          role?: Database["public"]["Enums"]["community_membership_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          request_status?: Database["public"]["Enums"]["membership_request_status"]
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          role?: Database["public"]["Enums"]["community_membership_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          difficulty_level: Database["public"]["Enums"]["difficulty_level"]
          estimated_hours: number | null
          id: string
          is_published: boolean
          tenant_id: string | null
          title: string
          updated_at: string
          xp_reward: number
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: Database["public"]["Enums"]["difficulty_level"]
          estimated_hours?: number | null
          id?: string
          is_published?: boolean
          tenant_id?: string | null
          title: string
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: Database["public"]["Enums"]["difficulty_level"]
          estimated_hours?: number | null
          id?: string
          is_published?: boolean
          tenant_id?: string | null
          title?: string
          updated_at?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "courses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      credential_types: {
        Row: {
          accent_color: string
          created_at: string
          description: string | null
          display_name: string
          game_title: Database["public"]["Enums"]["game_title"] | null
          icon_name: string
          id: string
          is_active: boolean
          issuer_app_slug: string | null
          skills_granted: string[]
          sort_order: number
          type_key: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          created_at?: string
          description?: string | null
          display_name: string
          game_title?: Database["public"]["Enums"]["game_title"] | null
          icon_name?: string
          id?: string
          is_active?: boolean
          issuer_app_slug?: string | null
          skills_granted?: string[]
          sort_order?: number
          type_key: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          created_at?: string
          description?: string | null
          display_name?: string
          game_title?: Database["public"]["Enums"]["game_title"] | null
          icon_name?: string
          id?: string
          is_active?: boolean
          issuer_app_slug?: string | null
          skills_granted?: string[]
          sort_order?: number
          type_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credential_types_issuer_app_slug_fkey"
            columns: ["issuer_app_slug"]
            isOneToOne: false
            referencedRelation: "authorized_apps"
            referencedColumns: ["app_slug"]
          },
        ]
      }
      event_matches: {
        Row: {
          created_at: string
          event_id: string
          id: string
          match_order: number
          player1_id: string | null
          player1_score: number | null
          player2_id: string | null
          player2_score: number | null
          round_number: number
          scheduled_time: string | null
          status: Database["public"]["Enums"]["match_status"]
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          match_order: number
          player1_id?: string | null
          player1_score?: number | null
          player2_id?: string | null
          player2_score?: number | null
          round_number: number
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          match_order?: number
          player1_id?: string | null
          player1_score?: number | null
          player2_id?: string | null
          player2_score?: number | null
          round_number?: number
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_matches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          bracket_seed: number | null
          event_id: string
          id: string
          registered_at: string
          status: Database["public"]["Enums"]["registration_status"]
          user_id: string
        }
        Insert: {
          bracket_seed?: number | null
          event_id: string
          id?: string
          registered_at?: string
          status?: Database["public"]["Enums"]["registration_status"]
          user_id: string
        }
        Update: {
          bracket_seed?: number | null
          event_id?: string
          id?: string
          registered_at?: string
          status?: Database["public"]["Enums"]["registration_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          google_calendar_event_id: string | null
          id: string
          max_participants: number | null
          min_participants: number | null
          registration_deadline: string | null
          scheduled_end: string
          scheduled_start: string
          status: Database["public"]["Enums"]["event_status"]
          tenant_id: string | null
          title: string
          updated_at: string
          winner_id: string | null
          work_order_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          google_calendar_event_id?: string | null
          id?: string
          max_participants?: number | null
          min_participants?: number | null
          registration_deadline?: string | null
          scheduled_end: string
          scheduled_start: string
          status?: Database["public"]["Enums"]["event_status"]
          tenant_id?: string | null
          title: string
          updated_at?: string
          winner_id?: string | null
          work_order_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          google_calendar_event_id?: string | null
          id?: string
          max_participants?: number | null
          min_participants?: number | null
          registration_deadline?: string | null
          scheduled_end?: string
          scheduled_start?: string
          status?: Database["public"]["Enums"]["event_status"]
          tenant_id?: string | null
          title?: string
          updated_at?: string
          winner_id?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      game_channels: {
        Row: {
          accent_color: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          game_title: Database["public"]["Enums"]["game_title"]
          id: string
          member_count: number
          name: string
          work_order_count: number
        }
        Insert: {
          accent_color?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          game_title: Database["public"]["Enums"]["game_title"]
          id?: string
          member_count?: number
          name: string
          work_order_count?: number
        }
        Update: {
          accent_color?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          game_title?: Database["public"]["Enums"]["game_title"]
          id?: string
          member_count?: number
          name?: string
          work_order_count?: number
        }
        Relationships: []
      }
      leaderboard_embed_configs: {
        Row: {
          created_at: string
          created_by: string
          display_count: number
          embed_token: string
          expires_at: string | null
          game_title: Database["public"]["Enums"]["game_title"] | null
          id: string
          is_active: boolean
          show_avatars: boolean
          show_change: boolean
          tenant_id: string | null
          theme: string
          title: string
          work_order_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          display_count?: number
          embed_token?: string
          expires_at?: string | null
          game_title?: Database["public"]["Enums"]["game_title"] | null
          id?: string
          is_active?: boolean
          show_avatars?: boolean
          show_change?: boolean
          tenant_id?: string | null
          theme?: string
          title: string
          work_order_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          display_count?: number
          embed_token?: string
          expires_at?: string | null
          game_title?: Database["public"]["Enums"]["game_title"] | null
          id?: string
          is_active?: boolean
          show_avatars?: boolean
          show_change?: boolean
          tenant_id?: string | null
          theme?: string
          title?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_embed_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboard_embed_configs_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content: Json | null
          created_at: string
          duration_minutes: number | null
          id: string
          lesson_type: Database["public"]["Enums"]["lesson_type"]
          module_id: string
          order_index: number
          passing_score: number | null
          title: string
          updated_at: string
          work_order_id: string | null
          xp_reward: number
        }
        Insert: {
          content?: Json | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          lesson_type?: Database["public"]["Enums"]["lesson_type"]
          module_id: string
          order_index?: number
          passing_score?: number | null
          title: string
          updated_at?: string
          work_order_id?: string | null
          xp_reward?: number
        }
        Update: {
          content?: Json | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          lesson_type?: Database["public"]["Enums"]["lesson_type"]
          module_id?: string
          order_index?: number
          passing_score?: number | null
          title?: string
          updated_at?: string
          work_order_id?: string | null
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          order_index: number
          title: string
          updated_at: string
          xp_reward: number
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title: string
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title?: string
          updated_at?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          employability_score: number | null
          id: string
          skills: Json | null
          tenant_id: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          employability_score?: number | null
          id: string
          skills?: Json | null
          tenant_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          employability_score?: number | null
          id?: string
          skills?: Json | null
          tenant_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          current_uses: number
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          tenant_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          current_uses?: number
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          tenant_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          current_uses?: number
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registration_codes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sim_resources: {
        Row: {
          accent_color: string
          created_at: string
          description: string | null
          game_title: Database["public"]["Enums"]["game_title"]
          href: string
          icon_name: string
          id: string
          is_active: boolean
          media_id: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          created_at?: string
          description?: string | null
          game_title: Database["public"]["Enums"]["game_title"]
          href: string
          icon_name?: string
          id?: string
          is_active?: boolean
          media_id?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          created_at?: string
          description?: string | null
          game_title?: Database["public"]["Enums"]["game_title"]
          href?: string
          icon_name?: string
          id?: string
          is_active?: boolean
          media_id?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sim_resources_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "site_media"
            referencedColumns: ["id"]
          },
        ]
      }
      site_media: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          is_active: boolean
          location_key: string
          media_type: string
          metadata: Json | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          location_key: string
          media_type: string
          metadata?: Json | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          location_key?: string
          media_type?: string
          metadata?: Json | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      skill_credentials: {
        Row: {
          created_at: string
          credential_type: Database["public"]["Enums"]["credential_type"]
          credential_type_key: string | null
          expires_at: string | null
          external_reference_id: string | null
          game_title: Database["public"]["Enums"]["game_title"] | null
          id: string
          issued_at: string
          issuer: string | null
          issuer_app_slug: string | null
          metadata: Json | null
          passport_id: string
          score: number | null
          skills_verified: string[] | null
          title: string
          verification_hash: string
        }
        Insert: {
          created_at?: string
          credential_type: Database["public"]["Enums"]["credential_type"]
          credential_type_key?: string | null
          expires_at?: string | null
          external_reference_id?: string | null
          game_title?: Database["public"]["Enums"]["game_title"] | null
          id?: string
          issued_at?: string
          issuer?: string | null
          issuer_app_slug?: string | null
          metadata?: Json | null
          passport_id: string
          score?: number | null
          skills_verified?: string[] | null
          title: string
          verification_hash: string
        }
        Update: {
          created_at?: string
          credential_type?: Database["public"]["Enums"]["credential_type"]
          credential_type_key?: string | null
          expires_at?: string | null
          external_reference_id?: string | null
          game_title?: Database["public"]["Enums"]["game_title"] | null
          id?: string
          issued_at?: string
          issuer?: string | null
          issuer_app_slug?: string | null
          metadata?: Json | null
          passport_id?: string
          score?: number | null
          skills_verified?: string[] | null
          title?: string
          verification_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_credentials_credential_type_key_fkey"
            columns: ["credential_type_key"]
            isOneToOne: false
            referencedRelation: "credential_types"
            referencedColumns: ["type_key"]
          },
          {
            foreignKeyName: "skill_credentials_issuer_app_slug_fkey"
            columns: ["issuer_app_slug"]
            isOneToOne: false
            referencedRelation: "authorized_apps"
            referencedColumns: ["app_slug"]
          },
          {
            foreignKeyName: "skill_credentials_passport_id_fkey"
            columns: ["passport_id"]
            isOneToOne: false
            referencedRelation: "skill_passport"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_passport: {
        Row: {
          created_at: string
          id: string
          is_public: boolean
          passport_hash: string
          public_url_slug: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_public?: boolean
          passport_hash: string
          public_url_slug?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_public?: boolean
          passport_hash?: string
          public_url_slug?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      skills_taxonomy: {
        Row: {
          category: string
          created_at: string
          description: string | null
          game_title: Database["public"]["Enums"]["game_title"]
          id: string
          is_active: boolean
          skill_key: string
          skill_name: string
          sort_order: number
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          game_title: Database["public"]["Enums"]["game_title"]
          id?: string
          is_active?: boolean
          skill_key: string
          skill_name: string
          sort_order?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          game_title?: Database["public"]["Enums"]["game_title"]
          id?: string
          is_active?: boolean
          skill_key?: string
          skill_name?: string
          sort_order?: number
        }
        Relationships: []
      }
      system_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: []
      }
      telemetry_sessions: {
        Row: {
          completed_at: string | null
          final_score: number | null
          id: string
          raw_data: Json | null
          started_at: string
          user_id: string
          work_order_id: string | null
        }
        Insert: {
          completed_at?: string | null
          final_score?: number | null
          id?: string
          raw_data?: Json | null
          started_at?: string
          user_id: string
          work_order_id?: string | null
        }
        Update: {
          completed_at?: string | null
          final_score?: number | null
          id?: string
          raw_data?: Json | null
          started_at?: string
          user_id?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telemetry_sessions_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          approval_status: Database["public"]["Enums"]["community_approval_status"]
          brand_color: string
          category_type:
            | Database["public"]["Enums"]["community_category_type"]
            | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          game_titles: Database["public"]["Enums"]["game_title"][] | null
          hierarchy_level: number
          id: string
          is_verified: boolean
          location: string | null
          logo_url: string | null
          member_count: number
          name: string
          owner_id: string | null
          parent_tenant_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          slug: string
          submitted_at: string | null
          website_url: string | null
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["community_approval_status"]
          brand_color?: string
          category_type?:
            | Database["public"]["Enums"]["community_category_type"]
            | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          game_titles?: Database["public"]["Enums"]["game_title"][] | null
          hierarchy_level?: number
          id?: string
          is_verified?: boolean
          location?: string | null
          logo_url?: string | null
          member_count?: number
          name: string
          owner_id?: string | null
          parent_tenant_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          slug: string
          submitted_at?: string | null
          website_url?: string | null
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["community_approval_status"]
          brand_color?: string
          category_type?:
            | Database["public"]["Enums"]["community_category_type"]
            | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          game_titles?: Database["public"]["Enums"]["game_title"][] | null
          hierarchy_level?: number
          id?: string
          is_verified?: boolean
          location?: string | null
          logo_url?: string | null
          member_count?: number
          name?: string
          owner_id?: string | null
          parent_tenant_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          slug?: string
          submitted_at?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_parent_tenant_id_fkey"
            columns: ["parent_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_conversations: {
        Row: {
          context_id: string | null
          context_type: string
          created_at: string
          game_title: string | null
          id: string
          is_active: boolean
          message_count: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          context_id?: string | null
          context_type?: string
          created_at?: string
          game_title?: string | null
          id?: string
          is_active?: boolean
          message_count?: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          context_id?: string | null
          context_type?: string
          created_at?: string
          game_title?: string | null
          id?: string
          is_active?: boolean
          message_count?: number
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tutor_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "tutor_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_addresses: {
        Row: {
          city: string
          created_at: string
          discord_id: string | null
          full_name: string
          id: string
          is_validated: boolean
          override_code_id: string | null
          smarty_response: Json | null
          state: string
          street_address: string
          tenant_id: string | null
          updated_at: string
          user_id: string
          zip_code: string
        }
        Insert: {
          city: string
          created_at?: string
          discord_id?: string | null
          full_name: string
          id?: string
          is_validated?: boolean
          override_code_id?: string | null
          smarty_response?: Json | null
          state: string
          street_address: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
          zip_code: string
        }
        Update: {
          city?: string
          created_at?: string
          discord_id?: string | null
          full_name?: string
          id?: string
          is_validated?: boolean
          override_code_id?: string | null
          smarty_response?: Json | null
          state?: string
          street_address?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_addresses_override_code_id_fkey"
            columns: ["override_code_id"]
            isOneToOne: false
            referencedRelation: "registration_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_addresses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          game_title: Database["public"]["Enums"]["game_title"] | null
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          game_title?: Database["public"]["Enums"]["game_title"] | null
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          game_title?: Database["public"]["Enums"]["game_title"] | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_course_enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          current_lesson_id: string | null
          current_module_id: string | null
          enrolled_at: string
          id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          current_lesson_id?: string | null
          current_module_id?: string | null
          enrolled_at?: string
          id?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          current_lesson_id?: string | null
          current_module_id?: string | null
          enrolled_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_course_enrollments_current_lesson_id_fkey"
            columns: ["current_lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_course_enrollments_current_module_id_fkey"
            columns: ["current_module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_discord_connections: {
        Row: {
          access_token: string
          connected_at: string
          created_at: string
          discord_accent_color: number | null
          discord_avatar_hash: string | null
          discord_banner_hash: string | null
          discord_discriminator: string | null
          discord_global_name: string | null
          discord_id: string
          discord_username: string
          id: string
          is_active: boolean
          last_synced_at: string | null
          refresh_token: string
          scopes: string[]
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          connected_at?: string
          created_at?: string
          discord_accent_color?: number | null
          discord_avatar_hash?: string | null
          discord_banner_hash?: string | null
          discord_discriminator?: string | null
          discord_global_name?: string | null
          discord_id: string
          discord_username: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          refresh_token: string
          scopes?: string[]
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          connected_at?: string
          created_at?: string
          discord_accent_color?: number | null
          discord_avatar_hash?: string | null
          discord_banner_hash?: string | null
          discord_discriminator?: string | null
          discord_global_name?: string | null
          discord_id?: string
          discord_username?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          refresh_token?: string
          scopes?: string[]
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_game_stats: {
        Row: {
          best_score: number | null
          created_at: string
          game_title: Database["public"]["Enums"]["game_title"]
          id: string
          last_played_at: string | null
          total_play_time_minutes: number
          total_score: number
          total_sessions: number
          updated_at: string
          user_id: string
          work_orders_completed: number
        }
        Insert: {
          best_score?: number | null
          created_at?: string
          game_title: Database["public"]["Enums"]["game_title"]
          id?: string
          last_played_at?: string | null
          total_play_time_minutes?: number
          total_score?: number
          total_sessions?: number
          updated_at?: string
          user_id: string
          work_orders_completed?: number
        }
        Update: {
          best_score?: number | null
          created_at?: string
          game_title?: Database["public"]["Enums"]["game_title"]
          id?: string
          last_played_at?: string | null
          total_play_time_minutes?: number
          total_score?: number
          total_sessions?: number
          updated_at?: string
          user_id?: string
          work_orders_completed?: number
        }
        Relationships: []
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          tenant_id: string | null
          username: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          tenant_id?: string | null
          username?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          tenant_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_lesson_progress: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          score: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["progress_status"]
          updated_at: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["progress_status"]
          updated_at?: string
          user_id: string
          xp_earned?: number
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["progress_status"]
          updated_at?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_points: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          points_type: Database["public"]["Enums"]["points_type"]
          source_id: string | null
          source_type: Database["public"]["Enums"]["source_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          points_type?: Database["public"]["Enums"]["points_type"]
          source_id?: string | null
          source_type: Database["public"]["Enums"]["source_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          points_type?: Database["public"]["Enums"]["points_type"]
          source_id?: string | null
          source_type?: Database["public"]["Enums"]["source_type"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_work_order_completions: {
        Row: {
          attempt_number: number
          completed_at: string | null
          created_at: string
          id: string
          metadata: Json | null
          score: number | null
          started_at: string
          status: Database["public"]["Enums"]["completion_status"]
          user_id: string
          work_order_id: string
          xp_awarded: number | null
        }
        Insert: {
          attempt_number?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["completion_status"]
          user_id: string
          work_order_id: string
          xp_awarded?: number | null
        }
        Update: {
          attempt_number?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["completion_status"]
          user_id?: string
          work_order_id?: string
          xp_awarded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_work_order_completions_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_evidence: {
        Row: {
          completion_id: string
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          metadata: Json | null
          review_status: Database["public"]["Enums"]["evidence_review_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          uploaded_at: string
          user_id: string
          work_order_id: string
        }
        Insert: {
          completion_id: string
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          metadata?: Json | null
          review_status?: Database["public"]["Enums"]["evidence_review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          uploaded_at?: string
          user_id: string
          work_order_id: string
        }
        Update: {
          completion_id?: string
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          metadata?: Json | null
          review_status?: Database["public"]["Enums"]["evidence_review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          uploaded_at?: string
          user_id?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_evidence_completion_id_fkey"
            columns: ["completion_id"]
            isOneToOne: false
            referencedRelation: "user_work_order_completions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_evidence_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          channel_id: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          difficulty: Database["public"]["Enums"]["work_order_difficulty"]
          estimated_time_minutes: number | null
          evidence_requirements: Json | null
          game_title: Database["public"]["Enums"]["game_title"]
          id: string
          is_active: boolean | null
          max_attempts: number | null
          success_criteria: Json | null
          tenant_id: string | null
          title: string
          xp_reward: number
        }
        Insert: {
          channel_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["work_order_difficulty"]
          estimated_time_minutes?: number | null
          evidence_requirements?: Json | null
          game_title: Database["public"]["Enums"]["game_title"]
          id?: string
          is_active?: boolean | null
          max_attempts?: number | null
          success_criteria?: Json | null
          tenant_id?: string | null
          title: string
          xp_reward?: number
        }
        Update: {
          channel_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["work_order_difficulty"]
          estimated_time_minutes?: number | null
          evidence_requirements?: Json | null
          game_title?: Database["public"]["Enums"]["game_title"]
          id?: string
          is_active?: boolean | null
          max_attempts?: number | null
          success_criteria?: Json | null
          tenant_id?: string | null
          title?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "game_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_profile: {
        Args: { profile_id: string; viewer_id: string }
        Returns: boolean
      }
      generate_app_api_key: { Args: { p_app_id: string }; Returns: string }
      get_child_tenants: { Args: { p_tenant_id: string }; Returns: string[] }
      get_course_progress: {
        Args: { p_course_id: string; p_user_id: string }
        Returns: number
      }
      get_parent_tenants: { Args: { p_tenant_id: string }; Returns: string[] }
      get_public_profile_data: {
        Args: { profile_ids?: string[] }
        Returns: {
          avatar_url: string
          id: string
          username: string
        }[]
      }
      get_user_level: { Args: { p_user_id: string }; Returns: number }
      get_user_total_xp: { Args: { p_user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tenant_role: {
        Args: {
          p_role: Database["public"]["Enums"]["community_membership_role"]
          p_tenant_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      is_tenant_admin: {
        Args: { p_tenant_id: string; p_user_id: string }
        Returns: boolean
      }
      redeem_registration_code: { Args: { p_code: string }; Returns: string }
      verify_app_api_key: {
        Args: { p_api_key: string }
        Returns: {
          app_slug: string
          can_issue: boolean
          can_read: boolean
          types_allowed: string[]
        }[]
      }
    }
    Enums: {
      achievement_category: "mastery" | "streak" | "social" | "special"
      achievement_rarity: "common" | "rare" | "epic" | "legendary"
      achievement_trigger:
        | "points"
        | "lessons"
        | "courses"
        | "time"
        | "score"
        | "streak"
      app_role: "admin" | "moderator" | "user" | "super_admin" | "developer"
      community_approval_status:
        | "pending"
        | "approved"
        | "rejected"
        | "needs_revision"
      community_category_type:
        | "geography"
        | "broadband_provider"
        | "trade_skill"
        | "school"
        | "employer"
        | "training_center"
        | "government"
        | "nonprofit"
      community_membership_role:
        | "member"
        | "moderator"
        | "admin"
        | "student"
        | "employee"
        | "apprentice"
        | "instructor"
        | "manager"
        | "subscriber"
        | "owner"
      completion_status: "in_progress" | "completed" | "failed"
      credential_type:
        | "course_completion"
        | "certification"
        | "badge"
        | "skill_verification"
      difficulty_level: "beginner" | "intermediate" | "advanced"
      event_status:
        | "draft"
        | "published"
        | "registration_open"
        | "in_progress"
        | "completed"
        | "cancelled"
      event_type: "quest" | "head_to_head"
      evidence_review_status:
        | "pending"
        | "approved"
        | "rejected"
        | "needs_revision"
      game_title:
        | "ATS"
        | "Farming_Sim"
        | "Construction_Sim"
        | "Mechanic_Sim"
        | "Fiber_Tech"
      invitation_status: "pending" | "accepted" | "expired" | "revoked"
      lesson_type: "video" | "reading" | "quiz" | "simulation" | "work_order"
      match_status: "pending" | "in_progress" | "completed"
      membership_request_status: "pending" | "approved" | "rejected"
      points_type: "xp" | "credits" | "tokens"
      progress_status: "not_started" | "in_progress" | "completed" | "failed"
      registration_status: "registered" | "confirmed" | "cancelled" | "no_show"
      source_type:
        | "lesson"
        | "module"
        | "course"
        | "achievement"
        | "bonus"
        | "redemption"
        | "work_order"
      work_order_difficulty: "beginner" | "intermediate" | "advanced"
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
    Enums: {
      achievement_category: ["mastery", "streak", "social", "special"],
      achievement_rarity: ["common", "rare", "epic", "legendary"],
      achievement_trigger: [
        "points",
        "lessons",
        "courses",
        "time",
        "score",
        "streak",
      ],
      app_role: ["admin", "moderator", "user", "super_admin", "developer"],
      community_approval_status: [
        "pending",
        "approved",
        "rejected",
        "needs_revision",
      ],
      community_category_type: [
        "geography",
        "broadband_provider",
        "trade_skill",
        "school",
        "employer",
        "training_center",
        "government",
        "nonprofit",
      ],
      community_membership_role: [
        "member",
        "moderator",
        "admin",
        "student",
        "employee",
        "apprentice",
        "instructor",
        "manager",
        "subscriber",
        "owner",
      ],
      completion_status: ["in_progress", "completed", "failed"],
      credential_type: [
        "course_completion",
        "certification",
        "badge",
        "skill_verification",
      ],
      difficulty_level: ["beginner", "intermediate", "advanced"],
      event_status: [
        "draft",
        "published",
        "registration_open",
        "in_progress",
        "completed",
        "cancelled",
      ],
      event_type: ["quest", "head_to_head"],
      evidence_review_status: [
        "pending",
        "approved",
        "rejected",
        "needs_revision",
      ],
      game_title: [
        "ATS",
        "Farming_Sim",
        "Construction_Sim",
        "Mechanic_Sim",
        "Fiber_Tech",
      ],
      invitation_status: ["pending", "accepted", "expired", "revoked"],
      lesson_type: ["video", "reading", "quiz", "simulation", "work_order"],
      match_status: ["pending", "in_progress", "completed"],
      membership_request_status: ["pending", "approved", "rejected"],
      points_type: ["xp", "credits", "tokens"],
      progress_status: ["not_started", "in_progress", "completed", "failed"],
      registration_status: ["registered", "confirmed", "cancelled", "no_show"],
      source_type: [
        "lesson",
        "module",
        "course",
        "achievement",
        "bonus",
        "redemption",
        "work_order",
      ],
      work_order_difficulty: ["beginner", "intermediate", "advanced"],
    },
  },
} as const
