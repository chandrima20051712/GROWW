'use client';

import { useAuth } from './AuthProvider';
import { supabase } from '@/lib/supabaseClient';

export default function Header() {
  const { session } = useAuth();
  return (
    <header className="flex items-baseline justify-between border-b border-rule px-6 py-5">
      <div className="flex items-baseline gap-3">
        <h1 className="font-serif text-2xl font-semibold text-ink">GROWW</h1>
        <span className="text-sm text-inksoft">a market bulletin, not a ticker</span>
      </div>
      {session && (
        <div className="flex items-center gap-4 text-sm text-inksoft">
          <span>{session.user.email}</span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="underline decoration-rule underline-offset-4 transition-colors hover:text-ink"
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}
