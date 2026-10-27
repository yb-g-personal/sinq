'use client';

import { useState } from 'react';
import { Check, X, UserPlus } from 'lucide-react';
import type { Profile } from '@/lib/types';

interface FriendRequest {
  id: string;
  requester: Profile;
  created_at: string;
}

export function FriendRequestCard({
  request,
  onAccept,
  onDecline,
}: {
  request: FriendRequest;
  onAccept: (id: string) => Promise<void>;
  onDecline: (id: string) => Promise<void>;
}) {
  const [actionState, setActionState] = useState<'idle' | 'accepting' | 'declining'>('idle');

  async function handleAccept() {
    setActionState('accepting');
    try {
      await onAccept(request.id);
    } catch (e) {
      console.error('Failed to accept friend request', e);
      setActionState('idle');
    }
  }

  async function handleDecline() {
    setActionState('declining');
    try {
      await onDecline(request.id);
    } catch (e) {
      console.error('Failed to decline friend request', e);
      setActionState('idle');
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 font-serif text-sm text-lavender"
        >
          {request.requester.initials}
        </div>
        <div className="min-w-0">
          <strong className="serif block truncate text-base font-normal">
            {request.requester.displayName}
          </strong>
          <span className="block truncate text-xs text-quiet">
            @{request.requester.username} wants to be your friend
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
              Accept
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
            <UserPlus size={12} strokeWidth={2} className="animate-spin" />
            Accepting...
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