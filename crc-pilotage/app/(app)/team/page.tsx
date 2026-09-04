import { createClient } from "@/lib/supabase/server";
import { getCurrentEmployee } from "@/lib/supabase/getCurrentEmployee";
import { Employee, Team } from "@/lib/types";
import TeamView from "@/components/TeamView";

export default async function TeamPage() {
  const supabase = createClient();
  const currentEmployee = await getCurrentEmployee();

  const { data: employees, error } = await supabase
    .from("employees")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return <p className="text-critique text-sm">Erreur de chargement : {error.message}</p>;
  }

  const { data: teams } = await supabase
    .from("teams")
    .select("*")
    .order("created_at", { ascending: true });

  const { data: memberships } = await supabase.from("team_members").select("*");

  return (
    <TeamView
      initialEmployees={(employees as Employee[]) ?? []}
      initialTeams={(teams as Team[]) ?? []}
      initialMemberships={memberships ?? []}
      currentEmployeeId={currentEmployee?.id ?? null}
    />
  );
}
