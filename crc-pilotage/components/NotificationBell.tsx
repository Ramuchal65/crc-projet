"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Notification } from "@/lib/types";
import { Bell, MessageSquare, UserPlus } from "lucide-react";

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
          <div className="fixed left-64 bottom-4 w-80 bg-white border border-line rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between px-3 py-2 border-b border-line sticky top-0 bg-white">
              <span className="text-xs font-medium text-ink/60">Notifications</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[11px] text-accent hover:text-accent/80">
                  Tout marquer lu
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="text-xs text-ink/35 px-3 py-6 text-center">Rien pour l'instant.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`w-full text-left flex items-start gap-2 px-3 py-2.5 border-b border-line/60 last:border-0 hover:bg-paper/60 transition-colors ${
                    n.read ? "opacity-50" : ""
                  }`}
                >
                  {n.type === "assigned" ? (
                    <UserPlus size={13} className="text-accent shrink-0 mt-0.5" />
                  ) : (
                    <MessageSquare size={13} className="text-accent shrink-0 mt-0.5" />
                  )}
                  <span className="text-xs text-ink/80 leading-snug">{n.message}</span>
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1 ml-auto" />}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
