'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { Plus, Users, Mail, Link2, Copy, Check } from 'lucide-react';
import { GroupInviteCard } from '@/components/group-invite-card';
import { InviteLinkDialog } from '@/components/invite-link-dialog';
import { getCurrentProfile } from '@/lib/data';

interface Group {
  id: string;
  name: string;
  description: string;
  members: string[];
  overlap: number;
  lastUpdated: string;
  owner_id: string;
  member_count: number;
  role: string;
}

interface GroupInvitation {
  id: string;
  group_id: string;
  group_name: string;
  invited_by: {
    display_name: string;
    username: string;
  };
  invite_code: string;
  expires_at: string;
  created_at: string;
}

export default function GroupsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [inviteLinkDialog, setInviteLinkDialog] = useState<{ open: boolean; groupId: string; groupName: string }>({ open: false, groupId: '', groupName: '' });

  useEffect(() => {
    async function loadData() {
      try {
        const [profileRes, blendsRes, invitesRes] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/blends'),
          fetch('/api/groups/invitations'),
        ]);

        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(data);
        }

        if (blendsRes.ok) {
          const blends = await blendsRes.json();
          const groupBlends = blends.filter((b: any) => b.kind === 'group');
          setGroups(groupBlends);
        }

        if (invitesRes.ok) {
          const data = await invitesRes.json();
          setInvitations(data.invitations || []);
        }
      } catch (e) {
        console.error('Failed to load groups data', e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName, description: groupDescription }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create group');
      }
      setGroupName('');
      setGroupDescription('');
      setShowCreateGroup(false);
      // Refresh groups
      const blendsRes = await fetch('/api/blends');
      if (blendsRes.ok) {
        const blends = await blendsRes.json();
        setGroups(blends.filter((b: any) => b.kind === 'group'));
      }
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create group');
    } finally {
      setCreating(false);
    }
  }

  async function handleAcceptInvite(invitationId: string) {
    const res = await fetch(`/api/groups/invitations/${invitationId}/accept`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to accept invitation');
    // Refresh data
    const [blendsRes, invitesRes] = await Promise.all([
      fetch('/api/blends'),
      fetch('/api/groups/invitations'),
    ]);
    if (blendsRes.ok) {
      const blends = await blendsRes.json();
      setGroups(blends.filter((b: any) => b.kind === 'group'));
    }
    if (invitesRes.ok) {
      const data = await invitesRes.json();
      setInvitations(data.invitations || []);
    }
  }

  async function handleDeclineInvite(invitationId: string) {
    const res = await fetch(`/api/groups/invitations/${invitationId}/decline`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to decline invitation');
    const invitesRes = await fetch('/api/groups/invitations');
    if (invitesRes.ok) {
      const data = await invitesRes.json();
      setInvitations(data.invitations || []);
    }
  }

  function openInviteLinkDialog(groupId: string, groupName: string) {
    setInviteLinkDialog({ open: true, groupId, groupName });
  }

  if (loading) {
    return (
      <AppShell profile={profile}>
        <div className="mx-auto max-w-[1000px] px-5 pb-16 sm:px-8 lg:px-14">
          <div className="flex flex-col justify-between gap-5 pb-10 pt-14 sm:flex-row sm:items-end">
            <div>
              <p className="label">Shared rooms</p>
              <h1 className="serif mt-3 text-6xl tracking-[-.05em]">Groups<span className="text-purple">.</span></h1>
              <p className="serif mt-3 text-lg text-quiet">Unlimited rooms, up to 10 people in each.</p>
            </div>
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 bg-surface-2/50 rounded-lg animate-pulse border border-line" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell profile={profile}>
      <div className="mx-auto max-w-[1000px] px-5 pb-16 sm:px-8 lg:px-14">
        <div className="flex flex-col justify-between gap-5 pb-10 pt-14 sm:flex-row sm:items-end">
          <div>
            <p className="label">Shared rooms</p>
            <h1 className="serif mt-3 text-6xl tracking-[-.05em]">Groups<span className="text-purple">.</span></h1>
            <p className="serif mt-3 text-lg text-quiet">Unlimited rooms, up to 10 people in each.</p>
          </div>
          <button
            onClick={() => setShowCreateGroup(true)}
            className="w-fit bg-purple px-4 py-3 text-sm text-ink flex items-center gap-2"
          >
            <Plus size={16} strokeWidth={2} />
            New group
          </button>
        </div>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div className="mb-8">
            <h2 className="label mb-4 flex items-center gap-2">
              <Mail size={16} strokeWidth={1.5} />
              Group Invitations
            </h2>
            <div className="border border-line rounded-xl overflow-hidden">
              {invitations.map((invite) => (
                <GroupInviteCard
                  key={invite.id}
                  invite={invite}
                  onAccept={handleAcceptInvite}
                  onDecline={handleDeclineInvite}
                />
              ))}
            </div>
          </div>
        )}

        {/* Groups List */}
        <div className="border-t border-line">
          {groups.length > 0 ? (
            groups.map((group) => (
              <Link
                key={group.id}
                href={`/blends/${group.id}`}
                className="flex items-center gap-5 border-b border-line py-7 last:border-b-0 hover:bg-surface-2/50 transition-colors"
              >
                <span className="grid h-20 w-20 place-items-center bg-[#aa5c61] font-serif text-2xl">
                  <Users size={24} strokeWidth={1.5} className="text-white" />
                </span>
                <span className="flex-1">
                  <strong className="serif block text-3xl font-normal">{group.name}</strong>
                  <span className="mt-2 block text-xs text-quiet">
                    {group.member_count} members · {group.overlap}% overlap · updated {group.lastUpdated}
                  </span>
                </span>
                {group.role === 'owner' && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      openInviteLinkDialog(group.id, group.name);
                    }}
                    className="flex items-center gap-1.5 text-purple hover:text-lavender transition-colors"
                  >
                    <Link2 size={16} strokeWidth={1.5} />
                    <span className="text-sm">Invite</span>
                  </button>
                )}
                <span className="text-lavender">→</span>
              </Link>
            ))
          ) : (
            <div className="p-12 text-center text-quiet">
              <Users size={48} strokeWidth={1.5} className="mx-auto mb-3 opacity-50" />
              <p>No groups yet</p>
              <p className="text-xs mt-1">Create a group to start blending with friends</p>
            </div>
          )}
        </div>

        {/* Create Group Modal */}
        {showCreateGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreateGroup(false)}>
            <div
              className="w-full max-w-md bg-ink border border-line rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-group-title"
            >
              <div className="p-6 border-b border-line">
                <h2 id="create-group-title" className="serif text-xl font-normal text-white">
                  Create new group
                </h2>
              </div>
              <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
                {createError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                    {createError}
                  </div>
                )}
                <div className="space-y-2">
                  <label htmlFor="group-name" className="block text-sm font-medium text-white">
                    Group Name
                  </label>
                  <input
                    id="group-name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    required
                    maxLength={50}
                    className="w-full bg-surface border border-line rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple focus:border-transparent"
                    placeholder="e.g., nightshift, weekend crew"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="group-description" className="block text-sm font-medium text-white">
                    Description (optional)
                  </label>
                  <textarea
                    id="group-description"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    maxLength={200}
                    rows={3}
                    className="w-full bg-surface border border-line rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple focus:border-transparent resize-none"
                    placeholder="What's this group about?"
                  />
                </div>
                <div className="flex gap-3 pt-4 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setShowCreateGroup(false)}
                    className="flex-1 focus-ring border border-line text-quiet py-2.5 rounded-lg hover:bg-surface-2 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !groupName.trim()}
                    className="flex-1 focus-ring bg-purple px-4 py-2.5 text-sm text-ink rounded-lg hover:bg-purple/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? 'Creating...' : 'Create Group'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Invite Link Dialog */}
        <InviteLinkDialog
          open={inviteLinkDialog.open}
          onClose={() => setInviteLinkDialog({ open: false, groupId: '', groupName: '' })}
          groupId={inviteLinkDialog.groupId}
          groupName={inviteLinkDialog.groupName}
        />
      </div>
    </AppShell>
  );
}