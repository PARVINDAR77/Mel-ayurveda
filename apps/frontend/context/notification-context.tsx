'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, getAccessToken } from '../lib/api-client';
import { useAuth } from './auth-context';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  unreadCountByPath: Record<string, number>;
  activeToast: NotificationItem | null;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markPathAsRead: (path: string) => Promise<void>;
  dismissToast: () => void;
  navigateToNotification: (notif: NotificationItem) => void;
  hasUnreadForPath: (path: string) => boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Synthesize pleasant ambient notification sound using native Web Audio API (zero audio file dependencies)
function playNotificationChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.3); // D6

    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime + 0.08);
    osc1.stop(ctx.currentTime + 0.45);
    osc2.stop(ctx.currentTime + 0.45);
  } catch {
    // Ignore audio permission or context restrictions
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [unreadCountByPath, setUnreadCountByPath] = useState<Record<string, number>>({});
  const [activeToast, setActiveToast] = useState<NotificationItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch full notification list and unread summary from API
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const [listRes, summaryRes] = await Promise.all([
        apiClient.get('/notifications?limit=15'),
        apiClient.get('/notifications/unread-summary'),
      ]);

      const items: NotificationItem[] = listRes.data?.data || [];
      const summary = summaryRes.data || { totalUnread: 0, byPath: {} };

      setNotifications(items);
      setUnreadCount(summary.totalUnread ?? listRes.data?.meta?.unreadCount ?? 0);
      setUnreadCountByPath(summary.byPath || {});
    } catch {
      // Quiet fail on network transient issues
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Display floating toast banner
  const triggerToast = useCallback((notif: NotificationItem) => {
    playNotificationChime();
    setActiveToast(notif);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setActiveToast(null);
    }, 7000); // Auto dismiss after 7 seconds
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setActiveToast(null);
  }, []);

  // Connect to live SSE stream
  useEffect(() => {
    if (!user) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setNotifications([]);
      setUnreadCount(0);
      setUnreadCountByPath({});
      return;
    }

    fetchNotifications();

    const token = getAccessToken();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100/api/v1';

    if (token && typeof window !== 'undefined' && window.EventSource) {
      try {
        const streamUrl = `${apiUrl}/notifications/stream?token=${encodeURIComponent(token)}`;
        const es = new EventSource(streamUrl);
        eventSourceRef.current = es;

        es.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            if (parsed.type === 'NOTIFICATION' && parsed.payload) {
              const newNotif: NotificationItem = parsed.payload;

              // Prepend to notifications list
              setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);
              setUnreadCount((prev) => prev + 1);

              if (newNotif.link) {
                setUnreadCountByPath((prev) => ({
                  ...prev,
                  [newNotif.link!]: (prev[newNotif.link!] || 0) + 1,
                }));
              }

              triggerToast(newNotif);
            }
          } catch {
            // Ignore heartbeat or non-json message
          }
        };

        es.onerror = () => {
          // Fallback polling will handle updates if SSE connection drops
        };
      } catch {
        // SSE not supported or blocked
      }
    }

    // Resilient fallback polling every 6 seconds to ensure zero missed notifications
    const pollInterval = setInterval(() => {
      fetchNotifications();
    }, 6000);

    return () => {
      clearInterval(pollInterval);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [user, fetchNotifications, triggerToast]);

  const markAsRead = async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      // Recalculate unreadCountByPath
      const targetNotif = notifications.find((n) => n.id === id);
      if (targetNotif?.link) {
        setUnreadCountByPath((prev) => {
          const current = prev[targetNotif.link!] || 0;
          if (current <= 1) {
            const next = { ...prev };
            delete next[targetNotif.link!];
            return next;
          }
          return { ...prev, [targetNotif.link!]: current - 1 };
        });
      }
    } catch {
      // Ignore transient errors
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      setUnreadCountByPath({});
    } catch {
      // Ignore transient errors
    }
  };

  const markPathAsRead = async (path: string) => {
    if (!path) return;
    try {
      await apiClient.patch('/notifications/mark-path-read', { path });
      setNotifications((prev) =>
        prev.map((n) => (n.link && n.link.startsWith(path) ? { ...n, isRead: true } : n)),
      );
      setUnreadCountByPath((prev) => {
        const next = { ...prev };
        delete next[path];
        return next;
      });
      // Refresh count
      const summaryRes = await apiClient.get('/notifications/unread-summary');
      if (summaryRes.data) {
        setUnreadCount(summaryRes.data.totalUnread || 0);
        setUnreadCountByPath(summaryRes.data.byPath || {});
      }
    } catch {
      // Ignore transient errors
    }
  };

  // One-click contextual redirection: marks as read & navigates
  const navigateToNotification = (notif: NotificationItem) => {
    dismissToast();
    if (!notif.isRead) {
      markAsRead(notif.id);
    }
    if (notif.link) {
      router.push(notif.link);
    }
  };

  // Helper to check if a navigation route has any unread alerts
  const hasUnreadForPath = (path: string): boolean => {
    if (unreadCountByPath[path] && unreadCountByPath[path] > 0) return true;
    for (const [k, v] of Object.entries(unreadCountByPath)) {
      if (v > 0 && k.startsWith(path)) return true;
    }
    return false;
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        unreadCountByPath,
        activeToast,
        isLoading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        markPathAsRead,
        dismissToast,
        navigateToNotification,
        hasUnreadForPath,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
