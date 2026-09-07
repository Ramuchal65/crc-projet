import { createClient } from "@/lib/supabase/server";
import DashboardView from "@/components/DashboardView";
import { Task, Project, Employee } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: true });

  const { data: tasks, error } = await supabase.from("tasks").select("*");

  if (error) {
    return <p className="text-critique text-sm">Erreur de chargement : {error.message}</p>;
  }

  const { data: employees } = await supabase
    .from("employees")
    .select("*")
    .order("full_name", { ascending: true });

  return (
    <DashboardView
      tasks={(tasks as Task[]) ?? []}
      projects={(projects as Project[]) ?? []}
      employees={(employees as Employee[]) ?? []}
    />
  );
}
