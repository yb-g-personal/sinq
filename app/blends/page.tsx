'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Plus, Layers3, Users, Filter, X } from 'lucide-react';
import { AppShell } from '@/components/app-shell';

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

type FilterType = 'all' | 'group' | 'pair';

export default function BlendsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [blends, setBlends] = useState<Blend[]>([]);
  const [filteredBlends, setFilteredBlends] = useState<Blend[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'overlap' | 'name'>('recent');

  useEffect(() => {
    async function loadData() {
      try {
        const [profileRes, blendsRes] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/blends'),
        ]);

        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(data);
        }

        if (blendsRes.ok) {
          const data = await blendsRes.json();
          setBlends(data);
          setFilteredBlends(data);
        }
      } catch (e) {
        console.error('Failed to load blends data', e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...blends];

    // Filter by type
    if (filter === 'group') {
      result = result.filter(b => b.kind === 'group');
    } else if (filter === 'pair') {
      result = result.filter(b => b.kind === 'pair');
    }

    // Sort
    switch (sortBy) {
      case 'overlap':
        result.sort((a, b) => b.overlap - a.overlap);
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'recent':
      default:
        // Already sorted by created_at desc from API
        break;
    }

    setFilteredBlends(result);
  }, [blends, filter, sortBy]);

  const hasActiveFilters = filter !== 'all';

  if (loading) {
    return (
      <AppShell profile={profile}>
        <div className="mx-auto max-w-[1000px] px-5 pb-16 sm:px-8 lg:px-14">
          <div className="flex flex-col justify-between gap-5 pb-10 pt-14 sm:flex-row sm:items-end">
            <div>
              <p className="label">Your listening rooms</p>
              <h1 className="serif mt-3 text-6xl tracking-[-.05em]">Blends<span className="text-purple">.</span></h1>
              <p className="serif mt-3 text-lg text-quiet">Persistent spaces for the music you share.</p>
            </div>
            <Link href="/groups/new" className="w-fit bg-purple px-4 py-3 text-sm text-ink flex items-center gap-2">
              <Plus size={16} strokeWidth={2} />
              New Group
            </Link>
          </div>
          <div className="animate-pulse space-y-4 border-t border-line">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-surface-2/50 rounded-lg border border-line" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  const groupBlends = blends.filter(b => b.kind === 'group').length;
  const pairBlends = blends.filter(b => b.kind === 'pair').length;

  return (
    <AppShell profile={profile}>
      <div className="mx-auto max-w-[1000px] px-5 pb-16 sm:px-8 lg:px-14">
        <div className="flex flex-col justify-between gap-5 pb-10 pt-14 sm:flex-row sm:items-end">
          <div>
            <p className="label">Your listening rooms</p>
            <h1 className="serif mt-3 text-6xl tracking-[-.05em]">Blends<span className="text-purple">.</span></h1>
            <p className="serif mt-3 text-lg text-quiet">Persistent spaces for the music you share.</p>
          </div>
          <Link href="/groups/new" className="w-fit bg-purple px-4 py-3 text-sm text-ink flex items-center gap-2">
            <Plus size={16} strokeWidth={2} />
            New Group
          </Link>
        </div>

        {/* Filters and Stats */}
        <div className="border-t border-line pt-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Stats */}
            <div className="flex items-center gap-6 text-sm text-quiet">
              <span className="flex items-center gap-1">
                <Layers3 size={14} strokeWidth={1.5} className="text-purple" />
                {blends.length} total
              </span>
              <span className="flex items-center gap-1">
                <Users size={14} strokeWidth={1.5} className="text-[#aa5c61]" />
                {groupBlends} groups
              </span>
              <span className="flex items-center gap-1">
                <Layers3 size={14} strokeWidth={1.5} className="text-purple" />
                {pairBlends} pairs
              </span>
            </div>

            {/* Filter Controls */}
            <div className="flex items-center gap-3">
              {/* Type Filter */}
              <div className="flex items-center gap-2 border border-line rounded-lg bg-surface px-2">
                <Filter size={14} strokeWidth={1.5} className="text-quiet" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as FilterType)}
                  className="bg-transparent border-none outline-none text-sm text-white cursor-pointer"
                >
                  <option value="all">All</option>
                  <option value="group">Groups</option>
                  <option value="pair">Pairs</option>
                </select>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2 border border-line rounded-lg bg-surface px-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'recent' | 'overlap' | 'name')}
                  className="bg-transparent border-none outline-none text-sm text-white cursor-pointer"
                >
                  <option value="recent">Recent</option>
                  <option value="overlap">Overlap</option>
                  <option value="name">Name</option>
                </select>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={() => setFilter('all')}
                  className="focus-ring flex items-center gap-1.5 text-xs text-quiet hover:text-white transition-colors"
                >
                  <X size={12} strokeWidth={2} />
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-line">
          {filteredBlends.length > 0 ? (
            filteredBlends.map((blend) => (
              <Link
                key={blend.id}
                href={`/blends/${blend.id}`}
                className="group grid gap-4 border-b border-line py-7 sm:grid-cols-[130px_1fr_auto] sm:items-center hover:bg-surface-2/50 transition-colors"
              >
                <span className="grid h-24 w-24 place-items-center bg-surface-2 font-serif text-2xl text-lavender">
                  {blend.kind === 'group' ? (
                    <Users size={28} strokeWidth={1.5} className="text-[#aa5c61]" />
                  ) : (
                    <Layers3 size={28} strokeWidth={1.5} className="text-purple" />
                  )}
                </span>
                <span>
                  <small className="label">{blend.kind === 'group' ? 'Group blend' : 'Pair blend'}</small>
                  <strong className="serif mt-2 block text-3xl font-normal">{blend.name}</strong>
                  <span className="mt-2 block text-xs text-quiet">
                    {blend.kind === 'group' ? `${blend.member_count} members` : blend.members.join(' · ')} · updated {blend.lastUpdated}
                  </span>
                </span>
                <span className="flex items-center gap-4">
                  <strong className="serif text-4xl font-normal">{blend.overlap}%</strong>
                  <ArrowUpRight size={18} className="text-lavender transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))
          ) : (
            <div className="p-12 text-center text-quiet">
              {hasActiveFilters ? (
                <>
                  <Filter size={48} strokeWidth={1.5} className="mx-auto mb-3 opacity-50" />
                  <p>No blends match your filters</p>
                  <p className="text-xs mt-1">Try adjusting your filters or create a new blend</p>
                  <button
                    onClick={() => setFilter('all')}
                    className="mt-4 focus-ring text-purple hover:text-lavender text-sm underline"
                  >
                    Clear filters
                  </button>
                </>
              ) : (
                <>
                  <Layers3 size={48} strokeWidth={1.5} className="mx-auto mb-3 opacity-50" />
                  <p>No blends yet</p>
                  <p className="text-xs mt-1">Add friends or create a group to start blending</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}