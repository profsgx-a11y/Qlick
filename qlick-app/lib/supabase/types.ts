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
      account_reports: {
        Row: {
          business_id: string
          created_at: string
          customer_name: string | null
          id: string
          reason: string | null
          reported_customer_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_name?: string | null
          id?: string
          reason?: string | null
          reported_customer_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_name?: string | null
          id?: string
          reason?: string | null
          reported_customer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_reports_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_reports_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_reports_reported_customer_id_fkey"
            columns: ["reported_customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_label: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          business_id: string
          business_customer_id: string | null
          series_id: string | null
          cancellation_reason: string | null
          cancelled_by: string | null
          completed_at: string | null
          created_at: string
          customer_id: string
          customer_name: string | null
          customer_notes: string | null
          customer_phone: string | null
          ends_at: string
          id: string
          internal_notes: string | null
          no_staff_preference: boolean
          price_cents: number
          service_id: string | null
          service_name: string | null
          source: string
          staff_id: string | null
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          business_customer_id?: string | null
          series_id?: string | null
          cancellation_reason?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id: string
          customer_name?: string | null
          customer_notes?: string | null
          customer_phone?: string | null
          ends_at: string
          id?: string
          internal_notes?: string | null
          no_staff_preference?: boolean
          price_cents?: number
          service_id?: string | null
          service_name?: string | null
          source?: string
          staff_id?: string | null
          starts_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          business_customer_id?: string | null
          series_id?: string | null
          cancellation_reason?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          customer_name?: string | null
          customer_notes?: string | null
          customer_phone?: string | null
          ends_at?: string
          id?: string
          internal_notes?: string | null
          no_staff_preference?: boolean
          price_cents?: number
          service_id?: string | null
          service_name?: string | null
          source?: string
          staff_id?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_business_customer_id_fkey"
            columns: ["business_customer_id"]
            isOneToOne: false
            referencedRelation: "business_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "recurring_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      business_customers: {
        Row: {
          business_id: string
          created_at: string
          customer_id: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_id?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_id?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_customers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_blocked_customers: {
        Row: {
          business_id: string
          created_at: string
          customer_id: string
          reason: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_id: string
          reason?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_blocked_customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_blocked_customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_blocked_customers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_categories: {
        Row: {
          business_id: string
          category_id: string
        }
        Insert: {
          business_id: string
          category_id: string
        }
        Update: {
          business_id?: string
          category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      business_closures: {
        Row: {
          business_id: string
          created_at: string
          date: string
          id: string
          is_closed: boolean
          reason: string | null
          special_close_time: string | null
          special_open_time: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          date: string
          id?: string
          is_closed?: boolean
          reason?: string | null
          special_close_time?: string | null
          special_open_time?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          date?: string
          id?: string
          is_closed?: boolean
          reason?: string | null
          special_close_time?: string | null
          special_open_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_closures_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_closures_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          business_id: string
          close_time: string | null
          created_at: string
          day_of_week: number
          id: string
          is_closed: boolean
          open_time: string | null
          order_index: number
        }
        Insert: {
          business_id: string
          close_time?: string | null
          created_at?: string
          day_of_week: number
          id?: string
          is_closed?: boolean
          open_time?: string | null
          order_index?: number
        }
        Update: {
          business_id?: string
          close_time?: string | null
          created_at?: string
          day_of_week?: number
          id?: string
          is_closed?: boolean
          open_time?: string | null
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_members: {
        Row: {
          accepted_at: string | null
          business_id: string
          created_at: string
          id: string
          invited_at: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          business_id: string
          created_at?: string
          id?: string
          invited_at?: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          business_id?: string
          created_at?: string
          id?: string
          invited_at?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: Json | null
          bookings_paused: boolean
          brand_colors: Json
          category_id: string | null
          cover_url: string | null
          created_at: string
          currency: string
          day_order: Json
          deletion_scheduled_at: string | null
          description: string | null
          description_en: string | null
          email: string | null
          facebook_url: string | null
          gallery: Json
          google_place_id: string | null
          id: string
          instagram_url: string | null
          landline: string | null
          logo_url: string | null
          name: string
          phone: string | null
          plan: string
          plan_expires_at: string | null
          published_at: string | null
          show_reviews: boolean
          show_stats: boolean
          slug: string
          status: string
          timezone: string
          trial_bonus_days: number
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: Json | null
          bookings_paused?: boolean
          brand_colors?: Json
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          currency?: string
          day_order?: Json
          deletion_scheduled_at?: string | null
          description?: string | null
          description_en?: string | null
          email?: string | null
          facebook_url?: string | null
          gallery?: Json
          google_place_id?: string | null
          id?: string
          instagram_url?: string | null
          landline?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          plan?: string
          plan_expires_at?: string | null
          published_at?: string | null
          show_reviews?: boolean
          show_stats?: boolean
          slug: string
          status?: string
          timezone?: string
          trial_bonus_days?: number
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: Json | null
          bookings_paused?: boolean
          brand_colors?: Json
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          currency?: string
          day_order?: Json
          deletion_scheduled_at?: string | null
          description?: string | null
          description_en?: string | null
          email?: string | null
          facebook_url?: string | null
          gallery?: Json
          google_place_id?: string | null
          id?: string
          instagram_url?: string | null
          landline?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          plan?: string
          plan_expires_at?: string | null
          published_at?: string | null
          show_reviews?: boolean
          show_stats?: boolean
          slug?: string
          status?: string
          timezone?: string
          trial_bonus_days?: number
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name_el: string
          name_en: string
          order_index: number
          parent_id: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name_el: string
          name_en: string
          order_index?: number
          parent_id?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name_el?: string
          name_en?: string
          order_index?: number
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          business_id: string
          created_at: string
          customer_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string
          address: Json | null
          avatar_url: string | null
          created_at: string
          first_name: string | null
          id: string
          is_admin: boolean
          last_name: string | null
          phone: string | null
          phone_verified: boolean
          preferred_language: string
          suspended_at: string | null
          updated_at: string
        }
        Insert: {
          account_type?: string
          address?: Json | null
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id: string
          is_admin?: boolean
          last_name?: string | null
          phone?: string | null
          phone_verified?: boolean
          preferred_language?: string
          suspended_at?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string
          address?: Json | null
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          is_admin?: boolean
          last_name?: string | null
          phone?: string | null
          phone_verified?: boolean
          preferred_language?: string
          suspended_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      qr_templates: {
        Row: {
          business_id: string
          config: Json
          created_at: string
          id: string
          is_default: boolean
          name: string
          pdf_url: string | null
          png_url: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          config?: Json
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          pdf_url?: string | null
          png_url?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          config?: Json
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          pdf_url?: string | null
          png_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_series: {
        Row: {
          business_customer_id: string | null
          business_id: string
          created_at: string
          day_of_month: number | null
          duration_minutes: number
          id: string
          interval_n: number
          no_staff_preference: boolean
          nth: number | null
          pattern_type: string
          price_cents: number
          service_id: string | null
          service_name: string | null
          staff_id: string | null
          status: string
          time_of_day: string
          updated_at: string
          weekday: number | null
        }
        Insert: {
          business_customer_id?: string | null
          business_id: string
          created_at?: string
          day_of_month?: number | null
          duration_minutes?: number
          id?: string
          interval_n?: number
          no_staff_preference?: boolean
          nth?: number | null
          pattern_type: string
          price_cents?: number
          service_id?: string | null
          service_name?: string | null
          staff_id?: string | null
          status?: string
          time_of_day: string
          updated_at?: string
          weekday?: number | null
        }
        Update: {
          business_customer_id?: string | null
          business_id?: string
          created_at?: string
          day_of_month?: number | null
          duration_minutes?: number
          id?: string
          interval_n?: number
          no_staff_preference?: boolean
          nth?: number | null
          pattern_type?: string
          price_cents?: number
          service_id?: string | null
          service_name?: string | null
          staff_id?: string | null
          status?: string
          time_of_day?: string
          updated_at?: string
          weekday?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_series_business_customer_id_fkey"
            columns: ["business_customer_id"]
            isOneToOne: false
            referencedRelation: "business_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_series_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_series_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_series_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string
          business_id: string
          business_reply: string | null
          comment: string | null
          created_at: string
          customer_id: string
          customer_name: string | null
          id: string
          rating: number
          staff_id: string | null
          staff_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          business_id: string
          business_reply?: string | null
          comment?: string | null
          created_at?: string
          customer_id: string
          customer_name?: string | null
          id?: string
          rating: number
          staff_id?: string | null
          staff_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          business_id?: string
          business_reply?: string | null
          comment?: string | null
          created_at?: string
          customer_id?: string
          customer_name?: string | null
          id?: string
          rating?: number
          staff_id?: string | null
          staff_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          business_id: string
          created_at: string
          id: string
          name: string
          name_en: string | null
          order_index: number
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          name: string
          name_en?: string | null
          order_index?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          name?: string
          name_en?: string | null
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      service_staff: {
        Row: {
          service_id: string
          staff_id: string
        }
        Insert: {
          service_id: string
          staff_id: string
        }
        Update: {
          service_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_staff_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_staff_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          bookable_online: boolean
          buffer_minutes: number
          business_id: string
          category_id: string | null
          color: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          name_en: string | null
          order_index: number
          price_cents: number
          updated_at: string
        }
        Insert: {
          bookable_online?: boolean
          buffer_minutes?: number
          business_id: string
          category_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name: string
          name_en?: string | null
          order_index?: number
          price_cents?: number
          updated_at?: string
        }
        Update: {
          bookable_online?: boolean
          buffer_minutes?: number
          business_id?: string
          category_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          name_en?: string | null
          order_index?: number
          price_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          avatar_url: string | null
          business_id: string
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          is_bookable: boolean
          name: string
          order_index: number
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          business_id: string
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_bookable?: boolean
          name: string
          order_index?: number
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          business_id?: string
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_bookable?: boolean
          name?: string
          order_index?: number
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_hours: {
        Row: {
          close_time: string
          created_at: string
          day_of_week: number
          id: string
          open_time: string
          order_index: number
          staff_id: string
        }
        Insert: {
          close_time: string
          created_at?: string
          day_of_week: number
          id?: string
          open_time: string
          order_index?: number
          staff_id: string
        }
        Update: {
          close_time?: string
          created_at?: string
          day_of_week?: number
          id?: string
          open_time?: string
          order_index?: number
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_hours_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_time_off: {
        Row: {
          business_id: string
          created_at: string
          ends_at: string
          id: string
          reason: string | null
          staff_id: string
          starts_at: string
          type: string
        }
        Insert: {
          business_id: string
          created_at?: string
          ends_at: string
          id?: string
          reason?: string | null
          staff_id: string
          starts_at: string
          type?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          reason?: string | null
          staff_id?: string
          starts_at?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_time_off_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_time_off_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_time_off_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      my_businesses: {
        Row: {
          address: Json | null
          brand_colors: Json | null
          category_id: string | null
          cover_url: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          description_en: string | null
          email: string | null
          facebook_url: string | null
          gallery: Json | null
          google_place_id: string | null
          id: string | null
          instagram_url: string | null
          logo_url: string | null
          my_role: string | null
          name: string | null
          phone: string | null
          show_reviews: boolean | null
          show_stats: boolean | null
          slug: string | null
          status: string | null
          timezone: string | null
          updated_at: string | null
          website: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_ratings: {
        Row: {
          avg_rating: number | null
          business_id: string | null
          review_count: number | null
          staff_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_booking_stats: { Args: never; Returns: Json }
      admin_business_details: { Args: { p_business: string }; Returns: Json }
      admin_confirm_user_email: { Args: { p_user: string }; Returns: undefined }
      admin_delete_business: {
        Args: { p_business: string }
        Returns: undefined
      }
      admin_delete_review: { Args: { p_review: string }; Returns: undefined }
      admin_delete_user: { Args: { p_user: string }; Returns: undefined }
      admin_extend_trial: {
        Args: { p_business: string; p_days: number }
        Returns: undefined
      }
      admin_list_audit_log: {
        Args: { p_limit?: number }
        Returns: {
          action: string
          admin_email: string
          admin_name: string
          created_at: string
          details: Json
          id: string
          target_id: string
          target_label: string
          target_type: string
        }[]
      }
      admin_list_bookings: {
        Args: {
          p_from?: string
          p_limit?: number
          p_offset?: number
          p_query?: string
          p_source?: string
          p_status?: string
          p_to?: string
        }
        Returns: {
          business_id: string
          business_name: string
          business_slug: string
          cancelled_by: string
          created_at: string
          customer_email: string
          customer_id: string
          customer_name: string
          customer_notes: string
          customer_phone: string
          ends_at: string
          id: string
          price_cents: number
          service_name: string
          source: string
          staff_name: string
          starts_at: string
          status: string
          total_count: number
        }[]
      }
      admin_list_businesses: {
        Args: never
        Returns: {
          bookings_count: number
          category_el: string
          city: string
          created_at: string
          id: string
          name: string
          owner_email: string
          owner_last_sign_in_at: string
          owner_name: string
          plan: string
          plan_expires_at: string
          published_at: string
          slug: string
          status: string
          trial_bonus_days: number
          trial_days_left: number
          trial_state: string
          trial_total_days: number
        }[]
      }
      admin_list_reviews: {
        Args: never
        Returns: {
          business_id: string
          business_name: string
          business_reply: string
          business_slug: string
          comment: string
          created_at: string
          customer_email: string
          customer_id: string
          customer_name: string
          id: string
          rating: number
          staff_name: string
          status: string
          updated_at: string
        }[]
      }
      admin_list_subscriptions: {
        Args: never
        Returns: {
          created_at: string
          days_left: number
          id: string
          name: string
          owner_email: string
          owner_name: string
          plan: string
          plan_expires_at: string
          published_at: string
          slug: string
          status: string
          sub_state: string
          trial_bonus_days: number
          trial_total_days: number
        }[]
      }
      admin_list_users: {
        Args: never
        Returns: {
          account_type: string
          bookings_count: number
          created_at: string
          email: string
          email_confirmed_at: string
          first_name: string
          id: string
          is_admin: boolean
          last_name: string
          last_sign_in_at: string
          owns_business: boolean
          phone: string
          suspended_at: string
        }[]
      }
      admin_log: {
        Args: {
          p_action: string
          p_details?: Json
          p_target_id: string
          p_target_label: string
          p_target_type: string
        }
        Returns: undefined
      }
      admin_moderation_texts: {
        Args: never
        Returns: {
          business_id: string
          txt: string
        }[]
      }
      admin_overview_stats: { Args: never; Returns: Json }
      admin_set_business_status: {
        Args: { p_business: string; p_status: string }
        Returns: undefined
      }
      admin_set_review_status: {
        Args: { p_review: string; p_status: string }
        Returns: undefined
      }
      admin_set_user_suspended: {
        Args: { p_suspended: boolean; p_user: string }
        Returns: undefined
      }
      auth_email_confirmed: { Args: never; Returns: boolean }
      business_plan_active: {
        Args: { p_business_id: string }
        Returns: boolean
      }
      business_plan_state: { Args: { p_business_id: string }; Returns: Json }
      cancel_booking: { Args: { p_booking_id: string }; Returns: undefined }
      cancel_business_deletion: {
        Args: { p_business: string }
        Returns: undefined
      }
      create_booking: {
        Args: {
          p_business_id: string
          p_customer_name: string
          p_customer_phone: string
          p_notes: string
          p_service_id: string
          p_source?: string
          p_staff_id?: string
          p_starts_at: string
        }
        Returns: string
      }
      create_business_with_owner: {
        Args: {
          p_address: Json
          p_category_id: string
          p_hours: Json
          p_landline?: string
          p_name: string
          p_phone: string
          p_slug: string
        }
        Returns: {
          business_id: string
          business_slug: string
        }[]
      }
      create_review: {
        Args: {
          p_booking_id: string
          p_comment: string
          p_name_visibility?: string
          p_rating: number
        }
        Returns: string
      }
      delete_cancelled_bookings: {
        Args: { p_business_id: string }
        Returns: number
      }
      delete_past_bookings: { Args: { p_business_id: string }; Returns: number }
      email_available: { Args: { p_email: string }; Returns: boolean }
      get_busy_intervals: {
        Args: { p_business_id: string; p_from: string; p_to: string }
        Returns: {
          ends_at: string
          starts_at: string
        }[]
      }
      get_staff_busy_intervals: {
        Args: { p_business_id: string; p_from: string; p_to: string }
        Returns: {
          ends_at: string
          staff_id: string
          starts_at: string
        }[]
      }
      is_business_member: { Args: { b_id: string }; Returns: boolean }
      is_business_owner_or_manager: { Args: { b_id: string }; Returns: boolean }
      is_platform_admin: { Args: { uid?: string }; Returns: boolean }
      maybe_activate_business: {
        Args: { p_business: string }
        Returns: undefined
      }
      purge_scheduled_deletions: { Args: never; Returns: number }
      reschedule_booking: {
        Args: { p_booking_id: string; p_staff_id?: string; p_starts_at: string }
        Returns: undefined
      }
      schedule_business_deletion: {
        Args: { p_business: string }
        Returns: string
      }
      update_review: {
        Args: {
          p_comment: string
          p_name_visibility?: string
          p_rating: number
          p_review_id: string
        }
        Returns: undefined
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
