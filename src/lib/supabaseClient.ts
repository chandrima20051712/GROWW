'use client';

import { createClient } from '@supabase/supabase-js';

// Browser client used by client components. Auth state (magic-link session)
// lives here so it can be read via useAuth() and attached to API requests.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
