'use client';

import { useState } from 'react';

export default function AddSymbolForm({ onAdd }: { onAdd: (symbol: string) => Promise<void> }) {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setSubmitting(true);
    await onAdd(value.trim().toUpperCase());
    setValue('');
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 border-b border-rule pb-4">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a symbol — AAPL, TSLA, SPY…"
        className="flex-1 border border-rule bg-transparent px-3 py-2 font-mono text-sm text-ink placeholder:text-inksoft focus:border-ink focus:outline-none"
      />
      <button
        disabled={submitting}
        className="border border-ink bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/90 disabled:opacity-50"
      >
        Add
      </button>
    </form>
  );
}
