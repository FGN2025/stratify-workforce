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
        }
        Relationships: []
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
          expires_at: string | null
          id: string
          issued_at: string
          issuer: string | null
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
          expires_at?: string | null
          id?: string
          issued_at?: string
          issuer?: string | null
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
          expires_at?: string | null
          id?: string
          issued_at?: string
          issuer?: string | null
          metadata?: Json | null
          passport_id?: string
          score?: number | null
          skills_verified?: string[] | null
          title?: string
          verification_hash?: string
        }
        Relationships: [
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
          brand_color: string
          created_at: string
          game_titles: Database["public"]["Enums"]["game_title"][] | null
          id: string
          logo_url: string | null
          name: string
          slug: string
        }
        Insert: {
          brand_color?: string
          created_at?: string
          game_titles?: Database["public"]["Enums"]["game_title"][] | null
          id?: string
          logo_url?: string | null
          name: string
          slug: string
        }
        Update: {
          brand_color?: string
          created_at?: string
          game_titles?: Database["public"]["Enums"]["game_title"][] | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
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
      work_orders: {
        Row: {
          created_at: string
          description: string | null
          game_title: Database["public"]["Enums"]["game_title"]
          id: string
          is_active: boolean | null
          success_criteria: Json | null
          tenant_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          game_title: Database["public"]["Enums"]["game_title"]
          id?: string
          is_active?: boolean | null
          success_criteria?: Json | null
          tenant_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          game_title?: Database["public"]["Enums"]["game_title"]
          id?: string
          is_active?: boolean | null
          success_criteria?: Json | null
          tenant_id?: string | null
          title?: string
        }
        Relationships: [
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
      get_course_progress: {
        Args: { p_course_id: string; p_user_id: string }
        Returns: number
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
      app_role: "admin" | "moderator" | "user"
      credential_type:
        | "course_completion"
        | "certification"
        | "badge"
        | "skill_verification"
      difficulty_level: "beginner" | "intermediate" | "advanced"
      game_title: "ATS" | "Farming_Sim" | "Construction_Sim" | "Mechanic_Sim"
      lesson_type: "video" | "reading" | "quiz" | "simulation" | "work_order"
      points_type: "xp" | "credits" | "tokens"
      progress_status: "not_started" | "in_progress" | "completed" | "failed"
      source_type:
        | "lesson"
        | "module"
        | "course"
        | "achievement"
        | "bonus"
        | "redemption"
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
      app_role: ["admin", "moderator", "user"],
      credential_type: [
        "course_completion",
        "certification",
        "badge",
        "skill_verification",
      ],
      difficulty_level: ["beginner", "intermediate", "advanced"],
      game_title: ["ATS", "Farming_Sim", "Construction_Sim", "Mechanic_Sim"],
      lesson_type: ["video", "reading", "quiz", "simulation", "work_order"],
      points_type: ["xp", "credits", "tokens"],
      progress_status: ["not_started", "in_progress", "completed", "failed"],
      source_type: [
        "lesson",
        "module",
        "course",
        "achievement",
        "bonus",
        "redemption",
      ],
    },
  },
} as const
