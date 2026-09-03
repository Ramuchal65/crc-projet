import { createClient } from "@/lib/supabase/server";
import GanttView from "@/components/GanttView";
import { Task, TaskDependency, Project } from "@/lib/types";

export default async function GanttPage() {
  const supabase = createClient();

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: true });

  if (projectsError) {
    return (
      <p className="text-critique text-sm">
        Erreur de chargement des projets : {projectsError.message}
      </p>
    );
  }

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*")
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) {
    return <p className="text-critique text-sm">Erreur de chargement : {error.message}</p>;
  }

  const taskIds = (tasks ?? []).map((t) => t.id);
  const { data: dependencies } = taskIds.length
    ? await supabase.from("task_dependencies").select("*").in("task_id", taskIds)
    : { data: [] };

  return (
    <GanttView
      tasks={(tasks as Task[]) ?? []}
      dependencies={(dependencies as TaskDependency[]) ?? []}
      initialProjects={(projects as Project[]) ?? []}
    />
  );
}
