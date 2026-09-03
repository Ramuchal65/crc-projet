"use client";

import { useState } from "react";
import {
  Task,
  Priority,
  Status,
  STATUS_LABEL,
  STATUS_ORDER,
  PRIORITY_LABEL,
  PRIORITY_ORDER,
  Project,
} from "@/lib/types";
import { initials, avatarColor, isOverdue, dueDateLabel, projectColor } from "@/lib/avatar";
import { ArrowUp, ArrowDown, Lock } from "lucide-react";

type SortKey = "priority" | "due_date" | "status" | "title";

export default function ListView({
  tasks,
  blockedTaskIds,
  projectById,
  showProjectBadge,
  onUpdate,
  onSelect,
}: {
  tasks: Task[];
  blockedTaskIds: Set<string>;
  projectById: Map<string, Project>;
  showProjectBadge: boolean;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onSelect: (id: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [sortAsc, setSortAsc] = useState(true);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  const sorted = [...tasks].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "priority") cmp = PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
    else if (sortKey === "status") cmp = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    else if (sortKey === "due_date") cmp = (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999");
    else cmp = a.title.localeCompare(b.title);
    return sortAsc ? cmp : -cmp;
  });

  const headerCell = (key: SortKey, label: string) => (
    <button onClick={() => toggleSort(key)} className="flex items-center gap-1 hover:text-ink transition-colors">
      {label}
      {sortKey === key && (sortAsc ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
    </button>
  );

  return (
    <div className="border border-line rounded-lg bg-white overflow-hidden">
      <div className="grid grid-cols-[1fr_170px_110px_120px_110px] gap-2 px-4 py-2.5 text-[11px] uppercase tracking-wide text-ink/40 border-b border-line bg-paper/50 sticky top-0">
        {headerCell("title", "Tâche")}
        <span>Responsable</span>
        {headerCell("priority", "Priorité")}
        {headerCell("status", "Statut")}
        {headerCell("due_date", "Échéance")}
      </div>
      {sorted.length === 0 && (
        <p className="px-4 py-10 text-sm text-ink/40 text-center">
          Aucune tâche ne correspond aux filtres.
        </p>
      )}
      {sorted.map((task) => {
        const overdue = isOverdue(task.due_date) && task.status !== "fait";
        const firstResponsable = task.responsible_name_raw?.split(",")[0]?.trim();
        return (
          <div
            key={task.id}
            className="grid grid-cols-[1fr_170px_110px_120px_110px] gap-2 px-4 py-2.5 items-center border-b border-line last:border-0 hover:bg-paper/60 text-sm transition-colors"
          >
            <button
              onClick={() => onSelect(task.id)}
              className="text-left truncate hover:underline underline-offset-4 flex items-center gap-1.5"
            >
              {blockedTaskIds.has(task.id) && (
                <Lock size={11} className="text-critique shrink-0" />
              )}
              {showProjectBadge && (
                <span
                  className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded text-white"
                  style={{ backgroundColor: projectColor(task.project_id) }}
                >
                  {projectById.get(task.project_id)?.name ?? "?"}
                </span>
              )}
              <span className="truncate">{task.title}</span>
            </button>
            <div className="flex items-center gap-1.5 min-w-0">
              {firstResponsable && (
                <span
                  style={{ backgroundColor: avatarColor(firstResponsable) }}
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium text-white shrink-0"
                >
                  {initials(firstResponsable)}
                </span>
              )}
              <span className="truncate text-ink/60 text-xs">
                {task.responsible_name_raw || "—"}
              </span>
            </div>
            <select
              value={task.priority}
              onChange={(e) => onUpdate(task.id, { priority: e.target.value as Priority })}
              className={`text-xs border border-line rounded px-1.5 py-1 bg-white text-${task.priority} w-fit`}
            >
              {PRIORITY_ORDER.map((p) => (
                <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
              ))}
            </select>
            <select
              value={task.status}
              onChange={(e) => onUpdate(task.id, { status: e.target.value as Status })}
              className="text-xs border border-line rounded px-1.5 py-1 bg-white w-fit"
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
            {(() => {
              const due = dueDateLabel(task);
              if (due.defined) {
                return (
                  <span className={`text-xs truncate ${overdue ? "text-critique font-medium" : "text-ink/50"}`}>
                    {due.label}
                  </span>
                );
              }
              return (
                <span className="text-xs truncate text-moyenne bg-moyenne/10 rounded px-1.5 py-0.5 w-fit">
                  Pas d'échéance
                </span>
              );
            })()}
          </div>
        );
      })}
    </div>
  );
}
