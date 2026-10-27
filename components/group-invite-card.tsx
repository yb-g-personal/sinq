'use client';

import { useState } from 'react';
import { Check, X, Users } from 'lucide-react';

interface GroupInvite {
  id: string;
  group_name: string;
  invited_by: {
    display_name: string;
    username: string;
  };
  invite_code: string;
  expires_at: string;
  created_at: string;
}

interface GroupInviteCardProps {
  invite: GroupInvite;
  onAccept: (id: string) => Promise<void>;
  onDecline: (id: string) => Promise<void>;
}

export function GroupInviteCard({ invite, onAccept, onDecline }: GroupInviteCardProps) {
  const [actionState, setActionState] = useState<'idle' | 'accepting' | 'declining'>('idle');

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

  function getExpiryStatus(expiresAt: string) {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (diff <= 0) return { text: 'Expired', className: 'text-red-400' };
    if (days > 0) return { text: `${days}d left`, className: 'text-quiet' };
    if (hours > 0) return { text: `${hours}h left`, className: 'text-amber-400' };
    return { text: 'Expiring soon', className: 'text-red-400' };
  }

  async function handleAccept() {
    setActionState('accepting');
    try {
      await onAccept(invite.id);
    } catch (e) {
      console.error('Failed to accept group invite', e);
      setActionState('idle');
    }
  }

  async function handleDecline() {
    setActionState('declining');
    try {
      await onDecline(invite.id);
    } catch (e) {
      console.error('Failed to decline group invite', e);
      setActionState('idle');
    }
  }

  const expiry = getExpiryStatus(invite.expires_at);

  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-4">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-purple/20 font-serif text-sm text-purple mt-0.5"
        >
          <Users size={16} strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <strong className="serif block truncate text-base font-normal">
              {invite.group_name}
            </strong>
            <span className={`text-xs font-medium ${expiry.className}`}>{expiry.text}</span>
          </div>
          <span className="block truncate text-xs text-quiet mt-0.5">
            Invited by {invite.invited_by.display_name} (@{invite.invited_by.username})
          </span>
          <span className="block truncate text-[10px] text-quiet mt-1">
            {formatTime(invite.created_at)} · Code: {invite.invite_code}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {actionState === 'idle' && (
          <>
            <button
              onClick={handleAccept}
              className="focus-ring flex items-center gap-1.5 border border-purple/50 text-purple px-3 py-1.5 text-sm hover:bg-purple/10 transition-colors"
            >
              <Check size={14} strokeWidth={2} />
              Join
            </button>
            <button
              onClick={handleDecline}
              className="focus-ring flex items-center gap-1.5 border border-line text-quiet px-3 py-1.5 text-sm hover:bg-surface-2 hover:text-white transition-colors"
            >
              <X size={14} strokeWidth={2} />
              Decline
            </button>
          </>
        )}
        {actionState === 'accepting' && (
          <span className="text-xs text-purple flex items-center gap-1">
            <Users size={12} strokeWidth={2} className="animate-spin" />
            Joining...
          </span>
        )}
        {actionState === 'declining' && (
          <span className="text-xs text-quiet flex items-center gap-1">
            <X size={12} strokeWidth={2} className="animate-spin" />
            Declining...
          </span>
        )}
      </div>
    </div>
  );
}