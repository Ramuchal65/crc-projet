"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutGrid, Upload, GanttChartSquare, Users, LogOut, KeyRound, LayoutDashboard, Bell, History, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ChangePasswordModal from "./ChangePasswordModal";

const NAV_ITEMS = [
  { href: "/", label: "Tâches", icon: LayoutGrid },
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/import", label: "Importer un CR", icon: Upload },
  { href: "/gantt", label: "Gantt", icon: GanttChartSquare },
  { href: "/activity", label: "Historique", icon: History },
  { href: "/team", label: "Équipe", icon: Users },
];

export default function Sidebar({
  unreadNotifications,
  onToggleNotifications,
  mobileOpen,
  onCloseMobile,
}: {
  unreadNotifications: number;
  onToggleNotifications: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

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
    <aside
      className={`w-60 shrink-0 bg-sidebar text-paper h-screen flex flex-col fixed md:sticky top-0 left-0 z-40 transition-transform duration-200 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}
    >
      <div className="px-5 py-5 flex items-center justify-between">
        <span className="font-medium">Pilotage</span>
        <button onClick={onCloseMobile} className="md:hidden text-paper/50 hover:text-paper">
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <a
              key={href}
              href={href}
              onClick={onCloseMobile}
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
        <button
          onClick={onToggleNotifications}
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-paper/60 hover:text-paper hover:bg-paper/5 transition-colors w-full"
        >
          <Bell size={16} strokeWidth={2} />
          Notifications
          {unreadNotifications > 0 && (
            <span className="ml-auto bg-critique text-white text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          )}
        </button>
      </nav>

      <div className="px-5 py-4 border-t border-paper/10 space-y-2 shrink-0">
        {name && <p className="text-xs text-paper/60 truncate">{name}</p>}
        <button
          onClick={() => setChangingPassword(true)}
          className="flex items-center gap-1.5 text-xs text-paper/40 hover:text-paper transition-colors"
        >
          <KeyRound size={12} />
          Changer mon mot de passe
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-paper/40 hover:text-paper transition-colors"
        >
          <LogOut size={12} />
          Se déconnecter
        </button>
      </div>
      {changingPassword && <ChangePasswordModal onClose={() => setChangingPassword(false)} />}
    </aside>
  );
}
