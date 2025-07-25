export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ai_analyses: {
        Row: {
          ai_response: Json
          analysis_type: string
          created_at: string
          id: string
          input_data: Json
          room_id: string
        }
        Insert: {
          ai_response: Json
          analysis_type: string
          created_at?: string
          id?: string
          input_data: Json
          room_id: string
        }
        Update: {
          ai_response?: Json
          analysis_type?: string
          created_at?: string
          id?: string
          input_data?: Json
          room_id?: string
        }
        Relationships: []
      }
      game_responses: {
        Row: {
          ai_reasoning: string | null
          card_id: string
          created_at: string
          evaluation: string | null
          evaluation_by: string | null
          id: string
          player_id: string
          response: string | null
          response_time: number | null
          room_id: string
          round_number: number
          selection_method: string | null
        }
        Insert: {
          ai_reasoning?: string | null
          card_id: string
          created_at?: string
          evaluation?: string | null
          evaluation_by?: string | null
          id?: string
          player_id: string
          response?: string | null
          response_time?: number | null
          room_id: string
          round_number: number
          selection_method?: string | null
        }
        Update: {
          ai_reasoning?: string | null
          card_id?: string
          created_at?: string
          evaluation?: string | null
          evaluation_by?: string | null
          id?: string
          player_id?: string
          response?: string | null
          response_time?: number | null
          room_id?: string
          round_number?: number
          selection_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_responses_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      game_rooms: {
        Row: {
          created_at: string
          created_by: string | null
          current_card: string | null
          current_card_index: number | null
          current_phase: string | null
          current_turn: string | null
          finished_at: string | null
          id: string
          level: number
          proximity_question_answered: boolean | null
          proximity_response: boolean | null
          room_code: string
          started_at: string | null
          status: string
          used_cards: string[] | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_card?: string | null
          current_card_index?: number | null
          current_phase?: string | null
          current_turn?: string | null
          finished_at?: string | null
          id?: string
          level?: number
          proximity_question_answered?: boolean | null
          proximity_response?: boolean | null
          room_code: string
          started_at?: string | null
          status?: string
          used_cards?: string[] | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_card?: string | null
          current_card_index?: number | null
          current_phase?: string | null
          current_turn?: string | null
          finished_at?: string | null
          id?: string
          level?: number
          proximity_question_answered?: boolean | null
          proximity_response?: boolean | null
          room_code?: string
          started_at?: string | null
          status?: string
          used_cards?: string[] | null
        }
        Relationships: []
      }
      game_sync: {
        Row: {
          action_data: Json
          action_type: string
          created_at: string
          id: string
          room_id: string
          triggered_by: string
        }
        Insert: {
          action_data: Json
          action_type: string
          created_at?: string
          id?: string
          room_id: string
          triggered_by: string
        }
        Update: {
          action_data?: Json
          action_type?: string
          created_at?: string
          id?: string
          room_id?: string
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_sync_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      level_selection_votes: {
        Row: {
          created_at: string
          id: string
          player_id: string
          room_id: string
          selected_level: number
        }
        Insert: {
          created_at?: string
          id?: string
          player_id: string
          room_id: string
          selected_level: number
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string
          room_id?: string
          selected_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "level_selection_votes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      levels: {
        Row: {
          bg_color: string | null
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          language: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          bg_color?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          language?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          bg_color?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          language?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          category: string | null
          created_at: string
          id: string
          intensity: number | null
          is_active: boolean
          language: string
          level_id: string
          question_type: string | null
          text: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          intensity?: number | null
          is_active?: boolean
          language?: string
          level_id: string
          question_type?: string | null
          text: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          intensity?: number | null
          is_active?: boolean
          language?: string
          level_id?: string
          question_type?: string | null
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
        ]
      }
      room_participants: {
        Row: {
          id: string
          is_ready: boolean
          joined_at: string
          last_activity: string
          player_id: string
          player_name: string | null
          player_number: number | null
          room_id: string
        }
        Insert: {
          id?: string
          is_ready?: boolean
          joined_at?: string
          last_activity?: string
          player_id: string
          player_name?: string | null
          player_number?: number | null
          room_id: string
        }
        Update: {
          id?: string
          is_ready?: boolean
          joined_at?: string
          last_activity?: string
          player_id?: string
          player_name?: string | null
          player_number?: number | null
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_inactive_rooms: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_random_questions_for_level: {
        Args: {
          level_id_param: string
          language_param?: string
          limit_param?: number
        }
        Returns: {
          id: string
          text: string
          category: string
          level_id: string
          language: string
          created_at: string
          updated_at: string
          is_active: boolean
        }[]
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      handle_level_selection: {
        Args: {
          room_id_param: string
          player_id_param: string
          selected_level_param: number
        }
        Returns: Json
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      promote_to_admin: {
        Args: { user_email: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
