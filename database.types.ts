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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      activity_post_media: {
        Row: {
          created_at: string | null
          id: string
          media_type: string
          post_id: string
          sort_order: number | null
          source: string
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          media_type?: string
          post_id: string
          sort_order?: number | null
          source?: string
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          media_type?: string
          post_id?: string
          sort_order?: number | null
          source?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "activity_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_posts: {
        Row: {
          activity_date: string | null
          created_at: string | null
          description: string | null
          id: string
          interest_id: string | null
          private: boolean
          profile_id: string
          source: string
          source_data: Json | null
          source_id: string | null
          source_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          activity_date?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          interest_id?: string | null
          private?: boolean
          profile_id: string
          source?: string
          source_data?: Json | null
          source_id?: string | null
          source_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          activity_date?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          interest_id?: string | null
          private?: boolean
          profile_id?: string
          source?: string
          source_data?: Json | null
          source_id?: string | null
          source_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_posts_interest_id_fkey"
            columns: ["interest_id"]
            isOneToOne: false
            referencedRelation: "interests"
            referencedColumns: ["interest_id"]
          },
          {
            foreignKeyName: "activity_posts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      event_interests: {
        Row: {
          event_id: string
          interest_id: string
        }
        Insert: {
          event_id: string
          interest_id: string
        }
        Update: {
          event_id?: string
          interest_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_interests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_interests_interest_id_fkey"
            columns: ["interest_id"]
            isOneToOne: false
            referencedRelation: "interests"
            referencedColumns: ["interest_id"]
          },
        ]
      }
      event_participants: {
        Row: {
          event_id: string
          joined_at: string
          profile_id: string
        }
        Insert: {
          event_id: string
          joined_at?: string
          profile_id: string
        }
        Update: {
          event_id?: string
          joined_at?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      events: {
        Row: {
          cancelled_at: string | null
          created_at: string
          creator_id: string
          date_type: string
          description: string | null
          event_date: string | null
          event_id: string
          event_time: string | null
          event_weekdays: number[] | null
          latitude: number
          longitude: number
          max_participants: number | null
          place_name: string
          slug: string
          time_of_day: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          creator_id: string
          date_type?: string
          description?: string | null
          event_date?: string | null
          event_id?: string
          event_time?: string | null
          event_weekdays?: number[] | null
          latitude: number
          longitude: number
          max_participants?: number | null
          place_name: string
          slug?: string
          time_of_day?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          creator_id?: string
          date_type?: string
          description?: string | null
          event_date?: string | null
          event_id?: string
          event_time?: string | null
          event_weekdays?: number[] | null
          latitude?: number
          longitude?: number
          max_participants?: number | null
          place_name?: string
          slug?: string
          time_of_day?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      hi5s: {
        Row: {
          created_at: string
          receiver_id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          receiver_id: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          receiver_id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      interest_relations: {
        Row: {
          created_at: string
          interest_id_a: string
          interest_id_b: string
          score: number
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          interest_id_a: string
          interest_id_b: string
          score: number
          source?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          interest_id_a?: string
          interest_id_b?: string
          score?: number
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interest_relations_interest_id_a_fkey"
            columns: ["interest_id_a"]
            isOneToOne: false
            referencedRelation: "interests"
            referencedColumns: ["interest_id"]
          },
          {
            foreignKeyName: "interest_relations_interest_id_b_fkey"
            columns: ["interest_id_b"]
            isOneToOne: false
            referencedRelation: "interests"
            referencedColumns: ["interest_id"]
          },
        ]
      }
      interest_tags: {
        Row: {
          interest_id: string
          tag: string
        }
        Insert: {
          interest_id: string
          tag: string
        }
        Update: {
          interest_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "interest_tags_interest_id_fkey"
            columns: ["interest_id"]
            isOneToOne: false
            referencedRelation: "interests"
            referencedColumns: ["interest_id"]
          },
        ]
      }
      interests: {
        Row: {
          category: string
          created_at: string
          custom: boolean
          custom_added_by: string | null
          icon: string
          interest_da: string
          interest_en: string
          interest_id: string
          onboarding: boolean
          slug: string
        }
        Insert: {
          category?: string
          created_at?: string
          custom?: boolean
          custom_added_by?: string | null
          icon?: string
          interest_da?: string
          interest_en?: string
          interest_id?: string
          onboarding?: boolean
          slug?: string
        }
        Update: {
          category?: string
          created_at?: string
          custom?: boolean
          custom_added_by?: string | null
          icon?: string
          interest_da?: string
          interest_en?: string
          interest_id?: string
          onboarding?: boolean
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "interests_custom_added_by_fkey"
            columns: ["custom_added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: number
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: never
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: never
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          coordinates: unknown
          country: string | null
          country_code: string | null
          created_at: string | null
          email: string | null
          email_verified: boolean
          first_name: string | null
          house_number: string | null
          last_name: string | null
          latitude: number | null
          longitude: number | null
          newsletter: boolean
          postcode: string | null
          profile_id: string
          road: string | null
          slug: string
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          coordinates?: unknown
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          email?: string | null
          email_verified?: boolean
          first_name?: string | null
          house_number?: string | null
          last_name?: string | null
          latitude?: number | null
          longitude?: number | null
          newsletter?: boolean
          postcode?: string | null
          profile_id?: string
          road?: string | null
          slug?: string
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          coordinates?: unknown
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          email?: string | null
          email_verified?: boolean
          first_name?: string | null
          house_number?: string | null
          last_name?: string | null
          latitude?: number | null
          longitude?: number | null
          newsletter?: boolean
          postcode?: string | null
          profile_id?: string
          road?: string | null
          slug?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          id: number
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          id?: number
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          id?: number
          permission?: Database["public"]["Enums"]["app_permission"]
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      strava_connections: {
        Row: {
          access_token: string
          athlete_data: Json | null
          created_at: string | null
          id: string
          profile_id: string
          refresh_token: string
          strava_athlete_id: number
          token_expires_at: string
          updated_at: string | null
        }
        Insert: {
          access_token: string
          athlete_data?: Json | null
          created_at?: string | null
          id?: string
          profile_id: string
          refresh_token: string
          strava_athlete_id: number
          token_expires_at: string
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          athlete_data?: Json | null
          created_at?: string | null
          id?: string
          profile_id?: string
          refresh_token?: string
          strava_athlete_id?: number
          token_expires_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strava_connections_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      user_interests: {
        Row: {
          created_at: string
          description: string
          id: number
          interest_id: string
          is_non_interest: boolean
          profile_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: number
          interest_id?: string
          is_non_interest?: boolean
          profile_id?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: number
          interest_id?: string
          is_non_interest?: boolean
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interests_interest_id_fkey"
            columns: ["interest_id"]
            isOneToOne: false
            referencedRelation: "interests"
            referencedColumns: ["interest_id"]
          },
          {
            foreignKeyName: "user_interests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: number
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: number
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: number
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_unused_custom_interests_delete: { Args: never; Returns: undefined }
      get_related_interests: {
        Args: { min_score?: number; my_ids: string[] }
        Returns: {
          my_id: string
          related_id: string
          score: number
        }[]
      }
    }
    Enums: {
      app_permission: "channels.delete" | "messages.delete"
      app_role: "admin" | "moderator"
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
      app_permission: ["channels.delete", "messages.delete"],
      app_role: ["admin", "moderator"],
    },
  },
} as const
