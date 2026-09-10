"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

export default function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 border rounded-lg px-2 py-1.5 bg-white text-sm ${
          selected.length > 0 ? "border-accent/50 text-accent" : "border-line text-ink"
        }`}
      >
        {label}
        {selected.length > 0 && (
          <span className="bg-accent text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
            {selected.length}
          </span>
        )}
        <ChevronDown size={13} className="text-ink/40" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-line rounded-lg shadow-lg z-30 py-1">
          {selected.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="w-full text-left px-3 py-1.5 text-xs text-ink/40 hover:text-critique border-b border-line"
            >
              Effacer la sélection
            </button>
          )}
          {options.map((opt) => {
            const active = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => toggle(opt.value)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-paper/60 text-left"
              >
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    active ? "bg-accent border-accent" : "border-line"
                  }`}
                >
                  {active && <Check size={11} className="text-white" />}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
