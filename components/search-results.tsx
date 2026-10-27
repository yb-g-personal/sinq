'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { UserPlus, Search, X, User, Check } from 'lucide-react';
import type { Profile } from '@/lib/types';

interface SearchResult {
  profile: Profile;
  friendshipStatus: 'none' | 'pending_outgoing' | 'pending_incoming' | 'friends' | 'blocked';
}

interface SearchResultsProps {
  query: string;
  onSearch: (query: string) => Promise<SearchResult[]>;
  onAddFriend: (userId: string) => Promise<void>;
  onAcceptRequest: (userId: string) => Promise<void>;
  onRemoveFriend: (userId: string) => Promise<void>;
  onCancelRequest: (userId: string) => Promise<void>;
  currentUserId: string;
}

export function SearchResults({
  query,
  onSearch,
  onAddFriend,
  onAcceptRequest,
  onRemoveFriend,
  onCancelRequest,
  currentUserId,
}: SearchResultsProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionStates, setActionStates] = useState<Record<string, 'idle' | 'loading'>>({});
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await onSearch(query);
        setResults(data);
      } catch (e) {
        console.error('Search failed', e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, onSearch]);

  const getActionState = useCallback((userId: string) => {
    return actionStates[userId] || 'idle';
  }, [actionStates]);

  const setActionState = useCallback((userId: string, state: 'idle' | 'loading') => {
    setActionStates((prev) => ({ ...prev, [userId]: state }));
  }, []);

  async function handleAddFriend(userId: string) {
    setActionState(userId, 'loading');
    try {
      await onAddFriend(userId);
      setResults((prev) =>
        prev.map((r) =>
          r.profile.id === userId
            ? { ...r, friendshipStatus: 'pending_outgoing' }
            : r
        )
      );
    } catch (e) {
      console.error('Failed to add friend', e);
    } finally {
      setActionState(userId, 'idle');
    }
  }

  async function handleAcceptRequest(userId: string) {
    setActionState(userId, 'loading');
    try {
      await onAcceptRequest(userId);
      setResults((prev) =>
        prev.map((r) =>
          r.profile.id === userId
            ? { ...r, friendshipStatus: 'friends' }
            : r
        )
      );
    } catch (e) {
      console.error('Failed to accept request', e);
    } finally {
      setActionState(userId, 'idle');
    }
  }

  async function handleRemoveFriend(userId: string) {
    setActionState(userId, 'loading');
    try {
      await onRemoveFriend(userId);
      setResults((prev) =>
        prev.map((r) =>
          r.profile.id === userId
            ? { ...r, friendshipStatus: 'none' }
            : r
        )
      );
    } catch (e) {
      console.error('Failed to remove friend', e);
    } finally {
      setActionState(userId, 'idle');
    }
  }

  async function handleCancelRequest(userId: string) {
    setActionState(userId, 'loading');
    try {
      await onCancelRequest(userId);
      setResults((prev) =>
        prev.map((r) =>
          r.profile.id === userId
            ? { ...r, friendshipStatus: 'none' }
            : r
        )
      );
    } catch (e) {
      console.error('Failed to cancel request', e);
    } finally {
      setActionState(userId, 'idle');
    }
  }

  if (!query.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-quiet">
        <Search size={32} strokeWidth={1.2} className="opacity-50" />
        <p className="mt-3 text-sm">Search for users to add as friends</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple/30 border-t-purple" />
        <span className="sr-only">Searching...</span>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-quiet">
        <User size={32} strokeWidth={1.2} className="opacity-50" />
        <p className="mt-3 text-sm">No users found for "{query}"</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-line">
      {results.map((result) => {
        const { profile, friendshipStatus } = result;
        const isSelf = profile.id === currentUserId;
        const actionState = getActionState(profile.id);
        const isLoading = actionState === 'loading';

        const getActionButtons = () => {
          if (isSelf) {
            return (
              <span className="text-xs text-quiet shrink-0">You</span>
            );
          }

          switch (friendshipStatus) {
            case 'friends':
              return (
                <button
                  onClick={() => handleRemoveFriend(profile.id)}
                  disabled={isLoading}
                  className="focus-ring flex items-center gap-1.5 border border-red-400/50 text-red-400 px-3 py-1.5 text-sm hover:bg-red-400/10 transition-colors disabled:opacity-50"
                >
                  <UserMinus size={14} strokeWidth={2} />
                  Remove
                </button>
              );
            case 'pending_outgoing':
              return (
                <button
                  onClick={() => handleCancelRequest(profile.id)}
                  disabled={isLoading}
                  className="focus-ring flex items-center gap-1.5 border border-line text-quiet px-3 py-1.5 text-sm hover:bg-surface-2 hover:text-white transition-colors disabled:opacity-50"
                >
                  <X size={14} strokeWidth={2} />
                  Cancel
                </button>
              );
            case 'pending_incoming':
              return (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleAcceptRequest(profile.id)}
                    disabled={isLoading}
                    className="focus-ring flex items-center gap-1.5 border border-purple/50 text-purple px-3 py-1.5 text-sm hover:bg-purple/10 transition-colors disabled:opacity-50"
                  >
                    <Check size={14} strokeWidth={2} />
                    Accept
                  </button>
                  <button
                    onClick={() => handleCancelRequest(profile.id)}
                    disabled={isLoading}
                    className="focus-ring flex items-center gap-1.5 border border-line text-quiet px-3 py-1.5 text-sm hover:bg-surface-2 hover:text-white transition-colors disabled:opacity-50"
                  >
                    <X size={14} strokeWidth={2} />
                    Decline
                  </button>
                </div>
              );
            case 'blocked':
              return (
                <span className="text-xs text-red-400 shrink-0">Blocked</span>
              );
            default:
              return (
                <button
                  onClick={() => handleAddFriend(profile.id)}
                  disabled={isLoading}
                  className="focus-ring flex items-center gap-1.5 border border-purple/50 text-purple px-3 py-1.5 text-sm hover:bg-purple/10 transition-colors disabled:opacity-50"
                >
                  <UserPlus size={14} strokeWidth={2} />
                  Add Friend
                </button>
              );
          }
        };

        return (
          <div key={profile.id} className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 font-serif text-sm text-lavender"
              >
                {profile.initials}
              </div>
              <div className="min-w-0">
                <strong className="serif block truncate text-base font-normal">
                  {profile.displayName}
                </strong>
                <span className="block truncate text-xs text-quiet">@{profile.username}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {getActionButtons()}
              {isLoading && (
                <span className="text-xs text-purple flex items-center gap-1">
                  <div className="h-4 w-4 animate-spin rounded-full border border-purple/30 border-t-purple" />
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}