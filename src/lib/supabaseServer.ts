import { createClient } from '@supabase/supabase-js';

// Admin client bypasses row-level security entirely. Only ever use this
// inside the cron job / trusted server code, never in a route that echoes
// back arbitrary user input without scoping it yourself.
export function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Per-request client scoped to the calling user's JWT. Row-level security
// policies apply normally, so a user can only ever see/modify their own
// watchlist and snapshot rows.
export function getUserClient(accessToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );
}

export function getBearerToken(req: Request): string | null {
  const header = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7);
}
