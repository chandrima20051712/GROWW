'use client';

import ScoreBadge from './ScoreBadge';
import type { SymbolSnapshot } from '@/lib/types';

interface Row {
  id: string;
  symbol: string;
  notes: string | null;
  quote: SymbolSnapshot | null;
}

export default function WatchlistTable({ items, onRemove }: { items: Row[]; onRemove: (id: string) => void }) {
  if (!items.length) {
    return <p className="text-sm text-inksoft">Nothing on your list yet. Add a symbol above.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-rule text-left text-inksoft">
          <th className="py-2 font-normal">Symbol</th>
          <th className="py-2 font-normal">Price</th>
          <th className="py-2 font-normal">Change</th>
          <th className="py-2 font-normal">Attention</th>
          <th className="py-2 font-normal">As of</th>
          <th className="py-2"></th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const q = item.quote;
          const positive = q ? q.dayChangePct >= 0 : true;
          return (
            <tr key={item.id} className="border-b border-rule">
              <td className="py-3 font-mono font-medium text-ink">{item.symbol}</td>
              <td className="py-3 font-mono text-ink">{q ? `$${q.price.toFixed(2)}` : '—'}</td>
              <td className={`py-3 font-mono ${positive ? 'text-up' : 'text-down'}`}>
                {q ? `${positive ? '+' : ''}${q.dayChangePct}%` : '—'}
              </td>
              <td className="py-3">{q ? <ScoreBadge score={q.attentionScore} /> : '—'}</td>
              <td className="py-3 text-xs text-inksoft">
                {q ? new Date(q.asOf).toLocaleTimeString() : 'no data yet'}
                {q?.stale && <span className="ml-1 text-signal">delayed</span>}
              </td>
              <td className="py-3 text-right">
                <button
                  onClick={() => onRemove(item.id)}
                  className="text-xs text-inksoft underline decoration-rule underline-offset-4 transition-colors hover:text-down"
                >
                  remove
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
