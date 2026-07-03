import { supabase } from "@/integrations/supabase/client";
import type { Category, Severity } from "./pollution";

export interface Report {
  id: string;
  user_id: string | null;
  image_url: string | null;
  category: Category;
  location_name: string | null;
  lat: number;
  lng: number;
  severity: Severity;
  confidence: number;
  ai_message: string;
  description: string | null;
  wind_speed: number | null;
  wind_deg: number | null;
  status: string;
  created_at: string;
}

export async function listReports(): Promise<Report[]> {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as Report[];
}

export async function insertReport(
  r: Omit<Report, "id" | "created_at" | "status" | "user_id"> & { status?: string },
) {
  const { data, error } = await supabase
    .from("reports")
    .insert({ ...r, status: r.status ?? "active" })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Report;
}

export async function updateReportStatus(id: string, status: string) {
  const { error } = await supabase.from("reports").update({ status }).eq("id", id);
  if (error) throw error;
}
