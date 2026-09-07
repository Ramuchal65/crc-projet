"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Notification } from "@/lib/types";
import { Bell, MessageSquare, UserPlus, X } from "lucide-react";

const POLL_MS = 30000;

export default function NotificationBell({ employeeId }: { employeeId: string | null }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!employeeId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifications((data as Notification[]) ?? []);
  }, [employeeId]);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  async function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  }

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
  }

  if (!employeeId) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-paper/60 hover:text-paper hover:bg-paper/5 transition-colors w-full"
      >
        <Bell size={16} strokeWidth={2} />
        Notifications
        {unreadCount > 0 && (
          <span className="ml-auto bg-critique text-white text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <aside className="fixed left-60 top-0 bottom-0 w-80 bg-white border-r border-line shadow-xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-line shrink-0">
              <span className="text-sm font-medium">Notifications</span>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[11px] text-accent hover:text-accent/80">
                    Tout marquer lu
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-ink/40 hover:text-ink">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-xs text-ink/35 px-4 py-8 text-center">Rien pour l'instant.</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={`w-full text-left flex items-start gap-2.5 px-4 py-3 border-b border-line/60 hover:bg-paper/60 transition-colors ${
                      n.read ? "opacity-50" : ""
                    }`}
                  >
                    {n.type === "assigned" ? (
                      <UserPlus size={14} className="text-accent shrink-0 mt-0.5" />
                    ) : (
                      <MessageSquare size={14} className="text-accent shrink-0 mt-0.5" />
                    )}
                    <span className="text-sm text-ink/80 leading-snug flex-1">{n.message}</span>
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1.5" />}
                  </button>
                ))
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
