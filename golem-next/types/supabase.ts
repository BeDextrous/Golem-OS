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
      clients: {
        Row: {
          company: string | null
          contact_id: number | null
          contract_value: number | null
          created_at: string
          currency: string | null
          end_date: string | null
          id: number
          name: string
          notes: string | null
          start_date: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          contact_id?: number | null
          contract_value?: number | null
          created_at?: string
          currency?: string | null
          end_date?: string | null
          id?: number
          name: string
          notes?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          contact_id?: number | null
          contract_value?: number | null
          created_at?: string
          currency?: string | null
          end_date?: string | null
          id?: number
          name?: string
          notes?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm"
            referencedColumns: ["id"]
          },
        ]
      }
      crm: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: number
          interaction_log: string | null
          last_contact_date: string | null
          linkedin_url: string | null
          name: string
          pillar: string | null
          role: string | null
          tags: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: number
          interaction_log?: string | null
          last_contact_date?: string | null
          linkedin_url?: string | null
          name: string
          pillar?: string | null
          role?: string | null
          tags?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: number
          interaction_log?: string | null
          last_contact_date?: string | null
          linkedin_url?: string | null
          name?: string
          pillar?: string | null
          role?: string | null
          tags?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cross_links: {
        Row: {
          created_at: string
          id: number
          relationship_label: string | null
          source_id: number
          source_table: string
          target_id: number
          target_table: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          relationship_label?: string | null
          source_id: number
          source_table: string
          target_id: number
          target_table: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          relationship_label?: string | null
          source_id?: number
          source_table?: string
          target_id?: number
          target_table?: string
          user_id?: string
        }
        Relationships: []
      }
      finances: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          entry_date: string
          id: number
          label: string | null
          pillar: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          entry_date?: string
          id?: number
          label?: string | null
          pillar?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          entry_date?: string
          id?: number
          label?: string | null
          pillar?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          area: string | null
          created_at: string
          id: number
          notes: string | null
          pillar: string | null
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area?: string | null
          created_at?: string
          id?: number
          notes?: string | null
          pillar?: string | null
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string | null
          created_at?: string
          id?: number
          notes?: string | null
          pillar?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      health_entries: {
        Row: {
          category: string
          created_at: string
          entry_date: string
          id: number
          label: string | null
          notes: string | null
          source: string | null
          unit: string | null
          updated_at: string
          user_id: string
          value: number | null
        }
        Insert: {
          category: string
          created_at?: string
          entry_date?: string
          id?: number
          label?: string | null
          notes?: string | null
          source?: string | null
          unit?: string | null
          updated_at?: string
          user_id: string
          value?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          entry_date?: string
          id?: number
          label?: string | null
          notes?: string | null
          source?: string | null
          unit?: string | null
          updated_at?: string
          user_id?: string
          value?: number | null
        }
        Relationships: []
      }
      integration_cache: {
        Row: {
          data: Json
          fetched_at: string
          id: number
          source: string
          user_id: string
        }
        Insert: {
          data?: Json
          fetched_at?: string
          id?: number
          source: string
          user_id: string
        }
        Update: {
          data?: Json
          fetched_at?: string
          id?: number
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          client_id: number | null
          created_at: string
          currency: string | null
          due_date: string | null
          id: number
          issued_date: string | null
          notes: string | null
          paid_date: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          client_id?: number | null
          created_at?: string
          currency?: string | null
          due_date?: string | null
          id?: number
          issued_date?: string | null
          notes?: string | null
          paid_date?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          client_id?: number | null
          created_at?: string
          currency?: string | null
          due_date?: string | null
          id?: number
          issued_date?: string | null
          notes?: string | null
          paid_date?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          company: string
          contact_id: number | null
          created_at: string
          date_applied: string | null
          id: number
          job_url: string | null
          location: string | null
          next_action: string | null
          next_action_date: string | null
          notes: string | null
          remote_type: string | null
          role: string | null
          salary_offer: string | null
          salary_range: string | null
          source: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company: string
          contact_id?: number | null
          created_at?: string
          date_applied?: string | null
          id?: number
          job_url?: string | null
          location?: string | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          remote_type?: string | null
          role?: string | null
          salary_offer?: string | null
          salary_range?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string
          contact_id?: number | null
          created_at?: string
          date_applied?: string | null
          id?: number
          job_url?: string | null
          location?: string | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          remote_type?: string | null
          role?: string | null
          salary_offer?: string | null
          salary_range?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_items: {
        Row: {
          content: string | null
          created_at: string
          id: number
          project_id: number | null
          source_url: string | null
          tags: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: number
          project_id?: number | null
          source_url?: string | null
          tags?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: number
          project_id?: number | null
          source_url?: string | null
          tags?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      links: {
        Row: {
          created_at: string
          date_added: string | null
          id: number
          parent_goal_id: number | null
          parent_objective_id: number | null
          parent_task_id: number | null
          pillar: string | null
          title: string | null
          updated_at: string
          url: string
          user_id: string
          website: string | null
        }
        Insert: {
          created_at?: string
          date_added?: string | null
          id?: number
          parent_goal_id?: number | null
          parent_objective_id?: number | null
          parent_task_id?: number | null
          pillar?: string | null
          title?: string | null
          updated_at?: string
          url: string
          user_id: string
          website?: string | null
        }
        Update: {
          created_at?: string
          date_added?: string | null
          id?: number
          parent_goal_id?: number | null
          parent_objective_id?: number | null
          parent_task_id?: number | null
          pillar?: string | null
          title?: string | null
          updated_at?: string
          url?: string
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "links_parent_goal_id_fkey"
            columns: ["parent_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "links_parent_objective_id_fkey"
            columns: ["parent_objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "links_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string | null
          created_at: string
          drafts_uuid: string | null
          id: number
          parent_goal_id: number | null
          parent_objective_id: number | null
          parent_task_id: number | null
          pillar: string | null
          tags: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          drafts_uuid?: string | null
          id?: number
          parent_goal_id?: number | null
          parent_objective_id?: number | null
          parent_task_id?: number | null
          pillar?: string | null
          tags?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          drafts_uuid?: string | null
          id?: number
          parent_goal_id?: number | null
          parent_objective_id?: number | null
          parent_task_id?: number | null
          pillar?: string | null
          tags?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_parent_goal_id_fkey"
            columns: ["parent_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_parent_objective_id_fkey"
            columns: ["parent_objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      objectives: {
        Row: {
          created_at: string
          current_value: number | null
          deadline: string | null
          goal_id: number | null
          id: number
          metric_unit: string | null
          pillar: string | null
          target_value: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_value?: number | null
          deadline?: string | null
          goal_id?: number | null
          id?: number
          metric_unit?: string | null
          pillar?: string | null
          target_value?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_value?: number | null
          deadline?: string | null
          goal_id?: number | null
          id?: number
          metric_unit?: string | null
          pillar?: string | null
          target_value?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "objectives_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: number | null
          created_at: string
          description: string | null
          end_date: string | null
          id: number
          name: string
          notes: string | null
          pillar: string
          project_type: string | null
          start_date: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: number | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: number
          name: string
          notes?: string | null
          pillar: string
          project_type?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: number | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: number
          name?: string
          notes?: string | null
          pillar?: string
          project_type?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      reading: {
        Row: {
          author: string | null
          book_title: string
          created_at: string
          id: number
          progress_pct: number | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          author?: string | null
          book_title: string
          created_at?: string
          id?: number
          progress_pct?: number | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          author?: string | null
          book_title?: string
          created_at?: string
          id?: number
          progress_pct?: number | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      target_companies: {
        Row: {
          company_name: string
          created_at: string
          id: number
          industry: string | null
          notes: string | null
          priority: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          company_name: string
          created_at?: string
          id?: number
          industry?: string | null
          notes?: string | null
          priority?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          company_name?: string
          created_at?: string
          id?: number
          industry?: string | null
          notes?: string | null
          priority?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          area: string | null
          client_id: number | null
          created_at: string
          due_date: string | null
          id: number
          name: string
          objective_id: number | null
          pillar: string | null
          priority: string | null
          project_id: number | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          area?: string | null
          client_id?: number | null
          created_at?: string
          due_date?: string | null
          id?: number
          name: string
          objective_id?: number | null
          pillar?: string | null
          priority?: string | null
          project_id?: number | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string | null
          client_id?: number | null
          created_at?: string
          due_date?: string | null
          id?: number
          name?: string
          objective_id?: number | null
          pillar?: string | null
          priority?: string | null
          project_id?: number | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_dashboard_config: {
        Row: {
          config: Json
          dashboard: string
          id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          dashboard: string
          id?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          dashboard?: string
          id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_pages: {
        Row: {
          config: Json
          created_at: string
          data_type: string | null
          icon: string | null
          id: number
          pillar: string
          slug: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          data_type?: string | null
          icon?: string | null
          id?: number
          pillar: string
          slug: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          data_type?: string | null
          icon?: string | null
          id?: number
          pillar?: string
          slug?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
A new version of Supabase CLI is available: v2.101.0 (currently installed v2.90.0)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
