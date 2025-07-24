export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)";
  };
  public: {
    Tables: {
      interests: {
        Row: {
          created_at: string;
          custom: boolean;
          custom_added_by: string | null;
          icon: string;
          interest_da: string;
          interest_en: string;
          interest_id: string;
          onboarding: boolean;
        };
        Insert: {
          created_at?: string;
          custom?: boolean;
          custom_added_by?: string | null;
          icon?: string;
          interest_da?: string;
          interest_en?: string;
          interest_id?: string;
          onboarding?: boolean;
        };
        Update: {
          created_at?: string;
          custom?: boolean;
          custom_added_by?: string | null;
          icon?: string;
          interest_da?: string;
          interest_en?: string;
          interest_id?: string;
          onboarding?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "interests_custom_added_by_fkey";
            columns: ["custom_added_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["profile_id"];
          },
        ];
      };
      profiles: {
        Row: {
          age: number | null;
          bio: string | null;
          city: string | null;
          coordinates: unknown | null;
          country: string | null;
          country_code: string | null;
          created_at: string | null;
          email: string | null;
          first_name: string | null;
          house_number: string | null;
          last_name: string | null;
          latitude: number | null;
          longitude: number | null;
          newsletter: boolean;
          postcode: string | null;
          profile_id: string;
          road: string | null;
          user_id: string | null;
        };
        Insert: {
          age?: number | null;
          bio?: string | null;
          city?: string | null;
          coordinates?: unknown | null;
          country?: string | null;
          country_code?: string | null;
          created_at?: string | null;
          email?: string | null;
          first_name?: string | null;
          house_number?: string | null;
          last_name?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          newsletter?: boolean;
          postcode?: string | null;
          profile_id?: string;
          road?: string | null;
          user_id?: string | null;
        };
        Update: {
          age?: number | null;
          bio?: string | null;
          city?: string | null;
          coordinates?: unknown | null;
          country?: string | null;
          country_code?: string | null;
          created_at?: string | null;
          email?: string | null;
          first_name?: string | null;
          house_number?: string | null;
          last_name?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          newsletter?: boolean;
          postcode?: string | null;
          profile_id?: string;
          road?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          id: number;
          permission: Database["public"]["Enums"]["app_permission"];
          role: Database["public"]["Enums"]["app_role"];
        };
        Insert: {
          id?: number;
          permission: Database["public"]["Enums"]["app_permission"];
          role: Database["public"]["Enums"]["app_role"];
        };
        Update: {
          id?: number;
          permission?: Database["public"]["Enums"]["app_permission"];
          role?: Database["public"]["Enums"]["app_role"];
        };
        Relationships: [];
      };
      user_interests: {
        Row: {
          created_at: string;
          description: string;
          id: number;
          interest_id: string;
          profile_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string;
          id?: number;
          interest_id?: string;
          profile_id?: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: number;
          interest_id?: string;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_interests_interest_id_fkey";
            columns: ["interest_id"];
            isOneToOne: false;
            referencedRelation: "interests";
            referencedColumns: ["interest_id"];
          },
          {
            foreignKeyName: "user_interests_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["profile_id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: number;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: number;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: number;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      delete_unused_custom_interests_delete: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
    };
    Enums: {
      app_permission: "channels.delete" | "messages.delete";
      app_role: "admin" | "moderator";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_permission: ["channels.delete", "messages.delete"],
      app_role: ["admin", "moderator"],
    },
  },
} as const;
