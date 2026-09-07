"use client";

import { useMemo, useState } from "react";
import { ActivityLogEntry, Project, Employee } from "@/lib/types";
import { avatarColor, initials } from "@/lib/avatar";
import { PlusCircle, ArrowRightLeft, Flag, UserCog, CalendarClock, MessageSquare } from "lucide-react";

const ACTION_ICON: Record<string, any> = {
  created: PlusCircle,
  status: ArrowRightLeft,
  priority: Flag,
  assignee: UserCog,
  due_date: CalendarClock,
  comment: MessageSquare,
};

const ACTION_COLOR: Record<string, string> = {
  created: "text-basse",
  status: "text-accent",
  priority: "text-moyenne",
  assignee: "text-accent",
  due_date: "text-moyenne",
  comment: "text-ink/50",
};

function formatDay(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Aujourd'hui";
  if (sameDay(d, yesterday)) return "Hier";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default function ActivityFeedView({
  entries,
  projects,
  employees,
}: {
  entries: ActivityLogEntry[];
  projects: Project[];
  employees: Employee[];
}) {
  const [projectFilter, setProjectFilter] = useState<string | "all">("all");

  const projectById = new Map(projects.map((p) => [p.id, p]));
  const employeeById = new Map(employees.map((e) => [e.id, e]));

  const filtered = useMemo(
    () => (projectFilter === "all" ? entries : entries.filter((e) => e.project_id === projectFilter)),
    [entries, projectFilter]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityLogEntry[]>();
    filtered.forEach((e) => {
      const day = formatDay(e.created_at);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(e);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-medium">Historique</h1>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="border border-line rounded-lg px-2 py-1.5 bg-white text-sm"
        >
          <option value="all">Tous les projets</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {grouped.length === 0 ? (
        <p className="text-sm text-ink/40 text-center py-12">Aucune activité pour l'instant.</p>
      ) : (
        grouped.map(([day, dayEntries]) => (
          <div key={day} className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-ink/40 sticky top-0 bg-paper py-1">
              {day}
            </p>
            <div className="border border-line rounded-lg bg-white divide-y divide-line">
              {dayEntries.map((entry) => {
                const Icon = ACTION_ICON[entry.action] ?? PlusCircle;
                const actor = entry.employee_id ? employeeById.get(entry.employee_id) : null;
                const project = projectById.get(entry.project_id);
                const time = new Date(entry.created_at).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <div key={entry.id} className="flex items-start gap-3 px-4 py-2.5">
                    <Icon size={14} className={`shrink-0 mt-0.5 ${ACTION_COLOR[entry.action]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ink/80 leading-snug">
                        {actor ? (
                          <span className="font-medium">{actor.full_name} </span>
                        ) : (
                          "Quelqu'un "
                        )}
                        {entry.message}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {project && (
                          <span className="flex items-center gap-1 text-[11px] text-ink/40">
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: project.color }}
                            />
                            {project.name}
                          </span>
                        )}
                        <span className="text-[11px] text-ink/35">{time}</span>
                      </div>
                    </div>
                    {actor && (
                      <span
                        style={{ backgroundColor: avatarColor(actor.full_name) }}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium text-white shrink-0"
                      >
                        {initials(actor.full_name)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
