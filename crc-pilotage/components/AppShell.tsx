"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Notification } from "@/lib/types";
import Sidebar from "./Sidebar";
import NotificationsPanel from "./NotificationsPanel";

const POLL_MS = 30000;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("employees")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      setEmployeeId(data?.id ?? null);
    });
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!employeeId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    setNotifications((data as Notification[]) ?? []);
  }, [employeeId]);

  useEffect(() => {
    loadNotifications();
    const id = setInterval(loadNotifications, POLL_MS);
    return () => clearInterval(id);
  }, [loadNotifications]);

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

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex min-h-screen">
      <Sidebar
        unreadNotifications={unreadCount}
        onToggleNotifications={() => setPanelOpen((v) => !v)}
      />
      {panelOpen && (
        <NotificationsPanel
          notifications={notifications}
          onClose={() => setPanelOpen(false)}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
        />
      )}
      <main className="flex-1 px-8 py-8 max-w-[1600px] min-w-0">{children}</main>
    </div>
  );
}
