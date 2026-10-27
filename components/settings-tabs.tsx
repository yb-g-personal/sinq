'use client';

import { useState } from 'react';
import { User, Shield, Key, Database, LogOut, Trash2, Link2, Music, Bell, UserMinus } from 'lucide-react';

type Tab = 'profile' | 'privacy' | 'services' | 'notifications' | 'account' | 'danger';

interface SettingsTabsProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; description: string }[] = [
  { id: 'profile', label: 'Profile', icon: User, description: 'Display name, username, bio, avatar' },
  { id: 'privacy', label: 'Privacy', icon: Shield, description: 'Who can find you, friend requests, blocked users' },
  { id: 'services', label: 'Services', icon: Music, description: 'Connected music services (Last.fm, Spotify, Apple Music)' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Manage notification preferences' },
  { id: 'account', label: 'Account', icon: Key, description: 'Password, email, sessions' },
  { id: 'danger', label: 'Danger Zone', icon: Trash2, description: 'Delete account, export data' },
];

export function SettingsTabs({ activeTab, onTabChange }: SettingsTabsProps) {
  return (
    <nav className="flex flex-col gap-1 border-r border-line pr-4 lg:w-64 shrink-0" aria-label="Settings sections">
      {tabs.map(({ id, label, icon: Icon, description }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={`focus-ring flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
            activeTab === id
              ? 'bg-surface-2 text-white'
              : 'text-quiet hover:text-white hover:bg-surface-2/50'
          }`}
        >
          <Icon size={18} strokeWidth={1.5} className="shrink-0" />
          <div className="min-w-0">
            <strong className="block text-sm font-normal truncate">{label}</strong>
            <span className="block text-xs truncate opacity-70">{description}</span>
          </div>
        </button>
      ))}
    </nav>
  );
}