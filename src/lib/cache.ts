// Shared symbol-level cache. This is the piece that makes the architecture
// scale: the cron job writes each unique symbol's data here ONCE, and every
// user's watchlist read hits this cache instead of calling Finnhub again.
//
// Uses Upstash Redis (REST API, works from serverless functions) when
// configured. Falls back to an in-process Map otherwise, which is fine for
// local development but note it is NOT shared across serverless instances
// in production — set UPSTASH_REDIS_REST_URL/TOKEN before deploying.

interface MemoryEntry {
  value: unknown;
  expiresAt: number;
}

const memoryStore = new Map<string, MemoryEntry>();

function upstashConfigured() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function upstashCommand(command: (string | number)[]) {
  const res = await fetch(process.env.UPSTASH_REDIS_REST_URL!, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  return res.json();
}

export async function cacheGet<T = unknown>(key: string): Promise<T | null> {
  if (upstashConfigured()) {
    const result = await upstashCommand(['GET', key]);
    return result?.result ? (JSON.parse(result.result) as T) : null;
  }
  const entry = memoryStore.get(key);
  if (!entry || entry.expiresAt < Date.now()) return null;
  return entry.value as T;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  if (upstashConfigured()) {
    await upstashCommand(['SET', key, JSON.stringify(value), 'EX', ttlSeconds]);
    return;
  }
  memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}
