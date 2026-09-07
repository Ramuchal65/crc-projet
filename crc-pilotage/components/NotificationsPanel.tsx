"use client";

import { Notification } from "@/lib/types";
import { MessageSquare, UserPlus, X } from "lucide-react";

export default function NotificationsPanel({
  notifications,
  onClose,
  onMarkRead,
  onMarkAllRead,
}: {
  notifications: Notification[];
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <aside className="w-80 shrink-0 h-screen sticky top-0 bg-white border-r border-line flex flex-col">
      <div className="flex items-center justify-between px-4 py-4 border-b border-line shrink-0">
        <span className="text-sm font-medium">Notifications</span>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button onClick={onMarkAllRead} className="text-[11px] text-accent hover:text-accent/80">
              Tout marquer lu
            </button>
          )}
          <button onClick={onClose} className="text-ink/40 hover:text-ink">
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
              onClick={() => onMarkRead(n.id)}
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
  );
}
