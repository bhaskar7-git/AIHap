import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — Supabase features will be unavailable.');
}

// Service-role client: bypasses RLS — NEVER expose this key in the browser
export const supabase = createClient(
  config.SUPABASE_URL || 'https://placeholder.supabase.co',
  config.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
