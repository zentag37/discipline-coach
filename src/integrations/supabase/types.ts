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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          details: Json | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          announcement_enabled: boolean
          announcement_text: string
          default_plan: string
          feature_api_access: boolean
          feature_pdf_reports: boolean
          feature_prop_team: boolean
          id: number
          maintenance_mode: boolean
          updated_at: string
        }
        Insert: {
          announcement_enabled?: boolean
          announcement_text?: string
          default_plan?: string
          feature_api_access?: boolean
          feature_pdf_reports?: boolean
          feature_prop_team?: boolean
          id?: number
          maintenance_mode?: boolean
          updated_at?: string
        }
        Update: {
          announcement_enabled?: boolean
          announcement_text?: string
          default_plan?: string
          feature_api_access?: boolean
          feature_pdf_reports?: boolean
          feature_prop_team?: boolean
          id?: number
          maintenance_mode?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          admin_response: string | null
          category: Database["public"]["Enums"]["feedback_category"]
          created_at: string
          id: string
          message: string
          responded_at: string | null
          responded_by: string | null
          status: Database["public"]["Enums"]["feedback_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          category?: Database["public"]["Enums"]["feedback_category"]
          created_at?: string
          id?: string
          message: string
          responded_at?: string | null
          responded_by?: string | null
          status?: Database["public"]["Enums"]["feedback_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          category?: Database["public"]["Enums"]["feedback_category"]
          created_at?: string
          id?: string
          message?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: Database["public"]["Enums"]["feedback_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_reviews: {
        Row: {
          ace_review: string | null
          avg_rr: number | null
          created_at: string
          focus_next_week: string | null
          id: string
          losses: number | null
          net_pnl: number | null
          total_trades: number | null
          user_id: string
          week_end: string | null
          week_start: string | null
          win_rate: number | null
          wins: number | null
        }
        Insert: {
          ace_review?: string | null
          avg_rr?: number | null
          created_at?: string
          focus_next_week?: string | null
          id?: string
          losses?: number | null
          net_pnl?: number | null
          total_trades?: number | null
          user_id: string
          week_end?: string | null
          week_start?: string | null
          win_rate?: number | null
          wins?: number | null
        }
        Update: {
          ace_review?: string | null
          avg_rr?: number | null
          created_at?: string
          focus_next_week?: string | null
          id?: string
          losses?: number | null
          net_pnl?: number | null
          total_trades?: number | null
          user_id?: string
          week_end?: string | null
          week_start?: string | null
          win_rate?: number | null
          wins?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_size: string | null
          assets: string[] | null
          broker: string | null
          country: string | null
          created_at: string
          daily_loss_limit: number | null
          experience: string | null
          full_name: string | null
          id: string
          instruments: string | null
          language: string | null
          max_trades: number | null
          onboarded: boolean
          plan: string
          platform: string | null
          prop_firm: string | null
          prop_firm_name: string | null
          risk_per_trade: number | null
          session: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          style: string | null
          subscription_status: string | null
          timezone: string | null
          updated_at: string
          voice_consent_decided: boolean
          voice_enabled: boolean | null
          voice_style: string | null
        }
        Insert: {
          account_size?: string | null
          assets?: string[] | null
          broker?: string | null
          country?: string | null
          created_at?: string
          daily_loss_limit?: number | null
          experience?: string | null
          full_name?: string | null
          id: string
          instruments?: string | null
          language?: string | null
          max_trades?: number | null
          onboarded?: boolean
          plan?: string
          platform?: string | null
          prop_firm?: string | null
          prop_firm_name?: string | null
          risk_per_trade?: number | null
          session?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          style?: string | null
          subscription_status?: string | null
          timezone?: string | null
          updated_at?: string
          voice_consent_decided?: boolean
          voice_enabled?: boolean | null
          voice_style?: string | null
        }
        Update: {
          account_size?: string | null
          assets?: string[] | null
          broker?: string | null
          country?: string | null
          created_at?: string
          daily_loss_limit?: number | null
          experience?: string | null
          full_name?: string | null
          id?: string
          instruments?: string | null
          language?: string | null
          max_trades?: number | null
          onboarded?: boolean
          plan?: string
          platform?: string | null
          prop_firm?: string | null
          prop_firm_name?: string | null
          risk_per_trade?: number | null
          session?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          style?: string | null
          subscription_status?: string | null
          timezone?: string | null
          updated_at?: string
          voice_consent_decided?: boolean
          voice_enabled?: boolean | null
          voice_style?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          checklist_done: boolean
          closed_at: string | null
          daily_pnl: number
          id: string
          limit_hit: boolean
          opened_at: string
          session_date: string
          session_type: string | null
          trades_taken: number
          user_id: string
        }
        Insert: {
          checklist_done?: boolean
          closed_at?: string | null
          daily_pnl?: number
          id?: string
          limit_hit?: boolean
          opened_at?: string
          session_date?: string
          session_type?: string | null
          trades_taken?: number
          user_id: string
        }
        Update: {
          checklist_done?: boolean
          closed_at?: string | null
          daily_pnl?: number
          id?: string
          limit_hit?: boolean
          opened_at?: string
          session_date?: string
          session_type?: string | null
          trades_taken?: number
          user_id?: string
        }
        Relationships: []
      }
      signals: {
        Row: {
          confidence: number | null
          created_at: string
          direction: string
          entry_price: number | null
          followed: boolean
          id: string
          instrument: string
          outcome: string | null
          reasons: string[] | null
          rr: number | null
          rsi: number | null
          status: string
          stop_loss: number | null
          target1: number | null
          target2: number | null
          timeframe: string | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          direction: string
          entry_price?: number | null
          followed?: boolean
          id?: string
          instrument: string
          outcome?: string | null
          reasons?: string[] | null
          rr?: number | null
          rsi?: number | null
          status?: string
          stop_loss?: number | null
          target1?: number | null
          target2?: number | null
          timeframe?: string | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          direction?: string
          entry_price?: number | null
          followed?: boolean
          id?: string
          instrument?: string
          outcome?: string | null
          reasons?: string[] | null
          rr?: number | null
          rsi?: number | null
          status?: string
          stop_loss?: number | null
          target1?: number | null
          target2?: number | null
          timeframe?: string | null
          user_id?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          ace_note: string | null
          created_at: string
          direction: string | null
          emotion: string | null
          entry_price: number | null
          exit_price: number | null
          id: string
          instrument: string | null
          journal_entry: string | null
          notes: string | null
          result_dollars: number | null
          risk_dollars: number | null
          session: string | null
          trade_date: string
          trade_time: string
          user_id: string
        }
        Insert: {
          ace_note?: string | null
          created_at?: string
          direction?: string | null
          emotion?: string | null
          entry_price?: number | null
          exit_price?: number | null
          id?: string
          instrument?: string | null
          journal_entry?: string | null
          notes?: string | null
          result_dollars?: number | null
          risk_dollars?: number | null
          session?: string | null
          trade_date?: string
          trade_time?: string
          user_id: string
        }
        Update: {
          ace_note?: string | null
          created_at?: string
          direction?: string | null
          emotion?: string | null
          entry_price?: number | null
          exit_price?: number | null
          id?: string
          instrument?: string | null
          journal_entry?: string | null
          notes?: string | null
          result_dollars?: number | null
          risk_dollars?: number | null
          session?: string | null
          trade_date?: string
          trade_time?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      feedback_category: "bug" | "feature" | "question" | "praise" | "other"
      feedback_status: "new" | "in_progress" | "resolved" | "archived"
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
      app_role: ["admin", "moderator", "user"],
      feedback_category: ["bug", "feature", "question", "praise", "other"],
      feedback_status: ["new", "in_progress", "resolved", "archived"],
    },
  },
} as const
