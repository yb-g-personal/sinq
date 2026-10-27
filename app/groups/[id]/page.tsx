'use client';

import { useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { Users, UserPlus, UserMinus, Link2, Settings, Copy, Check, X, MoreVertical, Trash2, Crown, ArrowUpRight, Layers3, Mail } from 'lucide-react';
import { InviteLinkDialog } from '@/components/invite-link-dialog';
import { GroupInviteCard } from '@/components/group-invite-card';

interface Group {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  created_at: string;
  member_count: number;
  role: string;
}

interface Member {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
  joined_at: string;
  initials: string;
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

interface Blend {
  id: string;
  kind: 'pair' | 'group';
  name: string;
  overlap: number;
  last_refreshed_at: string | null;
}

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [profile, setProfile] = useState<any>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [blend, setBlend] = useState<Blend | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteLinkDialog, setInviteLinkDialog] = useState<{ open: boolean }>({ open: false });
  const [deletingMember, setDeletingMember] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const paramsResolved = await params;
        const [profileRes, groupRes, membersRes, invitesRes, blendsRes] = await Promise.all([
          fetch('/api/profile'),
          fetch(`/api/groups/${paramsResolved.id}`),
          fetch(`/api/groups/${paramsResolved.id}/members`),
          fetch('/api/groups/invitations'),
          fetch('/api/blends'),
        ]);

        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(data);
        }

        if (groupRes.ok) {
          const data = await groupRes.json();
          setGroup(data);
        } else if (groupRes.status === 404) {
          notFound();
        } else {
          throw new Error('Failed to load group');
        }

        if (membersRes.ok) {
          const data = await membersRes.json();
          setMembers(data.members || []);
        }

        if (invitesRes.ok) {
          const data = await invitesRes.json();
          setInvitations(data.invitations || []);
        }

        if (blendsRes.ok) {
          const blends = await blendsRes.json();
          const groupBlend = blends.find((b: any) => b.kind === 'group' && b.group_id === paramsResolved.id);
          if (groupBlend) setBlend(groupBlend);
        }
      } catch (e) {
        console.error('Failed to load group data', e);
        setError(e instanceof Error ? e.message : 'Failed to load group');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params]);

  async function handleAcceptInvite(invitationId: string) {
    const res = await fetch(`/api/groups/invitations/${invitationId}/accept`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to accept invitation');
    // Refresh data
    const [membersRes, invitesRes, blendsRes] = await Promise.all([
      fetch(`/api/groups/${group?.id}/members`),
      fetch('/api/groups/invitations'),
      fetch('/api/blends'),
    ]);
    if (membersRes.ok) {
      const data = await membersRes.json();
      setMembers(data.members || []);
    }
    if (invitesRes.ok) {
      const data = await invitesRes.json();
      setInvitations(data.invitations || []);
    }
    if (blendsRes.ok) {
      const blends = await blendsRes.json();
      const groupBlend = blends.find((b: any) => b.kind === 'group' && b.group_id === group?.id);
      if (groupBlend) setBlend(groupBlend);
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

  async function handleRemoveMember(memberId: string) {
    if (!group) return;
    setDeletingMember(memberId);
    try {
      const res = await fetch(`/api/groups/${group.id}/members/${memberId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove member');
      // Refresh members
      const membersRes = await fetch(`/api/groups/${group.id}/members`);
      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members || []);
      }
    } catch (e) {
      console.error('Failed to remove member', e);
    } finally {
      setDeletingMember(null);
    }
  }

  async function handleLeaveGroup() {
    if (!group) return;
    try {
      const res = await fetch(`/api/groups/${group.id}/leave`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to leave group');
      window.location.href = '/groups';
    } catch (e) {
      console.error('Failed to leave group', e);
    }
  }

  async function handleTransferOwnership(newOwnerId: string) {
    if (!group) return;
    try {
      const res = await fetch(`/api/groups/${group.id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOwnerId }),
      });
      if (!res.ok) throw new Error('Failed to transfer ownership');
      window.location.reload();
    } catch (e) {
      console.error('Failed to transfer ownership', e);
    }
  }

  async function handleDeleteGroup() {
    if (!group) return;
    try {
      const res = await fetch(`/api/groups/${group.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete group');
      window.location.href = '/groups';
    } catch (e) {
      console.error('Failed to delete group', e);
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

  const isOwner = group?.owner_id === profile?.id;
  const currentUserMember = members.find(m => m.id === profile?.id);
  const currentUserRole = currentUserMember?.role || 'member';
  const isMember = members.some(m => m.id === profile?.id);

  if (loading) {
    return (
      <AppShell profile={profile}>
        <div className="mx-auto max-w-[1000px] px-5 pb-16 sm:px-8 lg:px-14">
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

  if (error || !group) {
    return (
      <AppShell profile={profile}>
        <div className="mx-auto max-w-[1000px] px-5 pb-16 sm:px-8 lg:px-14">
          <div className="p-12 text-center text-quiet">
            <p className="text-red-400">Failed to load group</p>
            {error && <p className="text-xs mt-1">{error}</p>}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell profile={profile}>
      <div className="mx-auto max-w-[1000px] px-5 pb-16 sm:px-8 lg:px-14">
        {/* Header */}
        <div className="grid gap-10 border-b border-line pb-12 pt-14 lg:grid-cols-[.7fr_1.3fr] lg:items-end lg:pt-20">
          <div>
            <p className="label">Group · {group.member_count} members</p>
            <h1 className="serif mt-4 text-6xl tracking-[-.06em]">
              {group.name}<span className="text-purple">.</span>
            </h1>
            {group.description && (
              <p className="serif mt-4 max-w-xl text-xl leading-relaxed text-quiet">
                {group.description}
              </p>
            )}
            <p className="mt-5 text-xs text-quiet">
              Created {formatTime(group.created_at)} · {currentUserRole === 'owner' ? 'You are the owner' : `Role: ${currentUserRole}`}
            </p>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            {blend && (
              <Link
                href={`/blends/${blend.id}`}
                className="flex items-center gap-2 bg-purple/10 border border-purple/30 text-purple px-4 py-2 rounded-lg hover:bg-purple/20 transition-colors"
              >
                <Layers3 size={16} strokeWidth={1.5} />
                <span className="text-sm font-medium">Open Blend</span>
                <ArrowUpRight size={14} strokeWidth={2} />
              </Link>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setInviteLinkDialog({ open: true })}
                className="focus-ring flex items-center gap-1.5 border border-purple/50 text-purple px-4 py-2 rounded-lg hover:bg-purple/10 transition-colors"
              >
                <Link2 size={16} strokeWidth={1.5} />
                <span className="hidden sm:inline">Invite</span>
              </button>
              {isOwner && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="focus-ring flex items-center gap-1.5 border border-line text-quiet px-4 py-2 rounded-lg hover:bg-surface-2 hover:text-white transition-colors"
                >
                  <Settings size={16} strokeWidth={1.5} />
                  <span className="hidden sm:inline">Settings</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-14 py-12 lg:grid-cols-[.85fr_1.15fr]">
          {/* Members Section */}
          <section>
            <div className="flex items-end justify-between border-b border-line pb-4">
              <div>
                <p className="label">People</p>
                <h2 className="serif mt-2 text-3xl">Members</h2>
              </div>
              {isOwner && (
                <button
                  onClick={() => setInviteLinkDialog({ open: true })}
                  className="focus-ring flex items-center gap-1.5 border border-purple/50 text-purple px-3 py-1.5 text-sm hover:bg-purple/10 transition-colors"
                >
                  <UserPlus size={14} strokeWidth={2} />
                  Invite
                </button>
              )}
            </div>

            <div className="border border-line rounded-xl overflow-hidden">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="group flex items-center justify-between gap-4 border-b border-line py-4 last:border-b-0"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-serif text-sm text-lavender ${member.role === 'owner' ? 'bg-purple/20' : 'bg-surface-2'}`}>
                      {member.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="serif block truncate text-base font-normal">{member.display_name}</strong>
                        <span className="text-xs text-quiet">@{member.username}</span>
                        {member.role === 'owner' && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-purple/20 text-purple text-[10px] rounded-full">
                            <Crown size={10} strokeWidth={2} />
                            Owner
                          </span>
                        )}
                      </div>
                      <span className="block truncate text-[10px] text-quiet">Joined {formatTime(member.joined_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isOwner && member.id !== profile?.id && (
                      <>
                        {currentUserRole === 'owner' && (
                          <button
                            onClick={() => handleTransferOwnership(member.id)}
                            className="focus-ring p-2 text-quiet hover:text-lavender hover:bg-surface-2 transition-colors"
                            aria-label="Transfer ownership"
                          >
                            <Crown size={16} strokeWidth={1.5} />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={deletingMember === member.id}
                          className="focus-ring p-2 text-quiet hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
                          aria-label="Remove member"
                        >
                          {deletingMember === member.id ? (
                            <span className="animate-spin">⏳</span>
                          ) : (
                            <UserMinus size={16} strokeWidth={1.8} />
                          )}
                        </button>
                      </>
                    )}
                    {!isOwner && member.id === profile?.id && (
                      <button
                        onClick={handleLeaveGroup}
                        className="focus-ring flex items-center gap-1.5 border border-red-400/50 text-red-400 px-3 py-1.5 text-sm hover:bg-red-400/10 transition-colors"
                      >
                        <Users size={14} strokeWidth={1.8} />
                        Leave
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Pending Invitations & Settings */}
          <section className="space-y-8">
            {/* Pending Invitations */}
            {invitations.length > 0 && (
              <div>
                <div className="flex items-end justify-between border-b border-line pb-4">
                  <div>
                    <p className="label">Pending</p>
                    <h2 className="serif mt-2 text-3xl">Invitations</h2>
                  </div>
                </div>
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

            {/* Group Settings (Owner only) */}
            {isOwner && showSettings && (
              <div className="border border-line rounded-xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="serif text-2xl font-normal">Group Settings</h3>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="focus-ring p-1 text-quiet hover:text-white"
                  >
                    <X size={20} strokeWidth={2} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 border border-line rounded-lg">
                    <h4 className="serif text-lg font-normal mb-2">Transfer Ownership</h4>
                    <p className="text-sm text-quiet mb-4">Make another member the group owner. This action cannot be undone.</p>
                    <div className="flex flex-wrap gap-2">
                      {members
                        .filter(m => m.id !== profile?.id && m.role !== 'owner')
                        .map((member) => (
                          <button
                            key={member.id}
                            onClick={() => handleTransferOwnership(member.id)}
                            className="focus-ring border border-line text-quiet px-3 py-1.5 text-sm rounded-lg hover:bg-surface-2 hover:text-white transition-colors"
                          >
                            {member.display_name} (@{member.username})
                          </button>
                        ))}
                    </div>
                    {members.filter(m => m.id !== profile?.id && m.role !== 'owner').length === 0 && (
                      <p className="text-sm text-quiet">No other members to transfer ownership to.</p>
                    )}
                  </div>

                  <div className="p-4 border border-red-400/30 bg-red-500/5 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Trash2 size={24} strokeWidth={1.5} className="text-red-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="serif text-lg font-normal text-white">Delete Group</h4>
                        <p className="text-sm text-quiet mt-1">
                          Permanently delete this group and its blend. This action cannot be undone.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleDeleteGroup}
                      className="mt-4 focus-ring border border-red-400/50 text-red-400 px-4 py-2 text-sm hover:bg-red-400/10 w-full"
                    >
                      Delete Group
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Blend Link */}
            {blend && (
              <div className="border border-line rounded-xl p-6">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-purple/20">
                    <Layers3 size={24} strokeWidth={1.5} className="text-purple" />
                  </div>
                  <div>
                    <strong className="serif block text-xl font-normal">Group Blend</strong>
                    <span className="text-xs text-quiet">{blend.overlap}% overlap · Updated {blend.last_refreshed_at ? new Date(blend.last_refreshed_at).toLocaleDateString() : 'never'}</span>
                  </div>
                </div>
                <Link
                  href={`/blends/${blend.id}`}
                  className="mt-4 inline-flex items-center gap-2 text-purple hover:text-lavender"
                >
                  <ArrowUpRight size={16} strokeWidth={2} />
                  View Blend
                </Link>
              </div>
            )}
          </section>
        </div>

        {/* Invite Link Dialog */}
        <InviteLinkDialog
          open={inviteLinkDialog.open}
          onClose={() => setInviteLinkDialog({ open: false })}
          groupId={group.id}
          groupName={group.name}
        />
      </div>
    </AppShell>
  );
}