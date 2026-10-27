'use client';

import { useState, useEffect } from 'react';
import { Bell, X, Check } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUnreadCount() {
    try {
      const res = await fetch('/api/notifications/count');
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
      }
    } catch (e) {
      console.error('Failed to fetch unread count', e);
    }
  }

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  async function markAsRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error('Failed to mark notification as read', e);
    }
  }

  async function markAllAsRead() {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (e) {
      console.error('Failed to mark all notifications as read', e);
    }
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  function getIcon(type: string) {
    switch (type) {
      case 'friend_request':
        return '👤';
      case 'friend_request_accepted':
        return '✅';
      case 'friend_request_declined':
        return '❌';
      case 'group_invite':
      case 'group_invite_accepted':
      case 'group_invite_declined':
      case 'member_joined_group':
      case 'member_left_group':
        return '👥';
      case 'blend_updated':
        return '🎵';
      default:
        return '🔔';
    }
  }

  if (loading) {
    return (
      <button aria-label="Notifications" className="relative focus-ring">
        <Bell size={18} strokeWidth={1.4} />
        <span className="absolute right-0 top-0 h-1 w-1 rounded-full bg-purple" />
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(!open)}
        className="relative focus-ring"
      >
        <Bell size={18} strokeWidth={1.4} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple text-[10px] font-medium text-ink">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-ink border border-line rounded-xl shadow-xl overflow-hidden z-50">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h3 className="serif text-lg font-normal">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-purple hover:text-lavender"
                >
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="focus-ring p-1 text-quiet hover:text-white">
                <X size={16} strokeWidth={2} />
              </button>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-quiet">
                <Bell size={32} strokeWidth={1.2} className="mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`px-4 py-3 transition-colors ${
                      !notification.read_at ? 'bg-surface-2' : ''
                    } hover:bg-surface-2/50`}
                  >
                    <div className="flex gap-3">
                      <span className="mt-0.5 text-lg">{getIcon(notification.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <strong className="text-sm font-normal serif">{notification.title}</strong>
                          <span className="text-[10px] text-quiet shrink-0">
                            {formatTime(notification.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-quiet mt-1">{notification.message}</p>
                        {!notification.read_at && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="mt-2 text-xs text-purple hover:text-lavender flex items-center gap-1"
                          >
                            <Check size={12} strokeWidth={2} />
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}