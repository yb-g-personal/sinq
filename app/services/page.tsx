'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/app-shell';
import { RefreshCw, Link2, Unlink2, Music, CheckCircle, AlertCircle } from 'lucide-react';

export default function ServicesPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastfmConnected, setLastfmConnected] = useState(false);
  const [lastfmUsername, setLastfmUsername] = useState('');
  const [lastfmLastSynced, setLastfmLastSynced] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [profileRes, lastfmRes] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/services/lastfm'),
        ]);

        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(data);
        }

        if (lastfmRes.ok) {
          const data = await lastfmRes.json();
          setLastfmConnected(data.connected);
          setLastfmUsername(data.username || '');
          setLastfmLastSynced(data.last_synced_at || null);
        }
      } catch (e) {
        console.error('Failed to load services data', e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setConnecting(true);
    setError(null);
    setSuccess(false);
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
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      // Refresh connection data
      const lastfmRes = await fetch('/api/services/lastfm');
      if (lastfmRes.ok) {
        const data = await lastfmRes.json();
        setLastfmLastSynced(data.last_synced_at || null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect Last.fm');
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch('/api/services/lastfm', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to disconnect Last.fm');
      setLastfmConnected(false);
      setLastfmUsername('');
      setLastfmLastSynced(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to disconnect Last.fm');
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch('/api/services/refresh', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to refresh listening data');
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      // Refresh connection data
      const lastfmRes = await fetch('/api/services/lastfm');
      if (lastfmRes.ok) {
        const data = await lastfmRes.json();
        setLastfmLastSynced(data.last_synced_at || null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to refresh listening data');
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <AppShell profile={profile}>
        <div className="mx-auto max-w-[900px] px-5 pb-16 sm:px-8 lg:px-14">
          <div className="pb-10 pt-14">
            <p className="label">Your listening data</p>
            <h1 className="serif mt-3 text-6xl">Services<span className="text-purple">.</span></h1>
            <p className="serif mt-3 text-lg text-quiet">Connect only what you want to bring into the room.</p>
          </div>
          <div className="animate-pulse space-y-6 border-t border-line">
            <div className="h-28 bg-surface-2/50 rounded-lg border border-line" />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell profile={profile}>
      <div className="mx-auto max-w-[900px] px-5 pb-16 sm:px-8 lg:px-14">
        <div className="pb-10 pt-14">
          <p className="label">Your listening data</p>
          <h1 className="serif mt-3 text-6xl">Services<span className="text-purple">.</span></h1>
          <p className="serif mt-3 text-lg text-quiet">Connect only what you want to bring into the room.</p>
        </div>

        <div className="border-t border-line space-y-6">
          {/* Last.fm */}
          <div className="border-b border-line py-6">
            <div className="flex items-center gap-4">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-[#d36a53]">
                <Music size={20} strokeWidth={1.5} className="text-white" />
              </div>
              <div className="flex-1">
                <strong className="serif block text-2xl font-normal">Last.fm</strong>
                <small className="text-xs text-quiet">Public username used to import recent listening data.</small>
              </div>
              <span className={`text-xs ${lastfmConnected ? 'text-signal' : 'text-quiet'}`}>
                {lastfmConnected ? 'Connected' : 'Not connected'}
              </span>
            </div>

            {lastfmConnected ? (
              <div className="mt-5 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="flex items-center gap-2 text-sm text-quiet">
                  <Link2 size={14} strokeWidth={1.5} />
                  <span>@{lastfmUsername}</span>
                  {lastfmLastSynced && (
                    <>
                      <span className="text-line mx-2">·</span>
                      <RefreshCw size={12} strokeWidth={1.5} />
                      <span>Last synced {new Date(lastfmLastSynced).toLocaleString()}</span>
                    </>
                  )}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex-1 sm:flex-none border border-lavender px-4 py-2 text-xs text-lavender hover:bg-lavender/10 disabled:opacity-50"
                  >
                    {refreshing ? (
                      <>
                        <RefreshCw size={14} strokeWidth={2} className="animate-spin inline-block mr-1" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={14} strokeWidth={1.5} className="inline-block mr-1" />
                        Sync recent listening
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="flex-1 sm:flex-none border border-red-400/50 text-red-400 px-4 py-2 text-xs hover:bg-red-400/10 disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {disconnecting ? 'Disconnecting...' : (
                      <>
                        <Unlink2 size={14} strokeWidth={1.5} className="inline-block mr-1" />
                        Disconnect
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConnect} className="mt-5 flex gap-3">
                <input
                  value={lastfmUsername}
                  onChange={(e) => setLastfmUsername(e.target.value)}
                  required
                  placeholder="Last.fm username"
                  className="flex-1 border border-line bg-surface px-3 py-3 text-sm outline-none focus:border-lavender"
                />
                <button
                  type="submit"
                  disabled={connecting || !lastfmUsername.trim()}
                  className="bg-purple px-4 py-2 text-xs text-ink disabled:opacity-50"
                >
                  {connecting ? 'Connecting...' : 'Save username'}
                </button>
              </form>
            )}

            {(error || success) && (
              <div className={`mt-4 p-3 rounded-lg text-sm ${error ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-green-500/10 border border-green-500/30 text-green-400'} flex items-center gap-2`}>
                {error ? <AlertCircle size={16} strokeWidth={2} /> : <CheckCircle size={16} strokeWidth={2} />}
                {error || success}
              </div>
            )}
          </div>

          {/* Coming Soon */}
          <div className="py-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-2/50 border border-line/50 rounded-full text-xs text-quiet">
              <Music size={12} strokeWidth={1.5} />
              <span>Spotify & Apple Music coming soon</span>
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-surface-2/30 border border-line/50 rounded-xl text-xs text-quiet space-y-2">
          <p><strong className="text-white">How it works:</strong> We fetch your recent tracks from Last.fm to compute overlap with friends and groups.</p>
          <p>Your Last.fm username is stored securely. We never post on your behalf or access private data.</p>
          <p>Sync pulls your most recent ~200 tracks and updates all your blends automatically.</p>
        </div>
      </div>
    </AppShell>
  );
}