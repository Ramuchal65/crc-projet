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
} from "@/lib/types";

type SortKey = "priority" | "due_date" | "status" | "title";

export default function ListView({
  tasks,
  onUpdate,
  onSelect,
}: {
  tasks: Task[];
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
    if (sortKey === "priority") {
      cmp = PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
    } else if (sortKey === "status") {
      cmp = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    } else if (sortKey === "due_date") {
      cmp = (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999");
    } else {
      cmp = a.title.localeCompare(b.title);
    }
    return sortAsc ? cmp : -cmp;
  });

  const headerCell = (key: SortKey, label: string) => (
    <button
      onClick={() => toggleSort(key)}
      className="flex items-center gap-1 hover:text-ink"
    >
      {label}
      {sortKey === key && <span className="text-xs">{sortAsc ? "↑" : "↓"}</span>}
    </button>
  );

  return (
    <div className="border border-line rounded-md bg-white overflow-hidden">
      <div className="grid grid-cols-[1fr_140px_120px_120px_130px] gap-2 px-4 py-2 text-xs uppercase tracking-wide text-ink/50 border-b border-line">
        {headerCell("title", "Tâche")}
        <span>Responsable</span>
        {headerCell("priority", "Priorité")}
        {headerCell("status", "Statut")}
        {headerCell("due_date", "Échéance")}
      </div>
      {sorted.length === 0 && (
        <p className="px-4 py-6 text-sm text-ink/40 text-center">
          Aucune tâche ne correspond aux filtres.
        </p>
      )}
      {sorted.map((task) => (
        <div
          key={task.id}
          className="grid grid-cols-[1fr_140px_120px_120px_130px] gap-2 px-4 py-2.5 items-center border-b border-line last:border-0 hover:bg-paper/60 text-sm"
        >
          <button
            onClick={() => onSelect(task.id)}
            className="text-left truncate hover:underline underline-offset-4"
          >
            {task.title}
          </button>
          <span className="truncate text-ink/60 text-xs">
            {task.responsible_name_raw || "—"}
          </span>
          <select
            value={task.priority}
            onChange={(e) => onUpdate(task.id, { priority: e.target.value as Priority })}
            className={`text-xs border border-line rounded px-1.5 py-1 bg-white text-${task.priority}`}
          >
            {PRIORITY_ORDER.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
          <select
            value={task.status}
            onChange={(e) => onUpdate(task.id, { status: e.target.value as Status })}
            className="text-xs border border-line rounded px-1.5 py-1 bg-white"
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <span className="text-xs text-ink/50 truncate">{task.due_date_raw || "—"}</span>
        </div>
      ))}
    </div>
  );
}
