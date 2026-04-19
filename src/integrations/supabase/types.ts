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
      admin_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          actor_role: string | null
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      app_reviews: {
        Row: {
          advice: string | null
          approved: boolean
          created_at: string
          device_id: string | null
          id: string
          notes: string | null
          rating: number
          reviewer_country: string | null
          reviewer_name: string | null
        }
        Insert: {
          advice?: string | null
          approved?: boolean
          created_at?: string
          device_id?: string | null
          id?: string
          notes?: string | null
          rating: number
          reviewer_country?: string | null
          reviewer_name?: string | null
        }
        Update: {
          advice?: string | null
          approved?: boolean
          created_at?: string
          device_id?: string | null
          id?: string
          notes?: string | null
          rating?: number
          reviewer_country?: string | null
          reviewer_name?: string | null
        }
        Relationships: []
      }
      manual_otp_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          recipient: string
          used_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          recipient: string
          used_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          recipient?: string
          used_at?: string | null
        }
        Relationships: []
      }
      medical_profiles: {
        Row: {
          allergies: string[] | null
          blood_type: string | null
          chronic_conditions: string[] | null
          created_at: string
          current_medications: string[] | null
          device_id: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          id: string
          insurance_policy_number: string | null
          insurance_provider: string | null
          preferred_language: string | null
          updated_at: string
        }
        Insert: {
          allergies?: string[] | null
          blood_type?: string | null
          chronic_conditions?: string[] | null
          created_at?: string
          current_medications?: string[] | null
          device_id: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          id?: string
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          preferred_language?: string | null
          updated_at?: string
        }
        Update: {
          allergies?: string[] | null
          blood_type?: string | null
          chronic_conditions?: string[] | null
          created_at?: string
          current_medications?: string[] | null
          device_id?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          id?: string
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          preferred_language?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          org_type: Database["public"]["Enums"]["org_type"]
          updated_at: string
          website: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          org_type?: Database["public"]["Enums"]["org_type"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          org_type?: Database["public"]["Enums"]["org_type"]
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      otp_send_log: {
        Row: {
          channel: string
          id: string
          recipient: string
          sent_at: string
        }
        Insert: {
          channel: string
          id?: string
          recipient: string
          sent_at?: string
        }
        Update: {
          channel?: string
          id?: string
          recipient?: string
          sent_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          date_of_birth: string | null
          deleted_at: string | null
          deleted_reason: string | null
          device_id: string
          email: string | null
          full_name_ar: string | null
          full_name_en: string | null
          gender: string | null
          id: string
          nationality: string | null
          organization_id: string | null
          passport_number: string | null
          phone: string | null
          privacy_accepted_at: string | null
          provider_type: Database["public"]["Enums"]["provider_type"]
          saudi_id: string | null
          terms_accepted_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          deleted_reason?: string | null
          device_id: string
          email?: string | null
          full_name_ar?: string | null
          full_name_en?: string | null
          gender?: string | null
          id?: string
          nationality?: string | null
          organization_id?: string | null
          passport_number?: string | null
          phone?: string | null
          privacy_accepted_at?: string | null
          provider_type?: Database["public"]["Enums"]["provider_type"]
          saudi_id?: string | null
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          deleted_reason?: string | null
          device_id?: string
          email?: string | null
          full_name_ar?: string | null
          full_name_en?: string | null
          gender?: string | null
          id?: string
          nationality?: string | null
          organization_id?: string | null
          passport_number?: string | null
          phone?: string | null
          privacy_accepted_at?: string | null
          provider_type?: Database["public"]["Enums"]["provider_type"]
          saudi_id?: string | null
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      site_pages: {
        Row: {
          body_md: string
          slug: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body_md?: string
          slug: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body_md?: string
          slug?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          category: Database["public"]["Enums"]["ticket_category"]
          created_at: string
          description: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolution_notes: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_number: string
          title: string
          updated_at: string
          user_email: string | null
          user_name: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          description: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolution_notes?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_number?: string
          title: string
          updated_at?: string
          user_email?: string | null
          user_name?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolution_notes?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_number?: string
          title?: string
          updated_at?: string
          user_email?: string | null
          user_name?: string | null
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
      user_status: {
        Row: {
          created_at: string
          reason: string | null
          status: Database["public"]["Enums"]["user_status_enum"]
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          reason?: string | null
          status?: Database["public"]["Enums"]["user_status_enum"]
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          reason?: string | null
          status?: Database["public"]["Enums"]["user_status_enum"]
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_trials: {
        Row: {
          created_at: string
          device_id: string
          extended_at: string | null
          extended_by: string | null
          extension_reason: string | null
          id: string
          plan: string
          trial_ends_at: string
          trial_started_at: string
        }
        Insert: {
          created_at?: string
          device_id: string
          extended_at?: string | null
          extended_by?: string | null
          extension_reason?: string | null
          id?: string
          plan?: string
          trial_ends_at?: string
          trial_started_at?: string
        }
        Update: {
          created_at?: string
          device_id?: string
          extended_at?: string | null
          extended_by?: string | null
          extension_reason?: string | null
          id?: string
          plan?: string
          trial_ends_at?: string
          trial_started_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      admin_generate_manual_otp: {
        Args: { _recipient: string }
        Returns: {
          code: string
          expires_at: string
        }[]
      }
      admin_user_kpis: {
        Args: never
        Returns: {
          new_30d: number
          new_7d: number
          provider_type: string
          total: number
        }[]
      }
      consume_manual_otp: {
        Args: { _code: string; _recipient: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          _action: string
          _actor_email?: string
          _actor_id?: string
          _details?: Json
          _target_id?: string
          _target_type?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      org_type:
        | "hospital"
        | "vendor"
        | "insurance"
        | "patient_org"
        | "clinic"
        | "other"
      provider_type:
        | "patient"
        | "hospital"
        | "physician"
        | "vendor"
        | "insurance"
        | "internal"
      ticket_category: "billing" | "technical" | "medical" | "general"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
      user_status_enum: "active" | "on_hold" | "suspended"
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
      org_type: [
        "hospital",
        "vendor",
        "insurance",
        "patient_org",
        "clinic",
        "other",
      ],
      provider_type: [
        "patient",
        "hospital",
        "physician",
        "vendor",
        "insurance",
        "internal",
      ],
      ticket_category: ["billing", "technical", "medical", "general"],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
      user_status_enum: ["active", "on_hold", "suspended"],
    },
  },
} as const
