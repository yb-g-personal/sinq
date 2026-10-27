'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/app-shell';
import { SettingsTabs } from '@/components/settings-tabs';
import { LogoutButton } from '@/components/logout-button';
import { DeleteAccountModal } from '@/components/delete-account-modal';
import { User, Shield, Music, Bell, Key, Trash2, Eye, EyeOff, Mail, Lock, UserMinus, Ban } from 'lucide-react';
import { getCurrentProfile } from '@/lib/data';

type Tab = 'profile' | 'privacy' | 'services' | 'notifications' | 'account' | 'danger';

interface BlockedUser {
  id: string;
  username: string;
  display_name: string;
  initials: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Profile form state
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Privacy state
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [blocking, setBlocking] = useState<string | null>(null);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  // Services state
  const [lastfmConnected, setLastfmConnected] = useState(false);
  const [lastfmUsername, setLastfmUsername] = useState('');
  const [connectingLastfm, setConnectingLastfm] = useState(false);
  const [disconnectingLastfm, setDisconnectingLastfm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastfmError, setLastfmError] = useState<string | null>(null);
  const [lastfmSuccess, setLastfmSuccess] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Account state
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [profileRes, blockedRes, lastfmRes, notificationsRes, countRes] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/friends/blocked'),
          fetch('/api/services/lastfm'),
          fetch('/api/notifications'),
          fetch('/api/notifications/count'),
        ]);

        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(data);
          setDisplayName(data.display_name || '');
          setUsername(data.username || '');
          setBio(data.bio || '');
        }

        if (blockedRes.ok) {
          const data = await blockedRes.json();
          setBlockedUsers(data.blockedUsers || []);
        }

        if (lastfmRes.ok) {
          const data = await lastfmRes.json();
          setLastfmConnected(data.connected);
          setLastfmUsername(data.username || '');
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
        console.error('Failed to load settings data', e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Profile handlers
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(false);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName, username, bio }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save profile');
      }
      setProfileSuccess(true);
      // Update profile in state
      setProfile((prev: any) => prev ? { ...prev, display_name: displayName, username, bio } : null);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : 'Failed to save profile');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangeUsername(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError(null);
    try {
      const res = await fetch('/api/profile/username', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to change username');
      }
      setProfileSuccess(true);
      setProfile((prev: any) => prev ? { ...prev, username } : null);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : 'Failed to change username');
    } finally {
      setSavingProfile(false);
    }
  }

  // Privacy handlers
  async function loadBlockedUsers() {
    setLoadingBlocked(true);
    try {
      const res = await fetch('/api/friends/blocked');
      if (res.ok) {
        const data = await res.json();
        setBlockedUsers(data.blockedUsers || []);
      }
    } catch (e) {
      console.error('Failed to load blocked users', e);
    } finally {
      setLoadingBlocked(false);
    }
  }

  async function handleBlockUser(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    if (!username.trim()) return;
    setBlocking(username);
    try {
      const res = await fetch('/api/friends/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) throw new Error('Failed to block user');
      loadBlockedUsers();
    } catch (e) {
      console.error('Failed to block user', e);
    } finally {
      setBlocking(null);
    }
  }

  async function handleUnblockUser(blockedId: string) {
    setUnblocking(blockedId);
    try {
      const res = await fetch('/api/friends/unblock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedId }),
      });
      if (!res.ok) throw new Error('Failed to unblock user');
      loadBlockedUsers();
    } catch (e) {
      console.error('Failed to unblock user', e);
    } finally {
      setUnblocking(null);
    }
  }

  // Services handlers
  async function loadLastfmConnection() {
    try {
      const res = await fetch('/api/services/lastfm');
      if (res.ok) {
        const data = await res.json();
        setLastfmConnected(data.connected);
        setLastfmUsername(data.username || '');
      }
    } catch (e) {
      console.error('Failed to load Last.fm connection', e);
    }
  }

  async function handleConnectLastfm(e: React.FormEvent) {
    e.preventDefault();
    setConnectingLastfm(true);
    setLastfmError(null);
    setLastfmSuccess(false);
    try {
      const res = await fetch('/api/services/lastfm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: lastfmUsername }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to connect Last.fm');
      }
      setLastfmConnected(true);
      setLastfmSuccess(true);
      setTimeout(() => setLastfmSuccess(false), 3000);
    } catch (e) {
      setLastfmError(e instanceof Error ? e.message : 'Failed to connect Last.fm');
    } finally {
      setConnectingLastfm(false);
    }
  }

  async function handleDisconnectLastfm() {
    setDisconnectingLastfm(true);
    try {
      const res = await fetch('/api/services/lastfm', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to disconnect Last.fm');
      setLastfmConnected(false);
      setLastfmUsername('');
      loadLastfmConnection();
    } catch (e) {
      console.error('Failed to disconnect Last.fm', e);
    } finally {
      setDisconnectingLastfm(false);
    }
  }

  async function handleRefreshListening() {
    setRefreshing(true);
    try {
      const res = await fetch('/api/services/refresh', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to refresh listening data');
      }
      setLastfmSuccess(true);
      setTimeout(() => setLastfmSuccess(false), 3000);
    } catch (e) {
      setLastfmError(e instanceof Error ? e.message : 'Failed to refresh listening data');
    } finally {
      setRefreshing(false);
    }
  }

  // Notifications handlers
  async function loadNotifications() {
    setLoadingNotifications(true);
    try {
      const [notificationsRes, countRes] = await Promise.all([
        fetch('/api/notifications'),
        fetch('/api/notifications/count'),
      ]);
      if (notificationsRes.ok) {
        const data = await notificationsRes.json();
        setNotifications(data.notifications || []);
      }
      if (countRes.ok) {
        const data = await countRes.json();
        setUnreadCount(data.count || 0);
      }
    } catch (e) {
      console.error('Failed to load notifications', e);
    } finally {
      setLoadingNotifications(false);
    }
  }

  async function handleMarkRead(notificationId: string) {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, { method: 'POST' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error('Failed to mark notification as read', e);
    }
  }

  async function handleMarkAllRead() {
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

  // Account handlers
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setChangingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(false);
    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      setChangingPassword(false);
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      setChangingPassword(false);
      return;
    }

    try {
      const supabase = (await import('@/lib/supabase/client')).createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
      setPasswordSuccess(true);
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleDeleteAccount() {
    try {
      await fetch('/api/account/delete', { method: 'POST' });
      window.location.href = '/sign-in';
    } catch (e) {
      console.error('Failed to delete account', e);
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
        <div className="mx-auto max-w-[900px] px-5 pb-16 sm:px-8 lg:px-14">
          <div className="pb-10 pt-14">
            <p className="label">Your account</p>
            <h1 className="serif mt-3 text-6xl">Settings<span className="text-purple">.</span></h1>
          </div>
          <div className="animate-pulse space-y-8 border-t border-line py-8">
            <div className="h-8 bg-surface-2/50 rounded w-1/3" />
            <div className="h-8 bg-surface-2/50 rounded w-1/2" />
            <div className="h-8 bg-surface-2/50 rounded w-1/4" />
          </div>
        </div>
      </AppShell>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User, description: 'Display name, username, bio, avatar' },
    { id: 'privacy', label: 'Privacy', icon: Shield, description: 'Blocked users, who can find you' },
    { id: 'services', label: 'Services', icon: Music, description: 'Connected music services (Last.fm)' },
    { id: 'notifications', label: 'Notifications', icon: Bell, description: 'View and manage notifications' },
    { id: 'account', label: 'Account', icon: Key, description: 'Password, email, sessions' },
    { id: 'danger', label: 'Danger Zone', icon: Trash2, description: 'Delete account, export data' },
  ];

  return (
    <AppShell profile={profile}>
      <div className="mx-auto max-w-[900px] px-5 pb-16 sm:px-8 lg:px-14">
        <div className="pb-10 pt-14">
          <p className="label">Your account</p>
          <h1 className="serif mt-3 text-6xl">Settings<span className="text-purple">.</span></h1>
        </div>

        <div className="flex gap-8">
          <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="flex-1 min-w-0">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-8 border-t border-line py-8">
                <div>
                  <h2 className="serif text-2xl font-normal">Profile</h2>
                  <p className="mt-2 text-xs leading-relaxed text-quiet">The details people see when you share a room.</p>
                </div>
                <div className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="block text-sm">
                      Display name
                      <input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                        className="mt-2 w-full border border-line bg-surface px-3 py-3 outline-none focus:border-lavender"
                      />
                    </label>
                    <label className="block text-sm">
                      Username
                      <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        pattern="[A-Za-z0-9_]{3,24}"
                        className="mt-2 w-full border border-line bg-surface px-3 py-3 outline-none focus:border-lavender"
                      />
                    </label>
                  </div>
                  <label className="block text-sm">
                    Bio
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      className="mt-2 w-full border border-line bg-surface px-3 py-3 outline-none focus:border-lavender resize-none"
                      placeholder="Tell people about your taste..."
                    />
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="bg-purple px-4 py-2 text-xs text-ink disabled:opacity-50"
                    >
                      {savingProfile ? 'Saving...' : 'Save changes'}
                    </button>
                    {profileSuccess && (
                      <span className="text-green-400 text-sm">Saved!</span>
                    )}
                    {profileError && (
                      <span className="text-red-400 text-sm">{profileError}</span>
                    )}
                  </div>
                </div>
              </form>
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-8 border-t border-line py-8">
                <div>
                  <h2 className="serif text-2xl font-normal">Privacy</h2>
                  <p className="mt-2 text-xs leading-relaxed text-quiet">Control who can interact with you and see your activity.</p>
                </div>

                {/* Block User */}
                <div className="space-y-5">
                  <h3 className="serif text-lg font-normal flex items-center gap-2">
                    <UserMinus size={18} strokeWidth={1.5} />
                    Blocked Users
                  </h3>
                  <p className="text-xs text-quiet">Blocked users cannot send friend requests, join your groups, or see your blends.</p>

                  <form onSubmit={handleBlockUser} className="flex gap-2">
                    <input
                      name="username"
                      placeholder="Username to block"
                      className="flex-1 border border-line bg-surface px-3 py-2 outline-none focus:border-lavender"
                    />
                    <button
                      type="submit"
                      disabled={blocking}
                      className="border border-red-400/50 text-red-400 px-4 py-2 text-sm hover:bg-red-400/10 disabled:opacity-50"
                    >
                      {blocking ? 'Blocking...' : 'Block'}
                    </button>
                  </form>

                  {blockedUsers.length > 0 ? (
                    <div className="border border-line rounded-xl overflow-hidden">
                      {blockedUsers.map((blocked) => (
                        <div key={blocked.id} className="flex items-center justify-between gap-4 border-b border-line py-4 last:border-b-0">
                          <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 font-serif text-sm text-lavender">
                              {blocked.initials}
                            </div>
                            <div>
                              <strong className="serif block text-base font-normal">{blocked.display_name}</strong>
                              <span className="text-xs text-quiet">@{blocked.username}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnblockUser(blocked.id)}
                            disabled={unblocking === blocked.id}
                            className="focus-ring text-red-400 hover:text-red-300 text-sm flex items-center gap-1"
                          >
                            {unblocking === blocked.id ? (
                              <span className="animate-spin">⏳</span>
                            ) : (
                              <>
                                <Ban size={14} strokeWidth={1.8} />
                                Unblock
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-quiet border border-line/50 rounded-xl">
                      <UserMinus size={32} strokeWidth={1.5} className="mx-auto mb-2 opacity-50" />
                      <p>No blocked users</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Services Tab */}
            {activeTab === 'services' && (
              <div className="space-y-8 border-t border-line py-8">
                <div>
                  <h2 className="serif text-2xl font-normal">Connected Services</h2>
                  <p className="mt-2 text-xs leading-relaxed text-quiet">Connect your music accounts to build blends from your listening history.</p>
                </div>

                {/* Last.fm */}
                <div className="border border-line rounded-xl p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-red-500/20">
                      <span className="text-red-400 font-bold text-lg">fm</span>
                    </div>
                    <div>
                      <strong className="serif block text-lg font-normal">Last.fm</strong>
                      <span className="text-xs text-quiet">Scrobble history for accurate blends</span>
                    </div>
                    <span className={`ml-auto px-2 py-1 text-xs rounded-full ${lastfmConnected ? 'bg-green-500/20 text-green-400' : 'bg-surface-2 text-quiet'}`}>
                      {lastfmConnected ? 'Connected' : 'Not connected'}
                    </span>
                  </div>

                  {lastfmConnected ? (
                    <div className="flex items-center gap-3 pt-2 border-t border-line">
                      <span className="text-sm text-quiet flex-1">@{lastfmUsername}</span>
                      <button
                        onClick={handleDisconnectLastfm}
                        disabled={disconnectingLastfm}
                        className="focus-ring border border-red-400/50 text-red-400 px-4 py-2 text-sm hover:bg-red-400/10 disabled:opacity-50"
                      >
                        {disconnectingLastfm ? 'Disconnecting...' : 'Disconnect'}
                      </button>
                      <button
                        onClick={handleRefreshListening}
                        disabled={refreshing}
                        className="focus-ring border border-purple/50 text-purple px-4 py-2 text-sm hover:bg-purple/10 disabled:opacity-50"
                      >
                        {refreshing ? 'Refreshing...' : 'Refresh Now'}
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleConnectLastfm} className="flex gap-2 pt-2 border-t border-line">
                      <input
                        value={lastfmUsername}
                        onChange={(e) => setLastfmUsername(e.target.value)}
                        placeholder="Last.fm username"
                        required
                        className="flex-1 border border-line bg-surface px-3 py-2 outline-none focus:border-lavender"
                      />
                      <button
                        type="submit"
                        disabled={connectingLastfm || !lastfmUsername.trim()}
                        className="bg-purple px-4 py-2 text-xs text-ink disabled:opacity-50"
                      >
                        {connectingLastfm ? 'Connecting...' : 'Connect'}
                      </button>
                    </form>
                  )}

                  {lastfmError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                      {lastfmError}
                    </div>
                  )}
                  {lastfmSuccess && (
                    <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-400">
                      Success!
                    </div>
                  )}

                  <div className="pt-4 border-t border-line text-xs text-quiet space-y-1">
                    <p><strong>How it works:</strong> We fetch your recent tracks from Last.fm to compute overlap with friends.</p>
                    <p>Your Last.fm username is stored securely. We never post on your behalf.</p>
                    <p>Spotify & Apple Music support coming soon.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-8 border-t border-line py-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="serif text-2xl font-normal">Notifications</h2>
                    <p className="mt-2 text-xs leading-relaxed text-quiet">Manage your notification preferences and history.</p>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="focus-ring text-sm text-purple hover:text-lavender"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {loadingNotifications ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 bg-surface-2/50 rounded-lg animate-pulse border border-line" />
                    ))}
                  </div>
                ) : notifications.length > 0 ? (
                  <div className="border border-line rounded-xl overflow-hidden">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`px-4 py-4 border-b border-line last:border-b-0 ${!notification.read_at ? 'bg-surface-2' : ''}`}
                      >
                        <div className="flex gap-3">
                          <span className="mt-0.5 text-lg">{getNotificationIcon(notification.type)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <strong className="text-sm font-normal serif">{notification.title}</strong>
                              <span className="text-[10px] text-quiet shrink-0">{formatTime(notification.created_at)}</span>
                            </div>
                            <p className="text-sm text-quiet mt-1">{notification.message}</p>
                            {!notification.read_at && (
                              <button
                                onClick={() => handleMarkRead(notification.id)}
                                className="mt-2 text-xs text-purple hover:text-lavender flex items-center gap-1"
                              >
                                <span>✓</span> Mark as read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-quiet border border-line/50 rounded-xl">
                    <Bell size={48} strokeWidth={1.5} className="mx-auto mb-3 opacity-50" />
                    <p>No notifications yet</p>
                    <p className="text-xs mt-1">Friend requests, group invites, and blend updates will appear here</p>
                  </div>
                )}
              </div>
            )}

            {/* Account Tab */}
            {activeTab === 'account' && (
              <div className="space-y-8 border-t border-line py-8">
                <div>
                  <h2 className="serif text-2xl font-normal">Account</h2>
                  <p className="mt-2 text-xs leading-relaxed text-quiet">Manage your account security and access.</p>
                </div>

                {/* Change Password */}
                <div className="border border-line rounded-xl p-6 space-y-4">
                  <h3 className="serif text-lg font-normal flex items-center gap-2">
                    <Lock size={18} strokeWidth={1.5} />
                    Change Password
                  </h3>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <label className="block text-sm">
                        Current Password
                        <input
                          name="currentPassword"
                          type="password"
                          required
                          className="mt-2 w-full border border-line bg-surface px-3 py-2 outline-none focus:border-lavender"
                        />
                      </label>
                      <label className="block text-sm">
                        New Password
                        <input
                          name="newPassword"
                          type="password"
                          required
                          minLength={8}
                          className="mt-2 w-full border border-line bg-surface px-3 py-2 outline-none focus:border-lavender"
                        />
                      </label>
                      <label className="block text-sm">
                        Confirm New Password
                        <input
                          name="confirmPassword"
                          type="password"
                          required
                          className="mt-2 w-full border border-line bg-surface px-3 py-2 outline-none focus:border-lavender"
                        />
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="submit"
                        disabled={changingPassword}
                        className="bg-purple px-4 py-2 text-xs text-ink disabled:opacity-50"
                      >
                        {changingPassword ? 'Changing...' : 'Update Password'}
                      </button>
                      {passwordSuccess && <span className="text-green-400 text-sm">Password updated!</span>}
                      {passwordError && <span className="text-red-400 text-sm">{passwordError}</span>}
                    </div>
                  </form>
                </div>

                {/* Sign Out */}
                <div className="border border-line rounded-xl p-6">
                  <h3 className="serif text-lg font-normal flex items-center gap-2 mb-4">
                    <Mail size={18} strokeWidth={1.5} />
                    Sessions
                  </h3>
                  <p className="text-xs text-quiet mb-4">Sign out of all devices. You'll need to sign in again.</p>
                  <LogoutButton />
                </div>
              </div>
            )}

            {/* Danger Zone Tab */}
            {activeTab === 'danger' && (
              <div className="space-y-8 border-t border-line py-8">
                <div>
                  <h2 className="serif text-2xl font-normal text-red-400">Danger Zone</h2>
                  <p className="mt-2 text-xs leading-relaxed text-quiet">Irreversible actions. Proceed with caution.</p>
                </div>

                {/* Delete Account */}
                <div className="border border-red-400/30 bg-red-500/5 rounded-xl p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <Trash2 size={24} strokeWidth={1.5} className="text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="serif text-lg font-normal text-white">Delete Account</h3>
                      <p className="text-sm text-quiet mt-1">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      <ul className="list-disc list-inside text-xs text-quiet mt-2 space-y-1">
                        <li>Your profile, username, and bio</li>
                        <li>All friendships and friend requests</li>
                        <li>All groups you own and your memberships</li>
                        <li>All blends (pair and group) and their track history</li>
                        <li>Connected music service accounts and listening data</li>
                        <li>All notifications</li>
                      </ul>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteModalOpen(true)}
                    className="focus-ring border border-red-400/50 text-red-400 px-4 py-2 text-sm hover:bg-red-400/10 w-full"
                  >
                    Delete My Account
                  </button>
                </div>

                {/* Export Data */}
                <div className="border border-line rounded-xl p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <Eye size={24} strokeWidth={1.5} className="text-purple shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="serif text-lg font-normal">Export Your Data</h3>
                      <p className="text-sm text-quiet mt-1">
                        Download a copy of your data including profile, friends, groups, blends, and listening history.
                      </p>
                    </div>
                  </div>
                  <button className="focus-ring border border-line text-quiet px-4 py-2 text-sm hover:bg-surface-2 hover:text-white w-full">
                    Request Data Export
                  </button>
                  <p className="text-xs text-quiet">A download link will be sent to your email.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DeleteAccountModal
          open={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={handleDeleteAccount}
        />
      </div>
    </AppShell>
  );
}