"use client";

import { useMemo, useState } from "react";
import { Task, TaskDependency, Project, Team, PRIORITY_LABEL } from "@/lib/types";
import { projectColor, withAlpha } from "@/lib/avatar";
import ProjectSelector from "./ProjectSelector";
import { createClient } from "@/lib/supabase/client";

const DAY_WIDTH = 28;
const ROW_HEIGHT = 40;
const LABEL_WIDTH = 240;

function parseISO(s: string): Date {
  return new Date(s + "T00:00:00Z");
}
function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}
function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function endOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
}

const PRIORITY_BAR: Record<string, string> = {
  haute: "bg-haute",
  moyenne: "bg-moyenne",
  basse: "bg-basse",
};

export default function GanttView({
  tasks,
  dependencies,
  initialProjects,
  myTeams,
}: {
  tasks: Task[];
  dependencies: TaskDependency[];
  initialProjects: Project[];
  myTeams: Team[];
}) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string | "all">("all");
  const supabase = createClient();

  async function createProject(name: string, color: string, teamId: string) {
    const { data, error } = await supabase
      .from("projects")
      .insert({ name, color, team_id: teamId })
      .select()
      .single();
    if (error) {
      console.error("Échec création projet :", error.message);
      return;
    }
    setProjects((prev) => [...prev, data as Project]);
    setSelectedProjectId((data as Project).id);
  }

  async function updateProject(id: string, patch: { name?: string; color?: string }) {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    const { error } = await supabase.from("projects").update(patch).eq("id", id);
    if (error) console.error("Échec mise à jour projet :", error.message);
  }

  async function deleteProject(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) console.error("Échec suppression projet :", error.message);
  }

  const taskCountsByProject = useMemo(() => {
    const map = new Map<string, number>();
    tasks.forEach((t) => map.set(t.project_id, (map.get(t.project_id) ?? 0) + 1));
    return map;
  }, [tasks]);

  const showProjectBadge = selectedProjectId === "all" && projects.length > 1;
  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const scopedTasks = useMemo(
    () => (selectedProjectId === "all" ? tasks : tasks.filter((t) => t.project_id === selectedProjectId)),
    [tasks, selectedProjectId]
  );

  const dated = useMemo(() => scopedTasks.filter((t) => !!t.due_date), [scopedTasks]);
  const undated = scopedTasks.length - dated.length;

  const { rangeStart, rangeEnd, totalDays } = useMemo(() => {
    if (dated.length === 0) {
      const today = new Date();
      return { rangeStart: today, rangeEnd: addDays(today, 30), totalDays: 30 };
    }
    let min = parseISO(dated[0].start_date ?? dated[0].due_date!);
    let max = parseISO(dated[0].due_date!);
    dated.forEach((t) => {
      const s = parseISO(t.start_date ?? t.due_date!);
      const e = parseISO(t.due_date!);
      if (s < min) min = s;
      if (e > max) max = e;
    });
    const start = addDays(min, -3);
    const end = addDays(max, 5);
    return { rangeStart: start, rangeEnd: end, totalDays: diffDays(end, start) + 1 };
  }, [dated]);

  const timelineWidth = totalDays * DAY_WIDTH;

  function dateToX(d: Date) {
    return diffDays(d, rangeStart) * DAY_WIDTH;
  }

  const months = useMemo(() => {
    const result: { label: string; x: number; width: number }[] = [];
    let cursor = startOfMonth(rangeStart);
    while (cursor <= rangeEnd) {
      const segStart = cursor < rangeStart ? rangeStart : cursor;
      const monthEnd = endOfMonth(cursor);
      const segEnd = monthEnd > rangeEnd ? rangeEnd : monthEnd;
      const width = (diffDays(segEnd, segStart) + 1) * DAY_WIDTH;
      const label = cursor
        .toLocaleDateString("fr-FR", { month: "short", year: "numeric", timeZone: "UTC" })
        .replace(/^\w/, (c) => c.toUpperCase());
      result.push({ label, x: dateToX(segStart), width });
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    }
    return result;
  }, [rangeStart, rangeEnd]);

  const days = useMemo(() => {
    const result: { label: string; x: number; weekend: boolean }[] = [];
    for (let i = 0; i < totalDays; i++) {
      const d = addDays(rangeStart, i);
      const dow = d.getUTCDay(); // 0 = dimanche, 6 = samedi
      result.push({
        label: String(d.getUTCDate()),
        x: i * DAY_WIDTH,
        weekend: dow === 0 || dow === 6,
      });
    }
    return result;
  }, [rangeStart, totalDays]);

  const todayX = useMemo(() => {
    const t = new Date();
    const today = new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()));
    if (today < rangeStart || today > rangeEnd) return null;
    return dateToX(today);
  }, [rangeStart, rangeEnd]);

  const bars = useMemo(() => {
    return dated.map((t, i) => {
      const due = parseISO(t.due_date!);
      const isMilestone = !t.start_date;
      const start = parseISO(t.start_date ?? t.due_date!);
      const x1 = dateToX(start);
      const x2 = dateToX(due) + DAY_WIDTH;
      return {
        task: t,
        rowIndex: i,
        y: i * ROW_HEIGHT + ROW_HEIGHT / 2,
        x1,
        x2,
        isMilestone,
      };
    });
  }, [dated, rangeStart]);

  const barByTaskId = new Map(bars.map((b) => [b.task.id, b]));

  const links = useMemo(() => {
    return dependencies
      .map((d) => {
        const from = barByTaskId.get(d.depends_on_task_id);
        const to = barByTaskId.get(d.task_id);
        if (!from || !to) return null;
        return { id: d.id, from, to };
      })
      .filter(Boolean) as { id: string; from: (typeof bars)[number]; to: (typeof bars)[number] }[];
  }, [dependencies, bars]);

  if (dated.length === 0) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-medium">Gantt</h1>
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
        </div>
        <div className="text-center py-16 text-ink/50 space-y-2">
          <p>Aucune tâche avec échéance à afficher.</p>
          <p className="text-xs">Renseigne une échéance sur tes tâches pour les voir apparaître ici.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium">Gantt</h1>
          <p className="text-sm text-ink/50">
            {dated.length} tâche(s) planifiée(s)
            {undated > 0 && ` · ${undated} sans échéance (non affichée${undated > 1 ? "s" : ""})`}
          </p>
        </div>
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
      </div>

      <div className="flex items-center gap-4 text-[11px] text-ink/40 px-1 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-haute" /> Priorité haute
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rotate-45 bg-ink/40" /> Jalon (pas de date de début)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 border-t border-dashed border-ink/30" /> Dépendance
        </span>
        {showProjectBadge &&
          projects.map((p) => (
            <span key={p.id} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: p.color }}
              />
              {p.name}
            </span>
          ))}
      </div>

      <div className="border border-line rounded-lg bg-white overflow-hidden">
        <div className="flex overflow-x-auto">
          {/* Colonne des libellés, collée à gauche */}
          <div className="shrink-0 sticky left-0 z-20 bg-white border-r border-line" style={{ width: LABEL_WIDTH }}>
            <div className="h-[52px] border-b border-line" />
            {bars.map(({ task, rowIndex }) => (
              <div
                key={task.id}
                onMouseEnter={() => setHoverId(task.id)}
                onMouseLeave={() => setHoverId(null)}
                style={{
                  height: ROW_HEIGHT,
                  backgroundColor:
                    hoverId === task.id
                      ? undefined
                      : showProjectBadge
                      ? withAlpha(projectById.get(task.project_id)?.color ?? "#3E6FA8", "1A")
                      : undefined,
                }}
                className={`flex items-center gap-1.5 px-3 text-xs truncate border-b border-line/60 transition-colors ${
                  hoverId === task.id ? "bg-accentSoft" : ""
                }`}
                title={task.title}
              >
                {showProjectBadge && (
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: projectById.get(task.project_id)?.color ?? "#3E6FA8" }}
                    title={projectById.get(task.project_id)?.name}
                  />
                )}
                <span className="truncate">{task.title}</span>
              </div>
            ))}
          </div>

          {/* Zone chronologique */}
          <div className="relative" style={{ width: timelineWidth }}>
            {/* en-tête des mois */}
            <div className="h-[52px] border-b border-line relative">
              <div className="h-6 relative border-b border-line/60">
                {months.map((m, i) => (
                  <div
                    key={i}
                    className="absolute top-0 h-full flex items-center px-2 text-[11px] text-ink/50 border-l border-line/60"
                    style={{ left: m.x, width: m.width }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>
              <div className="h-[26px] relative">
                {days.map((d, i) => (
                  <div
                    key={i}
                    className={`absolute top-0 h-full flex items-center justify-center text-[10px] border-l border-line/30 ${
                      d.weekend ? "text-ink/25 bg-line/20" : "text-ink/45"
                    }`}
                    style={{ left: d.x, width: DAY_WIDTH }}
                  >
                    {d.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative" style={{ height: bars.length * ROW_HEIGHT, width: timelineWidth }}>
              {/* repères verticaux par jour (week-ends estompés) */}
              {days.map((d, i) => (
                <div
                  key={i}
                  className={`absolute top-0 bottom-0 border-l ${
                    d.weekend ? "border-line/40 bg-line/10" : "border-line/20"
                  }`}
                  style={{ left: d.x, width: DAY_WIDTH }}
                />
              ))}

              {/* lignes de fond par ligne */}
              {bars.map(({ task, rowIndex }) => (
                <div
                  key={rowIndex}
                  className="absolute left-0 border-b border-line/60"
                  style={{
                    top: rowIndex * ROW_HEIGHT,
                    height: ROW_HEIGHT,
                    width: timelineWidth,
                    backgroundColor: showProjectBadge
                      ? withAlpha(projectById.get(task.project_id)?.color ?? "#3E6FA8", "1A")
                      : undefined,
                  }}
                />
              ))}

              {/* marqueur aujourd'hui */}
              {todayX !== null && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-accent/60"
                  style={{ left: todayX }}
                  title="Aujourd'hui"
                />
              )}

              {/* connecteurs de dépendances */}
              <svg
                className="absolute top-0 left-0 pointer-events-none"
                width={timelineWidth}
                height={bars.length * ROW_HEIGHT}
              >
                {links.map(({ id, from, to }) => {
                  const fx = from.x2;
                  const fy = from.y;
                  const tx = to.x1;
                  const ty = to.y;
                  const midX = fx + Math.max(16, (tx - fx) / 2);
                  const highlighted = hoverId === from.task.id || hoverId === to.task.id;
                  return (
                    <path
                      key={id}
                      d={`M ${fx} ${fy} C ${midX} ${fy}, ${midX} ${ty}, ${tx} ${ty}`}
                      fill="none"
                      stroke={highlighted ? "#3E6FA8" : "#B0B4BC"}
                      strokeWidth={highlighted ? 1.75 : 1.25}
                      strokeDasharray={highlighted ? undefined : "3 3"}
                      markerEnd="url(#arrow)"
                    />
                  );
                })}
                <defs>
                  <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="#B0B4BC" />
                  </marker>
                </defs>
              </svg>

              {/* barres de tâches */}
              {bars.map(({ task, rowIndex, x1, x2, isMilestone }) => {
                const dimmed = hoverId !== null && hoverId !== task.id;
                if (isMilestone) {
                  const cx = x2 - DAY_WIDTH / 2;
                  const cy = rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
                  return (
                    <div
                      key={task.id}
                      onMouseEnter={() => setHoverId(task.id)}
                      onMouseLeave={() => setHoverId(null)}
                      className={`absolute w-3 h-3 rotate-45 ${PRIORITY_BAR[task.priority]} transition-opacity ${
                        dimmed ? "opacity-30" : ""
                      }`}
                      style={{ left: cx - 6, top: cy - 6 }}
                      title={`${task.title} · ${PRIORITY_LABEL[task.priority]}${
                        showProjectBadge ? ` · ${projectById.get(task.project_id)?.name ?? ""}` : ""
                      }`}
                    />
                  );
                }
                return (
                  <div
                    key={task.id}
                    onMouseEnter={() => setHoverId(task.id)}
                    onMouseLeave={() => setHoverId(null)}
                    className={`absolute rounded-md ${PRIORITY_BAR[task.priority]} transition-opacity ${
                      task.status === "fait" ? "opacity-40" : ""
                    } ${dimmed ? "opacity-30" : ""}`}
                    style={{
                      left: x1,
                      top: rowIndex * ROW_HEIGHT + 8,
                      width: Math.max(x2 - x1, 10),
                      height: ROW_HEIGHT - 16,
                    }}
                    title={`${task.title} · ${PRIORITY_LABEL[task.priority]}${
                      showProjectBadge ? ` · ${projectById.get(task.project_id)?.name ?? ""}` : ""
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
