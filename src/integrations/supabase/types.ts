export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      activities: {
        Row: {
          body: string | null;
          company_id: string | null;
          contact_id: string | null;
          created_at: string;
          deal_id: string | null;
          id: string;
          subject: string | null;
          type: Database["public"]["Enums"]["activity_type"];
          user_id: string | null;
          workspace_id: string;
        };
        Insert: {
          body?: string | null;
          company_id?: string | null;
          contact_id?: string | null;
          created_at?: string;
          deal_id?: string | null;
          id?: string;
          subject?: string | null;
          type: Database["public"]["Enums"]["activity_type"];
          user_id?: string | null;
          workspace_id: string;
        };
        Update: {
          body?: string | null;
          company_id?: string | null;
          contact_id?: string | null;
          created_at?: string;
          deal_id?: string | null;
          id?: string;
          subject?: string | null;
          type?: Database["public"]["Enums"]["activity_type"];
          user_id?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activities_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          booked_by: string;
          contact_id: string;
          created_at: string;
          deal_id: string | null;
          held_at: string;
          id: string;
          notes: string | null;
          outcome: Database["public"]["Enums"]["booking_outcome"] | null;
          quality_score: number | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          booked_by: string;
          contact_id: string;
          created_at?: string;
          deal_id?: string | null;
          held_at: string;
          id?: string;
          notes?: string | null;
          outcome?: Database["public"]["Enums"]["booking_outcome"] | null;
          quality_score?: number | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          booked_by?: string;
          contact_id?: string;
          created_at?: string;
          deal_id?: string | null;
          held_at?: string;
          id?: string;
          notes?: string | null;
          outcome?: Database["public"]["Enums"]["booking_outcome"] | null;
          quality_score?: number | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      calendar_events: {
        Row: {
          color: string | null;
          company_id: string | null;
          contact_id: string | null;
          created_at: string;
          deal_id: string | null;
          description: string | null;
          end_at: string;
          event_type: Database["public"]["Enums"]["event_type"];
          id: string;
          location: string | null;
          owner_id: string;
          start_at: string;
          title: string;
          updated_at: string;
          video_url: string | null;
          workspace_id: string;
        };
        Insert: {
          color?: string | null;
          company_id?: string | null;
          contact_id?: string | null;
          created_at?: string;
          deal_id?: string | null;
          description?: string | null;
          end_at: string;
          event_type?: Database["public"]["Enums"]["event_type"];
          id?: string;
          location?: string | null;
          owner_id: string;
          start_at: string;
          title: string;
          updated_at?: string;
          video_url?: string | null;
          workspace_id: string;
        };
        Update: {
          color?: string | null;
          company_id?: string | null;
          contact_id?: string | null;
          created_at?: string;
          deal_id?: string | null;
          description?: string | null;
          end_at?: string;
          event_type?: Database["public"]["Enums"]["event_type"];
          id?: string;
          location?: string | null;
          owner_id?: string;
          start_at?: string;
          title?: string;
          updated_at?: string;
          video_url?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_events_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calendar_events_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calendar_events_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calendar_events_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      companies: {
        Row: {
          address: string | null;
          created_at: string;
          cvr: string | null;
          employees: number | null;
          id: string;
          industry: string | null;
          name: string;
          updated_at: string;
          website: string | null;
          workspace_id: string;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          cvr?: string | null;
          employees?: number | null;
          id?: string;
          industry?: string | null;
          name: string;
          updated_at?: string;
          website?: string | null;
          workspace_id: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          cvr?: string | null;
          employees?: number | null;
          id?: string;
          industry?: string | null;
          name?: string;
          updated_at?: string;
          website?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "companies_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      contacts: {
        Row: {
          company_id: string | null;
          created_at: string;
          email: string | null;
          first_name: string;
          id: string;
          last_name: string | null;
          phone: string | null;
          title: string | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          company_id?: string | null;
          created_at?: string;
          email?: string | null;
          first_name: string;
          id?: string;
          last_name?: string | null;
          phone?: string | null;
          title?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          company_id?: string | null;
          created_at?: string;
          email?: string | null;
          first_name?: string;
          id?: string;
          last_name?: string | null;
          phone?: string | null;
          title?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contacts_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      deal_contacts: {
        Row: {
          contact_id: string;
          created_at: string;
          deal_id: string;
          id: string;
          is_primary: boolean;
          role: string | null;
        };
        Insert: {
          contact_id: string;
          created_at?: string;
          deal_id: string;
          id?: string;
          is_primary?: boolean;
          role?: string | null;
        };
        Update: {
          contact_id?: string;
          created_at?: string;
          deal_id?: string;
          id?: string;
          is_primary?: boolean;
          role?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "deal_contacts_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deal_contacts_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
        ];
      };
      deal_stage_history: {
        Row: {
          deal_id: string;
          entered_at: string;
          exited_at: string | null;
          id: string;
          stage_id: string;
          workspace_id: string;
        };
        Insert: {
          deal_id: string;
          entered_at?: string;
          exited_at?: string | null;
          id?: string;
          stage_id: string;
          workspace_id: string;
        };
        Update: {
          deal_id?: string;
          entered_at?: string;
          exited_at?: string | null;
          id?: string;
          stage_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deal_stage_history_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deal_stage_history_stage_id_fkey";
            columns: ["stage_id"];
            isOneToOne: false;
            referencedRelation: "pipeline_stages";
            referencedColumns: ["id"];
          },
        ];
      };
      deals: {
        Row: {
          company_id: string | null;
          contact_id: string | null;
          created_at: string;
          currency: string;
          description: string | null;
          expected_close_date: string | null;
          id: string;
          owner_id: string | null;
          pipeline_id: string;
          sort_order: number;
          stage_id: string;
          status: Database["public"]["Enums"]["deal_status"];
          title: string;
          updated_at: string;
          value: number | null;
          workspace_id: string;
        };
        Insert: {
          company_id?: string | null;
          contact_id?: string | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          expected_close_date?: string | null;
          id?: string;
          owner_id?: string | null;
          pipeline_id: string;
          sort_order?: number;
          stage_id: string;
          status?: Database["public"]["Enums"]["deal_status"];
          title: string;
          updated_at?: string;
          value?: number | null;
          workspace_id: string;
        };
        Update: {
          company_id?: string | null;
          contact_id?: string | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          expected_close_date?: string | null;
          id?: string;
          owner_id?: string | null;
          pipeline_id?: string;
          sort_order?: number;
          stage_id?: string;
          status?: Database["public"]["Enums"]["deal_status"];
          title?: string;
          updated_at?: string;
          value?: number | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deals_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deals_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deals_pipeline_id_fkey";
            columns: ["pipeline_id"];
            isOneToOne: false;
            referencedRelation: "pipelines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deals_stage_id_fkey";
            columns: ["stage_id"];
            isOneToOne: false;
            referencedRelation: "pipeline_stages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deals_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      pipeline_stages: {
        Row: {
          color: string | null;
          id: string;
          name: string;
          pipeline_id: string;
          probability: number;
          sort_order: number;
          stage_type: Database["public"]["Enums"]["stage_type"];
        };
        Insert: {
          color?: string | null;
          id?: string;
          name: string;
          pipeline_id: string;
          probability?: number;
          sort_order?: number;
          stage_type?: Database["public"]["Enums"]["stage_type"];
        };
        Update: {
          color?: string | null;
          id?: string;
          name?: string;
          pipeline_id?: string;
          probability?: number;
          sort_order?: number;
          stage_type?: Database["public"]["Enums"]["stage_type"];
        };
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey";
            columns: ["pipeline_id"];
            isOneToOne: false;
            referencedRelation: "pipelines";
            referencedColumns: ["id"];
          },
        ];
      };
      pipelines: {
        Row: {
          created_at: string;
          id: string;
          is_default: boolean;
          name: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_default?: boolean;
          name: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_default?: boolean;
          name?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pipelines_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          assignee_id: string;
          company_id: string | null;
          completed_at: string | null;
          contact_id: string | null;
          created_at: string;
          creator_id: string;
          deal_id: string | null;
          description: string | null;
          due_at: string | null;
          id: string;
          priority: Database["public"]["Enums"]["task_priority"];
          sort_order: number;
          status: Database["public"]["Enums"]["task_status"];
          title: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          assignee_id: string;
          company_id?: string | null;
          completed_at?: string | null;
          contact_id?: string | null;
          created_at?: string;
          creator_id: string;
          deal_id?: string | null;
          description?: string | null;
          due_at?: string | null;
          id?: string;
          priority?: Database["public"]["Enums"]["task_priority"];
          sort_order?: number;
          status?: Database["public"]["Enums"]["task_status"];
          title: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          assignee_id?: string;
          company_id?: string | null;
          completed_at?: string | null;
          contact_id?: string | null;
          created_at?: string;
          creator_id?: string;
          deal_id?: string | null;
          description?: string | null;
          due_at?: string | null;
          id?: string;
          priority?: Database["public"]["Enums"]["task_priority"];
          sort_order?: number;
          status?: Database["public"]["Enums"]["task_status"];
          title?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspace_invitations: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string;
          message: string | null;
          resend_count: number;
          role: Database["public"]["Enums"]["app_role"];
          token: string;
          workspace_id: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          email: string;
          expires_at: string;
          id?: string;
          invited_by: string;
          message?: string | null;
          resend_count?: number;
          role?: Database["public"]["Enums"]["app_role"];
          token: string;
          workspace_id: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string;
          message?: string | null;
          resend_count?: number;
          role?: Database["public"]["Enums"]["app_role"];
          token?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspace_members: {
        Row: {
          joined_at: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          joined_at?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id: string;
          workspace_id: string;
        };
        Update: {
          joined_at?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspaces: {
        Row: {
          country: string;
          created_at: string;
          id: string;
          name: string;
          onboarding_completed: boolean;
        };
        Insert: {
          country?: string;
          created_at?: string;
          id?: string;
          name: string;
          onboarding_completed?: boolean;
        };
        Update: {
          country?: string;
          created_at?: string;
          id?: string;
          name?: string;
          onboarding_completed?: boolean;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_invitation: { Args: { _token: string }; Returns: string };
      create_workspace: {
        Args: { _country?: string; _name: string };
        Returns: string;
      };
      delete_workspace: { Args: { _workspace_id: string }; Returns: undefined };
      get_invitation_by_token: {
        Args: { _token: string };
        Returns: {
          accepted_at: string;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          inviter_name: string;
          message: string;
          role: Database["public"]["Enums"]["app_role"];
          workspace_id: string;
          workspace_name: string;
        }[];
      };
      has_workspace_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
          _workspace_id: string;
        };
        Returns: boolean;
      };
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string };
        Returns: boolean;
      };
      rpt_activity_breakdown: {
        Args: { _from: string; _to: string; _workspace_id: string };
        Returns: {
          count: number;
          type: Database["public"]["Enums"]["activity_type"];
        }[];
      };
      rpt_deal_velocity: {
        Args: { _from: string; _to: string; _workspace_id: string };
        Returns: {
          avg_days: number;
          deals_count: number;
          status: Database["public"]["Enums"]["deal_status"];
          week_start: string;
        }[];
      };
      rpt_deals_created_vs_closed: {
        Args: { _from: string; _to: string; _workspace_id: string };
        Returns: {
          created_count: number;
          lost_count: number;
          week_start: string;
          won_count: number;
        }[];
      };
      rpt_global_recents: {
        Args: { _limit?: number; _workspace_id: string };
        Returns: {
          id: string;
          label: string;
          secondary: string;
          type: string;
          updated_at: string;
        }[];
      };
      rpt_kpi_sparklines: {
        Args: { _from: string; _to: string; _workspace_id: string };
        Returns: {
          activities: number;
          day: string;
          deals_won: number;
          pipeline_value: number;
          weighted_value: number;
        }[];
      };
      rpt_kpi_summary: {
        Args: {
          _from: string;
          _prev_from: string;
          _prev_to: string;
          _to: string;
          _workspace_id: string;
        };
        Returns: {
          activities_count: number;
          activities_count_prev: number;
          deals_won_count: number;
          deals_won_count_prev: number;
          deals_won_value: number;
          deals_won_value_prev: number;
          total_pipeline_value: number;
          total_pipeline_value_prev: number;
          weighted_pipeline_value: number;
          weighted_pipeline_value_prev: number;
        }[];
      };
      rpt_pipeline_by_stage: {
        Args: { _pipeline_id?: string; _workspace_id: string };
        Returns: {
          color: string;
          deal_count: number;
          sort_order: number;
          stage_id: string;
          stage_name: string;
          total_value: number;
        }[];
      };
      rpt_team_leaderboard: {
        Args: { _from: string; _to: string; _workspace_id: string };
        Returns: {
          activity_score: number;
          avatar_url: string;
          calls_logged: number;
          deals_won: number;
          full_name: string;
          meetings_booked: number;
          tasks_completed: number;
          user_id: string;
          won_value: number;
        }[];
      };
      transfer_workspace_ownership: {
        Args: { _new_owner_id: string; _workspace_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      activity_type: "call" | "email" | "meeting" | "note" | "task";
      app_role: "owner" | "admin" | "member";
      booking_outcome: "held" | "no_show" | "cancelled";
      deal_status: "open" | "won" | "lost";
      event_type: "meeting" | "call" | "other";
      stage_type: "open" | "won" | "lost";
      task_priority: "low" | "medium" | "high";
      task_status: "todo" | "in_progress" | "done";
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
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
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
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
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
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
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
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
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
      activity_type: ["call", "email", "meeting", "note", "task"],
      app_role: ["owner", "admin", "member"],
      booking_outcome: ["held", "no_show", "cancelled"],
      deal_status: ["open", "won", "lost"],
      event_type: ["meeting", "call", "other"],
      stage_type: ["open", "won", "lost"],
      task_priority: ["low", "medium", "high"],
      task_status: ["todo", "in_progress", "done"],
    },
  },
} as const;
