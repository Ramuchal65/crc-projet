import { createClient } from "@/lib/supabase/server";
import { Employee, Team } from "@/lib/types";

export async function getCurrentEmployee(): Promise<Employee | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("employees")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return (data as Employee) ?? null;
}

export async function getMyTeams(employeeId: string | null): Promise<Team[]> {
  if (!employeeId) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("team_members")
    .select("teams(*)")
    .eq("employee_id", employeeId);

  return ((data ?? []).map((row: any) => row.teams).filter(Boolean)) as Team[];
}
