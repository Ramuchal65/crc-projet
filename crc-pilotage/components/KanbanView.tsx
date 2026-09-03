"use client";

import { useState } from "react";
import { Task, Status, STATUS_ORDER, STATUS_LABEL, PRIORITY_LABEL } from "@/lib/types";
import { initials, avatarColor, isOverdue } from "@/lib/avatar";
import { GripVertical, Plus, CalendarDays, Lock } from "lucide-react";

const COLUMN_ACCENT: Record<Status, string> = {
  a_faire: "bg-ink/20",
  en_cours: "bg-moyenne",
  bloque: "bg-critique",
  fait: "bg-basse",
};

export default function KanbanView({
  tasks,
  blockedTaskIds,
  onStatusChange,
  onReorder,
  onSelect,
  onQuickAdd,
}: {
  tasks: Task[];
  blockedTaskIds: Set<string>;
  onStatusChange: (id: string, status: Status) => void;
  onReorder: (status: Status, orderedIds: string[]) => void;
  onSelect: (id: string) => void;
  onQuickAdd: (title: string, status: Status) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<Status | null>(null);
  const [addingIn, setAddingIn] = useState<Status | null>(null);
  const [draft, setDraft] = useState("");

  const columns = STATUS_ORDER.map((status) => ({
    status,
    items: tasks.filter((t) => t.status === status).sort((a, b) => a.order_index - b.order_index),
  }));

  function handleDrop(status: Status, targetId: string | null) {
    if (!dragId) return;
    const dragged = tasks.find((t) => t.id === dragId);
    if (!dragged) return;

    if (dragged.status !== status) onStatusChange(dragId, status);

    const columnItems = tasks
      .filter((t) => t.status === status && t.id !== dragId)
      .sort((a, b) => a.order_index - b.order_index)
      .map((t) => t.id);

    const insertAt = targetId ? columnItems.indexOf(targetId) : columnItems.length;
    columnItems.splice(insertAt < 0 ? columnItems.length : insertAt, 0, dragId);
    onReorder(status, columnItems);

    setDragId(null);
    setOverColumn(null);
  }

  function submitDraft(status: Status) {
    const title = draft.trim();
    if (title) onQuickAdd(title, status);
    setDraft("");
    setAddingIn(null);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {columns.map((col) => (
        <div
          key={col.status}
          onDragOver={(e) => {
            e.preventDefault();
            setOverColumn(col.status);
          }}
          onDragLeave={() => setOverColumn(null)}
          onDrop={(e) => {
            e.preventDefault();
            handleDrop(col.status, null);
          }}
          className={`rounded-lg p-2 space-y-2 min-h-[160px] transition-colors ${
            overColumn === col.status ? "bg-ink/[0.04] ring-1 ring-ink/10" : ""
          }`}
        >
          <div className="flex items-center justify-between px-1.5 pt-1">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${COLUMN_ACCENT[col.status]}`} />
              <h2 className="text-sm font-medium text-ink/70">{STATUS_LABEL[col.status]}</h2>
              <span className="text-xs text-ink/35 bg-ink/5 rounded-full px-1.5 py-0.5">
                {col.items.length}
              </span>
            </div>
            <button
              onClick={() => setAddingIn(addingIn === col.status ? null : col.status)}
              className="text-ink/30 hover:text-ink transition-colors"
              title="Ajouter une tâche"
            >
              <Plus size={15} />
            </button>
          </div>

          {addingIn === col.status && (
            <div className="px-0.5">
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitDraft(col.status);
                  if (e.key === "Escape") {
                    setAddingIn(null);
                    setDraft("");
                  }
                }}
                onBlur={() => submitDraft(col.status)}
                placeholder="Titre, puis Entrée..."
                className="w-full border border-accent/40 rounded-lg px-2.5 py-2 text-sm bg-white shadow-sm"
              />
            </div>
          )}

          <div className="space-y-2">
            {col.items.map((task) => {
              const overdue = isOverdue(task.due_date) && task.status !== "fait";
              const blocked = blockedTaskIds.has(task.id);
              const firstResponsable = task.responsible_name_raw?.split(",")[0]?.trim();
              return (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => setDragId(task.id)}
                  onDragEnd={() => setDragId(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDrop(col.status, task.id);
                  }}
                  onClick={() => onSelect(task.id)}
                  className={`group border rounded-lg p-3 bg-white cursor-pointer transition-all hover:border-accent/40 hover:shadow-sm ${
                    blocked ? "border-critique/25" : "border-line"
                  } ${dragId === task.id ? "opacity-30" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical
                      size={14}
                      className="text-ink/0 group-hover:text-ink/25 -ml-1 mt-0.5 shrink-0 cursor-grab transition-colors"
                    />
                    <p className="text-sm font-medium leading-snug line-clamp-2 flex-1">
                      {task.title}
                    </p>
                    {blocked && (
                      <span title="Bloquée par une dépendance">
                        <Lock size={12} className="text-critique shrink-0 mt-1" />
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 pl-4">
                    <div className="flex items-center gap-1.5">
                      {firstResponsable && (
                        <span
                          style={{ backgroundColor: avatarColor(firstResponsable) }}
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium text-white shrink-0"
                          title={task.responsible_name_raw ?? undefined}
                        >
                          {initials(firstResponsable)}
                        </span>
                      )}
                      {task.due_date_raw && (
                        <span
                          className={`flex items-center gap-1 text-[11px] ${
                            overdue ? "text-critique font-medium" : "text-ink/40"
                          }`}
                        >
                          <CalendarDays size={11} />
                          {task.due_date_raw}
                        </span>
                      )}
                    </div>
                    <span className={`text-[11px] font-medium text-${task.priority} shrink-0`}>
                      {PRIORITY_LABEL[task.priority]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
