'use client';

import { useState } from 'react';
import { UserMinus, Ban } from 'lucide-react';
import type { Profile } from '@/lib/types';

interface FriendCardProps {
  friend: Profile;
  friendshipId: string;
  onRemove: (id: string) => Promise<void>;
  onBlock: (id: string) => Promise<void>;
}

export function FriendCard({ friend, friendshipId, onRemove, onBlock }: FriendCardProps) {
  const [actionState, setActionState] = useState<'idle' | 'removing' | 'blocking'>('idle');
  const [showConfirm, setShowConfirm] = useState<'remove' | 'block' | null>(null);

  async function handleRemove() {
    setActionState('removing');
    try {
      await onRemove(friendshipId);
    } catch (e) {
      console.error('Failed to remove friend', e);
      setActionState('idle');
      setShowConfirm(null);
    }
  }

  async function handleBlock() {
    setActionState('blocking');
    try {
      await onBlock(friendshipId);
    } catch (e) {
      console.error('Failed to block user', e);
      setActionState('idle');
      setShowConfirm(null);
    }
  }

  return (
    <div className="group flex items-center justify-between gap-4 border-b border-line py-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 font-serif text-sm text-lavender"
        >
          {friend.initials}
        </div>
        <div className="min-w-0">
          <strong className="serif block truncate text-base font-normal">
            {friend.displayName}
          </strong>
          <span className="block truncate text-xs text-quiet">@{friend.username}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
        {actionState === 'idle' && !showConfirm && (
          <>
            <button
              onClick={() => setShowConfirm('remove')}
              className="focus-ring p-2 text-quiet hover:text-red-400 hover:bg-red-400/10 transition-colors"
              aria-label="Remove friend"
            >
              <UserMinus size={16} strokeWidth={1.8} />
            </button>
            <button
              onClick={() => setShowConfirm('block')}
              className="focus-ring p-2 text-quiet hover:text-red-400 hover:bg-red-400/10 transition-colors"
              aria-label="Block user"
            >
              <Ban size={16} strokeWidth={1.8} />
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
        {showConfirm === 'block' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-quiet">Block?</span>
            <button
              onClick={handleBlock}
              className="focus-ring text-xs text-red-400 hover:text-red-300"
              disabled={actionState === 'blocking'}
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
        {actionState === 'blocking' && (
          <span className="text-xs text-quiet">Blocking...</span>
        )}
      </div>
    </div>
  );
}