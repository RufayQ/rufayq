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
          created_at: string
          created_by: string | null
          decided_at: string | null
          decided_by: string | null
          decision_notes: string | null
          eligibility_check_id: string | null
          evidence_url: string | null
          exception_type: Database["public"]["Enums"]["rcm_eligibility_exception"]
          id: string
          member_number: string | null
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
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          eligibility_check_id?: string | null
          evidence_url?: string | null
          exception_type?: Database["public"]["Enums"]["rcm_eligibility_exception"]
          id?: string
          member_number?: string | null
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
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          eligibility_check_id?: string | null
          evidence_url?: string | null
          exception_type?: Database["public"]["Enums"]["rcm_eligibility_exception"]
          id?: string
          member_number?: string | null
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
            foreignKeyName: "rcm_policy_activation_requests_eligibility_check_id_fkey"
            columns: ["eligibility_check_id"]
            isOneToOne: false
            referencedRelation: "rcm_eligibility_checks"
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
      user_org_ids: { Args: { _user_id: string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      claim_status:
        | "pending_admin"
        | "pending_patient"
        | "approved"
        | "rejected"
        | "revoked"
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
      rcm_activation_status:
        | "pending"
        | "assigned"
        | "in_progress"
        | "activated"
        | "rejected"
        | "cancelled"
      rcm_deductible_type: "percentage" | "amount"
      rcm_discount_kind: "prompt_payment" | "volume" | "contractual_other"
      rcm_eligibility_exception:
        | "none"
        | "referral"
        | "emergency_ctas"
        | "newborn"
      rcm_eligibility_status: "eligible" | "not_eligible" | "error" | "pending"
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
      rcm_time_band: "any" | "am" | "pm"
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
      claim_status: [
        "pending_admin",
        "pending_patient",
        "approved",
        "rejected",
        "revoked",
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
      rcm_activation_status: [
        "pending",
        "assigned",
        "in_progress",
        "activated",
        "rejected",
        "cancelled",
      ],
      rcm_deductible_type: ["percentage", "amount"],
      rcm_discount_kind: ["prompt_payment", "volume", "contractual_other"],
      rcm_eligibility_exception: [
        "none",
        "referral",
        "emergency_ctas",
        "newborn",
      ],
      rcm_eligibility_status: ["eligible", "not_eligible", "error", "pending"],
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
      rcm_time_band: ["any", "am", "pm"],
      ticket_category: ["billing", "technical", "medical", "general"],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
      user_status_enum: ["active", "on_hold", "suspended"],
    },
  },
} as const
