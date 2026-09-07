"use client";

import { useMemo, useState } from "react";
import { Task, Project, Employee, STATUS_ORDER, STATUS_LABEL } from "@/lib/types";
import { avatarColor, initials, isOverdue, projectColor } from "@/lib/avatar";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

const STATUS_BAR: Record<string, string> = {
  a_faire: "bg-ink/25",
  en_cours: "bg-moyenne",
  bloque: "bg-critique",
  fait: "bg-basse",
};

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="border border-line rounded-lg bg-white p-4">
      <p className="text-2xl font-medium" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
      <p className="text-xs text-ink/50 mt-0.5">{label}</p>
    </div>
  );
}

export default function DashboardView({
  tasks,
  projects,
  employees,
}: {
  tasks: Task[];
  projects: Project[];
  employees: Employee[];
}) {
  const [projectFilter, setProjectFilter] = useState<string | "all">("all");

  const scopedTasks = useMemo(
    () => (projectFilter === "all" ? tasks : tasks.filter((t) => t.project_id === projectFilter)),
    [tasks, projectFilter]
  );

  const statusCounts = useMemo(() => {
    const map = new Map<string, number>(STATUS_ORDER.map((s) => [s, 0]));
    scopedTasks.forEach((t) => map.set(t.status, (map.get(t.status) ?? 0) + 1));
    return map;
  }, [scopedTasks]);

  const overdueTasks = useMemo(
    () =>
      scopedTasks
        .filter((t) => isOverdue(t.due_date) && t.status !== "fait")
        .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? "")),
    [scopedTasks]
  );

  const projectById = new Map(projects.map((p) => [p.id, p]));
  const employeeById = new Map(employees.map((e) => [e.id, e]));

  const projectProgress = useMemo(() => {
    return projects
      .map((p) => {
        const pTasks = tasks.filter((t) => t.project_id === p.id);
        const done = pTasks.filter((t) => t.status === "fait").length;
        return { project: p, total: pTasks.length, done };
      })
      .filter((p) => p.total > 0);
  }, [tasks, projects]);

  const workload = useMemo(() => {
    const map = new Map<string, { total: number; byStatus: Map<string, number>; overdue: number }>();
    scopedTasks.forEach((t) => {
      if (!t.assignee_employee_id) return;
      if (!map.has(t.assignee_employee_id)) {
        map.set(t.assignee_employee_id, {
          total: 0,
          byStatus: new Map(STATUS_ORDER.map((s) => [s, 0])),
          overdue: 0,
        });
      }
      const entry = map.get(t.assignee_employee_id)!;
      entry.total += 1;
      entry.byStatus.set(t.status, (entry.byStatus.get(t.status) ?? 0) + 1);
      if (isOverdue(t.due_date) && t.status !== "fait") entry.overdue += 1;
    });
    return Array.from(map.entries())
      .map(([employeeId, data]) => ({ employee: employeeById.get(employeeId), ...data }))
      .filter((w) => w.employee)
      .sort((a, b) => b.total - a.total);
  }, [scopedTasks, employeeById]);

  const totalCount = scopedTasks.length;
  const doneCount = statusCounts.get("fait") ?? 0;
  const donePct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-medium">Tableau de bord</h1>
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

      {/* Cartes de synthèse */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Tâches visibles" value={totalCount} />
        <StatCard label="Terminées" value={`${donePct}%`} accent="#5B7A63" />
        <StatCard label="En retard" value={overdueTasks.length} accent={overdueTasks.length > 0 ? "#B02E2E" : undefined} />
        <StatCard label="Bloquées" value={statusCounts.get("bloque") ?? 0} accent="#B02E2E" />
      </div>

      {/* Répartition par statut */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-ink/70">Répartition par statut</h2>
        <div className="border border-line rounded-lg bg-white p-4">
          <div className="flex h-3 rounded-full overflow-hidden bg-line/40">
            {STATUS_ORDER.map((s) => {
              const count = statusCounts.get(s) ?? 0;
              const pct = totalCount > 0 ? (count / totalCount) * 100 : 0;
              return pct > 0 ? (
                <div key={s} className={STATUS_BAR[s]} style={{ width: `${pct}%` }} title={`${STATUS_LABEL[s as keyof typeof STATUS_LABEL]} : ${count}`} />
              ) : null;
            })}
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-ink/60">
            {STATUS_ORDER.map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${STATUS_BAR[s]}`} />
                {STATUS_LABEL[s as keyof typeof STATUS_LABEL]} ({statusCounts.get(s) ?? 0})
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Avancement par projet */}
      {projectFilter === "all" && projectProgress.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-ink/70">Avancement par projet</h2>
          <div className="border border-line rounded-lg bg-white divide-y divide-line">
            {projectProgress.map(({ project, total, done }) => {
              const pct = Math.round((done / total) * 100);
              return (
                <div key={project.id} className="px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
                      {project.name}
                    </span>
                    <span className="text-ink/50 text-xs">
                      {done}/{total} · {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-line/40 overflow-hidden">
                    <div
                      className={pct === 100 ? "h-full bg-basse" : "h-full bg-accent"}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Charge par personne */}
      {workload.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-ink/70">Charge par personne (tâches assignées)</h2>
          <div className="border border-line rounded-lg bg-white divide-y divide-line">
            {workload.map(({ employee, total, byStatus, overdue }) => (
              <div key={employee!.id} className="px-4 py-3 flex items-center gap-3">
                <span
                  style={{ backgroundColor: avatarColor(employee!.full_name) }}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium text-white shrink-0"
                >
                  {initials(employee!.full_name)}
                </span>
                <span className="text-sm w-32 truncate shrink-0">{employee!.full_name}</span>
                <div className="flex-1 flex h-2.5 rounded-full overflow-hidden bg-line/40 min-w-[80px]">
                  {STATUS_ORDER.map((s) => {
                    const c = byStatus.get(s) ?? 0;
                    const pct = total > 0 ? (c / total) * 100 : 0;
                    return pct > 0 ? (
                      <div key={s} className={STATUS_BAR[s]} style={{ width: `${pct}%` }} />
                    ) : null;
                  })}
                </div>
                <span className="text-xs text-ink/50 w-10 text-right shrink-0">{total}</span>
                {overdue > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-critique shrink-0">
                    <AlertTriangle size={11} />
                    {overdue}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tâches en retard */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-ink/70 flex items-center gap-1.5">
          <AlertTriangle size={13} className="text-critique" />
          Tâches en retard ({overdueTasks.length})
        </h2>
        {overdueTasks.length === 0 ? (
          <div className="border border-line rounded-lg bg-white p-4 text-sm text-ink/40 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-basse" />
            Aucune tâche en retard.
          </div>
        ) : (
          <div className="border border-line rounded-lg bg-white divide-y divide-line">
            {overdueTasks.slice(0, 15).map((t) => {
              const project = projectById.get(t.project_id);
              const assignee = t.assignee_employee_id ? employeeById.get(t.assignee_employee_id) : null;
              return (
                <div key={t.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project?.color ?? "#999" }} />
                  <span className="flex-1 truncate">{t.title}</span>
                  <span className="text-xs text-ink/40 shrink-0">{project?.name}</span>
                  {assignee && (
                    <span className="text-xs text-ink/50 shrink-0">{assignee.full_name}</span>
                  )}
                  <span className="text-xs text-critique font-medium shrink-0">{t.due_date}</span>
                </div>
              );
            })}
            {overdueTasks.length > 15 && (
              <p className="px-4 py-2 text-xs text-ink/35">+{overdueTasks.length - 15} de plus...</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
