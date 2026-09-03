"use client";

import { useState } from "react";
import { Project } from "@/lib/types";
import { Plus, FolderKanban } from "lucide-react";

export default function ProjectSelector({
  projects,
  selectedId,
  onSelect,
  onCreate,
}: {
  projects: Project[];
  selectedId: string | "all";
  onSelect: (id: string | "all") => void;
  onCreate: (name: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");

  function submit() {
    const name = draft.trim();
    if (name) onCreate(name);
    setDraft("");
    setCreating(false);
  }

  if (creating) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") setCreating(false);
          }}
          onBlur={() => (draft.trim() ? submit() : setCreating(false))}
          placeholder="Nom du projet..."
          className="border border-accent/40 rounded-lg px-2 py-1.5 bg-white text-sm w-40"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1.5 border border-line rounded-lg px-2 bg-white">
        <FolderKanban size={13} className="text-ink/30 shrink-0" />
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
