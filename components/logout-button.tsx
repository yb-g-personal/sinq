'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/sign-in';
    } catch (e) {
      console.error('Failed to logout', e);
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="focus-ring flex items-center gap-2 border border-line text-quiet px-4 py-2.5 rounded-lg hover:bg-surface-2 hover:text-white hover:border-red-400/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
    >
      <LogOut size={18} strokeWidth={1.5} className="text-red-400" />
      <span className="font-medium">Sign out</span>
      {loading && <span className="animate-spin">⏳</span>}
    </button>
  );
}