"use client";

import { usePathname } from "next/navigation";
import { LayoutGrid, Upload, GitBranch, GanttChartSquare, Users } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Tâches", icon: LayoutGrid },
  { href: "/import", label: "Importer un CR", icon: Upload },
];

const SOON_ITEMS = [
  { label: "Dépendances", icon: GitBranch },
  { label: "Gantt", icon: GanttChartSquare },
  { label: "Équipe", icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 bg-ink text-paper h-screen sticky top-0 flex flex-col">
      <div className="px-5 py-5 flex items-baseline gap-2">
        <span className="font-mono text-xs tracking-widest text-paper/50">CRC</span>
        <span className="font-medium">Pilotage</span>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <a
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? "bg-paper/10 text-paper"
                  : "text-paper/60 hover:text-paper hover:bg-paper/5"
              }`}
            >
              <Icon size={16} strokeWidth={2} />
              {label}
            </a>
          );
        })}

        <div className="pt-4 mt-4 border-t border-paper/10">
          <p className="px-3 pb-1.5 text-[11px] uppercase tracking-wide text-paper/30">
            À venir
          </p>
          {SOON_ITEMS.map(({ label, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-paper/30 cursor-not-allowed"
            >
              <Icon size={16} strokeWidth={2} />
              {label}
            </div>
          ))}
        </div>
      </nav>

      <div className="px-5 py-4 text-xs text-paper/30 border-t border-paper/10">
        13 salariés · CRC
      </div>
    </aside>
  );
}
