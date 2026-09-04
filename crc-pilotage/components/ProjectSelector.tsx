"use client";

import { useState } from "react";
import { Project, Team } from "@/lib/types";
import { PROJECT_COLOR_PRESETS } from "@/lib/avatar";
import { Plus, FolderKanban, Pencil, Check, Trash2 } from "lucide-react";

function ColorSwatches({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {PROJECT_COLOR_PRESETS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          style={{ backgroundColor: c }}
          className={`w-5 h-5 rounded-full flex items-center justify-center transition-transform ${
            value === c ? "ring-2 ring-offset-1 ring-ink/40 scale-105" : "hover:scale-105"
          }`}
        >
          {value === c && <Check size={11} className="text-white" />}
        </button>
      ))}
    </div>
  );
}

export default function ProjectSelector({
  projects,
  selectedId,
  onSelect,
  onCreate,
  onUpdate,
  onDelete,
  taskCounts,
  myTeams,
}: {
  projects: Project[];
  selectedId: string | "all";
  onSelect: (id: string | "all") => void;
  onCreate: (name: string, color: string, teamId: string) => void;
  onUpdate: (id: string, patch: { name?: string; color?: string }) => void;
  onDelete: (id: string) => void;
  taskCounts: Map<string, number>;
  myTeams: Team[];
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState(PROJECT_COLOR_PRESETS[0]);
  const [draftTeamId, setDraftTeamId] = useState(myTeams[0]?.id ?? "");

  const selectedProject = projects.find((p) => p.id === selectedId);

  function submitCreate() {
    const name = draftName.trim();
    if (!name || !draftTeamId) return;
    onCreate(name, draftColor, draftTeamId);
    setDraftName("");
    setDraftColor(PROJECT_COLOR_PRESETS[0]);
    setCreating(false);
  }

  function startEdit() {
    if (!selectedProject) return;
    setDraftName(selectedProject.name);
    setDraftColor(selectedProject.color);
    setEditing(true);
  }

  function submitEdit() {
    if (!selectedProject) return;
    const name = draftName.trim();
    onUpdate(selectedProject.id, { name: name || selectedProject.name, color: draftColor });
    setEditing(false);
  }

  function handleDelete() {
    if (!selectedProject) return;
    const count = taskCounts.get(selectedProject.id) ?? 0;
    const message =
      count > 0
        ? `Ce projet contient ${count} tâche(s) qui seront aussi supprimée(s) définitivement. Continuer ?`
        : `Supprimer le projet "${selectedProject.name}" ? Il n'a aucune tâche.`;
    if (confirm(message)) {
      onDelete(selectedProject.id);
      setEditing(false);
      onSelect("all");
    }
  }

  if (myTeams.length === 0) {
    return (
      <span className="text-xs text-ink/40 italic px-2">
        Pas encore d'équipe assignée — demande à un admin.
      </span>
    );
  }

  if (creating) {
    return (
      <div className="flex items-center gap-2 border border-accent/40 rounded-lg px-2.5 py-1.5 bg-white flex-wrap">
        <input
          autoFocus
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitCreate()}
          placeholder="Nom du projet..."
          className="text-sm outline-none w-32"
        />
        {myTeams.length > 1 && (
          <select
            value={draftTeamId}
            onChange={(e) => setDraftTeamId(e.target.value)}
            className="text-xs border border-line rounded px-1 py-1 bg-white"
          >
            {myTeams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
        <ColorSwatches value={draftColor} onChange={setDraftColor} />
        <button onClick={submitCreate} className="text-accent hover:text-accent/80">
          <Check size={15} />
        </button>
      </div>
    );
  }

  if (editing && selectedProject) {
    return (
      <div className="flex items-center gap-2 border border-accent/40 rounded-lg px-2.5 py-1.5 bg-white">
        <input
          autoFocus
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitEdit()}
          className="text-sm outline-none w-32"
        />
        <ColorSwatches value={draftColor} onChange={setDraftColor} />
        <button onClick={submitEdit} className="text-accent hover:text-accent/80">
          <Check size={15} />
        </button>
        <button onClick={handleDelete} title="Supprimer ce projet" className="text-ink/30 hover:text-critique">
          <Trash2 size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1.5 border border-line rounded-lg px-2 bg-white">
        {selectedProject ? (
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: selectedProject.color }}
          />
        ) : (
          <FolderKanban size={13} className="text-ink/30 shrink-0" />
        )}
        <select
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          className="py-1.5 bg-white text-sm max-w-[160px] outline-none"
        >
          <option value="all">Tous les projets</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      {selectedProject && (
        <button
          onClick={startEdit}
          title="Modifier le projet"
          className="text-ink/40 hover:text-accent border border-line rounded-lg p-1.5 bg-white transition-colors"
        >
          <Pencil size={13} />
        </button>
      )}
      <button
        onClick={() => setCreating(true)}
        title="Nouveau projet"
        className="text-ink/40 hover:text-accent border border-line rounded-lg p-1.5 bg-white transition-colors"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
