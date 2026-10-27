'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Layers3, Users, Disc3, ArrowUpRight, Bell, Plus, Clock } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { NotificationBell } from '@/components/notification-bell';

interface Blend {
  id: string;
  kind: 'pair' | 'group';
  name: string;
  description: string;
  overlap: number;
  last_refreshed_at: string | null;
  group_id: string | null;
  pair_low: string | null;
  pair_high: string | null;
  created_at: string;
  members: string[];
  member_count: number;
  role: string;
  lastUpdated: string;
}

interface Friend {
  id: string;
  displayName: string;
  username: string;
  initials: string;
  tone: string;
  friendshipId: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

export default function HomePage() {
  const [profile, setProfile] = useState<any>(null);
  const [blends, setBlends] = useState<Blend[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [profileRes, blendsRes, friendsRes, notificationsRes, countRes] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/blends'),
          fetch('/api/friends'),
          fetch('/api/notifications?limit=5'),
          fetch('/api/notifications/count'),
        ]);

        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(data);
        }

        if (blendsRes.ok) {
          const data = await blendsRes.json();
          setBlends(data);
        }

        if (friendsRes.ok) {
          const data = await friendsRes.json();
          setFriends(data);
        }

        if (notificationsRes.ok) {
          const data = await notificationsRes.json();
          setNotifications(data.notifications || []);
        }

        if (countRes.ok) {
          const data = await countRes.json();
          setUnreadCount(data.count || 0);
        }
      } catch (e) {
        console.error('Failed to load home data', e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Get recent blends (last 3)
  const recentBlends = blends.slice(0, 3);
  // Get recent friends (last 3)
  const recentFriends = friends.slice(0, 3);
  // Get unread notifications
  const unreadNotifications = notifications.filter(n => !n.read_at);

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

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'friend_request': return '👤';
      case 'friend_request_accepted': return '✅';
      case 'friend_request_declined': return '❌';
      case 'group_invite': return '👥';
      case 'group_invite_accepted': return '✅';
      case 'group_invite_declined': return '❌';
      case 'member_joined_group': return '👥';
      case 'member_left_group': return '👤';
      case 'blend_updated': return '🎵';
      default: return '🔔';
    }
  }

  if (loading) {
    return (
      <AppShell profile={profile}>
        <div className="mx-auto max-w-[1180px] px-5 pb-16 sm:px-8 lg:px-14">
          <div className="pb-10 pt-14">
            <p className="label">Welcome back</p>
            <h1 className="serif mt-3 text-6xl tracking-[-.06em]">Dashboard<span className="text-purple">.</span></h1>
            <p className="serif mt-3 text-lg text-quiet">Your listening rooms at a glance.</p>
          </div>
          <div className="animate-pulse space-y-8 border-t border-line py-8">
            <div className="h-8 bg-surface-2/50 rounded w-1/3" />
            <div className="h-8 bg-surface-2/50 rounded w-1/2" />
            <div className="h-32 bg-surface-2/50 rounded" />
            <div className="h-8 bg-surface-2/50 rounded w-1/4" />
            <div className="h-24 bg-surface-2/50 rounded" />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell profile={profile}>
      <div className="mx-auto max-w-[1180px] px-5 pb-16 sm:px-8 lg:px-14">
        <div className="pb-10 pt-14">
          <p className="label">Welcome back</p>
          <h1 className="serif mt-3 text-6xl tracking-[-.06em]">Dashboard<span className="text-purple">.</span></h1>
          <p className="serif mt-3 text-lg text-quiet">Your listening rooms at a glance.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 mb-10 sm:grid-cols-3 lg:grid-cols-4">
          <Link href="/blends" className="group border border-line rounded-xl p-5 hover:bg-surface-2/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-purple/20">
                <Layers3 size={20} strokeWidth={1.5} className="text-purple" />
              </div>
              <span className="text-xs text-quiet">Total Blends</span>
            </div>
            <div className="mt-4">
              <strong className="serif block text-4xl font-normal">{blends.length}</strong>
              <span className="text-xs text-quiet">listening rooms</span>
            </div>
          </Link>

          <Link href="/friends" className="group border border-line rounded-xl p-5 hover:bg-surface-2/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[#d6976b]/20">
                <Users size={20} strokeWidth={1.5} className="text-[#d6976b]" />
              </div>
              <span className="text-xs text-quiet">Friends</span>
            </div>
            <div className="mt-4">
              <strong className="serif block text-4xl font-normal">{friends.length}</strong>
              <span className="text-xs text-quiet">connected</span>
            </div>
          </Link>

          <Link href="/groups" className="group border border-line rounded-xl p-5 hover:bg-surface-2/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[#aa5c61]/20">
                <Disc3 size={20} strokeWidth={1.5} className="text-[#aa5c61]" />
              </div>
              <span className="text-xs text-quiet">Groups</span>
            </div>
            <div className="mt-4">
              <strong className="serif block text-4xl font-normal">
                {blends.filter(b => b.kind === 'group').length}
              </strong>
              <span className="text-xs text-quiet">shared rooms</span>
            </div>
          </Link>

          <Link href="/settings" className="group border border-line rounded-xl p-5 hover:bg-surface-2/50 transition-colors" tabIndex={notifications.length > 0 ? 0 : -1}>
            <div className="flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-surface-2">
                <Bell size={20} strokeWidth={1.5} className="text-quiet" />
              </div>
              <span className="text-xs text-quiet">Notifications</span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <strong className="serif block text-4xl font-normal">{unreadCount > 0 ? unreadCount : '0'}</strong>
              <span className="text-xs text-quiet">unread</span>
            </div>
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          {/* Left Column - Recent Blends */}
          <section>
            <div className="flex items-end justify-between border-b border-line pb-4 mb-6">
              <div>
                <p className="label">Your rooms</p>
                <h2 className="serif mt-2 text-3xl">Recent Blends</h2>
              </div>
              <Link href="/blends" className="focus-ring flex items-center gap-1.5 text-sm text-purple hover:text-lavender transition-colors">
                View all
                <ArrowUpRight size={14} strokeWidth={2} />
              </Link>
            </div>

            {recentBlends.length > 0 ? (
              <div className="border border-line rounded-xl overflow-hidden space-y-0">
                {recentBlends.map((blend) => (
                  <Link
                    key={blend.id}
                    href={`/blends/${blend.id}`}
                    className="group grid gap-4 border-b border-line py-5 sm:grid-cols-[100px_1fr_auto] sm:items-center hover:bg-surface-2/50 transition-colors last:border-b-0"
                  >
                    <span className="grid h-20 w-20 place-items-center bg-surface-2 font-serif text-xl text-lavender">
                      {blend.kind === 'group' ? (
                        <Disc3 size={24} strokeWidth={1.5} className="text-purple" />
                      ) : (
                        <Layers3 size={24} strokeWidth={1.5} className="text-purple" />
                      )}
                    </span>
                    <span>
                      <small className="label">{blend.kind === 'group' ? 'Group blend' : 'Pair blend'}</small>
                      <strong className="serif mt-2 block text-2xl font-normal">{blend.name}</strong>
                      <span className="mt-1 block text-xs text-quiet">
                        {blend.kind === 'group' ? `${blend.member_count} members` : blend.members.join(' · ')} · updated {blend.lastUpdated}
                      </span>
                    </span>
                    <span className="flex items-center gap-4">
                      <strong className="serif text-3xl font-normal">{blend.overlap}%</strong>
                      <ArrowUpRight size={16} className="text-lavender transition group-hover:translate-x-1" />
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-quiet border border-line/50 rounded-xl">
                <Layers3 size={48} strokeWidth={1.5} className="mx-auto mb-3 opacity-50" />
                <p>No blends yet</p>
                <p className="text-xs mt-1">Add friends or create a group to start blending</p>
                <div className="mt-4 flex justify-center gap-3">
                  <Link href="/friends" className="focus-ring border border-line text-quiet px-4 py-2 rounded-lg hover:bg-surface-2 hover:text-white transition-colors text-sm">
                    Add Friends
                  </Link>
                  <Link href="/groups/new" className="focus-ring bg-purple px-4 py-2 text-sm text-ink rounded-lg hover:bg-purple/90 transition-colors">
                    Create Group
                  </Link>
                </div>
              </div>
            )}
          </section>

          {/* Right Column - Friends & Activity */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="border border-line rounded-xl p-5 space-y-3">
              <h3 className="serif text-lg font-normal">Quick Actions</h3>
              <Link
                href="/groups/new"
                className="flex items-center gap-3 p-3 border border-line rounded-lg hover:bg-surface-2/50 transition-colors group"
              >
                <div className="grid h-8 w-8 place-items-center rounded-full bg-purple/20">
                  <Plus size={18} strokeWidth={2} className="text-purple" />
                </div>
                <div className="flex-1">
                  <strong className="text-sm">Create a group</strong>
                  <span className="block text-xs text-quiet">Up to 10 members, one shared room</span>
                </div>
                <ArrowUpRight size={16} className="text-lavender group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/friends"
                className="flex items-center gap-3 p-3 border border-line rounded-lg hover:bg-surface-2/50 transition-colors group"
              >
                <div className="grid h-8 w-8 place-items-center rounded-full bg-[#d6976b]/20">
                  <Users size={18} strokeWidth={1.5} className="text-[#d6976b]" />
                </div>
                <div className="flex-1">
                  <strong className="text-sm">Add a friend</strong>
                  <span className="block text-xs text-quiet">Send a friend request by username</span>
                </div>
                <ArrowUpRight size={16} className="text-lavender group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/services"
                className="flex items-center gap-3 p-3 border border-line rounded-lg hover:bg-surface-2/50 transition-colors group"
              >
                <div className="grid h-8 w-8 place-items-center rounded-full bg-surface-2">
                  <Clock size={18} strokeWidth={1.5} className="text-quiet" />
                </div>
                <div className="flex-1">
                  <strong className="text-sm">Sync listening data</strong>
                  <span className="block text-xs text-quiet">Refresh your Last.fm tracks</span>
                </div>
                <ArrowUpRight size={16} className="text-lavender group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Recent Friends */}
            {recentFriends.length > 0 && (
              <section>
                <div className="flex items-end justify-between border-b border-line pb-4 mb-4">
                  <div>
                    <p className="label">Your people</p>
                    <h2 className="serif mt-2 text-2xl">Recent Friends</h2>
                  </div>
                  <Link href="/friends" className="focus-ring flex items-center gap-1.5 text-sm text-purple hover:text-lavender transition-colors">
                    View all
                    <ArrowUpRight size={14} strokeWidth={2} />
                  </Link>
                </div>
                <div className="border border-line rounded-xl overflow-hidden space-y-0">
                  {recentFriends.map((friend) => (
                    <Link
                      key={friend.friendshipId}
                      href={`/blends?friend=${friend.id}`}
                      className="group flex items-center gap-3 border-b border-line py-3 last:border-b-0 hover:bg-surface-2/50 transition-colors"
                    >
                      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${friend.tone}`}>
                        {friend.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <strong className="serif block truncate text-base font-normal">{friend.displayName}</strong>
                        <span className="block truncate text-xs text-quiet">@{friend.username}</span>
                      </div>
                      <ArrowUpRight size={16} className="text-lavender opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Notifications */}
            {(unreadNotifications.length > 0 || notifications.length > 0) && (
              <section>
                <div className="flex items-end justify-between border-b border-line pb-4 mb-4">
                  <div>
                    <p className="label">Activity</p>
                    <h2 className="serif mt-2 text-2xl">Recent Notifications</h2>
                  </div>
                  <Link href="/settings?tab=notifications" className="focus-ring flex items-center gap-1.5 text-sm text-purple hover:text-lavender transition-colors">
                    View all
                    <ArrowUpRight size={14} strokeWidth={2} />
                  </Link>
                </div>
                <div className="border border-line rounded-xl overflow-hidden space-y-0">
                  {notifications.slice(0, 5).map((notification) => (
                    <div
                      key={notification.id}
                      className={`px-4 py-3 border-b border-line last:border-b-0 ${!notification.read_at ? 'bg-surface-2' : ''}`}
                    >
                      <div className="flex gap-3">
                        <span className="mt-0.5 text-lg">{getNotificationIcon(notification.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <strong className="text-sm font-normal serif">{notification.title}</strong>
                            <span className="text-[10px] text-quiet shrink-0">{formatTime(notification.created_at)}</span>
                          </div>
                          <p className="text-sm text-quiet mt-0.5 truncate">{notification.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {notifications.length > 5 && (
                    <div className="px-4 py-3 text-center text-xs text-quiet border-t border-line">
                      <Link href="/settings?tab=notifications" className="text-purple hover:text-lavender">
                        View all {notifications.length} notifications
                      </Link>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}