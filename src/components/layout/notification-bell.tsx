"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import Link from "next/link";

import {
  listMyNotifications,
  markAllAsRead,
  markAsRead,
  getUnreadCount,
  type NotificationItem,
} from "@/lib/actions/notifications";

const POLL_INTERVAL_MS = 30_000;

function formatRelative(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    const res = await getUnreadCount();
    if (res.success && typeof res.data === "number") {
      setUnread(res.data);
    }
  }, []);

  const refreshList = useCallback(async () => {
    setLoading(true);
    const res = await listMyNotifications({ limit: 10 });
    if (res.success && res.data) {
      setItems(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshCount();
    const id = setInterval(refreshCount, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refreshCount]);

  useEffect(() => {
    if (open) {
      refreshList();
    }
  }, [open, refreshList]);

  useEffect(() => {
    function handleClickOutside(ev: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(ev.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  async function handleMarkOne(id: string) {
    const res = await markAsRead(id);
    if (res.success) {
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, isRead: true } : it))
      );
      refreshCount();
    }
  }

  async function handleMarkAll() {
    const res = await markAllAsRead();
    if (res.success) {
      setItems((prev) => prev.map((it) => ({ ...it, isRead: true })));
      setUnread(0);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/60 bg-background hover:bg-accent transition-colors"
        aria-label="Notificacoes"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-md border border-border/60 bg-background shadow-lg z-50">
          <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
            <span className="text-sm font-semibold">Notificacoes</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <CheckCheck className="h-3 w-3" />
                Marcar todas
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading && items.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                Carregando...
              </div>
            )}
            {!loading && items.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                Nenhuma notificacao
              </div>
            )}
            {items.map((n) => (
              <div
                key={n.id}
                className={`flex flex-col gap-1 border-b border-border/40 px-3 py-2 text-sm last:border-0 ${
                  n.isRead ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={n.link}
                    className="font-medium hover:underline"
                    onClick={() => setOpen(false)}
                  >
                    {n.title}
                  </Link>
                  {!n.isRead && (
                    <button
                      type="button"
                      onClick={() => handleMarkOne(n.id)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Marcar como lida"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {n.message}
                </p>
                <span className="text-[10px] text-muted-foreground">
                  {formatRelative(n.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
