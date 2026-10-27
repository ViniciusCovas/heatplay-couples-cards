import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { resolveSupabaseConfig } from '@/lib/supabaseConfig';

// Imported only by online features. Isolated preview routes never initialize
// this module, so they remain usable without a configured database project.
const config = resolveSupabaseConfig({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  VITE_SUPABASE_PROJECT_ID: import.meta.env.VITE_SUPABASE_PROJECT_ID,
}, { allowLocal: import.meta.env.DEV });

export const supabase = createClient<Database>(config.url, config.publishableKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
    timeout: 30000,
    heartbeatIntervalMs: 30000,
  }
});
