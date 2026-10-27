'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { UserPlus, UserCheck, UserX, Clock, UserMinus, Ban } from 'lucide-react';
import { FriendRequestCard } from '@/components/friend-request-card';
import { FriendCard } from '@/components/friend-card';

interface FriendRequest {
  id: string;
  requester: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    initials: string;
  };
  created_at: string;
  isSent: boolean;
}

interface Friend {
  id: string;
  displayName: string;
  username: string;
  initials: string;
  tone: string;
  status: string;
  friendshipId: string;
}

export default function FriendsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [profileRes, friendsRes, requestsRes] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/friends'),
          fetch('/api/friends/requests'),
        ]);

        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(data);
        }

        if (friendsRes.ok) {
          const data = await friendsRes.json();
          setFriends(data);
        }

        if (requestsRes.ok) {
          const data = await requestsRes.json();
          setReceivedRequests(data.received);
          setSentRequests(data.sent);
        }
      } catch (e) {
        console.error('Failed to load friends data', e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  async function handleAcceptFriend(requestId: string) {
    const res = await fetch(`/api/friends/${requestId}/accept`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to accept friend request');
    // Refresh data
    const [friendsRes, requestsRes] = await Promise.all([
      fetch('/api/friends'),
      fetch('/api/friends/requests'),
    ]);
    if (friendsRes.ok) {
      const data = await friendsRes.json();
      setFriends(data);
    }
    if (requestsRes.ok) {
      const data = await requestsRes.json();
      setReceivedRequests(data.received);
    }
  }

  async function handleDeclineFriend(requestId: string) {
    const res = await fetch(`/api/friends/${requestId}/decline`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to decline friend request');
    const requestsRes = await fetch('/api/friends/requests');
    if (requestsRes.ok) {
      const data = await requestsRes.json();
      setReceivedRequests(data.received);
    }
  }

  async function handleCancelFriend(requestId: string) {
    const res = await fetch(`/api/friends/${requestId}/cancel`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to cancel friend request');
    const requestsRes = await fetch('/api/friends/requests');
    if (requestsRes.ok) {
      const data = await requestsRes.json();
      setSentRequests(data.sent);
    }
  }

  async function handleRemoveFriend(friendshipId: string) {
    const res = await fetch(`/api/friends/${friendshipId}/remove`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to remove friend');
    const [friendsRes, requestsRes] = await Promise.all([
      fetch('/api/friends'),
      fetch('/api/friends/requests'),
    ]);
    if (friendsRes.ok) {
      const data = await friendsRes.json();
      setFriends(data);
    }
  }

  async function handleBlockUser(friendshipId: string) {
    const friend = friends.find(f => f.friendshipId === friendshipId);
    if (!friend) return;
    const res = await fetch('/api/friends/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: friend.username }),
    });
    if (!res.ok) throw new Error('Failed to block user');
    const [friendsRes, requestsRes] = await Promise.all([
      fetch('/api/friends'),
      fetch('/api/friends/requests'),
    ]);
    if (friendsRes.ok) {
      const data = await friendsRes.json();
      setFriends(data);
    }
  }

  if (loading) {
    return (
      <AppShell profile={profile}>
        <div className="mx-auto max-w-[900px] px-5 pb-16 sm:px-8 lg:px-14">
          <div className="flex items-end justify-between pb-10 pt-14">
            <div>
              <p className="label">Your people</p>
              <h1 className="serif mt-3 text-6xl">Friends<span className="text-purple">.</span></h1>
            </div>
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-surface-2/50 rounded-lg animate-pulse border border-line" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell profile={profile}>
      <div className="mx-auto max-w-[900px] px-5 pb-16 sm:px-8 lg:px-14">
        <div className="flex items-end justify-between pb-10 pt-14">
          <div>
            <p className="label">Your people</p>
            <h1 className="serif mt-3 text-6xl">Friends<span className="text-purple">.</span></h1>
          </div>
        </div>

        {/* Received Friend Requests */}
        {receivedRequests.length > 0 && (
          <div className="mb-8">
            <h2 className="label mb-4 flex items-center gap-2">
              <UserCheck size={16} strokeWidth={1.5} />
              Friend Requests
            </h2>
            <div className="border border-line rounded-xl overflow-hidden">
              {receivedRequests.map((request) => (
                <FriendRequestCard
                  key={request.id}
                  request={request}
                  onAccept={handleAcceptFriend}
                  onDecline={handleDeclineFriend}
                />
              ))}
            </div>
          </div>
        )}

        {/* Sent Friend Requests */}
        {sentRequests.length > 0 && (
          <div className="mb-8">
            <h2 className="label mb-4 flex items-center gap-2">
              <Clock size={16} strokeWidth={1.5} />
              Sent Requests
            </h2>
            <div className="border border-line rounded-xl overflow-hidden">
              {sentRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between gap-4 border-b border-line py-4 last:border-b-0">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 font-serif text-sm text-lavender">
                      {request.requester.initials}
                    </div>
                    <div className="min-w-0">
                      <strong className="serif block truncate text-base font-normal">
                        {request.requester.display_name}
                      </strong>
                      <span className="block truncate text-xs text-quiet">
                        @{request.requester.username} · Request sent
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCancelFriend(request.id)}
                    className="focus-ring flex items-center gap-1.5 border border-line text-quiet px-3 py-1.5 text-sm hover:bg-surface-2 hover:text-white transition-colors shrink-0"
                  >
                    <UserX size={14} strokeWidth={2} />
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends List */}
        <div className="border border-line rounded-xl overflow-hidden">
          {friends.length > 0 ? (
            friends.map((friend) => (
              <FriendCard
                key={friend.friendshipId}
                friend={friend}
                friendshipId={friend.friendshipId}
                onRemove={handleRemoveFriend}
                onBlock={handleBlockUser}
              />
            ))
          ) : (
            <div className="p-12 text-center text-quiet">
              <UserPlus size={48} strokeWidth={1.5} className="mx-auto mb-3 opacity-50" />
              <p>No friends yet</p>
              <p className="text-xs mt-1">Send a friend request to get started</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}