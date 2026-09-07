import { createClient } from "@/lib/supabase/server";
import ActivityFeedView from "@/components/ActivityFeedView";
import { ActivityLogEntry, Project, Employee } from "@/lib/types";

export default async function ActivityPage() {
  const supabase = createClient();

  const { data: entries, error } = await supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(150);

  if (error) {
    return <p className="text-critique text-sm">Erreur de chargement : {error.message}</p>;
  }

  const { data: projects } = await supabase.from("projects").select("*");
  const { data: employees } = await supabase.from("employees").select("*");

  return (
    <ActivityFeedView
      entries={(entries as ActivityLogEntry[]) ?? []}
      projects={(projects as Project[]) ?? []}
      employees={(employees as Employee[]) ?? []}
    />
  );
}
