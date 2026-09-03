"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Task, Priority, Status, TaskDependency } from "@/lib/types";
import { Search } from "lucide-react";
import KanbanView from "./KanbanView";
import ListView from "./ListView";
import TaskDrawer from "./TaskDrawer";
import QuickAdd from "./QuickAdd";
import LinkDependencyModal from "./LinkDependencyModal";

export default function TaskBoard({
  initialTasks,
  initialDependencies,
  projectId,
}: {
  initialTasks: Task[];
  initialDependencies: TaskDependency[];
  projectId: string;
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [dependencies, setDependencies] = useState<TaskDependency[]>(initialDependencies);
  const [view, setView] = useState<"kanban" | "liste">("kanban");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "toutes">("toutes");
  const [responsableFilter, setResponsableFilter] = useState<string | "tous">("tous");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [quickAddStatus, setQuickAddStatus] = useState<Status | null>(null);
  const [linkRequest, setLinkRequest] = useState<{ a: Task; b: Task } | null>(null);

  const supabase = createClient();

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const blockedTaskIds = useMemo(() => {
    const set = new Set<string>();
    dependencies.forEach((d) => {
      const dep = taskById.get(d.depends_on_task_id);
      if (dep && dep.status !== "fait") set.add(d.task_id);
    });
    return set;
  }, [dependencies, taskById]);

  async function addDependency(taskId: string, dependsOnTaskId: string) {
    // évite l'auto-référence et le cycle direct A→B→A
    if (taskId === dependsOnTaskId) return;
    const reverseExists = dependencies.some(
      (d) => d.task_id === dependsOnTaskId && d.depends_on_task_id === taskId
    );
    if (reverseExists) {
      alert("Impossible : cette tâche dépend déjà de celle-ci (cycle direct).");
      return;
    }
    const { data, error } = await supabase
      .from("task_dependencies")
      .insert({ task_id: taskId, depends_on_task_id: dependsOnTaskId })
      .select()
      .single();
    if (error) {
      console.error("Échec ajout dépendance :", error.message);
      return;
    }
    setDependencies((prev) => [...prev, data as TaskDependency]);
  }

  async function removeDependency(dependencyId: string) {
    setDependencies((prev) => prev.filter((d) => d.id !== dependencyId));
    const { error } = await supabase.from("task_dependencies").delete().eq("id", dependencyId);
    if (error) console.error("Échec suppression dépendance :", error.message);
  }

  const responsables = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.responsible_name_raw) {
        t.responsible_name_raw.split(",").forEach((n) => set.add(n.trim()));
      }
    });
    return Array.from(set).sort();
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (priorityFilter !== "toutes" && t.priority !== priorityFilter) return false;
      if (
        responsableFilter !== "tous" &&
        !(t.responsible_name_raw ?? "").includes(responsableFilter)
      )
        return false;
      if (search.trim() && !t.title.toLowerCase().includes(search.trim().toLowerCase()))
        return false;
      return true;
    });
  }, [tasks, priorityFilter, responsableFilter, search]);

  async function updateTask(id: string, patch: Partial<Task>) {
    if (patch.status === "fait" && blockedTaskIds.has(id)) {
      const proceed = window.confirm(
        "Cette tâche est encore bloquée par une dépendance non terminée. La marquer comme faite quand même ?"
      );
      if (!proceed) return;
    }
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    const { error } = await supabase
      .from("tasks")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) console.error("Échec de la mise à jour :", error.message);
  }

  async function reorderColumn(status: Status, orderedIds: string[]) {
    setTasks((prev) => {
      const map = new Map(orderedIds.map((id, i) => [id, i]));
      return prev.map((t) =>
        t.status === status && map.has(t.id) ? { ...t, order_index: map.get(t.id)! } : t
      );
    });
    await Promise.all(
      orderedIds.map((id, i) => supabase.from("tasks").update({ order_index: i }).eq("id", id))
    );
  }

  async function createTask(title: string, status: Status = "a_faire") {
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        project_id: projectId,
        title,
        priority: "moyenne",
        status,
        order_index: tasks.filter((t) => t.status === status).length,
      })
      .select()
      .single();
    if (error) {
      console.error("Échec de la création :", error.message);
      return;
    }
    setTasks((prev) => [...prev, data as Task]);
  }

  async function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setDependencies((prev) => prev.filter((d) => d.task_id !== id && d.depends_on_task_id !== id));
    setSelectedTaskId(null);
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) console.error("Échec de la suppression :", error.message);
  }

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  function requestLink(draggedId: string, targetId: string) {
    const a = taskById.get(draggedId);
    const b = taskById.get(targetId);
    if (!a || !b) return;
    setLinkRequest({ a, b });
  }

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div>
            <h1 className="text-lg font-medium">Tâches</h1>
            <p className="text-sm text-ink/50">{filteredTasks.length} tâche(s)</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/30" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border border-line rounded-lg pl-8 pr-3 py-1.5 bg-white w-44"
              />
            </div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as Priority | "toutes")}
              className="border border-line rounded-lg px-2 py-1.5 bg-white"
            >
              <option value="toutes">Toute priorité</option>
              <option value="haute">Haute</option>
              <option value="moyenne">Moyenne</option>
              <option value="basse">Basse</option>
            </select>
            <select
              value={responsableFilter}
              onChange={(e) => setResponsableFilter(e.target.value)}
              className="border border-line rounded-lg px-2 py-1.5 bg-white max-w-[150px]"
            >
              <option value="tous">Tout responsable</option>
              {responsables.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-0.5 border border-line rounded-lg p-0.5 bg-white">
              <button
                onClick={() => setView("kanban")}
                className={`px-3 py-1.5 rounded text-sm ${
                  view === "kanban" ? "bg-accent text-white hover:bg-accent/90 transition-colors" : "text-ink/60 hover:text-ink"
                }`}
              >
                Kanban
              </button>
              <button
                onClick={() => setView("liste")}
                className={`px-3 py-1.5 rounded text-sm ${
                  view === "liste" ? "bg-accent text-white hover:bg-accent/90 transition-colors" : "text-ink/60 hover:text-ink"
                }`}
              >
                Liste
              </button>
            </div>
          </div>
        </div>

        {view === "kanban" ? (
          <KanbanView
            tasks={filteredTasks}
            blockedTaskIds={blockedTaskIds}
            onStatusChange={(id, status) => updateTask(id, { status })}
            onReorder={reorderColumn}
            onSelect={setSelectedTaskId}
            onQuickAdd={createTask}
            onRequestLink={requestLink}
          />
        ) : (
          <>
            <QuickAdd onCreate={(title) => createTask(title)} />
            <ListView
              tasks={filteredTasks}
              blockedTaskIds={blockedTaskIds}
              onUpdate={updateTask}
              onSelect={setSelectedTaskId}
            />
          </>
        )}
      </div>

      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          allTasks={tasks}
          dependencies={dependencies}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={(patch) => updateTask(selectedTask.id, patch)}
          onDelete={() => deleteTask(selectedTask.id)}
          onAddDependency={(dependsOnId) => addDependency(selectedTask.id, dependsOnId)}
          onRemoveDependency={removeDependency}
        />
      )}

      {linkRequest && (
        <LinkDependencyModal
          taskA={linkRequest.a}
          taskB={linkRequest.b}
          onChoose={(dependentId, dependsOnId) => {
            addDependency(dependentId, dependsOnId);
            setLinkRequest(null);
          }}
          onCancel={() => setLinkRequest(null)}
        />
      )}
    </>
  );
}
