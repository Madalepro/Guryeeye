'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Logo } from '@/components/brand';
import { Button, ErrorBanner } from '@/components/ui';
import { useAuth } from '@/lib/auth';

const DEMO_ACCOUNTS = [
  ['Owner', 'owner@guryeeye.com'],
  ['Front desk', 'frontdesk@guryeeye.com'],
  ['Housekeeping', 'housekeeping@guryeeye.com'],
  ['Cashier', 'cashier@guryeeye.com'],
] as const;

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/workspace');
  }, [loading, user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace('/workspace');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-brand-800 via-brand-900 to-brand-950 p-12 text-white lg:flex">
        <Logo inverted />
        <div>
          <h2 className="font-display text-3xl font-semibold leading-snug">
            Every room, every task, every sale —<br />
            <span className="text-sand-300">live.</span>
          </h2>
          <p className="mt-4 max-w-md text-brand-100/80">
            Sign in to your Hotel Workspace to manage the room grid, housekeeping, point of sale and performance reports.
          </p>
        </div>
        <p className="text-xs text-brand-200/60">© {new Date().getFullYear()} Guryeeye</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold">Sign in</h1>
            <p className="mt-1 text-sm text-ink-muted">Welcome back to your Hotel Workspace.</p>
          </div>
          <ErrorBanner error={error} />
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" type="email" className="input" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input id="password" type="password" className="input" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" loading={submitting}>
            Sign in
          </Button>

          {process.env.NODE_ENV !== 'production' && (
            <div className="rounded-xl border border-dashed border-slate-200 p-3">
              <p className="mb-2 text-xs font-medium text-ink-muted">Demo accounts (password Guryeeye#2026)</p>
              <div className="flex flex-wrap gap-1.5">
                {DEMO_ACCOUNTS.map(([label, addr]) => (
                  <button
                    key={addr}
                    type="button"
                    onClick={() => {
                      setEmail(addr);
                      setPassword('Guryeeye#2026');
                    }}
                    className="rounded-md bg-slate-100 px-2 py-1 text-xs text-ink-muted hover:bg-brand-50 hover:text-brand-800"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
