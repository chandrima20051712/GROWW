'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import Header from '@/components/Header';
import AddSymbolForm from '@/components/AddSymbolForm';
import WatchlistTable from '@/components/WatchlistTable';
import ChangeFeed from '@/components/ChangeFeed';
import type { ChangeCard, SymbolSnapshot } from '@/lib/types';

interface WatchlistRow {
  id: string;
  symbol: string;
  notes: string | null;
  quote: SymbolSnapshot | null;
}

export default function DashboardPage() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<WatchlistRow[]>([]);
  const [cards, setCards] = useState<ChangeCard[]>([]);
  const [fetching, setFetching] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setFetching(true);
    const headers = { Authorization: `Bearer ${session.access_token}` };
    const [wlRes, digestRes] = await Promise.all([
      fetch('/api/watchlist', { headers }),
      fetch('/api/digest', { headers }),
    ]);
    const wl = await wlRes.json();
    const digest = await digestRes.json();
    setItems(wl.items ?? []);
    setCards(digest.cards ?? []);
    setFetching(false);
  }, [session]);

  useEffect(() => {
    if (!loading && !session) router.push('/login');
  }, [loading, session, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(symbol: string) {
    if (!session) return;
    await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ symbol }),
    });
    await load();
  }

  async function handleRefresh() {
    if (!session) return;
    setRefreshing(true);
    setRefreshMessage(null);
    const res = await fetch('/api/refresh', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.status === 429) {
      setRefreshMessage('Just refreshed — try again shortly.');
    } else if (!res.ok) {
      setRefreshMessage('Refresh failed — try again in a moment.');
    } else {
      await load();
      setRefreshMessage('Updated just now.');
    }
    setRefreshing(false);
  }

  async function handleRemove(id: string) {
    if (!session) return;
    await fetch(`/api/watchlist?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    await load();
  }

  if (loading || !session) return null;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Header />
      <main className="mx-auto max-w-3xl space-y-12 px-6 py-10">
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-lg font-semibold text-ink">What&apos;s changed</h2>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-xs text-inksoft underline decoration-rule underline-offset-4 transition-colors hover:text-ink disabled:opacity-50"
            >
              {refreshing ? 'Refreshing…' : 'Refresh now'}
            </button>
          </div>
          <p className="mb-2 text-sm text-inksoft">
            Since your last visit — ranked by how much it deserves your attention.
          </p>
          {refreshMessage && <p className="mb-4 text-xs text-signal">{refreshMessage}</p>}
          {fetching ? <p className="text-sm text-inksoft">Loading…</p> : <ChangeFeed cards={cards} />}
        </section>

        <section>
          <h2 className="mb-4 font-serif text-lg font-semibold text-ink">Your watchlist</h2>
          <div className="mb-4">
            <AddSymbolForm onAdd={handleAdd} />
          </div>
          <WatchlistTable items={items} onRemove={handleRemove} />
        </section>
      </main>
    </div>
  );
}