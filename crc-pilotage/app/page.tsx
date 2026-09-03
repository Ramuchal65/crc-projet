import { createClient } from "@/lib/supabase/server";
import TaskBoard from "@/components/TaskBoard";
import { Task, TaskDependency } from "@/lib/types";

export default async function TasksPage() {
  const supabase = createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("name", "Pilotage CRC")
    .single();

  if (!project) {
    return (
      <p className="text-critique text-sm">
        Projet "Pilotage CRC" introuvable — vérifie que la migration SQL a bien été
        exécutée.
      </p>
    );
  }

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("project_id", project.id)
    .order("order_index", { ascending: true });

  if (error) {
    return <p className="text-critique text-sm">Erreur de chargement : {error.message}</p>;
  }

  const taskIds = (tasks ?? []).map((t) => t.id);
  const { data: dependencies } = taskIds.length
    ? await supabase.from("task_dependencies").select("*").in("task_id", taskIds)
    : { data: [] };

  return (
    <TaskBoard
      initialTasks={(tasks as Task[]) ?? []}
      initialDependencies={(dependencies as TaskDependency[]) ?? []}
      projectId={project.id}
    />
  );
}
