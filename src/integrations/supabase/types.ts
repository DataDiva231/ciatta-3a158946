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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      beliefs: {
        Row: {
          contradiction: number
          domain: string
          first_formed_at: string
          id: string
          key: string
          statement: string
          status: string
          strength: number
          subject_id: string
          support: number
          updated_at: string
        }
        Insert: {
          contradiction?: number
          domain: string
          first_formed_at?: string
          id?: string
          key: string
          statement: string
          status?: string
          strength?: number
          subject_id: string
          support?: number
          updated_at?: string
        }
        Update: {
          contradiction?: number
          domain?: string
          first_formed_at?: string
          id?: string
          key?: string
          statement?: string
          status?: string
          strength?: number
          subject_id?: string
          support?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beliefs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      memories: {
        Row: {
          detail: Json
          first_seen_at: string
          id: string
          key: string
          kind: string
          last_seen_at: string
          occurrences: number
          subject_id: string
          summary: string
        }
        Insert: {
          detail?: Json
          first_seen_at?: string
          id?: string
          key: string
          kind: string
          last_seen_at?: string
          occurrences?: number
          subject_id: string
          summary: string
        }
        Update: {
          detail?: Json
          first_seen_at?: string
          id?: string
          key?: string
          kind?: string
          last_seen_at?: string
          occurrences?: number
          subject_id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "memories_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      observations: {
        Row: {
          category: string
          confidence: number
          context: Json
          created_at: string
          id: string
          occurred_at: string
          source: string
          subject_id: string
          value: string
        }
        Insert: {
          category: string
          confidence?: number
          context?: Json
          created_at?: string
          id?: string
          occurred_at?: string
          source: string
          subject_id: string
          value: string
        }
        Update: {
          category?: string
          confidence?: number
          context?: Json
          created_at?: string
          id?: string
          occurred_at?: string
          source?: string
          subject_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "observations_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_events: {
        Row: {
          detail: Json
          id: string
          kind: string
          label: string
          occurred_at: string
          subject_id: string
        }
        Insert: {
          detail?: Json
          id?: string
          kind: string
          label: string
          occurred_at?: string
          subject_id: string
        }
        Update: {
          detail?: Json
          id?: string
          kind?: string
          label?: string
          occurred_at?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_events_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          id: string
          identity: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          identity?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          identity?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      understanding_snapshots: {
        Row: {
          created_at: string
          depth: number
          id: string
          subject_id: string
          summary: Json
        }
        Insert: {
          created_at?: string
          depth?: number
          id?: string
          subject_id: string
          summary?: Json
        }
        Update: {
          created_at?: string
          depth?: number
          id?: string
          subject_id?: string
          summary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "understanding_snapshots_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
