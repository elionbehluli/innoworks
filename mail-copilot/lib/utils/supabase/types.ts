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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          prompt_template: string
          routing_rule: string
          sort_order: number
          status_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          prompt_template: string
          routing_rule: string
          sort_order?: number
          status_id?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          prompt_template?: string
          routing_rule?: string
          sort_order?: number
          status_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_requests: {
        Row: {
          created_at: string
          id: string
          method: string
          request_body: Json | null
          request_headers: Json | null
          response_body: Json | null
          response_status: number | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          method: string
          request_body?: Json | null
          request_headers?: Json | null
          response_body?: Json | null
          response_status?: number | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          method?: string
          request_body?: Json | null
          request_headers?: Json | null
          response_body?: Json | null
          response_status?: number | null
          url?: string
        }
        Relationships: []
      }
      gmail_token: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      past_replies: {
        Row: {
          category_id: string
          created_at: string
          embedding: string
          id: string
          inbound_email: string
          outbound_reply: string
          sender: string
          thread_history: Json
          thread_id: string | null
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          embedding: string
          id?: string
          inbound_email: string
          outbound_reply: string
          sender: string
          thread_history?: Json
          thread_id?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          embedding?: string
          id?: string
          inbound_email?: string
          outbound_reply?: string
          sender?: string
          thread_history?: Json
          thread_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "past_replies_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      statuses: {
        Row: {
          created_at: string
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          id: number
          name: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      threads: {
        Row: {
          ai_draft_reply: string | null
          ai_draft_subject: string | null
          ai_reasoning: string | null
          assigned_to: string | null
          body_text: string | null
          category_id: string | null
          created_at: string
          gmail_message_id: string
          gmail_thread_id: string
          id: string
          locked_at: string | null
          open_count: number
          opened_at: string | null
          sender: string
          sent_at: string | null
          snippet: string | null
          status: Database["public"]["Enums"]["thread_status"]
          subject: string
          tracking_token: string
          updated_at: string
        }
        Insert: {
          ai_draft_reply?: string | null
          ai_draft_subject?: string | null
          ai_reasoning?: string | null
          assigned_to?: string | null
          body_text?: string | null
          category_id?: string | null
          created_at?: string
          gmail_message_id: string
          gmail_thread_id: string
          id?: string
          locked_at?: string | null
          open_count?: number
          opened_at?: string | null
          sender?: string
          sent_at?: string | null
          snippet?: string | null
          status?: Database["public"]["Enums"]["thread_status"]
          subject?: string
          tracking_token?: string
          updated_at?: string
        }
        Update: {
          ai_draft_reply?: string | null
          ai_draft_subject?: string | null
          ai_reasoning?: string | null
          assigned_to?: string | null
          body_text?: string | null
          category_id?: string | null
          created_at?: string
          gmail_message_id?: string
          gmail_thread_id?: string
          id?: string
          locked_at?: string | null
          open_count?: number
          opened_at?: string | null
          sender?: string
          sent_at?: string | null
          snippet?: string | null
          status?: Database["public"]["Enums"]["thread_status"]
          subject?: string
          tracking_token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "threads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threads_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      todos: {
        Row: {
          created_at: string
          id: number
          name: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          name?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          name?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_best_few_shot_examples: {
        Args: {
          match_count: number
          match_threshold: number
          query_embedding: string
          target_category: string
          target_sender: string
        }
        Returns: {
          id: string
          inbound_email: string
          match_level: string
          outbound_reply: string
          similarity: number
          thread_history: Json
        }[]
      }
      invoke_edge_function: { Args: { function_name: string }; Returns: number }
      record_email_open:
        | { Args: { p_token: string }; Returns: undefined }
        | { Args: { p_sent_at?: string; p_token: string }; Returns: undefined }
    }
    Enums: {
      thread_status: "PENDING" | "IN_PROGRESS" | "RESOLVED" | "SKIPPED"
      user_role: "ADMIN" | "STAFF"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      thread_status: ["PENDING", "IN_PROGRESS", "RESOLVED", "SKIPPED"],
      user_role: ["ADMIN", "STAFF"],
    },
  },
} as const
