"use client";

import { useState } from "react";
import { Task, Status, STATUS_ORDER, STATUS_LABEL, PRIORITY_LABEL, TaskDependency, Project } from "@/lib/types";
import { initials, avatarColor, isOverdue, dueDateLabel, withAlpha } from "@/lib/avatar";
import { GripVertical, Plus, CalendarDays, Lock, Link2, ArrowDownToLine, ArrowUpFromLine, CalendarOff } from "lucide-react";

const COLUMN_ACCENT: Record<Status, string> = {
  a_faire: "bg-ink/20",
  en_cours: "bg-moyenne",
  bloque: "bg-critique",
  fait: "bg-basse",
};

export default function KanbanView({
  tasks,
  dependencies,
  blockedTaskIds,
  projectById,
  showProjectBadge,
  onStatusChange,
  onReorder,
  onSelect,
  onQuickAdd,
  onRequestLink,
  onToggleSubtask,
}: {
  tasks: Task[];
  dependencies: TaskDependency[];
  blockedTaskIds: Set<string>;
  projectById: Map<string, Project>;
  showProjectBadge: boolean;
  onStatusChange: (id: string, status: Status) => void;
  onReorder: (status: Status, orderedIds: string[]) => void;
  onSelect: (id: string) => void;
  onQuickAdd: (title: string, status: Status) => void;
  onRequestLink: (draggedId: string, targetId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<Status | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; zone: "before" | "after" | "link" } | null>(
    null
  );
  const [addingIn, setAddingIn] = useState<Status | null>(null);
  const [draft, setDraft] = useState("");
  const [hoverId, setHoverId] = useState<string | null>(null);

  // pour une tâche survolée : ce dont elle a besoin (prérequis) vs ce qui l'attend (dépendants)
  const prereqOf = new Set(dependencies.filter((d) => d.task_id === hoverId).map((d) => d.depends_on_task_id));
  const waitingOn = new Set(dependencies.filter((d) => d.depends_on_task_id === hoverId).map((d) => d.task_id));
  const hasLinks = (id: string) =>
    dependencies.some((d) => d.task_id === id || d.depends_on_task_id === id);

  const columns = STATUS_ORDER.map((status) => ({
    status,
    items: tasks.filter((t) => t.status === status).sort((a, b) => a.order_index - b.order_index),
  }));

  function handleReorderDrop(status: Status, targetId: string | null, zone: "before" | "after" | null) {
    if (!dragId) return;
    const dragged = tasks.find((t) => t.id === dragId);
    if (!dragged) return;

    if (dragged.status !== status) onStatusChange(dragId, status);

    const columnItems = tasks
      .filter((t) => t.status === status && t.id !== dragId)
      .sort((a, b) => a.order_index - b.order_index)
      .map((t) => t.id);

    let insertAt = targetId ? columnItems.indexOf(targetId) : columnItems.length;
    if (insertAt < 0) insertAt = columnItems.length;
    if (zone === "after") insertAt += 1;
    columnItems.splice(insertAt, 0, dragId);
    onReorder(status, columnItems);

    setDragId(null);
    setOverColumn(null);
    setDropTarget(null);
  }

  function handleCardDrop(status: Status, targetTask: Task) {
    if (!dragId || dragId === targetTask.id) {
      setDragId(null);
      setDropTarget(null);
      return;
    }
    if (dropTarget?.zone === "link") {
      onRequestLink(dragId, targetTask.id);
      setDragId(null);
      setDropTarget(null);
      return;
    }
    handleReorderDrop(status, targetTask.id, dropTarget?.zone === "after" ? "after" : "before");
  }

  function submitDraft(status: Status) {
    const title = draft.trim();
    if (title) onQuickAdd(title, status);
    setDraft("");
    setAddingIn(null);
  }

  return (
    <div className="space-y-2">
      {dependencies.length > 0 && (
        <div className="flex items-center gap-4 text-[11px] text-ink/40 px-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-basse" />
            Survolez une tâche : prérequis en vert
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-accent" />
            en attente d'elle en bleu
          </span>
        </div>
      )}
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
            handleReorderDrop(col.status, null, null);
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
              const isDropTarget = dropTarget?.id === task.id && dragId !== task.id;
              const linkMode = isDropTarget && dropTarget?.zone === "link";
              const subtasks = task.subtasks ?? [];
              const doneCount = subtasks.filter((s) => s.done).length;
              const progressPct = subtasks.length > 0 ? Math.round((doneCount / subtasks.length) * 100) : 0;

              const isHovered = hoverId === task.id;
              const isPrereqOfHovered = hoverId !== null && prereqOf.has(task.id);
              const isWaitingOnHovered = hoverId !== null && waitingOn.has(task.id);
              const isDimmed =
                hoverId !== null && !isHovered && !isPrereqOfHovered && !isWaitingOnHovered;

              let relationRing = "";
              if (isHovered) relationRing = "ring-2 ring-ink/30";
              else if (isPrereqOfHovered) relationRing = "ring-2 ring-basse";
              else if (isWaitingOnHovered) relationRing = "ring-2 ring-accent";

              return (
                <div key={task.id}>
                  {isDropTarget && dropTarget?.zone === "before" && (
                    <div className="h-0.5 bg-accent rounded-full mx-1 mb-2" />
                  )}
                  <div
                    draggable
                    onDragStart={() => setDragId(task.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setDropTarget(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const ratio = (e.clientY - rect.top) / rect.height;
                      const zone: "before" | "after" | "link" =
                        ratio < 0.3 ? "before" : ratio > 0.7 ? "after" : "link";
                      setDropTarget({ id: task.id, zone });
                      setOverColumn(col.status);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCardDrop(col.status, task);
                    }}
                    onClick={() => onSelect(task.id)}
                    onMouseEnter={() => hasLinks(task.id) && setHoverId(task.id)}
                    onMouseLeave={() => setHoverId(null)}
                    title={
                      showProjectBadge
                        ? `Projet : ${projectById.get(task.project_id)?.name ?? "?"}`
                        : undefined
                    }
                    className={`group relative border rounded-lg p-3 cursor-pointer transition-all overflow-hidden ${
                      linkMode
                        ? "ring-2 ring-accent border-accent shadow-sm scale-[1.015] cursor-copy"
                        : `hover:border-accent/40 hover:shadow-sm ${relationRing}`
                    } ${blocked ? "border-critique/25" : linkMode || relationRing ? "" : "border-line"} ${
                      dragId === task.id ? "opacity-30" : isDimmed ? "opacity-35" : ""
                    }`}
                    style={
                      showProjectBadge
                        ? {
                            backgroundColor: withAlpha(
                              projectById.get(task.project_id)?.color ?? "#3E6FA8",
                              "14"
                            ),
                            borderLeft: `3px solid ${projectById.get(task.project_id)?.color ?? "#3E6FA8"}`,
                          }
                        : { backgroundColor: "white" }
                    }
                  >
                    {linkMode && (
                      <div className="flex items-center gap-1 text-[11px] text-accent font-medium mb-1.5">
                        <Link2 size={11} />
                        Relâcher pour créer une dépendance
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <GripVertical
                        size={14}
                        className="text-ink/0 group-hover:text-ink/25 -ml-1 mt-0.5 shrink-0 cursor-grab transition-colors"
                      />
                      <p className="text-sm font-medium leading-snug line-clamp-2 flex-1">
                        {task.title}
                      </p>
                      {blocked && (
                        <span title="Bloquée par une dépendance non terminée">
                          <Lock size={12} className="text-critique shrink-0 mt-1" />
                        </span>
                      )}
                      {!blocked && (
                        <>
                          {dependencies.some((d) => d.task_id === task.id) && (
                            <span title="Dépend d'autres tâches">
                              <ArrowDownToLine size={12} className="text-ink/25 shrink-0 mt-1" />
                            </span>
                          )}
                          {dependencies.some((d) => d.depends_on_task_id === task.id) && (
                            <span title="D'autres tâches en dépendent">
                              <ArrowUpFromLine size={12} className="text-ink/25 shrink-0 mt-1" />
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {subtasks.length > 0 && (
                      <div className="mt-2 pl-4 space-y-1">
                        {subtasks.slice(0, 4).map((s) => (
                          <label
                            key={s.id}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 text-xs cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={s.done}
                              onChange={() => onToggleSubtask(task.id, s.id)}
                              className="accent-accent shrink-0"
                            />
                            <span className={s.done ? "line-through text-ink/35" : "text-ink/60"}>
                              {s.title}
                            </span>
                          </label>
                        ))}
                        {subtasks.length > 4 && (
                          <p className="text-[11px] text-ink/35 pl-5">
                            +{subtasks.length - 4} de plus
                          </p>
                        )}
                      </div>
                    )}

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
                        {(() => {
                          const due = dueDateLabel(task);
                          if (due.defined) {
                            return (
                              <span
                                className={`flex items-center gap-1 text-[11px] ${
                                  overdue ? "text-critique font-medium" : "text-ink/40"
                                }`}
                              >
                                <CalendarDays size={11} />
                                {due.label}
                                {!due.inGantt && (
                                  <span title="Date non confirmée : absente du Gantt tant qu'une échéance précise n'est pas définie">
                                    <CalendarOff size={11} className="text-moyenne" />
                                  </span>
                                )}
                              </span>
                            );
                          }
                          return (
                            <span
                              className="flex items-center gap-1 text-[11px] text-moyenne bg-moyenne/10 rounded px-1.5 py-0.5"
                              title="Sans échéance : n'apparaîtra pas dans le Gantt"
                            >
                              <CalendarOff size={11} />
                              Pas d'échéance
                            </span>
                          );
                        })()}
                      </div>
                      <span className={`text-[11px] font-medium text-${task.priority} shrink-0`}>
                        {PRIORITY_LABEL[task.priority]}
                      </span>
                    </div>

                    {subtasks.length > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-line/50">
                        <div
                          className={`h-full transition-all ${
                            progressPct === 100 ? "bg-basse" : "bg-accent/70"
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    )}
                  </div>
                  {isDropTarget && dropTarget?.zone === "after" && (
                    <div className="h-0.5 bg-accent rounded-full mx-1 mt-2" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}
