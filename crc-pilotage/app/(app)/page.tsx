import { createClient } from "@/lib/supabase/server";
import TaskBoard from "@/components/TaskBoard";
import { getCurrentEmployee, getMyTeams } from "@/lib/supabase/getCurrentEmployee";
import { Task, TaskDependency, Project, Employee } from "@/lib/types";

export default async function TasksPage() {
  const supabase = createClient();
  const currentEmployee = await getCurrentEmployee();
  const myTeams = await getMyTeams(currentEmployee?.id ?? null);

  const { data: employees } = await supabase
    .from("employees")
    .select("*")
    .order("full_name", { ascending: true });

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
      initialProjects={(projects as Project[]) ?? []}
      currentEmployeeName={currentEmployee?.full_name ?? "Anonyme"}
      currentEmployeeId={currentEmployee?.id ?? null}
      employees={(employees as Employee[]) ?? []}
      myTeams={myTeams}
    />
  );
}
