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
      ebook_products: {
        Row: {
          created_at: string
          current_version_id: string | null
          description: string | null
          id: string
          length: string
          status: string
          title: string
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_version_id?: string | null
          description?: string | null
          id?: string
          length?: string
          status?: string
          title: string
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_version_id?: string | null
          description?: string | null
          id?: string
          length?: string
          status?: string
          title?: string
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_current_version"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "product_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      monetization_feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          module_id: string
          rating: number | null
          section: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          module_id: string
          rating?: number | null
          section?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          module_id?: string
          rating?: number | null
          section?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monetization_feedback_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "monetization_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      monetization_metrics: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          module_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          module_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monetization_metrics_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "monetization_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      monetization_modules: {
        Row: {
          created_at: string
          id: string
          module_type: string
          product_id: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          module_type: string
          product_id: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          module_type?: string
          product_id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "monetization_modules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "monetization_products"
            referencedColumns: ["id"]
          },
        ]
      }
      monetization_products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          source_product_id: string | null
          source_type: string
          title: string
          topic: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          source_product_id?: string | null
          source_type?: string
          title: string
          topic: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          source_product_id?: string | null
          source_type?: string
          title?: string
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      monetization_versions: {
        Row: {
          content: Json
          created_at: string
          id: string
          model_used: string | null
          module_id: string
          prompt_used: string | null
          version_number: number
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          model_used?: string | null
          module_id: string
          prompt_used?: string | null
          version_number?: number
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          model_used?: string | null
          module_id?: string
          prompt_used?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "monetization_versions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "monetization_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      product_feedback: {
        Row: {
          comment: string | null
          created_at: string
          feedback_type: string
          id: string
          product_id: string
          rating: number | null
          section_reference: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          feedback_type?: string
          id?: string
          product_id: string
          rating?: number | null
          section_reference?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          feedback_type?: string
          id?: string
          product_id?: string
          rating?: number | null
          section_reference?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_feedback_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ebook_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_metrics: {
        Row: {
          id: string
          metadata: Json | null
          metric_type: string
          product_id: string
          recorded_at: string
          value: number
        }
        Insert: {
          id?: string
          metadata?: Json | null
          metric_type: string
          product_id: string
          recorded_at?: string
          value?: number
        }
        Update: {
          id?: string
          metadata?: Json | null
          metric_type?: string
          product_id?: string
          recorded_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_metrics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ebook_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_versions: {
        Row: {
          change_summary: string | null
          content: string
          cover_image_url: string | null
          created_at: string
          id: string
          pages: number
          product_id: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          content: string
          cover_image_url?: string | null
          created_at?: string
          id?: string
          pages?: number
          product_id: string
          version_number?: number
        }
        Update: {
          change_summary?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string
          id?: string
          pages?: number
          product_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ebook_products"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan_type: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
          whop_order_id: string | null
          whop_user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_type: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
          whop_order_id?: string | null
          whop_user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_type?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
          whop_order_id?: string | null
          whop_user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_active_subscription: { Args: { user_uuid: string }; Returns: boolean }
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
