"use client";

import { useState } from "react";
import { Task, Status, STATUS_ORDER, STATUS_LABEL, PRIORITY_LABEL } from "@/lib/types";

export default function KanbanView({
  tasks,
  onStatusChange,
  onReorder,
  onSelect,
}: {
  tasks: Task[];
  onStatusChange: (id: string, status: Status) => void;
  onReorder: (status: Status, orderedIds: string[]) => void;
  onSelect: (id: string) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<Status | null>(null);

  const columns = STATUS_ORDER.map((status) => ({
    status,
    items: tasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.order_index - b.order_index),
  }));

  function handleDrop(status: Status, targetId: string | null) {
    if (!dragId) return;
    const dragged = tasks.find((t) => t.id === dragId);
    if (!dragged) return;

    if (dragged.status !== status) {
      onStatusChange(dragId, status);
    }

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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {columns.map((col) => (
        <div
          key={col.status}
          onDragOver={(e) => {
            e.preventDefault();
            setOverColumn(col.status);
          }}
          onDrop={(e) => {
            e.preventDefault();
            handleDrop(col.status, null);
          }}
          className={`rounded-md p-2 space-y-2 min-h-[120px] transition-colors ${
            overColumn === col.status ? "bg-line/30" : ""
          }`}
        >
          <h2 className="text-sm font-medium uppercase tracking-wide text-ink/50 px-1">
            {STATUS_LABEL[col.status]} ({col.items.length})
          </h2>
          <div className="space-y-2">
            {col.items.map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={() => setDragId(task.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDrop(col.status, task.id);
                }}
                onClick={() => onSelect(task.id)}
                className={`border border-line rounded-md p-3 bg-white cursor-pointer hover:border-ink/30 transition-colors ${
                  dragId === task.id ? "opacity-40" : ""
                }`}
              >
                <p className="text-sm font-medium leading-snug">{task.title}</p>
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-ink/50">
                    {task.responsible_name_raw || "—"}
                  </span>
                  <span className={`text-${task.priority} font-medium`}>
                    {PRIORITY_LABEL[task.priority]}
                  </span>
                </div>
                {task.due_date_raw && (
                  <p className="text-xs text-ink/40 mt-1">{task.due_date_raw}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
