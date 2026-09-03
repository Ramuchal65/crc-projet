"use client";

import { useState, useEffect } from "react";
import { X, Trash2, Link2, ChevronRight } from "lucide-react";
import { Task, Priority, Status, STATUS_ORDER, STATUS_LABEL, PRIORITY_ORDER, PRIORITY_LABEL, TaskDependency } from "@/lib/types";

export default function TaskDrawer({
  task,
  allTasks,
  dependencies,
  onClose,
  onUpdate,
  onDelete,
  onAddDependency,
  onRemoveDependency,
}: {
  task: Task;
  allTasks: Task[];
  dependencies: TaskDependency[];
  onClose: () => void;
  onUpdate: (patch: Partial<Task>) => void;
  onDelete: () => void;
  onAddDependency: (dependsOnTaskId: string) => void;
  onRemoveDependency: (dependencyId: string) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [responsible, setResponsible] = useState(task.responsible_name_raw ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [depPick, setDepPick] = useState("");

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setResponsible(task.responsible_name_raw ?? "");
    setConfirmingDelete(false);
  }, [task.id]);

  useEffect(() => {
    // déclenche la transition d'entrée après le premier rendu
    const id = requestAnimationFrame(() => setMounted(true));
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEsc);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const dependsOn = dependencies.filter((d) => d.task_id === task.id);
  const dependents = dependencies.filter((d) => d.depends_on_task_id === task.id);
  const availableToAdd = allTasks.filter(
    (t) => t.id !== task.id && !dependsOn.some((d) => d.depends_on_task_id === t.id)
  );

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`absolute inset-0 bg-ink/25 transition-opacity duration-200 ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full sm:w-[440px] bg-paper border-l border-line overflow-y-auto shadow-xl transition-transform duration-200 ease-out ${
          mounted ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          {task.ref_source && (
            <span className="font-mono text-xs text-ink/40">{task.ref_source}</span>
          )}
          <button
            onClick={onClose}
            className="text-ink/40 hover:text-ink transition-colors ml-auto p-1 rounded hover:bg-ink/5"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label className="text-xs uppercase tracking-wide text-ink/50 block mb-1">
              Titre
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title.trim() && onUpdate({ title: title.trim() })}
              className="w-full border border-line rounded-md px-3 py-2 bg-white font-medium"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-ink/50 block mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => onUpdate({ description: description || null })}
              rows={4}
              className="w-full border border-line rounded-md px-3 py-2 bg-white text-sm"
              placeholder="Aucune description"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wide text-ink/50 block mb-1">
                Priorité
              </label>
              <select
                value={task.priority}
                onChange={(e) => onUpdate({ priority: e.target.value as Priority })}
                className="w-full border border-line rounded-md px-2 py-2 bg-white text-sm"
              >
                {PRIORITY_ORDER.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABEL[p]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-ink/50 block mb-1">
                Statut
              </label>
              <select
                value={task.status}
                onChange={(e) => onUpdate({ status: e.target.value as Status })}
                className="w-full border border-line rounded-md px-2 py-2 bg-white text-sm"
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-ink/50 block mb-1">
              Responsable(s)
            </label>
            <input
              value={responsible}
              onChange={(e) => setResponsible(e.target.value)}
              onBlur={() => onUpdate({ responsible_name_raw: responsible || null })}
              placeholder="Noms séparés par une virgule"
              className="w-full border border-line rounded-md px-3 py-2 bg-white text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wide text-ink/50 block mb-1">
                Échéance (normalisée)
              </label>
              <input
                type="date"
                value={task.due_date ?? ""}
                onChange={(e) => onUpdate({ due_date: e.target.value || null })}
                className="w-full border border-line rounded-md px-2 py-2 bg-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-ink/50 block mb-1">
                Échéance (texte du CR)
              </label>
              <input
                value={task.due_date_raw ?? ""}
                disabled
                className="w-full border border-line rounded-md px-2 py-2 bg-line/20 text-sm text-ink/50"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-line space-y-4">
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-ink/50">
              <Link2 size={12} />
              Dépendances
            </div>

            {dependsOn.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-ink/40">Cette tâche dépend de :</p>
                {dependsOn.map((d) => {
                  const dep = allTasks.find((t) => t.id === d.depends_on_task_id);
                  if (!dep) return null;
                  const done = dep.status === "fait";
                  return (
                    <div
                      key={d.id}
                      className="flex items-center justify-between gap-2 text-sm border border-line rounded-md px-2.5 py-1.5 bg-white"
                    >
                      <span className={`truncate flex items-center gap-1.5 ${done ? "text-basse" : "text-critique"}`}>
                        <ChevronRight size={12} className="shrink-0" />
                        {dep.title}
                        <span className="text-[10px] uppercase tracking-wide shrink-0">
                          {done ? "fait" : STATUS_LABEL[dep.status]}
                        </span>
                      </span>
                      <button
                        onClick={() => onRemoveDependency(d.id)}
                        className="text-ink/30 hover:text-critique shrink-0"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {dependents.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-ink/40">Bloque en retour :</p>
                {dependents.map((d) => {
                  const dep = allTasks.find((t) => t.id === d.task_id);
                  if (!dep) return null;
                  return (
                    <div key={d.id} className="text-sm text-ink/60 px-2.5 py-1">
                      {dep.title}
                    </div>
                  );
                })}
              </div>
            )}

            {availableToAdd.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={depPick}
                  onChange={(e) => setDepPick(e.target.value)}
                  className="flex-1 border border-line rounded-md px-2 py-1.5 bg-white text-sm"
                >
                  <option value="">Ajouter une dépendance...</option>
                  {availableToAdd.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (depPick) {
                      onAddDependency(depPick);
                      setDepPick("");
                    }
                  }}
                  disabled={!depPick}
                  className="text-sm bg-accent text-white px-3 py-1.5 rounded-lg disabled:opacity-30"
                >
                  Ajouter
                </button>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-line">
            {!confirmingDelete ? (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="flex items-center gap-1.5 text-sm text-critique hover:underline underline-offset-4"
              >
                <Trash2 size={14} />
                Supprimer cette tâche
              </button>
            ) : (
              <div className="flex items-center gap-3 text-sm">
                <span>Confirmer la suppression ?</span>
                <button
                  onClick={onDelete}
                  className="bg-critique text-white px-3 py-1.5 rounded-md"
                >
                  Supprimer
                </button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="text-ink/50 hover:text-ink"
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
