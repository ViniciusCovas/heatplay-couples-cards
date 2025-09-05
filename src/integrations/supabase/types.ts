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
      connection_states: {
        Row: {
          connection_status: string
          created_at: string
          id: string
          last_ping: string
          player_id: string
          room_id: string
          updated_at: string
        }
        Insert: {
          connection_status?: string
          created_at?: string
          id?: string
          last_ping?: string
          player_id: string
          room_id: string
          updated_at?: string
        }
        Update: {
          connection_status?: string
          created_at?: string
          id?: string
          last_ping?: string
          player_id?: string
          room_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_connection_states_room_id"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      credits: {
        Row: {
          balance: number
          created_at: string
          id: string
          total_consumed: number
          total_purchased: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          total_consumed?: number
          total_purchased?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          total_consumed?: number
          total_purchased?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      game_flow_queue: {
        Row: {
          created_at: string
          error_message: string | null
          event_data: Json
          event_type: string
          id: string
          processed: boolean
          processed_at: string | null
          room_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_data?: Json
          event_type: string
          id?: string
          processed?: boolean
          processed_at?: string | null
          room_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_data?: Json
          event_type?: string
          id?: string
          processed?: boolean
          processed_at?: string | null
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
            foreignKeyName: "fk_game_responses_room_id"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
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
          credit_status: string | null
          current_card: string | null
          current_card_ai_reasoning: string | null
          current_card_ai_target_area: string | null
          current_card_index: number | null
          current_card_selection_method: string | null
          current_phase: string | null
          current_turn: string | null
          finished_at: string | null
          host_user_id: string | null
          id: string
          level: number
          player1_proximity_response: boolean | null
          player2_proximity_response: boolean | null
          proximity_question_answered: boolean | null
          proximity_response: boolean | null
          room_code: string
          selected_language: string | null
          session_id: string | null
          started_at: string | null
          status: string
          used_cards: string[] | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          credit_status?: string | null
          current_card?: string | null
          current_card_ai_reasoning?: string | null
          current_card_ai_target_area?: string | null
          current_card_index?: number | null
          current_card_selection_method?: string | null
          current_phase?: string | null
          current_turn?: string | null
          finished_at?: string | null
          host_user_id?: string | null
          id?: string
          level?: number
          player1_proximity_response?: boolean | null
          player2_proximity_response?: boolean | null
          proximity_question_answered?: boolean | null
          proximity_response?: boolean | null
          room_code: string
          selected_language?: string | null
          session_id?: string | null
          started_at?: string | null
          status?: string
          used_cards?: string[] | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          credit_status?: string | null
          current_card?: string | null
          current_card_ai_reasoning?: string | null
          current_card_ai_target_area?: string | null
          current_card_index?: number | null
          current_card_selection_method?: string | null
          current_phase?: string | null
          current_turn?: string | null
          finished_at?: string | null
          host_user_id?: string | null
          id?: string
          level?: number
          player1_proximity_response?: boolean | null
          player2_proximity_response?: boolean | null
          proximity_question_answered?: boolean | null
          proximity_response?: boolean | null
          room_code?: string
          selected_language?: string | null
          session_id?: string | null
          started_at?: string | null
          status?: string
          used_cards?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "game_rooms_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "fk_game_sync_room_id"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "fk_level_selection_votes_room_id"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
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
          last_login: string | null
          last_seen: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          last_login?: string | null
          last_seen?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          last_login?: string | null
          last_seen?: string | null
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
            foreignKeyName: "fk_room_participants_room_id"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          credits_consumed: number
          finished_at: string | null
          id: string
          room_id: string
          session_status: string
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_consumed?: number
          finished_at?: string | null
          id?: string
          room_id: string
          session_status?: string
          started_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_consumed?: number
          finished_at?: string | null
          id?: string
          room_id?: string
          session_status?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_room_id_fkey"
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
      add_credits: {
        Args: { credits_amount: number; user_id_param: string }
        Returns: Json
      }
      advance_game_to_next_round: {
        Args: {
          current_round: number
          evaluating_player_id: string
          room_id_param: string
        }
        Returns: Json
      }
      anonymous_can_access_room: {
        Args: { player_id_param: string; room_id_param: string }
        Returns: boolean
      }
      assign_player_number: {
        Args: { player_id_param: string; room_id_param: string }
        Returns: number
      }
      auto_advance_stuck_rooms: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      auto_recover_technical_issues: {
        Args: Record<PropertyKey, never>
        Returns: {
          action_taken: string
          room_id: string
        }[]
      }
      check_room_credit_status: {
        Args: { room_code_param: string }
        Returns: Json
      }
      cleanup_inactive_rooms: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      consume_credit: {
        Args: { room_id_param: string; user_id_param: string }
        Returns: Json
      }
      consume_credit_for_room: {
        Args: { room_code_param: string; user_id_param: string }
        Returns: Json
      }
      create_room_and_join: {
        Args: { level_param: number; selected_language_param?: string }
        Returns: {
          id: string
          room_code: string
        }[]
      }
      debug_evaluation_submission: {
        Args: { player_id_param: string; response_id_param: string }
        Returns: Json
      }
      detect_and_fix_stuck_rooms: {
        Args: Record<PropertyKey, never>
        Returns: {
          action_taken: string
          room_id: string
        }[]
      }
      detect_disconnected_players: {
        Args: Record<PropertyKey, never>
        Returns: {
          action_taken: string
          room_id: string
        }[]
      }
      fix_stuck_evaluation_rooms: {
        Args: Record<PropertyKey, never>
        Returns: {
          action_taken: string
          room_id: string
        }[]
      }
      get_player_number: {
        Args: { player_id_param: string; room_id_param: string }
        Returns: number
      }
      get_random_questions_for_level: {
        Args: {
          language_param?: string
          level_id_param: string
          limit_param?: number
        }
        Returns: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          language: string
          level_id: string
          text: string
          updated_at: string
        }[]
      }
      get_used_question_ids: {
        Args: { room_id_param: string }
        Returns: string[]
      }
      get_user_credits: {
        Args: { user_id_param: string }
        Returns: number
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      handle_level_selection: {
        Args: {
          player_id_param: string
          room_id_param: string
          selected_level_param: number
        }
        Returns: Json
      }
      handle_proximity_response: {
        Args: {
          is_close_param: boolean
          player_id_param: string
          room_id_param: string
        }
        Returns: Json
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_user_participant: {
        Args: { room_id_param: string; user_id_param: string }
        Returns: boolean
      }
      join_room_by_code: {
        Args: { player_id_param: string; room_code_param: string }
        Returns: Json
      }
      normalize_used_cards: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      player_participates_in_room: {
        Args: { player_id_param: string; room_id_param: string }
        Returns: boolean
      }
      process_game_flow_queue: {
        Args: Record<PropertyKey, never>
        Returns: {
          error_count: number
          processed_count: number
        }[]
      }
      promote_to_admin: {
        Args: { user_email: string }
        Returns: boolean
      }
      repair_stuck_evaluations: {
        Args: Record<PropertyKey, never>
        Returns: {
          action_taken: string
          room_id: string
        }[]
      }
      room_is_open: {
        Args: { room_id_param: string }
        Returns: boolean
      }
      select_next_card_robust: {
        Args: { current_used_cards?: string[]; room_id_param: string }
        Returns: string
      }
      sync_game_state_reliably: {
        Args: { player_id_param: string; room_id_param: string }
        Returns: Json
      }
      update_user_activity: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      user_participates_in_room: {
        Args: { room_id_param: string; user_id_param: string }
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
