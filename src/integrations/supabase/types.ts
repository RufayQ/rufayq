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
      ai_usage: {
        Row: {
          count: number
          created_at: string
          device_id: string
          id: string
          last_prompt_at: string
          updated_at: string
          usage_day: string
        }
        Insert: {
          count?: number
          created_at?: string
          device_id: string
          id?: string
          last_prompt_at?: string
          updated_at?: string
          usage_day?: string
        }
        Update: {
          count?: number
          created_at?: string
          device_id?: string
          id?: string
          last_prompt_at?: string
          updated_at?: string
          usage_day?: string
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
      billing_events: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          details: Json | null
          event_type: string
          id: string
          subscription_id: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          details?: Json | null
          event_type: string
          id?: string
          subscription_id: string
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          subscription_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_footer_items: {
        Row: {
          column_key: string
          created_at: string
          id: string
          is_header: boolean
          label_ar: string | null
          label_en: string
          link_type: Database["public"]["Enums"]["cms_nav_link_type"]
          link_value: string
          sort_order: number
          updated_at: string
          visible: boolean
        }
        Insert: {
          column_key: string
          created_at?: string
          id?: string
          is_header?: boolean
          label_ar?: string | null
          label_en: string
          link_type?: Database["public"]["Enums"]["cms_nav_link_type"]
          link_value: string
          sort_order?: number
          updated_at?: string
          visible?: boolean
        }
        Update: {
          column_key?: string
          created_at?: string
          id?: string
          is_header?: boolean
          label_ar?: string | null
          label_en?: string
          link_type?: Database["public"]["Enums"]["cms_nav_link_type"]
          link_value?: string
          sort_order?: number
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      cms_global_settings: {
        Row: {
          accent_color: string
          address_ar: string | null
          address_en: string | null
          brand_name: string
          brand_name_ar: string
          business_hours_ar: string | null
          business_hours_en: string | null
          copyright_ar: string | null
          copyright_en: string | null
          default_language: string
          gold_color: string
          id: string
          is_singleton: boolean
          language_toggle: boolean
          map_embed_url: string | null
          navy_color: string
          newsletter_subtitle_ar: string | null
          newsletter_subtitle_en: string | null
          newsletter_title_ar: string | null
          newsletter_title_en: string | null
          primary_color: string
          sales_email: string | null
          secondary_color: string
          social_links: Json
          sticky_header: boolean
          support_email: string | null
          support_phone: string | null
          support_whatsapp: string | null
          tagline_ar: string | null
          tagline_en: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accent_color?: string
          address_ar?: string | null
          address_en?: string | null
          brand_name?: string
          brand_name_ar?: string
          business_hours_ar?: string | null
          business_hours_en?: string | null
          copyright_ar?: string | null
          copyright_en?: string | null
          default_language?: string
          gold_color?: string
          id?: string
          is_singleton?: boolean
          language_toggle?: boolean
          map_embed_url?: string | null
          navy_color?: string
          newsletter_subtitle_ar?: string | null
          newsletter_subtitle_en?: string | null
          newsletter_title_ar?: string | null
          newsletter_title_en?: string | null
          primary_color?: string
          sales_email?: string | null
          secondary_color?: string
          social_links?: Json
          sticky_header?: boolean
          support_email?: string | null
          support_phone?: string | null
          support_whatsapp?: string | null
          tagline_ar?: string | null
          tagline_en?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accent_color?: string
          address_ar?: string | null
          address_en?: string | null
          brand_name?: string
          brand_name_ar?: string
          business_hours_ar?: string | null
          business_hours_en?: string | null
          copyright_ar?: string | null
          copyright_en?: string | null
          default_language?: string
          gold_color?: string
          id?: string
          is_singleton?: boolean
          language_toggle?: boolean
          map_embed_url?: string | null
          navy_color?: string
          newsletter_subtitle_ar?: string | null
          newsletter_subtitle_en?: string | null
          newsletter_title_ar?: string | null
          newsletter_title_en?: string | null
          primary_color?: string
          sales_email?: string | null
          secondary_color?: string
          social_links?: Json
          sticky_header?: boolean
          support_email?: string | null
          support_phone?: string | null
          support_whatsapp?: string | null
          tagline_ar?: string | null
          tagline_en?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      cms_nav_items: {
        Row: {
          created_at: string
          id: string
          label_ar: string | null
          label_en: string
          link_type: Database["public"]["Enums"]["cms_nav_link_type"]
          link_value: string
          location: string
          parent_id: string | null
          sort_order: number
          updated_at: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          label_ar?: string | null
          label_en: string
          link_type?: Database["public"]["Enums"]["cms_nav_link_type"]
          link_value: string
          location?: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          label_ar?: string | null
          label_en?: string
          link_type?: Database["public"]["Enums"]["cms_nav_link_type"]
          link_value?: string
          location?: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "cms_nav_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cms_nav_items"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_pages: {
        Row: {
          canonical_url: string | null
          created_at: string
          id: string
          include_sitemap: boolean
          index_in_search: boolean
          is_system: boolean
          og_image_url: string | null
          scheduled_at: string | null
          seo_desc_ar: string | null
          seo_desc_en: string | null
          seo_title_ar: string | null
          seo_title_en: string | null
          slug: string
          status: Database["public"]["Enums"]["cms_page_status"]
          title_ar: string | null
          title_en: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          id?: string
          include_sitemap?: boolean
          index_in_search?: boolean
          is_system?: boolean
          og_image_url?: string | null
          scheduled_at?: string | null
          seo_desc_ar?: string | null
          seo_desc_en?: string | null
          seo_title_ar?: string | null
          seo_title_en?: string | null
          slug: string
          status?: Database["public"]["Enums"]["cms_page_status"]
          title_ar?: string | null
          title_en: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          id?: string
          include_sitemap?: boolean
          index_in_search?: boolean
          is_system?: boolean
          og_image_url?: string | null
          scheduled_at?: string | null
          seo_desc_ar?: string | null
          seo_desc_en?: string | null
          seo_title_ar?: string | null
          seo_title_en?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["cms_page_status"]
          title_ar?: string | null
          title_en?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      cms_sections: {
        Row: {
          config: Json
          content_ar: Json
          content_en: Json
          created_at: string
          id: string
          page_id: string
          scheduled_at: string | null
          sort_order: number
          type: Database["public"]["Enums"]["cms_section_type"]
          updated_at: string
          updated_by: string | null
          visible: boolean
        }
        Insert: {
          config?: Json
          content_ar?: Json
          content_en?: Json
          created_at?: string
          id?: string
          page_id: string
          scheduled_at?: string | null
          sort_order?: number
          type: Database["public"]["Enums"]["cms_section_type"]
          updated_at?: string
          updated_by?: string | null
          visible?: boolean
        }
        Update: {
          config?: Json
          content_ar?: Json
          content_en?: Json
          created_at?: string
          id?: string
          page_id?: string
          scheduled_at?: string | null
          sort_order?: number
          type?: Database["public"]["Enums"]["cms_section_type"]
          updated_at?: string
          updated_by?: string | null
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "cms_sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "cms_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_versions: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          snapshot: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          snapshot: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          snapshot?: Json
        }
        Relationships: []
      }
      family_invites: {
        Row: {
          accepted_at: string | null
          accepted_device_id: string | null
          created_at: string
          expires_at: string
          family_member_id: string | null
          id: string
          invite_code: string
          invite_email: string | null
          invite_phone: string | null
          organizer_id: string
          status: string
          subscription_id: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_device_id?: string | null
          created_at?: string
          expires_at?: string
          family_member_id?: string | null
          id?: string
          invite_code?: string
          invite_email?: string | null
          invite_phone?: string | null
          organizer_id: string
          status?: string
          subscription_id: string
        }
        Update: {
          accepted_at?: string | null
          accepted_device_id?: string | null
          created_at?: string
          expires_at?: string
          family_member_id?: string | null
          id?: string
          invite_code?: string
          invite_email?: string | null
          invite_phone?: string | null
          organizer_id?: string
          status?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_invites_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_invites_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          allergies: string[] | null
          blood_type: string | null
          chronic_conditions: string[] | null
          created_at: string
          current_medications: string[] | null
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          family_history: string | null
          full_name: string
          full_name_ar: string | null
          gender: string | null
          id: string
          member_device_id: string | null
          national_id: string | null
          nationality: string | null
          notes: string | null
          organizer_id: string
          passport_number: string | null
          phone: string | null
          relationship: string
          status: string
          subscription_id: string
          surgical_history: string | null
          updated_at: string
        }
        Insert: {
          allergies?: string[] | null
          blood_type?: string | null
          chronic_conditions?: string[] | null
          created_at?: string
          current_medications?: string[] | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          family_history?: string | null
          full_name: string
          full_name_ar?: string | null
          gender?: string | null
          id?: string
          member_device_id?: string | null
          national_id?: string | null
          nationality?: string | null
          notes?: string | null
          organizer_id: string
          passport_number?: string | null
          phone?: string | null
          relationship: string
          status?: string
          subscription_id: string
          surgical_history?: string | null
          updated_at?: string
        }
        Update: {
          allergies?: string[] | null
          blood_type?: string | null
          chronic_conditions?: string[] | null
          created_at?: string
          current_medications?: string[] | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          family_history?: string | null
          full_name?: string
          full_name_ar?: string | null
          gender?: string | null
          id?: string
          member_device_id?: string | null
          national_id?: string | null
          nationality?: string | null
          notes?: string | null
          organizer_id?: string
          passport_number?: string | null
          phone?: string | null
          relationship?: string
          status?: string
          subscription_id?: string
          surgical_history?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
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
          family_history: Json
          id: string
          insurance_policy_number: string | null
          insurance_provider: string | null
          past_medical_history: Json
          preferred_language: string | null
          surgical_history: Json
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
          family_history?: Json
          id?: string
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          past_medical_history?: Json
          preferred_language?: string | null
          surgical_history?: Json
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
          family_history?: Json
          id?: string
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          past_medical_history?: Json
          preferred_language?: string | null
          surgical_history?: Json
          updated_at?: string
        }
        Relationships: []
      }
      organization_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          invited_role: string
          notes: string | null
          organization_id: string
          revoked_at: string | null
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          invited_role?: string
          notes?: string | null
          organization_id: string
          revoked_at?: string | null
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          invited_role?: string
          notes?: string | null
          organization_id?: string
          revoked_at?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_subscriptions: {
        Row: {
          amount: number
          assigned_by: string | null
          billing_cycle: string
          created_at: string
          currency: string
          ends_at: string | null
          id: string
          notes: string | null
          organization_id: string
          payment_method: string | null
          payment_receipt_filename: string | null
          payment_receipt_url: string | null
          payment_reference: string | null
          payment_uploaded_at: string | null
          payment_verified_at: string | null
          payment_verified_by: string | null
          plan: string
          seats: number
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          assigned_by?: string | null
          billing_cycle?: string
          created_at?: string
          currency?: string
          ends_at?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          payment_method?: string | null
          payment_receipt_filename?: string | null
          payment_receipt_url?: string | null
          payment_reference?: string | null
          payment_uploaded_at?: string | null
          payment_verified_at?: string | null
          payment_verified_by?: string | null
          plan: string
          seats?: number
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          assigned_by?: string | null
          billing_cycle?: string
          created_at?: string
          currency?: string
          ends_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          payment_method?: string | null
          payment_receipt_filename?: string | null
          payment_receipt_url?: string | null
          payment_reference?: string | null
          payment_uploaded_at?: string | null
          payment_verified_at?: string | null
          payment_verified_by?: string | null
          plan?: string
          seats?: number
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          contract_filename: string | null
          contract_uploaded_at: string | null
          contract_url: string | null
          country: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          org_code: string | null
          org_type: Database["public"]["Enums"]["org_type"]
          seq_no: number
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contract_filename?: string | null
          contract_uploaded_at?: string | null
          contract_url?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          org_code?: string | null
          org_type?: Database["public"]["Enums"]["org_type"]
          seq_no?: number
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contract_filename?: string | null
          contract_uploaded_at?: string | null
          contract_url?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          org_code?: string | null
          org_type?: Database["public"]["Enums"]["org_type"]
          seq_no?: number
          status?: string
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
      patient_claims: {
        Row: {
          admin_decision_at: string | null
          admin_decision_by: string | null
          admin_notes: string | null
          created_at: string
          id: string
          matched_device_id: string | null
          matched_profile_id: string | null
          organization_id: string
          patient_decision_at: string | null
          patient_notes: string | null
          reason: string | null
          requested_by: string
          search_type: string
          search_value: string
          status: Database["public"]["Enums"]["claim_status"]
          updated_at: string
        }
        Insert: {
          admin_decision_at?: string | null
          admin_decision_by?: string | null
          admin_notes?: string | null
          created_at?: string
          id?: string
          matched_device_id?: string | null
          matched_profile_id?: string | null
          organization_id: string
          patient_decision_at?: string | null
          patient_notes?: string | null
          reason?: string | null
          requested_by: string
          search_type: string
          search_value: string
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string
        }
        Update: {
          admin_decision_at?: string | null
          admin_decision_by?: string | null
          admin_notes?: string | null
          created_at?: string
          id?: string
          matched_device_id?: string | null
          matched_profile_id?: string | null
          organization_id?: string
          patient_decision_at?: string | null
          patient_notes?: string | null
          reason?: string | null
          requested_by?: string
          search_type?: string
          search_value?: string
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_claims_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_consents: {
        Row: {
          claim_id: string | null
          created_at: string
          granted: boolean
          granted_at: string
          id: string
          organization_id: string
          patient_device_id: string
          revoked_at: string | null
          section: Database["public"]["Enums"]["consent_section"]
          updated_at: string
        }
        Insert: {
          claim_id?: string | null
          created_at?: string
          granted?: boolean
          granted_at?: string
          id?: string
          organization_id: string
          patient_device_id: string
          revoked_at?: string | null
          section: Database["public"]["Enums"]["consent_section"]
          updated_at?: string
        }
        Update: {
          claim_id?: string | null
          created_at?: string
          granted?: boolean
          granted_at?: string
          id?: string
          organization_id?: string
          patient_device_id?: string
          revoked_at?: string | null
          section?: Database["public"]["Enums"]["consent_section"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_consents_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "patient_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_consents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_notifications: {
        Row: {
          body: string | null
          body_ar: string | null
          created_at: string
          id: string
          is_read: boolean
          kind: string
          link: string | null
          organization_id: string | null
          patient_device_id: string
          title: string
          title_ar: string | null
        }
        Insert: {
          body?: string | null
          body_ar?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          link?: string | null
          organization_id?: string | null
          patient_device_id: string
          title: string
          title_ar?: string | null
        }
        Update: {
          body?: string | null
          body_ar?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          link?: string | null
          organization_id?: string | null
          patient_device_id?: string
          title?: string
          title_ar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          device_id: string | null
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          device_id?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          device_id?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payment_receipts: {
        Row: {
          amount: number
          bank_name: string | null
          billing_cycle: string
          code_expires_at: string | null
          created_at: string
          currency: string
          device_id: string
          id: string
          internal_note: string | null
          patient_message: string | null
          payer_name: string | null
          payer_phone: string | null
          payment_method: string
          payment_reference: string | null
          receipt_file_path: string | null
          reference_no: string | null
          requested_plan: string
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_notes: string | null
          status: string
          submission_channel: string
          subscription_id: string | null
          transfer_date: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          bank_name?: string | null
          billing_cycle?: string
          code_expires_at?: string | null
          created_at?: string
          currency?: string
          device_id: string
          id?: string
          internal_note?: string | null
          patient_message?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          payment_method: string
          payment_reference?: string | null
          receipt_file_path?: string | null
          reference_no?: string | null
          requested_plan: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          status?: string
          submission_channel?: string
          subscription_id?: string | null
          transfer_date?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_name?: string | null
          billing_cycle?: string
          code_expires_at?: string | null
          created_at?: string
          currency?: string
          device_id?: string
          id?: string
          internal_note?: string | null
          patient_message?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          payment_method?: string
          payment_reference?: string | null
          receipt_file_path?: string | null
          reference_no?: string | null
          requested_plan?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          status?: string
          submission_channel?: string
          subscription_id?: string | null
          transfer_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_receipts_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_addon_prices: {
        Row: {
          addon_id: string
          amount: number
          created_at: string
          currency: string
          id: string
          updated_at: string
        }
        Insert: {
          addon_id: string
          amount?: number
          created_at?: string
          currency: string
          id?: string
          updated_at?: string
        }
        Update: {
          addon_id?: string
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_addon_prices_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "pricing_addons"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_addons: {
        Row: {
          created_at: string
          cta_ar: string | null
          cta_en: string | null
          description_ar: string | null
          description_en: string | null
          hero: boolean
          id: string
          is_active: boolean
          key: string
          name_ar: string
          name_en: string
          sort_order: number
          unit_ar: string | null
          unit_en: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_ar?: string | null
          cta_en?: string | null
          description_ar?: string | null
          description_en?: string | null
          hero?: boolean
          id?: string
          is_active?: boolean
          key: string
          name_ar: string
          name_en: string
          sort_order?: number
          unit_ar?: string | null
          unit_en?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_ar?: string | null
          cta_en?: string | null
          description_ar?: string | null
          description_en?: string | null
          hero?: boolean
          id?: string
          is_active?: boolean
          key?: string
          name_ar?: string
          name_en?: string
          sort_order?: number
          unit_ar?: string | null
          unit_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pricing_catalog_version: {
        Row: {
          id: number
          updated_at: string
          version: number
        }
        Insert: {
          id?: number
          updated_at?: string
          version?: number
        }
        Update: {
          id?: number
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      pricing_plan_features: {
        Row: {
          created_at: string
          id: string
          plan_id: string
          sort_order: number
          text_ar: string
          text_en: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_id: string
          sort_order?: number
          text_ar: string
          text_en: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_id?: string
          sort_order?: number
          text_ar?: string
          text_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "pricing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_plan_prices: {
        Row: {
          amount: number
          billing_cycle: string
          created_at: string
          currency: string
          id: string
          plan_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          billing_cycle: string
          created_at?: string
          currency: string
          id?: string
          plan_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          billing_cycle?: string
          created_at?: string
          currency?: string
          id?: string
          plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_plan_prices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "pricing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_plans: {
        Row: {
          code: string
          created_at: string
          cta_ar: string | null
          cta_en: string | null
          description_ar: string | null
          description_en: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          published_at: string | null
          recommended: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          cta_ar?: string | null
          cta_en?: string | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          published_at?: string | null
          recommended?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          cta_ar?: string | null
          cta_en?: string | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          published_at?: string | null
          recommended?: boolean
          sort_order?: number
          updated_at?: string
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
          iqama_number: string | null
          nationality: string | null
          organization_id: string | null
          passport_number: string | null
          phone: string | null
          privacy_accepted_at: string | null
          provider_type: Database["public"]["Enums"]["provider_type"]
          rufayq_id: string | null
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
          iqama_number?: string | null
          nationality?: string | null
          organization_id?: string | null
          passport_number?: string | null
          phone?: string | null
          privacy_accepted_at?: string | null
          provider_type?: Database["public"]["Enums"]["provider_type"]
          rufayq_id?: string | null
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
          iqama_number?: string | null
          nationality?: string | null
          organization_id?: string | null
          passport_number?: string | null
          phone?: string | null
          privacy_accepted_at?: string | null
          provider_type?: Database["public"]["Enums"]["provider_type"]
          rufayq_id?: string | null
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
      provider_applications: {
        Row: {
          admin_feedback: string | null
          agreement_url: string | null
          contact_email: string
          contact_person_name: string
          contact_person_role: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          id: string
          notes: string | null
          org_name: string
          org_name_ar: string | null
          org_type: Database["public"]["Enums"]["org_type"]
          organization_id: string | null
          registration_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          admin_feedback?: string | null
          agreement_url?: string | null
          contact_email: string
          contact_person_name: string
          contact_person_role?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          org_name: string
          org_name_ar?: string | null
          org_type?: Database["public"]["Enums"]["org_type"]
          organization_id?: string | null
          registration_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          admin_feedback?: string | null
          agreement_url?: string | null
          contact_email?: string
          contact_person_name?: string
          contact_person_role?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          org_name?: string
          org_name_ar?: string | null
          org_type?: Database["public"]["Enums"]["org_type"]
          organization_id?: string | null
          registration_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_applications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_appointments: {
        Row: {
          author_id: string | null
          created_at: string
          id: string
          location: string | null
          notes: string | null
          organization_id: string
          patient_device_id: string
          scheduled_at: string
          status: string
          title: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          organization_id: string
          patient_device_id: string
          scheduled_at: string
          status?: string
          title: string
        }
        Update: {
          author_id?: string | null
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          organization_id?: string
          patient_device_id?: string
          scheduled_at?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_instructions: {
        Row: {
          author_id: string | null
          body: string
          body_ar: string | null
          created_at: string
          id: string
          organization_id: string
          patient_device_id: string
          priority: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          body_ar?: string | null
          created_at?: string
          id?: string
          organization_id: string
          patient_device_id: string
          priority?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          body_ar?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          patient_device_id?: string
          priority?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_instructions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_medication_updates: {
        Row: {
          action: string
          author_id: string | null
          created_at: string
          dose: string | null
          frequency: string | null
          id: string
          med_name: string
          notes: string | null
          organization_id: string
          patient_device_id: string
        }
        Insert: {
          action?: string
          author_id?: string | null
          created_at?: string
          dose?: string | null
          frequency?: string | null
          id?: string
          med_name: string
          notes?: string | null
          organization_id: string
          patient_device_id: string
        }
        Update: {
          action?: string
          author_id?: string | null
          created_at?: string
          dose?: string | null
          frequency?: string | null
          id?: string
          med_name?: string
          notes?: string | null
          organization_id?: string
          patient_device_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_medication_updates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_members: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          member_role: string
          organization_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          member_role?: string
          organization_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          member_role?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_patients: {
        Row: {
          assigned_provider_id: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          organization_id: string
          patient_device_id: string
          patient_email: string | null
          patient_name: string | null
          patient_phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_provider_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          patient_device_id: string
          patient_email?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_provider_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          patient_device_id?: string
          patient_email?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_patients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_admissions: {
        Row: {
          actual_los_days: number | null
          admission_no: string | null
          admission_type: Database["public"]["Enums"]["rcm_admission_type"]
          admitted_at: string
          attending_name: string | null
          authorization_id: string | null
          cancellation_reason: string | null
          class_id: string | null
          created_at: string
          created_by: string | null
          discharge_advised_at: string | null
          discharge_ordered_at: string | null
          discharged_at: string | null
          expected_discharge_at: string | null
          financial_discharged_at: string | null
          id: string
          notes: string | null
          organization_id: string
          package_id: string | null
          patient_device_id: string | null
          patient_profile_id: string | null
          payer_id: string | null
          planned_los_days: number
          policy_id: string | null
          service_reconciled_at: string | null
          specialty: string | null
          status: Database["public"]["Enums"]["rcm_admission_status"]
          updated_at: string
          visit_id: string | null
          ward: string | null
        }
        Insert: {
          actual_los_days?: number | null
          admission_no?: string | null
          admission_type?: Database["public"]["Enums"]["rcm_admission_type"]
          admitted_at?: string
          attending_name?: string | null
          authorization_id?: string | null
          cancellation_reason?: string | null
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          discharge_advised_at?: string | null
          discharge_ordered_at?: string | null
          discharged_at?: string | null
          expected_discharge_at?: string | null
          financial_discharged_at?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          package_id?: string | null
          patient_device_id?: string | null
          patient_profile_id?: string | null
          payer_id?: string | null
          planned_los_days?: number
          policy_id?: string | null
          service_reconciled_at?: string | null
          specialty?: string | null
          status?: Database["public"]["Enums"]["rcm_admission_status"]
          updated_at?: string
          visit_id?: string | null
          ward?: string | null
        }
        Update: {
          actual_los_days?: number | null
          admission_no?: string | null
          admission_type?: Database["public"]["Enums"]["rcm_admission_type"]
          admitted_at?: string
          attending_name?: string | null
          authorization_id?: string | null
          cancellation_reason?: string | null
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          discharge_advised_at?: string | null
          discharge_ordered_at?: string | null
          discharged_at?: string | null
          expected_discharge_at?: string | null
          financial_discharged_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          package_id?: string | null
          patient_device_id?: string | null
          patient_profile_id?: string | null
          payer_id?: string | null
          planned_los_days?: number
          policy_id?: string | null
          service_reconciled_at?: string | null
          specialty?: string | null
          status?: Database["public"]["Enums"]["rcm_admission_status"]
          updated_at?: string
          visit_id?: string | null
          ward?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rcm_admissions_authorization_id_fkey"
            columns: ["authorization_id"]
            isOneToOne: false
            referencedRelation: "rcm_authorization_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_admissions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "rcm_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_admissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_admissions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "rcm_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_admissions_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "rcm_payers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_admissions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "rcm_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_admissions_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "rcm_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_authorization_attachments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          kind: string
          request_id: string
          uploaded_by: string | null
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          kind: string
          request_id: string
          uploaded_by?: string | null
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          request_id?: string
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "rcm_authorization_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "rcm_authorization_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_authorization_events: {
        Row: {
          actor_id: string | null
          actor_role: string | null
          created_at: string
          event_type: Database["public"]["Enums"]["rcm_auth_event_type"]
          id: string
          notes: string | null
          payload: Json | null
          request_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          event_type: Database["public"]["Enums"]["rcm_auth_event_type"]
          id?: string
          notes?: string | null
          payload?: Json | null
          request_id: string
        }
        Update: {
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          event_type?: Database["public"]["Enums"]["rcm_auth_event_type"]
          id?: string
          notes?: string | null
          payload?: Json | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rcm_authorization_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "rcm_authorization_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_authorization_items: {
        Row: {
          approved_amount: number | null
          approved_qty: number | null
          condition_text: string | null
          created_at: string
          denial_reason: string | null
          id: string
          notes: string | null
          qty: number
          request_id: string
          requested_days: number | null
          service_code: string
          service_kind: Database["public"]["Enums"]["rcm_service_kind"] | null
          service_name: string
          specialty: string | null
          status: Database["public"]["Enums"]["rcm_auth_item_status"]
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          approved_amount?: number | null
          approved_qty?: number | null
          condition_text?: string | null
          created_at?: string
          denial_reason?: string | null
          id?: string
          notes?: string | null
          qty?: number
          request_id: string
          requested_days?: number | null
          service_code: string
          service_kind?: Database["public"]["Enums"]["rcm_service_kind"] | null
          service_name: string
          specialty?: string | null
          status?: Database["public"]["Enums"]["rcm_auth_item_status"]
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          approved_amount?: number | null
          approved_qty?: number | null
          condition_text?: string | null
          created_at?: string
          denial_reason?: string | null
          id?: string
          notes?: string | null
          qty?: number
          request_id?: string
          requested_days?: number | null
          service_code?: string
          service_kind?: Database["public"]["Enums"]["rcm_service_kind"] | null
          service_name?: string
          specialty?: string | null
          status?: Database["public"]["Enums"]["rcm_auth_item_status"]
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rcm_authorization_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "rcm_authorization_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_authorization_requests: {
        Row: {
          assigned_to: string | null
          class_id: string | null
          clinical_notes: string | null
          conditional_terms: string | null
          created_at: string
          created_by: string | null
          decided_at: string | null
          decision_notes: string | null
          diagnosis_codes: string[] | null
          eligibility_check_id: string | null
          encounter_type: Database["public"]["Enums"]["rcm_encounter_type"]
          id: string
          membership_id: string | null
          network_id: string | null
          nphies_request_ref: string | null
          nphies_response_ref: string | null
          organization_id: string
          parent_request_id: string | null
          partial_reason: string | null
          patient_device_id: string | null
          patient_profile_id: string | null
          payer_id: string | null
          policy_id: string | null
          priority: Database["public"]["Enums"]["rcm_auth_priority"]
          rejection_reason: string | null
          request_payload: Json | null
          response_payload: Json | null
          scrubber_result: Json | null
          status: Database["public"]["Enums"]["rcm_auth_status"]
          submitted_at: string | null
          tat_due_at: string | null
          updated_at: string
          validity_from: string | null
          validity_to: string | null
          visit_ref: string | null
        }
        Insert: {
          assigned_to?: string | null
          class_id?: string | null
          clinical_notes?: string | null
          conditional_terms?: string | null
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decision_notes?: string | null
          diagnosis_codes?: string[] | null
          eligibility_check_id?: string | null
          encounter_type?: Database["public"]["Enums"]["rcm_encounter_type"]
          id?: string
          membership_id?: string | null
          network_id?: string | null
          nphies_request_ref?: string | null
          nphies_response_ref?: string | null
          organization_id: string
          parent_request_id?: string | null
          partial_reason?: string | null
          patient_device_id?: string | null
          patient_profile_id?: string | null
          payer_id?: string | null
          policy_id?: string | null
          priority?: Database["public"]["Enums"]["rcm_auth_priority"]
          rejection_reason?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          scrubber_result?: Json | null
          status?: Database["public"]["Enums"]["rcm_auth_status"]
          submitted_at?: string | null
          tat_due_at?: string | null
          updated_at?: string
          validity_from?: string | null
          validity_to?: string | null
          visit_ref?: string | null
        }
        Update: {
          assigned_to?: string | null
          class_id?: string | null
          clinical_notes?: string | null
          conditional_terms?: string | null
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decision_notes?: string | null
          diagnosis_codes?: string[] | null
          eligibility_check_id?: string | null
          encounter_type?: Database["public"]["Enums"]["rcm_encounter_type"]
          id?: string
          membership_id?: string | null
          network_id?: string | null
          nphies_request_ref?: string | null
          nphies_response_ref?: string | null
          organization_id?: string
          parent_request_id?: string | null
          partial_reason?: string | null
          patient_device_id?: string | null
          patient_profile_id?: string | null
          payer_id?: string | null
          policy_id?: string | null
          priority?: Database["public"]["Enums"]["rcm_auth_priority"]
          rejection_reason?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          scrubber_result?: Json | null
          status?: Database["public"]["Enums"]["rcm_auth_status"]
          submitted_at?: string | null
          tat_due_at?: string | null
          updated_at?: string
          validity_from?: string | null
          validity_to?: string | null
          visit_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rcm_authorization_requests_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "rcm_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_authorization_requests_eligibility_check_id_fkey"
            columns: ["eligibility_check_id"]
            isOneToOne: false
            referencedRelation: "rcm_eligibility_checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_authorization_requests_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "rcm_payer_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_authorization_requests_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "rcm_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_authorization_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_authorization_requests_parent_request_id_fkey"
            columns: ["parent_request_id"]
            isOneToOne: false
            referencedRelation: "rcm_authorization_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_authorization_requests_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "rcm_payers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_authorization_requests_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "rcm_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_bed_assignments: {
        Row: {
          admission_id: string
          bed_no: string | null
          check_in_at: string
          check_out_at: string | null
          created_at: string
          daily_rate: number | null
          id: string
          notes: string | null
          room_no: string | null
          room_type: Database["public"]["Enums"]["rcm_room_type"] | null
          ward: string | null
        }
        Insert: {
          admission_id: string
          bed_no?: string | null
          check_in_at?: string
          check_out_at?: string | null
          created_at?: string
          daily_rate?: number | null
          id?: string
          notes?: string | null
          room_no?: string | null
          room_type?: Database["public"]["Enums"]["rcm_room_type"] | null
          ward?: string | null
        }
        Update: {
          admission_id?: string
          bed_no?: string | null
          check_in_at?: string
          check_out_at?: string | null
          created_at?: string
          daily_rate?: number | null
          id?: string
          notes?: string | null
          room_no?: string | null
          room_type?: Database["public"]["Enums"]["rcm_room_type"] | null
          ward?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rcm_bed_assignments_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "rcm_admissions"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_bulk_jobs: {
        Row: {
          ai_summary: string | null
          applied_at: string | null
          applied_by: string | null
          applied_rows: number
          created_at: string
          created_by: string | null
          error_message: string | null
          failed_rows: number
          id: string
          kind: Database["public"]["Enums"]["rcm_bulk_kind"]
          organization_id: string | null
          parsed_payload: Json | null
          source_filename: string | null
          source_mime: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["rcm_bulk_status"]
          total_rows: number
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          applied_at?: string | null
          applied_by?: string | null
          applied_rows?: number
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          failed_rows?: number
          id?: string
          kind: Database["public"]["Enums"]["rcm_bulk_kind"]
          organization_id?: string | null
          parsed_payload?: Json | null
          source_filename?: string | null
          source_mime?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["rcm_bulk_status"]
          total_rows?: number
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          applied_at?: string | null
          applied_by?: string | null
          applied_rows?: number
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          failed_rows?: number
          id?: string
          kind?: Database["public"]["Enums"]["rcm_bulk_kind"]
          organization_id?: string | null
          parsed_payload?: Json | null
          source_filename?: string | null
          source_mime?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["rcm_bulk_status"]
          total_rows?: number
          updated_at?: string
        }
        Relationships: []
      }
      rcm_claim_denials: {
        Row: {
          amount: number
          appeal_status: string
          appealed_at: string | null
          claim_id: string
          claim_line_id: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          reason_code: string | null
          reason_text: string | null
          resolved_at: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          appeal_status?: string
          appealed_at?: string | null
          claim_id: string
          claim_line_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          reason_code?: string | null
          reason_text?: string | null
          resolved_at?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          appeal_status?: string
          appealed_at?: string | null
          claim_id?: string
          claim_line_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          reason_code?: string | null
          reason_text?: string | null
          resolved_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rcm_claim_denials_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "rcm_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_claim_denials_claim_line_id_fkey"
            columns: ["claim_line_id"]
            isOneToOne: false
            referencedRelation: "rcm_claim_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_claim_lines: {
        Row: {
          claim_id: string
          created_at: string
          denial_reason: string | null
          denied_amount: number
          discount_amount: number
          gross_amount: number
          id: string
          line_no: number | null
          net_amount: number
          notes: string | null
          paid_amount: number
          patient_share: number
          payer_share: number
          qty: number
          service_code: string
          service_kind: Database["public"]["Enums"]["rcm_service_kind"] | null
          service_name: string
          source_visit_service_id: string | null
          specialty: string | null
          unit_price: number
          updated_at: string
          vat_amount: number
        }
        Insert: {
          claim_id: string
          created_at?: string
          denial_reason?: string | null
          denied_amount?: number
          discount_amount?: number
          gross_amount?: number
          id?: string
          line_no?: number | null
          net_amount?: number
          notes?: string | null
          paid_amount?: number
          patient_share?: number
          payer_share?: number
          qty?: number
          service_code: string
          service_kind?: Database["public"]["Enums"]["rcm_service_kind"] | null
          service_name: string
          source_visit_service_id?: string | null
          specialty?: string | null
          unit_price?: number
          updated_at?: string
          vat_amount?: number
        }
        Update: {
          claim_id?: string
          created_at?: string
          denial_reason?: string | null
          denied_amount?: number
          discount_amount?: number
          gross_amount?: number
          id?: string
          line_no?: number | null
          net_amount?: number
          notes?: string | null
          paid_amount?: number
          patient_share?: number
          payer_share?: number
          qty?: number
          service_code?: string
          service_kind?: Database["public"]["Enums"]["rcm_service_kind"] | null
          service_name?: string
          source_visit_service_id?: string | null
          specialty?: string | null
          unit_price?: number
          updated_at?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "rcm_claim_lines_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "rcm_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_claim_payments: {
        Row: {
          amount: number
          claim_id: string
          created_at: string
          id: string
          method: Database["public"]["Enums"]["rcm_payment_method"]
          notes: string | null
          paid_at: string
          recorded_by: string | null
          reference: string | null
          remittance_id: string | null
        }
        Insert: {
          amount?: number
          claim_id: string
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["rcm_payment_method"]
          notes?: string | null
          paid_at?: string
          recorded_by?: string | null
          reference?: string | null
          remittance_id?: string | null
        }
        Update: {
          amount?: number
          claim_id?: string
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["rcm_payment_method"]
          notes?: string | null
          paid_at?: string
          recorded_by?: string | null
          reference?: string | null
          remittance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rcm_claim_payments_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "rcm_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_claim_payments_remittance_id_fkey"
            columns: ["remittance_id"]
            isOneToOne: false
            referencedRelation: "rcm_remittances"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_claim_submissions: {
        Row: {
          attempt_no: number
          claim_id: string
          error_message: string | null
          id: string
          nphies_batch_id: string | null
          request_payload: Json | null
          responded_at: string | null
          response_payload: Json | null
          status: Database["public"]["Enums"]["rcm_submission_status"]
          submitted_at: string
          submitted_by: string | null
        }
        Insert: {
          attempt_no?: number
          claim_id: string
          error_message?: string | null
          id?: string
          nphies_batch_id?: string | null
          request_payload?: Json | null
          responded_at?: string | null
          response_payload?: Json | null
          status?: Database["public"]["Enums"]["rcm_submission_status"]
          submitted_at?: string
          submitted_by?: string | null
        }
        Update: {
          attempt_no?: number
          claim_id?: string
          error_message?: string | null
          id?: string
          nphies_batch_id?: string | null
          request_payload?: Json | null
          responded_at?: string | null
          response_payload?: Json | null
          status?: Database["public"]["Enums"]["rcm_submission_status"]
          submitted_at?: string
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rcm_claim_submissions_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "rcm_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_claims: {
        Row: {
          admission_id: string | null
          authorization_id: string | null
          claim_no: string | null
          class_id: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          denied_amount: number
          diagnosis_codes: string[] | null
          discount_amount: number
          encounter_type: Database["public"]["Enums"]["rcm_encounter_type"]
          gross_amount: number
          id: string
          net_amount: number
          network_id: string | null
          notes: string | null
          nphies_request_ref: string | null
          nphies_response_ref: string | null
          organization_id: string
          outstanding_amount: number
          paid_amount: number
          patient_device_id: string | null
          patient_profile_id: string | null
          patient_share: number
          payer_id: string | null
          payer_share: number
          policy_id: string | null
          scrubber_result: Json | null
          status: Database["public"]["Enums"]["rcm_claim_status"]
          submitted_at: string | null
          updated_at: string
          vat_amount: number
          visit_id: string | null
        }
        Insert: {
          admission_id?: string | null
          authorization_id?: string | null
          claim_no?: string | null
          class_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          denied_amount?: number
          diagnosis_codes?: string[] | null
          discount_amount?: number
          encounter_type?: Database["public"]["Enums"]["rcm_encounter_type"]
          gross_amount?: number
          id?: string
          net_amount?: number
          network_id?: string | null
          notes?: string | null
          nphies_request_ref?: string | null
          nphies_response_ref?: string | null
          organization_id: string
          outstanding_amount?: number
          paid_amount?: number
          patient_device_id?: string | null
          patient_profile_id?: string | null
          patient_share?: number
          payer_id?: string | null
          payer_share?: number
          policy_id?: string | null
          scrubber_result?: Json | null
          status?: Database["public"]["Enums"]["rcm_claim_status"]
          submitted_at?: string | null
          updated_at?: string
          vat_amount?: number
          visit_id?: string | null
        }
        Update: {
          admission_id?: string | null
          authorization_id?: string | null
          claim_no?: string | null
          class_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          denied_amount?: number
          diagnosis_codes?: string[] | null
          discount_amount?: number
          encounter_type?: Database["public"]["Enums"]["rcm_encounter_type"]
          gross_amount?: number
          id?: string
          net_amount?: number
          network_id?: string | null
          notes?: string | null
          nphies_request_ref?: string | null
          nphies_response_ref?: string | null
          organization_id?: string
          outstanding_amount?: number
          paid_amount?: number
          patient_device_id?: string | null
          patient_profile_id?: string | null
          patient_share?: number
          payer_id?: string | null
          payer_share?: number
          policy_id?: string | null
          scrubber_result?: Json | null
          status?: Database["public"]["Enums"]["rcm_claim_status"]
          submitted_at?: string | null
          updated_at?: string
          vat_amount?: number
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rcm_claims_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_class_networks: {
        Row: {
          class_id: string
          created_at: string
          id: string
          is_default: boolean
          network_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          network_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          network_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rcm_class_networks_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "rcm_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_class_networks_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "rcm_networks"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_classes: {
        Row: {
          approval_limit: number | null
          before_discount: boolean
          consultation_rule: number | null
          created_at: string
          created_by: string | null
          deductible_type:
            | Database["public"]["Enums"]["rcm_deductible_type"]
            | null
          deductible_value: number | null
          id: string
          internal_serial: string | null
          is_active: boolean
          maximum_limit: number | null
          medications_rule: number | null
          name: string
          name_ar: string | null
          policy_id: string
          room_type: Database["public"]["Enums"]["rcm_room_type"] | null
          services_rule: number | null
          updated_at: string
        }
        Insert: {
          approval_limit?: number | null
          before_discount?: boolean
          consultation_rule?: number | null
          created_at?: string
          created_by?: string | null
          deductible_type?:
            | Database["public"]["Enums"]["rcm_deductible_type"]
            | null
          deductible_value?: number | null
          id?: string
          internal_serial?: string | null
          is_active?: boolean
          maximum_limit?: number | null
          medications_rule?: number | null
          name: string
          name_ar?: string | null
          policy_id: string
          room_type?: Database["public"]["Enums"]["rcm_room_type"] | null
          services_rule?: number | null
          updated_at?: string
        }
        Update: {
          approval_limit?: number | null
          before_discount?: boolean
          consultation_rule?: number | null
          created_at?: string
          created_by?: string | null
          deductible_type?:
            | Database["public"]["Enums"]["rcm_deductible_type"]
            | null
          deductible_value?: number | null
          id?: string
          internal_serial?: string | null
          is_active?: boolean
          maximum_limit?: number | null
          medications_rule?: number | null
          name?: string
          name_ar?: string | null
          policy_id?: string
          room_type?: Database["public"]["Enums"]["rcm_room_type"] | null
          services_rule?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rcm_classes_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "rcm_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_coverage_rules: {
        Row: {
          class_id: string | null
          coverage_pct: number | null
          created_at: string
          id: string
          is_covered: boolean
          network_id: string | null
          notes: string | null
          payer_id: string | null
          policy_id: string | null
          scope: Database["public"]["Enums"]["rcm_rule_scope"]
          service_code: string | null
          service_kind: Database["public"]["Enums"]["rcm_service_kind"] | null
          specialty: string | null
          sub_category: string | null
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          coverage_pct?: number | null
          created_at?: string
          id?: string
          is_covered?: boolean
          network_id?: string | null
          notes?: string | null
          payer_id?: string | null
          policy_id?: string | null
          scope: Database["public"]["Enums"]["rcm_rule_scope"]
          service_code?: string | null
          service_kind?: Database["public"]["Enums"]["rcm_service_kind"] | null
          specialty?: string | null
          sub_category?: string | null
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          coverage_pct?: number | null
          created_at?: string
          id?: string
          is_covered?: boolean
          network_id?: string | null
          notes?: string | null
          payer_id?: string | null
          policy_id?: string | null
          scope?: Database["public"]["Enums"]["rcm_rule_scope"]
          service_code?: string | null
          service_kind?: Database["public"]["Enums"]["rcm_service_kind"] | null
          specialty?: string | null
          sub_category?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rcm_coverage_rules_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "rcm_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_coverage_rules_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "rcm_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_coverage_rules_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "rcm_payers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_coverage_rules_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "rcm_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_discharge_signoffs: {
        Row: {
          admission_id: string
          created_at: string
          id: string
          nursing_notes: string | null
          nursing_signed_at: string | null
          nursing_signed_by: string | null
          pharmacy_notes: string | null
          pharmacy_signed_at: string | null
          pharmacy_signed_by: string | null
          physician_notes: string | null
          physician_signed_at: string | null
          physician_signed_by: string | null
          updated_at: string
        }
        Insert: {
          admission_id: string
          created_at?: string
          id?: string
          nursing_notes?: string | null
          nursing_signed_at?: string | null
          nursing_signed_by?: string | null
          pharmacy_notes?: string | null
          pharmacy_signed_at?: string | null
          pharmacy_signed_by?: string | null
          physician_notes?: string | null
          physician_signed_at?: string | null
          physician_signed_by?: string | null
          updated_at?: string
        }
        Update: {
          admission_id?: string
          created_at?: string
          id?: string
          nursing_notes?: string | null
          nursing_signed_at?: string | null
          nursing_signed_by?: string | null
          pharmacy_notes?: string | null
          pharmacy_signed_at?: string | null
          pharmacy_signed_by?: string | null
          physician_notes?: string | null
          physician_signed_at?: string | null
          physician_signed_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rcm_discharge_signoffs_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: true
            referencedRelation: "rcm_admissions"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_discharge_steps: {
        Row: {
          actor_id: string | null
          actor_role: string | null
          admission_id: string
          id: string
          notes: string | null
          occurred_at: string
          payload: Json | null
          stage: Database["public"]["Enums"]["rcm_discharge_stage"]
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string | null
          admission_id: string
          id?: string
          notes?: string | null
          occurred_at?: string
          payload?: Json | null
          stage: Database["public"]["Enums"]["rcm_discharge_stage"]
        }
        Update: {
          actor_id?: string | null
          actor_role?: string | null
          admission_id?: string
          id?: string
          notes?: string | null
          occurred_at?: string
          payload?: Json | null
          stage?: Database["public"]["Enums"]["rcm_discharge_stage"]
        }
        Relationships: [
          {
            foreignKeyName: "rcm_discharge_steps_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "rcm_admissions"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_discount_rules: {
        Row: {
          amount: number | null
          conditions: string | null
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          id: string
          kind: Database["public"]["Enums"]["rcm_discount_kind"]
          notes: string | null
          payer_id: string
          pct: number | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          conditions?: string | null
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          kind: Database["public"]["Enums"]["rcm_discount_kind"]
          notes?: string | null
          payer_id: string
          pct?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          conditions?: string | null
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["rcm_discount_kind"]
          notes?: string | null
          payer_id?: string
          pct?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rcm_discount_rules_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "rcm_payers"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_eligibility_checks: {
        Row: {
          checked_at: string
          class_id: string | null
          created_at: string
          created_by: string | null
          exception_evidence_url: string | null
          exception_type: Database["public"]["Enums"]["rcm_eligibility_exception"]
          id: string
          membership_id: string | null
          network_id: string | null
          nphies_reference: string | null
          organization_id: string | null
          patient_device_id: string | null
          patient_profile_id: string | null
          payer_id: string | null
          policy_id: string | null
          reason: string | null
          request_payload: Json | null
          response_payload: Json | null
          status: Database["public"]["Enums"]["rcm_eligibility_status"]
          visit_ref: string | null
        }
        Insert: {
          checked_at?: string
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          exception_evidence_url?: string | null
          exception_type?: Database["public"]["Enums"]["rcm_eligibility_exception"]
          id?: string
          membership_id?: string | null
          network_id?: string | null
          nphies_reference?: string | null
          organization_id?: string | null
          patient_device_id?: string | null
          patient_profile_id?: string | null
          payer_id?: string | null
          policy_id?: string | null
          reason?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: Database["public"]["Enums"]["rcm_eligibility_status"]
          visit_ref?: string | null
        }
        Update: {
          checked_at?: string
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          exception_evidence_url?: string | null
          exception_type?: Database["public"]["Enums"]["rcm_eligibility_exception"]
          id?: string
          membership_id?: string | null
          network_id?: string | null
          nphies_reference?: string | null
          organization_id?: string | null
          patient_device_id?: string | null
          patient_profile_id?: string | null
          payer_id?: string | null
          policy_id?: string | null
          reason?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: Database["public"]["Enums"]["rcm_eligibility_status"]
          visit_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rcm_eligibility_checks_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "rcm_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_eligibility_checks_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "rcm_payer_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_eligibility_checks_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "rcm_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_eligibility_checks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_eligibility_checks_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "rcm_payers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_eligibility_checks_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "rcm_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_import_jobs: {
        Row: {
          ai_summary: string | null
          applied_at: string | null
          applied_by: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          kind: Database["public"]["Enums"]["rcm_import_kind"]
          parsed_payload: Json | null
          payer_id: string | null
          policy_id: string | null
          price_list_id: string | null
          source_filename: string | null
          source_mime: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["rcm_import_status"]
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          applied_at?: string | null
          applied_by?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          kind: Database["public"]["Enums"]["rcm_import_kind"]
          parsed_payload?: Json | null
          payer_id?: string | null
          policy_id?: string | null
          price_list_id?: string | null
          source_filename?: string | null
          source_mime?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["rcm_import_status"]
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          applied_at?: string | null
          applied_by?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["rcm_import_kind"]
          parsed_payload?: Json | null
          payer_id?: string | null
          policy_id?: string | null
          price_list_id?: string | null
          source_filename?: string | null
          source_mime?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["rcm_import_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rcm_import_jobs_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "rcm_payers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_import_jobs_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "rcm_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_import_jobs_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "rcm_price_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_import_mappings: {
        Row: {
          approved: boolean
          confidence: number | null
          created_at: string
          id: string
          job_id: string
          notes: string | null
          proposed: Json | null
          raw_row: Json
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          approved?: boolean
          confidence?: number | null
          created_at?: string
          id?: string
          job_id: string
          notes?: string | null
          proposed?: Json | null
          raw_row: Json
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          approved?: boolean
          confidence?: number | null
          created_at?: string
          id?: string
          job_id?: string
          notes?: string | null
          proposed?: Json | null
          raw_row?: Json
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rcm_import_mappings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "rcm_import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_los_extensions: {
        Row: {
          admission_id: string
          approved_extra_days: number | null
          authorization_id: string | null
          clinical_justification: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_notes: string | null
          id: string
          requested_by: string | null
          requested_extra_days: number
          status: Database["public"]["Enums"]["rcm_los_ext_status"]
          updated_at: string
        }
        Insert: {
          admission_id: string
          approved_extra_days?: number | null
          authorization_id?: string | null
          clinical_justification?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          id?: string
          requested_by?: string | null
          requested_extra_days: number
          status?: Database["public"]["Enums"]["rcm_los_ext_status"]
          updated_at?: string
        }
        Update: {
          admission_id?: string
          approved_extra_days?: number | null
          authorization_id?: string | null
          clinical_justification?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          id?: string
          requested_by?: string | null
          requested_extra_days?: number
          status?: Database["public"]["Enums"]["rcm_los_ext_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rcm_los_extensions_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "rcm_admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_los_extensions_authorization_id_fkey"
            columns: ["authorization_id"]
            isOneToOne: false
            referencedRelation: "rcm_authorization_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_need_approval_rules: {
        Row: {
          class_id: string | null
          created_at: string
          exceed_approval_limit: boolean
          id: string
          notes: string | null
          payer_id: string | null
          policy_id: string | null
          ppd_threshold: number | null
          scope: Database["public"]["Enums"]["rcm_rule_scope"]
          service_code: string | null
          service_kind: Database["public"]["Enums"]["rcm_service_kind"] | null
          special_condition: string | null
          specialty: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          exceed_approval_limit?: boolean
          id?: string
          notes?: string | null
          payer_id?: string | null
          policy_id?: string | null
          ppd_threshold?: number | null
          scope: Database["public"]["Enums"]["rcm_rule_scope"]
          service_code?: string | null
          service_kind?: Database["public"]["Enums"]["rcm_service_kind"] | null
          special_condition?: string | null
          specialty?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string
          exceed_approval_limit?: boolean
          id?: string
          notes?: string | null
          payer_id?: string | null
          policy_id?: string | null
          ppd_threshold?: number | null
          scope?: Database["public"]["Enums"]["rcm_rule_scope"]
          service_code?: string | null
          service_kind?: Database["public"]["Enums"]["rcm_service_kind"] | null
          special_condition?: string | null
          specialty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rcm_need_approval_rules_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "rcm_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_need_approval_rules_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "rcm_payers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_need_approval_rules_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "rcm_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_networks: {
        Row: {
          approval_limit: number | null
          code: string | null
          created_at: string
          created_by: string | null
          deductible_type:
            | Database["public"]["Enums"]["rcm_deductible_type"]
            | null
          deductible_value: number | null
          id: string
          is_active: boolean
          maximum_limit: number | null
          name: string
          name_ar: string | null
          payer_id: string | null
          room_type: Database["public"]["Enums"]["rcm_room_type"] | null
          updated_at: string
        }
        Insert: {
          approval_limit?: number | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          deductible_type?:
            | Database["public"]["Enums"]["rcm_deductible_type"]
            | null
          deductible_value?: number | null
          id?: string
          is_active?: boolean
          maximum_limit?: number | null
          name: string
          name_ar?: string | null
          payer_id?: string | null
          room_type?: Database["public"]["Enums"]["rcm_room_type"] | null
          updated_at?: string
        }
        Update: {
          approval_limit?: number | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          deductible_type?:
            | Database["public"]["Enums"]["rcm_deductible_type"]
            | null
          deductible_value?: number | null
          id?: string
          is_active?: boolean
          maximum_limit?: number | null
          name?: string
          name_ar?: string | null
          payer_id?: string | null
          room_type?: Database["public"]["Enums"]["rcm_room_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rcm_networks_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "rcm_payers"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_not_covered_rules: {
        Row: {
          class_id: string | null
          created_at: string
          id: string
          payer_id: string | null
          policy_id: string | null
          reason: string | null
          scope: Database["public"]["Enums"]["rcm_rule_scope"]
          service_code: string | null
          service_kind: Database["public"]["Enums"]["rcm_service_kind"] | null
          specialty: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          id?: string
          payer_id?: string | null
          policy_id?: string | null
          reason?: string | null
          scope: Database["public"]["Enums"]["rcm_rule_scope"]
          service_code?: string | null
          service_kind?: Database["public"]["Enums"]["rcm_service_kind"] | null
          specialty?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string
          id?: string
          payer_id?: string | null
          policy_id?: string | null
          reason?: string | null
          scope?: Database["public"]["Enums"]["rcm_rule_scope"]
          service_code?: string | null
          service_kind?: Database["public"]["Enums"]["rcm_service_kind"] | null
          specialty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rcm_not_covered_rules_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "rcm_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_not_covered_rules_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "rcm_payers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_not_covered_rules_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "rcm_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_package_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          package_id: string
          qty: number
          service_code: string
          service_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          package_id: string
          qty?: number
          service_code: string
          service_name: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          package_id?: string
          qty?: number
          service_code?: string
          service_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "rcm_package_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "rcm_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_packages: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          duration_days: number
          id: string
          is_active: boolean
          name: string
          name_ar: string | null
          notes: string | null
          payer_id: string | null
          policy_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          name: string
          name_ar?: string | null
          notes?: string | null
          payer_id?: string | null
          policy_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          name?: string
          name_ar?: string | null
          notes?: string | null
          payer_id?: string | null
          policy_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rcm_packages_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "rcm_payers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_packages_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "rcm_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_payer_memberships: {
        Row: {
          class_id: string | null
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          id: string
          is_active: boolean
          member_number: string
          network_id: string | null
          notes: string | null
          patient_device_id: string | null
          patient_profile_id: string | null
          payer_id: string
          policy_id: string | null
          source: string | null
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean
          member_number: string
          network_id?: string | null
          notes?: string | null
          patient_device_id?: string | null
          patient_profile_id?: string | null
          payer_id: string
          policy_id?: string | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean
          member_number?: string
          network_id?: string | null
          notes?: string | null
          patient_device_id?: string | null
          patient_profile_id?: string | null
          payer_id?: string
          policy_id?: string | null
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rcm_payer_memberships_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "rcm_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_payer_memberships_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "rcm_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_payer_memberships_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "rcm_payers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_payer_memberships_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "rcm_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_payers: {
        Row: {
          che_no: string | null
          code: string | null
          contact_email: string | null
          contact_phone: string | null
          contract_expiry: string | null
          created_at: string
          created_by: string | null
          id: string
          internal_serial: string | null
          is_active: boolean
          name: string
          name_ar: string | null
          tpa_id: string | null
          updated_at: string
          vat_no: string | null
        }
        Insert: {
          che_no?: string | null
          code?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contract_expiry?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          internal_serial?: string | null
          is_active?: boolean
          name: string
          name_ar?: string | null
          tpa_id?: string | null
          updated_at?: string
          vat_no?: string | null
        }
        Update: {
          che_no?: string | null
          code?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contract_expiry?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          internal_serial?: string | null
          is_active?: boolean
          name?: string
          name_ar?: string | null
          tpa_id?: string | null
          updated_at?: string
          vat_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rcm_payers_tpa_id_fkey"
            columns: ["tpa_id"]
            isOneToOne: false
            referencedRelation: "rcm_tpas"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_policies: {
        Row: {
          created_at: string
          created_by: string | null
          effective_from: string | null
          effective_to: string | null
          id: string
          internal_serial: string | null
          is_active: boolean
          name: string
          name_ar: string | null
          notes: string | null
          payer_id: string
          policy_no: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          internal_serial?: string | null
          is_active?: boolean
          name: string
          name_ar?: string | null
          notes?: string | null
          payer_id: string
          policy_no: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          internal_serial?: string | null
          is_active?: boolean
          name?: string
          name_ar?: string | null
          notes?: string | null
          payer_id?: string
          policy_no?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rcm_policies_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "rcm_payers"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_policy_activation_requests: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          class_id: string | null
          created_at: string
          created_by: string | null
          decided_at: string | null
          decided_by: string | null
          decision_notes: string | null
          eligibility_check_id: string | null
          evidence_url: string | null
          exception_type: Database["public"]["Enums"]["rcm_eligibility_exception"]
          id: string
          kind: Database["public"]["Enums"]["rcm_activation_kind"]
          member_number: string | null
          network_id: string | null
          organization_id: string
          patient_device_id: string | null
          patient_profile_id: string | null
          proposed_class_id: string | null
          proposed_network_id: string | null
          proposed_payer_id: string | null
          proposed_policy_id: string | null
          resulting_membership_id: string | null
          status: Database["public"]["Enums"]["rcm_activation_status"]
          updated_at: string
          validity_from: string | null
          validity_to: string | null
          visit_ref: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          eligibility_check_id?: string | null
          evidence_url?: string | null
          exception_type?: Database["public"]["Enums"]["rcm_eligibility_exception"]
          id?: string
          kind?: Database["public"]["Enums"]["rcm_activation_kind"]
          member_number?: string | null
          network_id?: string | null
          organization_id: string
          patient_device_id?: string | null
          patient_profile_id?: string | null
          proposed_class_id?: string | null
          proposed_network_id?: string | null
          proposed_payer_id?: string | null
          proposed_policy_id?: string | null
          resulting_membership_id?: string | null
          status?: Database["public"]["Enums"]["rcm_activation_status"]
          updated_at?: string
          validity_from?: string | null
          validity_to?: string | null
          visit_ref?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          eligibility_check_id?: string | null
          evidence_url?: string | null
          exception_type?: Database["public"]["Enums"]["rcm_eligibility_exception"]
          id?: string
          kind?: Database["public"]["Enums"]["rcm_activation_kind"]
          member_number?: string | null
          network_id?: string | null
          organization_id?: string
          patient_device_id?: string | null
          patient_profile_id?: string | null
          proposed_class_id?: string | null
          proposed_network_id?: string | null
          proposed_payer_id?: string | null
          proposed_policy_id?: string | null
          resulting_membership_id?: string | null
          status?: Database["public"]["Enums"]["rcm_activation_status"]
          updated_at?: string
          validity_from?: string | null
          validity_to?: string | null
          visit_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rcm_policy_activation_requests_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "rcm_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_policy_activation_requests_eligibility_check_id_fkey"
            columns: ["eligibility_check_id"]
            isOneToOne: false
            referencedRelation: "rcm_eligibility_checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_policy_activation_requests_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "rcm_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_policy_activation_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_policy_activation_requests_proposed_class_id_fkey"
            columns: ["proposed_class_id"]
            isOneToOne: false
            referencedRelation: "rcm_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_policy_activation_requests_proposed_network_id_fkey"
            columns: ["proposed_network_id"]
            isOneToOne: false
            referencedRelation: "rcm_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_policy_activation_requests_proposed_payer_id_fkey"
            columns: ["proposed_payer_id"]
            isOneToOne: false
            referencedRelation: "rcm_payers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_policy_activation_requests_proposed_policy_id_fkey"
            columns: ["proposed_policy_id"]
            isOneToOne: false
            referencedRelation: "rcm_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_policy_activation_requests_resulting_membership_id_fkey"
            columns: ["resulting_membership_id"]
            isOneToOne: false
            referencedRelation: "rcm_payer_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_price_list_items: {
        Row: {
          created_at: string
          id: string
          is_referral_price: boolean
          price_list_id: string
          service_code: string
          service_kind: Database["public"]["Enums"]["rcm_service_kind"]
          service_name: string
          service_name_ar: string | null
          specialty: string | null
          sub_category: string | null
          time_band: Database["public"]["Enums"]["rcm_time_band"]
          unit_price: number
          uom: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_referral_price?: boolean
          price_list_id: string
          service_code: string
          service_kind?: Database["public"]["Enums"]["rcm_service_kind"]
          service_name: string
          service_name_ar?: string | null
          specialty?: string | null
          sub_category?: string | null
          time_band?: Database["public"]["Enums"]["rcm_time_band"]
          unit_price?: number
          uom?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_referral_price?: boolean
          price_list_id?: string
          service_code?: string
          service_kind?: Database["public"]["Enums"]["rcm_service_kind"]
          service_name?: string
          service_name_ar?: string | null
          specialty?: string | null
          sub_category?: string | null
          time_band?: Database["public"]["Enums"]["rcm_time_band"]
          unit_price?: number
          uom?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rcm_price_list_items_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "rcm_price_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_price_lists: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          effective_from: string
          effective_to: string | null
          id: string
          is_active: boolean
          name: string
          name_ar: string | null
          notes: string | null
          payer_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean
          name: string
          name_ar?: string | null
          notes?: string | null
          payer_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean
          name?: string
          name_ar?: string | null
          notes?: string | null
          payer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rcm_price_lists_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "rcm_payers"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_remittance_lines: {
        Row: {
          adjusted_amount: number
          claim_id: string | null
          claim_line_id: string | null
          created_at: string
          denied_amount: number
          id: string
          paid_amount: number
          reason_code: string | null
          reason_text: string | null
          remittance_id: string
          status: Database["public"]["Enums"]["rcm_remit_line_status"]
        }
        Insert: {
          adjusted_amount?: number
          claim_id?: string | null
          claim_line_id?: string | null
          created_at?: string
          denied_amount?: number
          id?: string
          paid_amount?: number
          reason_code?: string | null
          reason_text?: string | null
          remittance_id: string
          status?: Database["public"]["Enums"]["rcm_remit_line_status"]
        }
        Update: {
          adjusted_amount?: number
          claim_id?: string | null
          claim_line_id?: string | null
          created_at?: string
          denied_amount?: number
          id?: string
          paid_amount?: number
          reason_code?: string | null
          reason_text?: string | null
          remittance_id?: string
          status?: Database["public"]["Enums"]["rcm_remit_line_status"]
        }
        Relationships: [
          {
            foreignKeyName: "rcm_remittance_lines_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "rcm_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_remittance_lines_claim_line_id_fkey"
            columns: ["claim_line_id"]
            isOneToOne: false
            referencedRelation: "rcm_claim_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_remittance_lines_remittance_id_fkey"
            columns: ["remittance_id"]
            isOneToOne: false
            referencedRelation: "rcm_remittances"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_remittances: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          organization_id: string
          payer_id: string | null
          reference: string | null
          remit_date: string
          remit_no: string | null
          source_filename: string | null
          total_adjusted: number
          total_denied: number
          total_paid: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          payer_id?: string | null
          reference?: string | null
          remit_date?: string
          remit_no?: string | null
          source_filename?: string | null
          total_adjusted?: number
          total_denied?: number
          total_paid?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          payer_id?: string | null
          reference?: string | null
          remit_date?: string
          remit_no?: string | null
          source_filename?: string | null
          total_adjusted?: number
          total_denied?: number
          total_paid?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rcm_remittances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_tpas: {
        Row: {
          code: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          id: string
          internal_serial: string | null
          is_active: boolean
          name: string
          name_ar: string | null
          updated_at: string
          vat_no: string | null
        }
        Insert: {
          code?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          internal_serial?: string | null
          is_active?: boolean
          name: string
          name_ar?: string | null
          updated_at?: string
          vat_no?: string | null
        }
        Update: {
          code?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          internal_serial?: string | null
          is_active?: boolean
          name?: string
          name_ar?: string | null
          updated_at?: string
          vat_no?: string | null
        }
        Relationships: []
      }
      rcm_visit_diagnoses: {
        Row: {
          code: string
          code_system: string
          created_at: string
          description: string | null
          id: string
          role: Database["public"]["Enums"]["rcm_diagnosis_role"]
          visit_id: string
        }
        Insert: {
          code: string
          code_system?: string
          created_at?: string
          description?: string | null
          id?: string
          role?: Database["public"]["Enums"]["rcm_diagnosis_role"]
          visit_id: string
        }
        Update: {
          code?: string
          code_system?: string
          created_at?: string
          description?: string | null
          id?: string
          role?: Database["public"]["Enums"]["rcm_diagnosis_role"]
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rcm_visit_diagnoses_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "rcm_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_visit_invoices: {
        Row: {
          balance_due: number
          created_at: string
          currency: string
          discount_total: number
          due_at: string | null
          gross_total: number
          id: string
          invoice_no: string | null
          issued_at: string | null
          net_total: number
          notes: string | null
          paid_total: number
          patient_share_total: number
          payer_share_total: number
          status: Database["public"]["Enums"]["rcm_invoice_status"]
          updated_at: string
          vat_total: number
          visit_id: string
        }
        Insert: {
          balance_due?: number
          created_at?: string
          currency?: string
          discount_total?: number
          due_at?: string | null
          gross_total?: number
          id?: string
          invoice_no?: string | null
          issued_at?: string | null
          net_total?: number
          notes?: string | null
          paid_total?: number
          patient_share_total?: number
          payer_share_total?: number
          status?: Database["public"]["Enums"]["rcm_invoice_status"]
          updated_at?: string
          vat_total?: number
          visit_id: string
        }
        Update: {
          balance_due?: number
          created_at?: string
          currency?: string
          discount_total?: number
          due_at?: string | null
          gross_total?: number
          id?: string
          invoice_no?: string | null
          issued_at?: string | null
          net_total?: number
          notes?: string | null
          paid_total?: number
          patient_share_total?: number
          payer_share_total?: number
          status?: Database["public"]["Enums"]["rcm_invoice_status"]
          updated_at?: string
          vat_total?: number
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rcm_visit_invoices_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "rcm_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_visit_payments: {
        Row: {
          amount: number
          collected_at: string
          collected_by: string | null
          created_at: string
          id: string
          invoice_id: string
          method: Database["public"]["Enums"]["rcm_payment_method"]
          notes: string | null
          reference: string | null
        }
        Insert: {
          amount?: number
          collected_at?: string
          collected_by?: string | null
          created_at?: string
          id?: string
          invoice_id: string
          method?: Database["public"]["Enums"]["rcm_payment_method"]
          notes?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          collected_at?: string
          collected_by?: string | null
          created_at?: string
          id?: string
          invoice_id?: string
          method?: Database["public"]["Enums"]["rcm_payment_method"]
          notes?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rcm_visit_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "rcm_visit_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_visit_services: {
        Row: {
          authorization_item_id: string | null
          authorization_request_id: string | null
          copay_amount: number
          coverage_pct: number
          created_at: string
          decision: Database["public"]["Enums"]["rcm_service_line_decision"]
          deductible_amount: number
          denial_reason: string | null
          discount_amount: number
          gross_amount: number
          id: string
          line_kind: Database["public"]["Enums"]["rcm_service_line_kind"]
          net_amount: number
          notes: string | null
          patient_share: number
          payer_share: number
          performed_at: string | null
          performed_by: string | null
          qty: number
          service_code: string
          service_name: string
          unit_price: number
          updated_at: string
          vat_amount: number
          vat_pct: number
          visit_id: string
        }
        Insert: {
          authorization_item_id?: string | null
          authorization_request_id?: string | null
          copay_amount?: number
          coverage_pct?: number
          created_at?: string
          decision?: Database["public"]["Enums"]["rcm_service_line_decision"]
          deductible_amount?: number
          denial_reason?: string | null
          discount_amount?: number
          gross_amount?: number
          id?: string
          line_kind?: Database["public"]["Enums"]["rcm_service_line_kind"]
          net_amount?: number
          notes?: string | null
          patient_share?: number
          payer_share?: number
          performed_at?: string | null
          performed_by?: string | null
          qty?: number
          service_code: string
          service_name: string
          unit_price?: number
          updated_at?: string
          vat_amount?: number
          vat_pct?: number
          visit_id: string
        }
        Update: {
          authorization_item_id?: string | null
          authorization_request_id?: string | null
          copay_amount?: number
          coverage_pct?: number
          created_at?: string
          decision?: Database["public"]["Enums"]["rcm_service_line_decision"]
          deductible_amount?: number
          denial_reason?: string | null
          discount_amount?: number
          gross_amount?: number
          id?: string
          line_kind?: Database["public"]["Enums"]["rcm_service_line_kind"]
          net_amount?: number
          notes?: string | null
          patient_share?: number
          payer_share?: number
          performed_at?: string | null
          performed_by?: string | null
          qty?: number
          service_code?: string
          service_name?: string
          unit_price?: number
          updated_at?: string
          vat_amount?: number
          vat_pct?: number
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rcm_visit_services_authorization_item_id_fkey"
            columns: ["authorization_item_id"]
            isOneToOne: false
            referencedRelation: "rcm_authorization_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_visit_services_authorization_request_id_fkey"
            columns: ["authorization_request_id"]
            isOneToOne: false
            referencedRelation: "rcm_authorization_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_visit_services_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "rcm_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      rcm_visits: {
        Row: {
          arrival_at: string
          attending_name: string | null
          attending_user_id: string | null
          chief_complaint: string | null
          class_id: string | null
          created_at: string
          created_by: string | null
          discharge_at: string | null
          discharge_disposition: string | null
          eligibility_check_id: string | null
          id: string
          is_self_pay: boolean
          membership_id: string | null
          network_id: string | null
          notes: string | null
          organization_id: string
          patient_device_id: string | null
          patient_profile_id: string | null
          payer_id: string | null
          policy_id: string | null
          seen_at: string | null
          specialty: string | null
          status: Database["public"]["Enums"]["rcm_visit_status"]
          triage_level: Database["public"]["Enums"]["rcm_triage_level"]
          updated_at: string
          visit_kind: Database["public"]["Enums"]["rcm_visit_kind"]
          visit_no: string | null
        }
        Insert: {
          arrival_at?: string
          attending_name?: string | null
          attending_user_id?: string | null
          chief_complaint?: string | null
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          discharge_at?: string | null
          discharge_disposition?: string | null
          eligibility_check_id?: string | null
          id?: string
          is_self_pay?: boolean
          membership_id?: string | null
          network_id?: string | null
          notes?: string | null
          organization_id: string
          patient_device_id?: string | null
          patient_profile_id?: string | null
          payer_id?: string | null
          policy_id?: string | null
          seen_at?: string | null
          specialty?: string | null
          status?: Database["public"]["Enums"]["rcm_visit_status"]
          triage_level?: Database["public"]["Enums"]["rcm_triage_level"]
          updated_at?: string
          visit_kind?: Database["public"]["Enums"]["rcm_visit_kind"]
          visit_no?: string | null
        }
        Update: {
          arrival_at?: string
          attending_name?: string | null
          attending_user_id?: string | null
          chief_complaint?: string | null
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          discharge_at?: string | null
          discharge_disposition?: string | null
          eligibility_check_id?: string | null
          id?: string
          is_self_pay?: boolean
          membership_id?: string | null
          network_id?: string | null
          notes?: string | null
          organization_id?: string
          patient_device_id?: string | null
          patient_profile_id?: string | null
          payer_id?: string | null
          policy_id?: string | null
          seen_at?: string | null
          specialty?: string | null
          status?: Database["public"]["Enums"]["rcm_visit_status"]
          triage_level?: Database["public"]["Enums"]["rcm_triage_level"]
          updated_at?: string
          visit_kind?: Database["public"]["Enums"]["rcm_visit_kind"]
          visit_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rcm_visits_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "rcm_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_visits_eligibility_check_id_fkey"
            columns: ["eligibility_check_id"]
            isOneToOne: false
            referencedRelation: "rcm_eligibility_checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_visits_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "rcm_payer_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_visits_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "rcm_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_visits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_visits_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "rcm_payers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rcm_visits_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "rcm_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_dispute_events: {
        Row: {
          actor_id: string | null
          actor_role: string | null
          created_at: string
          details: Json | null
          dispute_id: string
          event_type: string
          from_status: string | null
          id: string
          note: string | null
          to_status: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          details?: Json | null
          dispute_id: string
          event_type: string
          from_status?: string | null
          id?: string
          note?: string | null
          to_status?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          details?: Json | null
          dispute_id?: string
          event_type?: string
          from_status?: string | null
          id?: string
          note?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refund_dispute_events_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "refund_disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_disputes: {
        Row: {
          addon_id: string | null
          created_at: string
          currency: string
          device_id: string | null
          elapsed_pct_at_open: number | null
          id: string
          preview_amount: number | null
          reason: string | null
          refund_tx_id: string | null
          resolution_note: string | null
          resolved_amount: number | null
          resolved_at: string | null
          reviewer_id: string | null
          status: string
          subscription_id: string | null
          tier_at_open: string | null
          updated_at: string
          user_id: string | null
          user_subscription_id: string | null
        }
        Insert: {
          addon_id?: string | null
          created_at?: string
          currency?: string
          device_id?: string | null
          elapsed_pct_at_open?: number | null
          id?: string
          preview_amount?: number | null
          reason?: string | null
          refund_tx_id?: string | null
          resolution_note?: string | null
          resolved_amount?: number | null
          resolved_at?: string | null
          reviewer_id?: string | null
          status?: string
          subscription_id?: string | null
          tier_at_open?: string | null
          updated_at?: string
          user_id?: string | null
          user_subscription_id?: string | null
        }
        Update: {
          addon_id?: string | null
          created_at?: string
          currency?: string
          device_id?: string | null
          elapsed_pct_at_open?: number | null
          id?: string
          preview_amount?: number | null
          reason?: string | null
          refund_tx_id?: string | null
          resolution_note?: string | null
          resolved_amount?: number | null
          resolved_at?: string | null
          reviewer_id?: string | null
          status?: string
          subscription_id?: string | null
          tier_at_open?: string | null
          updated_at?: string
          user_id?: string | null
          user_subscription_id?: string | null
        }
        Relationships: []
      }
      site_pages: {
        Row: {
          body_md: string
          body_md_ar: string
          slug: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body_md?: string
          body_md_ar?: string
          slug: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body_md?: string
          body_md_ar?: string
          slug?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      subscription_addons: {
        Row: {
          activated_at: string | null
          addon: Database["public"]["Enums"]["addon_id"]
          admin_notes: string | null
          canceled_at: string | null
          created_at: string
          currency: string
          id: string
          qty: number
          status: Database["public"]["Enums"]["addon_status"]
          subscription_id: string
          unit_price: number
          updated_at: string
          user_id: string
          user_notes: string | null
        }
        Insert: {
          activated_at?: string | null
          addon: Database["public"]["Enums"]["addon_id"]
          admin_notes?: string | null
          canceled_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          qty?: number
          status?: Database["public"]["Enums"]["addon_status"]
          subscription_id: string
          unit_price?: number
          updated_at?: string
          user_id: string
          user_notes?: string | null
        }
        Update: {
          activated_at?: string | null
          addon?: Database["public"]["Enums"]["addon_id"]
          admin_notes?: string | null
          canceled_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          qty?: number
          status?: Database["public"]["Enums"]["addon_status"]
          subscription_id?: string
          unit_price?: number
          updated_at?: string
          user_id?: string
          user_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_addons_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_events: {
        Row: {
          actor_id: string | null
          actor_role: string | null
          created_at: string
          details: Json | null
          device_id: string
          event_type: string
          from_value: string | null
          id: string
          notes: string | null
          receipt_id: string | null
          subscription_id: string | null
          to_value: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          details?: Json | null
          device_id: string
          event_type: string
          from_value?: string | null
          id?: string
          notes?: string | null
          receipt_id?: string | null
          subscription_id?: string | null
          to_value?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          details?: Json | null
          device_id?: string
          event_type?: string
          from_value?: string | null
          id?: string
          notes?: string | null
          receipt_id?: string | null
          subscription_id?: string | null
          to_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "payment_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          billing_cycle: Database["public"]["Enums"]["billing_cycle"]
          canceled_at: string | null
          created_at: string
          currency: string
          current_period_end: string | null
          current_period_start: string
          device_id: string | null
          family_seat_capacity: number
          family_setup_completed: boolean
          id: string
          notes: string | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          canceled_at?: string | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string
          device_id?: string | null
          family_seat_capacity?: number
          family_setup_completed?: boolean
          id?: string
          notes?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          canceled_at?: string | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string
          device_id?: string | null
          family_seat_capacity?: number
          family_setup_completed?: boolean
          id?: string
          notes?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          category: Database["public"]["Enums"]["ticket_category"]
          created_at: string
          description: string
          device_id: string | null
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
          device_id?: string | null
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
          device_id?: string | null
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
      user_subscription_addons: {
        Row: {
          active_from: string
          active_until: string | null
          addon_key: string
          addon_label: string
          created_at: string
          currency: string
          id: string
          is_active: boolean
          quantity: number
          subscription_id: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          active_from?: string
          active_until?: string | null
          addon_key: string
          addon_label: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          quantity?: number
          subscription_id: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          active_from?: string
          active_until?: string | null
          addon_key?: string
          addon_label?: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          quantity?: number
          subscription_id?: string
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscription_addons_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          amount: number | null
          billing_cycle: string
          cancelled_at: string | null
          created_at: string
          currency: string
          current_period_end: string | null
          current_period_start: string | null
          device_id: string
          id: string
          notes: string | null
          payment_receipt_id: string | null
          plan: string
          provider: string
          provider_subscription_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          amount?: number | null
          billing_cycle?: string
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          device_id: string
          id?: string
          notes?: string | null
          payment_receipt_id?: string | null
          plan: string
          provider?: string
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          amount?: number | null
          billing_cycle?: string
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          device_id?: string
          id?: string
          notes?: string | null
          payment_receipt_id?: string | null
          plan?: string
          provider?: string
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_payment_receipt_id_fkey"
            columns: ["payment_receipt_id"]
            isOneToOne: false
            referencedRelation: "payment_receipts"
            referencedColumns: ["id"]
          },
        ]
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
      verification_assistance_requests: {
        Row: {
          channel: string | null
          created_at: string
          device_id: string | null
          full_name: string | null
          handled_at: string | null
          handled_by: string | null
          id: string
          kind: Database["public"]["Enums"]["verification_assist_kind"]
          note: string | null
          recipient: string
          resolution_notes: string | null
          status: Database["public"]["Enums"]["verification_assist_status"]
          updated_at: string
        }
        Insert: {
          channel?: string | null
          created_at?: string
          device_id?: string | null
          full_name?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          kind: Database["public"]["Enums"]["verification_assist_kind"]
          note?: string | null
          recipient: string
          resolution_notes?: string | null
          status?: Database["public"]["Enums"]["verification_assist_status"]
          updated_at?: string
        }
        Update: {
          channel?: string | null
          created_at?: string
          device_id?: string | null
          full_name?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["verification_assist_kind"]
          note?: string | null
          recipient?: string
          resolution_notes?: string | null
          status?: Database["public"]["Enums"]["verification_assist_status"]
          updated_at?: string
        }
        Relationships: []
      }
      wallet_payouts: {
        Row: {
          amount: number
          created_at: string
          currency: string
          device_id: string | null
          id: string
          method: string
          notes: string | null
          receipt_file_path: string | null
          reference_no: string | null
          related_dispute_id: string | null
          related_tx_id: string | null
          reviewer_id: string | null
          status: string
          updated_at: string
          user_id: string | null
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          device_id?: string | null
          id?: string
          method?: string
          notes?: string | null
          receipt_file_path?: string | null
          reference_no?: string | null
          related_dispute_id?: string | null
          related_tx_id?: string | null
          reviewer_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          device_id?: string | null
          id?: string
          method?: string
          notes?: string | null
          receipt_file_path?: string | null
          reference_no?: string | null
          related_dispute_id?: string | null
          related_tx_id?: string | null
          reviewer_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_payouts_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "patient_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          actor_id: string | null
          addon_id: string | null
          amount: number
          balance_after: number
          created_at: string
          currency: string
          details: Json | null
          device_id: string | null
          direction: string
          elapsed_pct: number | null
          id: string
          kind: string
          reason: string | null
          reference: string | null
          refund_pct: number | null
          refund_tier: string | null
          subscription_id: string | null
          user_id: string | null
          wallet_id: string
        }
        Insert: {
          actor_id?: string | null
          addon_id?: string | null
          amount: number
          balance_after: number
          created_at?: string
          currency?: string
          details?: Json | null
          device_id?: string | null
          direction: string
          elapsed_pct?: number | null
          id?: string
          kind: string
          reason?: string | null
          reference?: string | null
          refund_pct?: number | null
          refund_tier?: string | null
          subscription_id?: string | null
          user_id?: string | null
          wallet_id: string
        }
        Update: {
          actor_id?: string | null
          addon_id?: string | null
          amount?: number
          balance_after?: number
          created_at?: string
          currency?: string
          details?: Json | null
          device_id?: string | null
          direction?: string
          elapsed_pct?: number | null
          id?: string
          kind?: string
          reason?: string | null
          reference?: string | null
          refund_pct?: number | null
          refund_tier?: string | null
          subscription_id?: string | null
          user_id?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "patient_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ai_usage_audit: {
        Row: {
          count: number | null
          daily_limit: number | null
          device_id: string | null
          last_prompt_at: string | null
          plan: string | null
          resets_at: string | null
          usage_day: string | null
        }
        Relationships: []
      }
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
      admin_issue_refund: {
        Args: {
          _addon_id: string
          _amount: number
          _reason: string
          _subscription_id: string
        }
        Returns: string
      }
      admin_record_payout: {
        Args: {
          _amount: number
          _currency: string
          _device_id: string
          _dispute_id?: string
          _method: string
          _notes: string
          _receipt_file_path: string
          _reference_no: string
          _user_id: string
        }
        Returns: string
      }
      admin_resolve_dispute: {
        Args: {
          _dispute_id: string
          _note: string
          _override_amount: number
          _to_status: string
        }
        Returns: undefined
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
      compute_refund_tier: {
        Args: {
          _amount: number
          _now?: string
          _period_end: string
          _period_start: string
        }
        Returns: {
          elapsed_pct: number
          refund_amount: number
          refund_pct: number
          tier: string
        }[]
      }
      consume_ai_credit: {
        Args: { _daily_limit: number; _device_id: string }
        Returns: {
          allowed: boolean
          daily_limit: number
          new_count: number
          resets_at: string
        }[]
      }
      consume_manual_otp: {
        Args: { _code: string; _recipient: string }
        Returns: boolean
      }
      credit_wallet: {
        Args: {
          _actor_id: string
          _addon_id: string
          _amount: number
          _currency: string
          _details?: Json
          _device_id: string
          _elapsed_pct: number
          _kind: string
          _reason: string
          _refund_pct: number
          _refund_tier: string
          _subscription_id: string
          _user_id: string
        }
        Returns: string
      }
      get_or_create_wallet: {
        Args: { _currency?: string; _device_id: string; _user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
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
      provider_has_consent: {
        Args: {
          _device_id: string
          _org_id: string
          _section: Database["public"]["Enums"]["consent_section"]
        }
        Returns: boolean
      }
      rcm_advance_discharge: {
        Args: {
          _admission_id: string
          _notes: string
          _stage: Database["public"]["Enums"]["rcm_discharge_stage"]
        }
        Returns: undefined
      }
      rcm_auth_follow_up: {
        Args: { _hours?: number; _note?: string; _request_id: string }
        Returns: undefined
      }
      rcm_recompute_invoice: { Args: { _visit_id: string }; Returns: undefined }
      user_org_ids: { Args: { _user_id: string }; Returns: string[] }
    }
    Enums: {
      addon_id:
        | "medicalConsultant"
        | "rushTranslation"
        | "priorityCoordinator"
        | "caregiverSeat"
        | "physioNetwork"
        | "claimsConcierge"
      addon_status: "pending_admin" | "active" | "canceled" | "expired"
      app_role: "admin" | "moderator" | "user"
      billing_cycle: "monthly" | "annual"
      claim_status:
        | "pending_admin"
        | "pending_patient"
        | "approved"
        | "rejected"
        | "revoked"
      cms_nav_link_type: "page" | "anchor" | "external"
      cms_page_status: "draft" | "published" | "scheduled" | "archived"
      cms_section_type:
        | "hero"
        | "features"
        | "how"
        | "pricing"
        | "faq"
        | "cta"
        | "rich_text"
        | "testimonials"
        | "trust_logos"
        | "providers"
        | "contact_form"
        | "comparison"
        | "timeline"
        | "video"
        | "stats"
        | "text_image"
        | "footer_cta"
        | "team"
      consent_section:
        | "records"
        | "labs"
        | "rads"
        | "meds"
        | "appointments"
        | "journey"
        | "rcm"
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
      rcm_activation_kind: "policy" | "class" | "network"
      rcm_activation_status:
        | "pending"
        | "assigned"
        | "in_progress"
        | "activated"
        | "rejected"
        | "cancelled"
      rcm_admission_status:
        | "admitted"
        | "in_treatment"
        | "discharge_advised"
        | "discharge_ordered"
        | "service_reconciled"
        | "financial_discharged"
        | "discharged"
        | "cancelled"
      rcm_admission_type:
        | "day_case"
        | "elective"
        | "emergency"
        | "observation"
        | "transfer_in"
      rcm_auth_event_type:
        | "created"
        | "submitted"
        | "payer_response"
        | "additional_info_requested"
        | "follow_up_sent"
        | "reminder"
        | "partial_decision"
        | "final_decision"
        | "cancelled"
        | "expired"
        | "note"
      rcm_auth_item_status:
        | "pending"
        | "approved"
        | "partial"
        | "conditional"
        | "rejected"
      rcm_auth_priority: "routine" | "urgent" | "emergency" | "stat"
      rcm_auth_status:
        | "draft"
        | "submitted"
        | "in_review"
        | "additional_info_requested"
        | "approved"
        | "partial"
        | "conditional"
        | "rejected"
        | "cancelled"
        | "expired"
      rcm_bulk_kind:
        | "claim_upload"
        | "claim_correction"
        | "remittance_upload"
        | "price_correction"
      rcm_bulk_status:
        | "uploaded"
        | "parsing"
        | "parsed"
        | "applying"
        | "applied"
        | "failed"
      rcm_claim_status:
        | "draft"
        | "scrubbing"
        | "ready"
        | "submitted"
        | "accepted"
        | "rejected"
        | "partially_paid"
        | "paid"
        | "denied"
        | "appealed"
        | "closed"
        | "void"
      rcm_deductible_type: "percentage" | "amount"
      rcm_diagnosis_role: "principal" | "secondary" | "admitting" | "discharge"
      rcm_discharge_stage:
        | "discharge_advice"
        | "discharge_order"
        | "service_reconciliation"
        | "financial_discharge"
        | "left_facility"
      rcm_discount_kind: "prompt_payment" | "volume" | "contractual_other"
      rcm_eligibility_exception:
        | "none"
        | "referral"
        | "emergency_ctas"
        | "newborn"
      rcm_eligibility_status: "eligible" | "not_eligible" | "error" | "pending"
      rcm_encounter_type: "op" | "er" | "ip" | "dc"
      rcm_import_kind:
        | "contract"
        | "policy"
        | "price_list"
        | "package"
        | "class"
        | "network"
        | "tariff"
      rcm_import_status:
        | "uploaded"
        | "parsing"
        | "ready_for_review"
        | "mapped"
        | "applied"
        | "failed"
        | "cancelled"
      rcm_invoice_status:
        | "draft"
        | "issued"
        | "partially_paid"
        | "paid"
        | "void"
        | "refunded"
      rcm_los_ext_status:
        | "draft"
        | "submitted"
        | "approved"
        | "partial"
        | "rejected"
        | "cancelled"
      rcm_payment_method:
        | "cash"
        | "card"
        | "bank_transfer"
        | "wallet"
        | "insurance_writeoff"
        | "adjustment"
      rcm_remit_line_status: "paid" | "partial" | "denied" | "adjusted"
      rcm_room_type:
        | "ward"
        | "semi_private"
        | "private"
        | "vip"
        | "suite"
        | "icu"
        | "ccu"
        | "hdu"
        | "nicu"
        | "picu"
      rcm_rule_scope: "payer" | "policy" | "class" | "network"
      rcm_service_kind:
        | "consultation"
        | "procedure"
        | "lab"
        | "radiology"
        | "medication"
        | "room_board"
        | "other"
      rcm_service_line_decision:
        | "pending"
        | "covered"
        | "partially_covered"
        | "not_covered"
        | "needs_approval"
        | "denied"
      rcm_service_line_kind:
        | "consultation"
        | "lab"
        | "radiology"
        | "procedure"
        | "medication"
        | "supply"
        | "room"
        | "observation"
        | "other"
      rcm_submission_status:
        | "queued"
        | "sent"
        | "accepted"
        | "rejected"
        | "error"
      rcm_time_band: "any" | "am" | "pm"
      rcm_triage_level:
        | "1_resuscitation"
        | "2_emergent"
        | "3_urgent"
        | "4_less_urgent"
        | "5_non_urgent"
        | "none"
      rcm_visit_kind:
        | "op_clinic"
        | "op_walkin"
        | "er_triage"
        | "er_resus"
        | "telemed"
        | "daycase_op"
      rcm_visit_status:
        | "open"
        | "in_progress"
        | "discharged"
        | "billed"
        | "closed"
        | "cancelled"
      subscription_plan:
        | "free"
        | "starter"
        | "companion"
        | "family"
        | "enterprise"
      subscription_status:
        | "trial"
        | "active"
        | "past_due"
        | "canceled"
        | "expired"
        | "pending_setup"
      ticket_category: "billing" | "technical" | "medical" | "general"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
      user_status_enum: "active" | "on_hold" | "suspended"
      verification_assist_kind: "manual_code" | "profile_activation"
      verification_assist_status:
        | "pending"
        | "in_progress"
        | "fulfilled"
        | "rejected"
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
      addon_id: [
        "medicalConsultant",
        "rushTranslation",
        "priorityCoordinator",
        "caregiverSeat",
        "physioNetwork",
        "claimsConcierge",
      ],
      addon_status: ["pending_admin", "active", "canceled", "expired"],
      app_role: ["admin", "moderator", "user"],
      billing_cycle: ["monthly", "annual"],
      claim_status: [
        "pending_admin",
        "pending_patient",
        "approved",
        "rejected",
        "revoked",
      ],
      cms_nav_link_type: ["page", "anchor", "external"],
      cms_page_status: ["draft", "published", "scheduled", "archived"],
      cms_section_type: [
        "hero",
        "features",
        "how",
        "pricing",
        "faq",
        "cta",
        "rich_text",
        "testimonials",
        "trust_logos",
        "providers",
        "contact_form",
        "comparison",
        "timeline",
        "video",
        "stats",
        "text_image",
        "footer_cta",
        "team",
      ],
      consent_section: [
        "records",
        "labs",
        "rads",
        "meds",
        "appointments",
        "journey",
        "rcm",
      ],
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
      rcm_activation_kind: ["policy", "class", "network"],
      rcm_activation_status: [
        "pending",
        "assigned",
        "in_progress",
        "activated",
        "rejected",
        "cancelled",
      ],
      rcm_admission_status: [
        "admitted",
        "in_treatment",
        "discharge_advised",
        "discharge_ordered",
        "service_reconciled",
        "financial_discharged",
        "discharged",
        "cancelled",
      ],
      rcm_admission_type: [
        "day_case",
        "elective",
        "emergency",
        "observation",
        "transfer_in",
      ],
      rcm_auth_event_type: [
        "created",
        "submitted",
        "payer_response",
        "additional_info_requested",
        "follow_up_sent",
        "reminder",
        "partial_decision",
        "final_decision",
        "cancelled",
        "expired",
        "note",
      ],
      rcm_auth_item_status: [
        "pending",
        "approved",
        "partial",
        "conditional",
        "rejected",
      ],
      rcm_auth_priority: ["routine", "urgent", "emergency", "stat"],
      rcm_auth_status: [
        "draft",
        "submitted",
        "in_review",
        "additional_info_requested",
        "approved",
        "partial",
        "conditional",
        "rejected",
        "cancelled",
        "expired",
      ],
      rcm_bulk_kind: [
        "claim_upload",
        "claim_correction",
        "remittance_upload",
        "price_correction",
      ],
      rcm_bulk_status: [
        "uploaded",
        "parsing",
        "parsed",
        "applying",
        "applied",
        "failed",
      ],
      rcm_claim_status: [
        "draft",
        "scrubbing",
        "ready",
        "submitted",
        "accepted",
        "rejected",
        "partially_paid",
        "paid",
        "denied",
        "appealed",
        "closed",
        "void",
      ],
      rcm_deductible_type: ["percentage", "amount"],
      rcm_diagnosis_role: ["principal", "secondary", "admitting", "discharge"],
      rcm_discharge_stage: [
        "discharge_advice",
        "discharge_order",
        "service_reconciliation",
        "financial_discharge",
        "left_facility",
      ],
      rcm_discount_kind: ["prompt_payment", "volume", "contractual_other"],
      rcm_eligibility_exception: [
        "none",
        "referral",
        "emergency_ctas",
        "newborn",
      ],
      rcm_eligibility_status: ["eligible", "not_eligible", "error", "pending"],
      rcm_encounter_type: ["op", "er", "ip", "dc"],
      rcm_import_kind: [
        "contract",
        "policy",
        "price_list",
        "package",
        "class",
        "network",
        "tariff",
      ],
      rcm_import_status: [
        "uploaded",
        "parsing",
        "ready_for_review",
        "mapped",
        "applied",
        "failed",
        "cancelled",
      ],
      rcm_invoice_status: [
        "draft",
        "issued",
        "partially_paid",
        "paid",
        "void",
        "refunded",
      ],
      rcm_los_ext_status: [
        "draft",
        "submitted",
        "approved",
        "partial",
        "rejected",
        "cancelled",
      ],
      rcm_payment_method: [
        "cash",
        "card",
        "bank_transfer",
        "wallet",
        "insurance_writeoff",
        "adjustment",
      ],
      rcm_remit_line_status: ["paid", "partial", "denied", "adjusted"],
      rcm_room_type: [
        "ward",
        "semi_private",
        "private",
        "vip",
        "suite",
        "icu",
        "ccu",
        "hdu",
        "nicu",
        "picu",
      ],
      rcm_rule_scope: ["payer", "policy", "class", "network"],
      rcm_service_kind: [
        "consultation",
        "procedure",
        "lab",
        "radiology",
        "medication",
        "room_board",
        "other",
      ],
      rcm_service_line_decision: [
        "pending",
        "covered",
        "partially_covered",
        "not_covered",
        "needs_approval",
        "denied",
      ],
      rcm_service_line_kind: [
        "consultation",
        "lab",
        "radiology",
        "procedure",
        "medication",
        "supply",
        "room",
        "observation",
        "other",
      ],
      rcm_submission_status: [
        "queued",
        "sent",
        "accepted",
        "rejected",
        "error",
      ],
      rcm_time_band: ["any", "am", "pm"],
      rcm_triage_level: [
        "1_resuscitation",
        "2_emergent",
        "3_urgent",
        "4_less_urgent",
        "5_non_urgent",
        "none",
      ],
      rcm_visit_kind: [
        "op_clinic",
        "op_walkin",
        "er_triage",
        "er_resus",
        "telemed",
        "daycase_op",
      ],
      rcm_visit_status: [
        "open",
        "in_progress",
        "discharged",
        "billed",
        "closed",
        "cancelled",
      ],
      subscription_plan: [
        "free",
        "starter",
        "companion",
        "family",
        "enterprise",
      ],
      subscription_status: [
        "trial",
        "active",
        "past_due",
        "canceled",
        "expired",
        "pending_setup",
      ],
      ticket_category: ["billing", "technical", "medical", "general"],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
      user_status_enum: ["active", "on_hold", "suspended"],
      verification_assist_kind: ["manual_code", "profile_activation"],
      verification_assist_status: [
        "pending",
        "in_progress",
        "fulfilled",
        "rejected",
      ],
    },
  },
} as const
