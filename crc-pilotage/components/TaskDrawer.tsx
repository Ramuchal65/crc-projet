"use client";

import { useState, useEffect } from "react";
import { Task, Priority, Status, STATUS_ORDER, STATUS_LABEL, PRIORITY_ORDER, PRIORITY_LABEL } from "@/lib/types";

export default function TaskDrawer({
  task,
  onClose,
  onUpdate,
  onDelete,
}: {
  task: Task;
  onClose: () => void;
  onUpdate: (patch: Partial<Task>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [responsible, setResponsible] = useState(task.responsible_name_raw ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // resynchronise les champs texte quand on change de tâche sélectionnée
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setResponsible(task.responsible_name_raw ?? "");
    setConfirmingDelete(false);
  }, [task.id]);

  return (
    <>
      <div
        className="fixed inset-0 bg-ink/20 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-paper border-l border-line z-50 overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          {task.ref_source && (
            <span className="font-mono text-xs text-ink/40">{task.ref_source}</span>
          )}
          <button onClick={onClose} className="text-ink/50 hover:text-ink text-sm ml-auto">
            Fermer
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

          <div className="pt-4 border-t border-line">
            {!confirmingDelete ? (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="text-sm text-critique hover:underline underline-offset-4"
              >
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
    </>
  );
}
