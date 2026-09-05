'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper text-ink">
      <div className="w-full max-w-sm border border-rule p-8">
        <h1 className="font-serif text-2xl font-semibold">GROWW</h1>
        <p className="mb-6 mt-1 text-sm text-inksoft">Sign in to sync your watchlist across devices.</p>
        {sent ? (
          <p className="text-sm text-up">Check your email for a sign-in link.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-rule bg-transparent px-3 py-2 text-sm focus:border-ink focus:outline-none"
            />
            <button
              type="submit"
              className="w-full border border-ink bg-ink py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/90"
            >
              Send magic link
            </button>
            {error && <p className="text-sm text-down">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
