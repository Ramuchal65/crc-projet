"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutGrid, Upload, GanttChartSquare, Users, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/", label: "Tâches", icon: LayoutGrid },
  { href: "/import", label: "Importer un CR", icon: Upload },
  { href: "/gantt", label: "Gantt", icon: GanttChartSquare },
  { href: "/team", label: "Équipe", icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("employees")
        .select("full_name")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      setName(data?.full_name ?? user.email ?? null);
    });
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-60 shrink-0 bg-sidebar text-paper h-screen sticky top-0 flex flex-col">
      <div className="px-5 py-5 flex items-baseline gap-2">
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
                  ? "bg-accent text-white"
                  : "text-paper/60 hover:text-paper hover:bg-paper/5"
              }`}
            >
              <Icon size={16} strokeWidth={2} />
              {label}
            </a>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-paper/10 space-y-2">
        {name && <p className="text-xs text-paper/60 truncate">{name}</p>}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-paper/40 hover:text-paper transition-colors"
        >
          <LogOut size={12} />
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
