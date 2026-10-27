'use client';

import { useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { SyncWave } from '@/components/sync-wave';
import { ArrowUpRight, Download, Copy, Pin, Ban, Share2 } from 'lucide-react';
import { ArrowUpRight as ArrowUpRightIcon } from 'lucide-react';

interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  reason: string;
  pinned?: boolean;
  excluded?: boolean;
}

interface BlendScore {
  label: string;
  value: number;
  explanation: string;
}

interface Blend {
  id: string;
  kind: 'pair' | 'group';
  name: string;
  description: string;
  overlap: number;
  lastUpdated: string;
  members: string[];
  tracks: Track[];
  scores: BlendScore[];
}

export default function BlendPage({ params }: { params: Promise<{ id: string }> }) {
  const [profile, setProfile] = useState<any>(null);
  const [blend, setBlend] = useState<Blend | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const paramsResolved = await params;
        const [profileRes, blendRes] = await Promise.all([
          fetch('/api/profile'),
          fetch(`/api/blends/${paramsResolved.id}`),
        ]);

        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(data);
        }

        if (blendRes.ok) {
          const data = await blendRes.json();
          setBlend(data);
        } else if (blendRes.status === 404) {
          notFound();
        } else {
          throw new Error('Failed to load blend');
        }
      } catch (e) {
        console.error('Failed to load blend data', e);
        setError(e instanceof Error ? e.message : 'Failed to load blend');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params]);

  async function handleTrackStateChange(trackId: string, state: 'active' | 'pinned' | 'excluded') {
    if (!blend) return;
    try {
      const res = await fetch(`/api/blends/${blend.id}/track-state`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId, state }),
      });
      if (!res.ok) throw new Error('Failed to update track state');

      // Update local state
      setBlend((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          tracks: prev.tracks.map((track) =>
            track.id === trackId
              ? { ...track, pinned: state === 'pinned', excluded: state === 'excluded' }
              : track
          ),
        };
      });
    } catch (e) {
      console.error('Failed to update track state', e);
    }
  }

  async function handleExportCSV() {
    if (!blend) return;
    try {
      const res = await fetch(`/api/blends/${blend.id}/export`);
      if (!res.ok) throw new Error('Failed to export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${blend.name}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export CSV', e);
    }
  }

  async function handleCopyList() {
    if (!blend) return;
    try {
      const res = await fetch(`/api/blends/${blend.id}/copy`);
      if (!res.ok) throw new Error('Failed to copy');
      const data = await res.json();
      await navigator.clipboard.writeText(data.text);
      // Show toast or success state
    } catch (e) {
      console.error('Failed to copy list', e);
    }
  }

  if (loading) {
    return (
      <AppShell profile={profile}>
        <div className="mx-auto max-w-[1180px] px-5 pb-16 sm:px-8 lg:px-14">
          <div className="animate-pulse space-y-8 border-b border-line pb-12 pt-14">
            <div className="h-8 bg-surface-2/50 rounded w-1/3" />
            <div className="h-12 bg-surface-2/50 rounded w-1/2" />
            <div className="h-6 bg-surface-2/50 rounded w-1/4" />
            <div className="h-32 bg-surface-2/50 rounded" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !blend) {
    return (
      <AppShell profile={profile}>
        <div className="mx-auto max-w-[1180px] px-5 pb-16 sm:px-8 lg:px-14">
          <div className="p-12 text-center text-quiet">
            <p className="text-red-400">Failed to load blend</p>
            {error && <p className="text-xs mt-1">{error}</p>}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell profile={profile}>
      <div className="mx-auto max-w-[1180px] px-5 pb-16 sm:px-8 lg:px-14">
        <div className="grid gap-10 border-b border-line pb-12 pt-14 lg:grid-cols-[.7fr_1.3fr] lg:items-end lg:pt-20">
          <div>
            <p className="label">
              {blend.kind === 'group' ? 'Group blend' : 'Pair blend'} · updated {blend.lastUpdated}
            </p>
            <h1 className="serif mt-4 text-6xl tracking-[-.06em]">
              {blend.name}<span className="text-purple">.</span>
            </h1>
            <p className="serif mt-4 max-w-xl text-xl leading-relaxed text-quiet">
              {blend.description}
            </p>
            <p className="mt-5 text-xs text-lavender">
              {blend.members.join(' · ')}
            </p>
          </div>
          <div className="flex items-end justify-between gap-8">
            <SyncWave overlap={blend.overlap} compact />
            <div>
              <strong className="serif block text-7xl font-normal">
                {blend.overlap}<span className="text-3xl text-purple">%</span>
              </strong>
              <span className="text-xs text-quiet">overall shared signal</span>
            </div>
          </div>
        </div>

        <div className="grid gap-14 py-12 lg:grid-cols-[.85fr_1.15fr]">
          <section>
            <div className="border-b border-line pb-4">
              <p className="label">The signal</p>
              <h2 className="serif mt-2 text-3xl">Why this blend works</h2>
            </div>
            <div>
              {blend.scores.map((score) => (
                <div key={score.label} className="border-b border-line py-5">
                  <div className="flex justify-between">
                    <strong className="serif text-xl font-normal">{score.label}</strong>
                    <span className="text-sm text-lavender">{score.value}%</span>
                  </div>
                  <div className="mt-3 h-[3px] bg-line">
                    <i className="block h-full bg-purple" style={{ width: `${score.value}%` }} />
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-quiet">{score.explanation}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-end justify-between border-b border-line pb-4">
              <div>
                <p className="label">The mix</p>
                <h2 className="serif mt-2 text-3xl">Tracks in this blend</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="focus-ring flex items-center gap-1.5 border border-line px-3 py-1.5 text-xs hover:bg-surface-2 transition-colors"
                  title="Export CSV"
                >
                  <Download size={12} strokeWidth={2} />
                  CSV
                </button>
                <button
                  onClick={handleCopyList}
                  className="focus-ring flex items-center gap-1.5 border border-line px-3 py-1.5 text-xs hover:bg-surface-2 transition-colors"
                  title="Copy track list"
                >
                  <Copy size={12} strokeWidth={2} />
                  Copy
                </button>
              </div>
            </div>
            <div className="border border-line rounded-xl overflow-hidden">
              {blend.tracks.length > 0 ? (
                blend.tracks.map((track) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    onStateChange={handleTrackStateChange}
                    blendId={blend.id}
                  />
                ))
              ) : (
                <div className="p-12 text-center text-quiet">
                  <p>No tracks in this blend yet</p>
                  <p className="text-xs mt-1">Sync your listening data to populate the blend</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

// TrackRow component with server-side state persistence
function TrackRow({ track, onStateChange, blendId }: { track: Track; onStateChange: (trackId: string, state: 'active' | 'pinned' | 'excluded') => void; blendId: string }) {
  const [state, setState] = useState<'active' | 'pinned' | 'excluded'>(
    track.pinned ? 'pinned' : track.excluded ? 'excluded' : 'active'
  );

  async function handleStateChange(newState: 'active' | 'pinned' | 'excluded') {
    setState(newState);
    await onStateChange(track.id, newState);
  }

  return (
    <div className={`group flex items-center gap-3 border-b border-line py-4 ${state === 'excluded' ? 'opacity-40' : ''} last:border-b-0`}>
      <span className="grid h-10 w-10 shrink-0 place-items-center bg-surface-2 font-serif text-lg text-lavender">
        {track.title[0]}
      </span>
      <div className="min-w-0 flex-1">
        <strong className="serif block truncate text-lg font-normal">{track.title}</strong>
        <span className="block truncate text-xs text-quiet">{track.artist} · {track.album}</span>
      </div>
      <span className="hidden text-xs text-quiet sm:block">{track.reason}</span>
      <button
        aria-label={state === 'pinned' ? 'Unpin track' : 'Pin track'}
        onClick={() => handleStateChange(state === 'pinned' ? 'active' : 'pinned')}
        className={`focus-ring p-2 ${state === 'pinned' ? 'text-purple' : 'text-quiet opacity-0 transition-opacity group-hover:opacity-100'}`}
      >
        <Pin size={15} strokeWidth={1.4} />
      </button>
      <button
        aria-label="Exclude track"
        onClick={() => handleStateChange(state === 'excluded' ? 'active' : 'excluded')}
        className="focus-ring p-2 text-quiet opacity-0 transition-opacity group-hover:opacity-100"
      >
        <Ban size={15} strokeWidth={1.4} />
      </button>
    </div>
  );
}