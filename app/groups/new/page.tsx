import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { createGroup } from '@/app/actions';
import { Shield, Users, HelpCircle } from 'lucide-react';

export default function NewGroupPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-xl px-5 pb-16 pt-14 sm:px-8 lg:px-14 lg:pt-20">
        <Link href="/groups" className="text-xs text-lavender">← Groups</Link>
        <p className="label mt-14">Start a shared room</p>
        <h1 className="serif mt-3 text-6xl">New group<span className="text-purple">.</span></h1>
        <p className="serif mt-3 text-lg text-quiet">A group can hold up to 10 members, including you.</p>

        <div className="mt-6 p-4 bg-surface-2/30 border border-line/50 rounded-xl text-xs text-quiet space-y-2">
          <div className="flex items-center gap-2">
            <Users size={14} strokeWidth={1.5} />
            <span>Up to 10 members per group</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield size={14} strokeWidth={1.5} />
            <span>Private by default — only members can see the blend</span>
          </div>
          <div className="flex items-center gap-2">
            <HelpCircle size={14} strokeWidth={1.5} />
            <span>Invite via link or username</span>
          </div>
        </div>

        <form action={createGroup} className="mt-10 space-y-6">
          <label className="block text-sm">
            Group name
            <input name="name" required maxLength={80} className="mt-2 w-full border border-line bg-surface px-3 py-3 outline-none focus:border-lavender" placeholder="nightshift" />
          </label>
          <label className="block text-sm">
            Description <span className="text-quiet">optional</span>
            <textarea name="description" rows={4} className="mt-2 w-full resize-none border border-line bg-surface px-3 py-3 outline-none focus:border-lavender" placeholder="What does this room sound like?" />
          </label>
          <button className="w-full bg-purple px-5 py-3 text-sm text-ink">Create group</button>
        </form>
      </div>
    </AppShell>
  );
}