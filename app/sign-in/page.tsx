'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from '@/app/actions';
import { AlertCircle } from 'lucide-react';

export default function SignInPage() {
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    // Add remember me to form data
    if (rememberMe) {
      formData.set('remember', 'true');
    }

    try {
      await signIn(formData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed');
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-ink lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-[#24102f] p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#a855f7_0%,#4d216f_30%,transparent_72%)] opacity-70" />
        <Link href="/" className="relative z-10 serif text-4xl tracking-[-.06em]">
          sinq<span className="text-purple">.</span>
        </Link>
        <div className="relative z-10 max-w-md">
          <p className="label">Music, in common</p>
          <h1 className="serif mt-5 text-6xl leading-none">
            Find the songs that sound like <em className="text-lavender">you.</em>
          </h1>
        </div>
        <p className="relative z-10 text-xs text-lavender">Private by default · Free to explore</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link href="/" className="serif text-4xl tracking-[-.06em] lg:hidden">
            sinq<span className="text-purple">.</span>
          </Link>
          <p className="label mt-14 lg:mt-0">Welcome back</p>
          <h2 className="serif mt-3 text-5xl">Sign in<span className="text-purple">.</span></h2>

          <form onSubmit={handleSubmit} className="mt-10 space-y-5">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400 flex items-center gap-2">
                <AlertCircle size={16} strokeWidth={2} />
                {error}
              </div>
            )}

            <label className="block text-sm">
              Email
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="mt-2 w-full border border-line bg-surface px-3 py-3 text-white outline-none focus:border-lavender"
                placeholder="you@example.com"
              />
            </label>

            <label className="block text-sm">
              Password
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="mt-2 w-full border border-line bg-surface px-3 py-3 text-white outline-none focus:border-lavender"
                placeholder="••••••••"
              />
            </label>

            {/* Remember Me */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border border-line bg-surface text-purple focus:ring-2 focus:ring-purple focus:ring-offset-2 focus:ring-offset-ink"
              />
              <span className="text-sm text-quiet">Remember me</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple py-3 text-sm text-ink disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="mt-7 text-center text-xs text-quiet">
            New to sinq? <Link className="text-lavender" href="/sign-up">Create an account</Link>
          </p>

          <div className="mt-6 text-center text-xs text-quiet">
            <p>By continuing, you agree to our</p>
            <div className="flex justify-center gap-4 mt-1">
              <Link href="/terms" className="text-lavender hover:underline">Terms of Service</Link>
              <Link href="/privacy" className="text-lavender hover:underline">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}