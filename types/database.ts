export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      checkins: {
        Row: {
          context: string | null
          created_at: string | null
          energy_level: number | null
          id: string
          other_priorities: string[] | null
          time_of_day: string | null
          top_priority: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string | null
          energy_level?: number | null
          id?: string
          other_priorities?: string[] | null
          time_of_day?: string | null
          top_priority: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          context?: string | null
          created_at?: string | null
          energy_level?: number | null
          id?: string
          other_priorities?: string[] | null
          time_of_day?: string | null
          top_priority?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      journal_tasks: {
        Row: {
          id: string
          journal_id: string
          task_id: string
        }
        Insert: {
          id?: string
          journal_id: string
          task_id: string
        }
        Update: {
          id?: string
          journal_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_tasks_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_tasks_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals_with_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      journals: {
        Row: {
          content: string
          created_at: string | null
          date: string
          id: string
          mood: string | null
          session_label: string | null
          spotify_album_art: string | null
          spotify_artist: string | null
          spotify_preview_url: string | null
          spotify_track_id: string | null
          spotify_track_name: string | null
          spotify_url: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          date?: string
          id?: string
          mood?: string | null
          session_label?: string | null
          spotify_album_art?: string | null
          spotify_artist?: string | null
          spotify_preview_url?: string | null
          spotify_track_id?: string | null
          spotify_track_name?: string | null
          spotify_url?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          date?: string
          id?: string
          mood?: string | null
          session_label?: string | null
          spotify_album_art?: string | null
          spotify_artist?: string | null
          spotify_preview_url?: string | null
          spotify_track_id?: string | null
          spotify_track_name?: string | null
          spotify_url?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      spotify_playlists: {
        Row: {
          auto_sync: boolean | null
          created_at: string | null
          description: string | null
          external_url: string
          id: string
          last_synced: string | null
          name: string
          spotify_id: string
          track_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_sync?: boolean | null
          created_at?: string | null
          description?: string | null
          external_url: string
          id?: string
          last_synced?: string | null
          name: string
          spotify_id: string
          track_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_sync?: boolean | null
          created_at?: string | null
          description?: string | null
          external_url?: string
          id?: string
          last_synced?: string | null
          name?: string
          spotify_id?: string
          track_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string | null
          description: string | null
          due_date: string | null
          end_time: string | null
          estimated_duration: number | null
          id: string
          locked: boolean | null
          notes: string | null
          priority_level: number | null
          project_id: string | null
          scheduling_mode: string | null
          start_time: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          end_time?: string | null
          estimated_duration?: number | null
          id?: string
          locked?: boolean | null
          notes?: string | null
          priority_level?: number | null
          project_id?: string | null
          scheduling_mode?: string | null
          start_time?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          end_time?: string | null
          estimated_duration?: number | null
          id?: string
          locked?: boolean | null
          notes?: string | null
          priority_level?: number | null
          project_id?: string | null
          scheduling_mode?: string | null
          start_time?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      journals_with_tasks: {
        Row: {
          content: string | null
          created_at: string | null
          date: string | null
          id: string | null
          mood: string | null
          session_label: string | null
          spotify_album_art: string | null
          spotify_artist: string | null
          spotify_preview_url: string | null
          spotify_track_id: string | null
          spotify_track_name: string | null
          spotify_url: string | null
          tasks: Json | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

