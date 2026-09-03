"use client";

import { useState } from "react";

export default function QuickAdd({ onCreate }: { onCreate: (title: string) => void }) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);

  function submit() {
    const title = value.trim();
    if (!title) return;
    onCreate(title);
    setValue("");
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-ink/50 hover:text-ink border border-dashed border-line rounded-md px-3 py-2 w-full text-left"
      >
        + Nouvelle tâche
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        type="text"
        placeholder="Titre de la tâche, puis Entrée..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") {
            setOpen(false);
            setValue("");
          }
        }}
        onBlur={() => {
          if (!value.trim()) setOpen(false);
        }}
        className="flex-1 border border-line rounded-md px-3 py-2 text-sm bg-white"
      />
      <button
        onClick={submit}
        className="bg-ink text-paper px-3 py-2 rounded-md text-sm"
      >
        Ajouter
      </button>
    </div>
  );
}
