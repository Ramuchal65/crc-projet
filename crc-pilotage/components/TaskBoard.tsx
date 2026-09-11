"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Task, Status, TaskDependency, Project, Team, Employee, STATUS_ORDER, STATUS_LABEL } from "@/lib/types";
import { Search } from "lucide-react";
import KanbanView from "./KanbanView";
import ListView from "./ListView";
import TaskDrawer from "./TaskDrawer";
import QuickAdd from "./QuickAdd";
import LinkDependencyModal from "./LinkDependencyModal";
import ProjectSelector from "./ProjectSelector";
import MultiSelectFilter from "./MultiSelectFilter";

export default function TaskBoard({
  initialTasks,
  initialDependencies,
  initialProjects,
  currentEmployeeName,
  currentEmployeeId,
  employees,
  myTeams,
}: {
  initialTasks: Task[];
  initialDependencies: TaskDependency[];
  initialProjects: Project[];
  currentEmployeeName: string;
  currentEmployeeId: string | null;
  employees: Employee[];
  myTeams: Team[];
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [dependencies, setDependencies] = useState<TaskDependency[]>(initialDependencies);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string | "all">("all");
  const [view, setView] = useState<"kanban" | "liste">("kanban");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [responsableFilter, setResponsableFilter] = useState<string | "tous">("tous");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [dueFilter, setDueFilter] = useState<string[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [linkRequest, setLinkRequest] = useState<{ a: Task; b: Task } | null>(null);

  const supabase = createClient();

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const blockedTaskIds = useMemo(() => {
    const set = new Set<string>();
    dependencies.forEach((d) => {
      const dep = taskById.get(d.depends_on_task_id);
      if (dep && dep.status !== "fait") set.add(d.task_id);
    });
    return set;
  }, [dependencies, taskById]);

  async function addDependency(taskId: string, dependsOnTaskId: string) {
    if (taskId === dependsOnTaskId) return;
    const reverseExists = dependencies.some(
      (d) => d.task_id === dependsOnTaskId && d.depends_on_task_id === taskId
    );
    if (reverseExists) {
      alert("Impossible : cette tâche dépend déjà de celle-ci (cycle direct).");
      return;
    }
    const newDep: TaskDependency = {
      id: crypto.randomUUID(),
      task_id: taskId,
      depends_on_task_id: dependsOnTaskId,
    };
    setDependencies((prev) => [...prev, newDep]);
    const { error } = await supabase.from("task_dependencies").insert(newDep);
    if (error) {
      console.error("Échec ajout dépendance :", error.message);
      setDependencies((prev) => prev.filter((d) => d.id !== newDep.id));
    }
  }

  async function removeDependency(dependencyId: string) {
    setDependencies((prev) => prev.filter((d) => d.id !== dependencyId));
    const { error } = await supabase.from("task_dependencies").delete().eq("id", dependencyId);
    if (error) console.error("Échec suppression dépendance :", error.message);
  }

  async function createProject(
    name: string,
    color: string,
    teamId: string,
    defaultVisibility: "public" | "private"
  ) {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      color,
      team_id: teamId,
      default_visibility: defaultVisibility,
      description: null,
      created_at: new Date().toISOString(),
    };
    setProjects((prev) => [...prev, newProject]);
    setSelectedProjectId(newProject.id);
    const { error } = await supabase.from("projects").insert(newProject);
    if (error) {
      console.error("Échec création projet :", error.message);
      alert(`Échec création projet : ${error.message}`);
      setProjects((prev) => prev.filter((p) => p.id !== newProject.id));
    }
  }

  async function updateProject(
    id: string,
    patch: { name?: string; color?: string; default_visibility?: "public" | "private" }
  ) {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    const { error } = await supabase.from("projects").update(patch).eq("id", id);
    if (error) console.error("Échec mise à jour projet :", error.message);
  }

  async function deleteProject(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setTasks((prev) => prev.filter((t) => t.project_id !== id));
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) console.error("Échec suppression projet :", error.message);
  }

  const taskCountsByProject = useMemo(() => {
    const map = new Map<string, number>();
    tasks.forEach((t) => map.set(t.project_id, (map.get(t.project_id) ?? 0) + 1));
    return map;
  }, [tasks]);

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
    const today = new Date().toISOString().slice(0, 10);
    // Semaine de travail en cours (lundi à vendredi), pas une fenêtre
    // glissante de 7 jours à partir d'aujourd'hui
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = dimanche, 1 = lundi, ... 6 = samedi
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    const weekStart = monday.toISOString().slice(0, 10);
    const weekEnd = friday.toISOString().slice(0, 10);
    return tasks.filter((t) => {
      if (selectedProjectId !== "all" && t.project_id !== selectedProjectId) return false;
      if (priorityFilter.length > 0 && !priorityFilter.includes(t.priority)) return false;
      if (statusFilter.length > 0 && !statusFilter.includes(t.status)) return false;
      if (
        responsableFilter !== "tous" &&
        !(t.responsible_name_raw ?? "").includes(responsableFilter)
      )
        return false;
      if (search.trim() && !t.title.toLowerCase().includes(search.trim().toLowerCase()))
        return false;
      if (dueFilter.length > 0) {
        const matches = dueFilter.some((f) => {
          if (f === "retard") return !!t.due_date && t.due_date < today && t.status !== "fait";
          if (f === "semaine") return !!t.due_date && t.due_date >= weekStart && t.due_date <= weekEnd;
          if (f === "aucune") return !t.due_date && !t.due_date_raw;
          return false;
        });
        if (!matches) return false;
      }
      return true;
    });
  }, [tasks, selectedProjectId, priorityFilter, statusFilter, responsableFilter, search, dueFilter]);

  async function updateTask(id: string, patch: Partial<Task>): Promise<boolean> {
    if (patch.status === "fait" && blockedTaskIds.has(id)) {
      const proceed = window.confirm(
        "Cette tâche est encore bloquée par une dépendance non terminée. La marquer comme faite quand même ?"
      );
      if (!proceed) return false;
    }
    const previous = tasks.find((t) => t.id === id);
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    const { error } = await supabase
      .from("tasks")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("Échec de la mise à jour :", error.message);
      // on annule la mise à jour optimiste : sans ça, l'écran mentirait
      // sur l'état réel (ex: statut refusé par le trigger de droits)
      if (previous) setTasks((prev) => prev.map((t) => (t.id === id ? previous : t)));
      alert(
        error.message.includes("Seuls le créateur")
          ? error.message
          : `Échec de la mise à jour : ${error.message}`
      );
      return false;
    }
    return true;
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
    // en vue "Tous les projets", on assigne au premier projet — un projet
    // précis doit être sélectionné pour une assignation intentionnelle
    const targetProjectId = selectedProjectId !== "all" ? selectedProjectId : projects[0]?.id;
    if (!targetProjectId) {
      alert("Crée d'abord un projet avant d'ajouter des tâches.");
      return;
    }

    // On génère l'id côté client et on n'utilise plus .select() après
    // l'insertion : .insert().select() déclenche une relecture immédiate
    // soumise à la policy SELECT (visibilité), distincte de la policy
    // d'écriture — une tâche pouvait donc être réellement créée en base
    // tout en faisant échouer l'affichage à cause de cette relecture.
    // On connaît déjà toutes les valeurs envoyées, pas besoin de les
    // redemander au serveur.
    const newTask: Task = {
      id: crypto.randomUUID(),
      project_id: targetProjectId,
      ref_source: null,
      title,
      description: null,
      responsible_name_raw: null,
      task_type: null,
      priority: "moyenne",
      status,
      due_date_raw: null,
      due_date: null,
      start_date: null,
      order_index: tasks.filter((t) => t.status === status && t.project_id === targetProjectId)
        .length,
      subtasks: [],
      visibility: null,
      assignee_employee_id: null,
      created_by: currentEmployeeId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setTasks((prev) => [...prev, newTask]);

    const { error } = await supabase.from("tasks").insert(newTask);
    if (error) {
      console.error("Échec de la création :", error.message);
      alert(`Échec de la création : ${error.message}`);
      setTasks((prev) => prev.filter((t) => t.id !== newTask.id));
    }
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

  function toggleSubtaskInline(taskId: string, subtaskId: string) {
    const task = taskById.get(taskId);
    if (!task) return;
    const updated = (task.subtasks ?? []).map((s) =>
      s.id === subtaskId ? { ...s, done: !s.done } : s
    );
    updateTask(taskId, { subtasks: updated });
  }

  const showProjectBadge = selectedProjectId === "all" && projects.length > 1;

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div>
            <h1 className="text-lg font-medium">Tâches</h1>
            <p className="text-sm text-ink/50">{filteredTasks.length} tâche(s)</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <ProjectSelector
              projects={projects}
              selectedId={selectedProjectId}
              onSelect={setSelectedProjectId}
              onCreate={createProject}
              onUpdate={updateProject}
              onDelete={deleteProject}
              taskCounts={taskCountsByProject}
              myTeams={myTeams}
            />
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
            <MultiSelectFilter
              label="Priorité"
              options={[
                { value: "haute", label: "Haute" },
                { value: "moyenne", label: "Moyenne" },
                { value: "basse", label: "Basse" },
              ]}
              selected={priorityFilter}
              onChange={setPriorityFilter}
            />
            <MultiSelectFilter
              label="Statut"
              options={STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
              selected={statusFilter}
              onChange={setStatusFilter}
            />
            <MultiSelectFilter
              label="Échéance"
              options={[
                { value: "retard", label: "En retard" },
                { value: "semaine", label: "Cette semaine" },
                { value: "aucune", label: "Sans échéance" },
              ]}
              selected={dueFilter}
              onChange={setDueFilter}
            />
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
            dependencies={dependencies}
            blockedTaskIds={blockedTaskIds}
            projectById={projectById}
            showProjectBadge={showProjectBadge}
            onStatusChange={(id, status) => updateTask(id, { status })}
            onReorder={reorderColumn}
            onSelect={setSelectedTaskId}
            onQuickAdd={createTask}
            onRequestLink={requestLink}
            onToggleSubtask={toggleSubtaskInline}
          />
        ) : (
          <>
            <QuickAdd onCreate={(title) => createTask(title)} />
            <ListView
              tasks={filteredTasks}
              blockedTaskIds={blockedTaskIds}
              projectById={projectById}
              showProjectBadge={showProjectBadge}
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
          projects={projects}
          employees={employees}
          currentEmployeeName={currentEmployeeName}
          currentEmployeeId={currentEmployeeId}
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
