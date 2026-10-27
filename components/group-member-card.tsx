'use client';

import { useState } from 'react';
import { UserMinus, Crown, Shield, UserX } from 'lucide-react';
import type { Profile } from '@/lib/types';

type MemberRole = 'owner' | 'admin' | 'member';

interface GroupMemberCardProps {
  member: Profile & { role: MemberRole; joinedAt: string };
  currentUserId: string;
  groupId: string;
  onRemove: (userId: string) => Promise<void>;
  onTransferOwnership: (userId: string) => Promise<void>;
  onToggleAdmin: (userId: string, makeAdmin: boolean) => Promise<void>;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (days < 1) return 'joined today';
  if (days < 7) return `joined ${days}d ago`;
  if (days < 30) return `joined ${Math.floor(days / 7)}w ago`;
  if (months < 12) return `joined ${months}mo ago`;
  return `joined ${years}y ago`;
}

export function GroupMemberCard({
  member,
  currentUserId,
  groupId,
  onRemove,
  onTransferOwnership,
  onToggleAdmin,
}: GroupMemberCardProps) {
  const [actionState, setActionState] = useState<'idle' | 'removing' | 'transferring' | 'toggling'>('idle');
  const [showConfirm, setShowConfirm] = useState<'remove' | 'transfer' | null>(null);
  const isOwner = member.role === 'owner';
  const isSelf = member.id === currentUserId;
  const isCurrentUserOwner = false; // This would be passed in or determined from context

  async function handleRemove() {
    setActionState('removing');
    try {
      await onRemove(member.id);
    } catch (e) {
      console.error('Failed to remove member', e);
      setActionState('idle');
      setShowConfirm(null);
    }
  }

  async function handleTransferOwnership() {
    setActionState('transferring');
    try {
      await onTransferOwnership(member.id);
    } catch (e) {
      console.error('Failed to transfer ownership', e);
      setActionState('idle');
      setShowConfirm(null);
    }
  }

  async function handleToggleAdmin() {
    setActionState('toggling');
    try {
      await onToggleAdmin(member.id, member.role !== 'admin');
    } catch (e) {
      console.error('Failed to toggle admin', e);
      setActionState('idle');
    }
  }

  const roleConfig = {
    owner: { label: 'Owner', icon: Crown, color: 'text-purple', bg: 'bg-purple/20' },
    admin: { label: 'Admin', icon: Shield, color: 'text-lavender', bg: 'bg-lavender/20' },
    member: { label: 'Member', icon: UserX, color: 'text-quiet', bg: 'bg-surface-2' },
  };

  const { label: roleLabel, icon: RoleIcon, color: roleColor, bg: roleBg } = roleConfig[member.role];

  return (
    <div className="group flex items-center justify-between gap-4 border-b border-line py-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 font-serif text-sm text-lavender"
        >
          {member.initials}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <strong className="serif block truncate text-base font-normal">
              {member.displayName}
            </strong>
            {isSelf && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-purple/20 text-purple font-medium">
                You
              </span>
            )}
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleBg} ${roleColor} whitespace-nowrap`}
            >
              <RoleIcon size={10} strokeWidth={2} className="inline-block align-middle mr-0.5" />
              {roleLabel}
            </span>
          </div>
          <span className="block truncate text-xs text-quiet">
            @{member.username} · {formatDate(member.joinedAt)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
        {isOwner && !isSelf && (
          <>
            <button
              onClick={() => setShowConfirm('transfer')}
              className="focus-ring p-2 text-quiet hover:text-purple hover:bg-purple/10 transition-colors"
              aria-label="Transfer ownership"
              title="Transfer ownership"
            >
              <Crown size={16} strokeWidth={1.8} className="text-purple" />
            </button>
          </>
        )}
        {!isOwner && isCurrentUserOwner && (
          <>
            <button
              onClick={handleToggleAdmin}
              disabled={actionState === 'toggling'}
              className={`focus-ring p-2 transition-colors ${
                member.role === 'admin'
                  ? 'text-lavender hover:bg-lavender/10'
                  : 'text-quiet hover:text-lavender hover:bg-lavender/10'
              }`}
              aria-label={member.role === 'admin' ? 'Remove admin' : 'Make admin'}
              title={member.role === 'admin' ? 'Remove admin' : 'Make admin'}
            >
              <Shield size={16} strokeWidth={member.role === 'admin' ? 2.5 : 1.8} className={member.role === 'admin' ? 'text-lavender' : ''} />
            </button>
          </>
        )}
        {isCurrentUserOwner && !isSelf && !isOwner && (
          <>
            <button
              onClick={() => setShowConfirm('remove')}
              className="focus-ring p-2 text-quiet hover:text-red-400 hover:bg-red-400/10 transition-colors"
              aria-label="Remove member"
            >
              <UserMinus size={16} strokeWidth={1.8} />
            </button>
          </>
        )}
        {showConfirm === 'remove' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-quiet">Remove?</span>
            <button
              onClick={handleRemove}
              className="focus-ring text-xs text-red-400 hover:text-red-300"
              disabled={actionState === 'removing'}
            >
              Yes
            </button>
            <button
              onClick={() => setShowConfirm(null)}
              className="focus-ring text-xs text-quiet hover:text-white"
            >
              No
            </button>
          </div>
        )}
        {showConfirm === 'transfer' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-quiet">Transfer ownership?</span>
            <button
              onClick={handleTransferOwnership}
              className="focus-ring text-xs text-purple hover:text-lavender"
              disabled={actionState === 'transferring'}
            >
              Yes
            </button>
            <button
              onClick={() => setShowConfirm(null)}
              className="focus-ring text-xs text-quiet hover:text-white"
            >
              No
            </button>
          </div>
        )}
        {actionState === 'removing' && (
          <span className="text-xs text-quiet">Removing...</span>
        )}
        {actionState === 'transferring' && (
          <span className="text-xs text-purple">Transferring...</span>
        )}
      </div>
    </div>
  );
}