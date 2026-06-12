import type { Database } from "@/integrations/supabase/types";

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Workspace = Tables<"workspaces">;
export type WorkspaceMember = Tables<"workspace_members">;
export type Profile = Tables<"profiles">;
export type Company = Tables<"companies">;
export type Contact = Tables<"contacts">;
export type Pipeline = Tables<"pipelines">;
export type PipelineStage = Tables<"pipeline_stages">;
export type Deal = Tables<"deals">;
export type Activity = Tables<"activities">;
export type Booking = Tables<"bookings">;

export type AppRole = Database["public"]["Enums"]["app_role"];
export type BookingOutcome = Database["public"]["Enums"]["booking_outcome"];
