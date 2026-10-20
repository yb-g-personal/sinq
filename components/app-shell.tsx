'use client';
import Link from 'next/link';
import { Home, Layers3, Users, Disc3, SlidersHorizontal, Bell } from 'lucide-react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { currentProfile, sampleMode } from '@/lib/sample-data';
import type { Profile } from '@/lib/types';
import { logout } from '@/app/actions';

const links = [{ href: '/', label: 'Home', icon: Home }, { href: '/blends', label: 'Blends', icon: Layers3 }, { href: '/friends', label: 'Friends', icon: Users }, { href: '/groups', label: 'Groups', icon: Disc3 }, { href: '/services', label: 'Services', icon: SlidersHorizontal }] as const;

type Notice = { kind: 'success' | 'error'; message: string };

function NoticeToast() {
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('notice');
    if (!raw) return;
    const separator = raw.indexOf('|');
    if (separator < 1) return;
    const kind = raw.slice(0, separator);
    const message = raw.slice(separator + 1);
    if (kind !== 'success' && kind !== 'error') return;
    setNotice({ kind, message });
    params.delete('notice');
    const query = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
    const timeout = window.setTimeout(() => setNotice(null), 4800);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!notice) return null;
  const success = notice.kind === 'success';
  return <div className="notification-toast fixed bottom-20 right-5 z-50 flex max-w-[min(92vw,380px)] items-start gap-3 border border-line bg-surface px-4 py-3 shadow-2xl lg:bottom-6 lg:right-8" role={success ? 'status' : 'alert'} aria-live="polite"><span className={success ? 'text-signal' : 'text-[#f4b6cc]'}>{success ? <CheckCircle2 size={19}/> : <AlertCircle size={19}/>}</span><p className="flex-1 text-sm leading-relaxed">{notice.message}</p><button aria-label="Dismiss notification" onClick={() => setNotice(null)} className="focus-ring text-quiet hover:text-white"><X size={16}/></button></div>;
}

export function AppShell({ children, profile }: { children: React.ReactNode; profile?: Profile | null }) {
  const pathname = usePathname();
  const displayedProfile = profile ?? currentProfile;
  return <div className="min-h-screen bg-ink"><NoticeToast/><aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-line bg-ink px-7 py-8 lg:flex"><Link href="/" className="serif text-4xl tracking-[-.06em] focus-ring">sinq<span className="text-purple">.</span></Link><p className="label mb-5 mt-16">Your listening room</p><nav className="grid gap-1">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`focus-ring flex items-center gap-3 border-l-2 px-3 py-3 text-sm transition-colors ${pathname === href || pathname.startsWith(href + '/') ? 'border-purple bg-surface-2 text-white' : 'border-transparent text-quiet hover:text-white'}`}><Icon size={17} strokeWidth={1.4} />{label}</Link>)}</nav><div className="mt-auto"><Link href="/settings" className="focus-ring flex items-center gap-3 border-t border-line pt-5"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#dec4f7] text-sm text-ink">{displayedProfile.initials}</span><span><strong className="block text-sm font-normal">{displayedProfile.displayName}</strong><small className="text-xs text-quiet">@{displayedProfile.username}</small></span></Link><form action={logout} className="mt-5 border-t border-line pt-4"><button className="text-xs text-quiet transition hover:text-white">Log out</button></form></div></aside><main className="pb-20 lg:ml-64 lg:pb-0"><header className="flex h-16 items-center justify-between px-5 sm:px-8 lg:justify-end lg:px-14"><Link href="/" className="serif text-3xl tracking-[-.06em] lg:hidden">sinq<span className="text-purple">.</span></Link><div className="flex items-center gap-4 text-quiet"><Link href="/friends" aria-label="Friend requests" className="relative focus-ring"><Bell size={18} strokeWidth={1.4} /><i className="absolute right-0 top-0 h-1 w-1 rounded-full bg-purple" /></Link></div></header>{sampleMode && <div className="mx-5 border-y border-purple/30 bg-purple/5 px-4 py-2 text-xs text-lavender sm:mx-8 lg:mx-14">Sample mode · add Supabase keys to connect your account and live data.</div>}{children}</main><nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-line bg-ink/95 py-3 backdrop-blur lg:hidden">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`flex flex-col items-center gap-1 text-[10px] ${pathname === href ? 'text-lavender' : 'text-quiet'}`}><Icon size={18} strokeWidth={1.4} />{label}</Link>)}</nav></div>;
}
