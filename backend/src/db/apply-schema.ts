/**
 * apply-schema.ts — Applies schema.sql directly via Supabase PostgreSQL connection
 * Run: npx tsx src/db/apply-schema.ts
 */
import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// We'll create tables one by one using Supabase's ability to run
// raw SQL via the pg REST endpoint with service role
async function execSQL(sql: string, label: string) {
  const res = await fetch(`${config.SUPABASE_URL}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': config.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${config.SUPABASE_SERVICE_ROLE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const err = await res.text();
    // If 404, the exec RPC doesn't exist — expected
    if (res.status === 404) return false;
    throw new Error(`${label}: ${err}`);
  }
  console.log(`  ✓ ${label}`);
  return true;
}

async function applySchema() {
  console.log('🔧 Attempting to apply schema via Supabase...\n');
  
  const statements = [
    ['CREATE TABLE IF NOT EXISTS public.profiles (id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, name VARCHAR(255) NOT NULL, phone VARCHAR(50) NOT NULL DEFAULT \'\', role VARCHAR(50) NOT NULL DEFAULT \'PATIENT\' CHECK (role IN (\'PATIENT\', \'DOCTOR\', \'ADMIN\')), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())', 'profiles table'],
    ['CREATE TABLE IF NOT EXISTS public.hospitals (id VARCHAR(36) PRIMARY KEY, name VARCHAR(255) NOT NULL, address TEXT NOT NULL, city VARCHAR(100) NOT NULL, phone VARCHAR(50) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())', 'hospitals table'],
    ['CREATE TABLE IF NOT EXISTS public.departments (id VARCHAR(36) PRIMARY KEY, hospital_id VARCHAR(36) NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE, name VARCHAR(255) NOT NULL, description TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())', 'departments table'],
    ['CREATE TABLE IF NOT EXISTS public.doctors (id VARCHAR(36) PRIMARY KEY, user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, hospital_id VARCHAR(36) NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE, department_id VARCHAR(36) NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE, specialization VARCHAR(255) NOT NULL, qualification VARCHAR(255) NOT NULL, average_consultation_time INTEGER NOT NULL DEFAULT 10, available BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())', 'doctors table'],
    ['CREATE TABLE IF NOT EXISTS public.appointments (id VARCHAR(36) PRIMARY KEY, patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, doctor_id VARCHAR(36) NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE, appointment_date VARCHAR(50) NOT NULL, appointment_time VARCHAR(50) NOT NULL, appointment_type VARCHAR(100) NOT NULL DEFAULT \'CONSULTATION\', status VARCHAR(50) NOT NULL DEFAULT \'BOOKED\' CHECK (status IN (\'BOOKED\',\'WAITING\',\'CALLED\',\'IN_CONSULTATION\',\'COMPLETED\',\'CANCELLED\',\'NO_SHOW\')), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())', 'appointments table'],
    ['CREATE TABLE IF NOT EXISTS public.tokens (id VARCHAR(36) PRIMARY KEY, appointment_id VARCHAR(36) NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE, token_number VARCHAR(50) NOT NULL, priority VARCHAR(50) NOT NULL DEFAULT \'NORMAL\' CHECK (priority IN (\'NORMAL\',\'PRIORITY\',\'EMERGENCY\')), status VARCHAR(50) NOT NULL DEFAULT \'WAITING\' CHECK (status IN (\'WAITING\',\'CALLED\',\'IN_CONSULTATION\',\'COMPLETED\',\'CANCELLED\',\'NO_SHOW\')), estimated_wait INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), called_at TIMESTAMPTZ, completed_at TIMESTAMPTZ)', 'tokens table'],
    ['CREATE TABLE IF NOT EXISTS public.queue_events (id VARCHAR(36) PRIMARY KEY, token_id VARCHAR(36) NOT NULL REFERENCES public.tokens(id) ON DELETE CASCADE, event_type VARCHAR(100) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())', 'queue_events table'],
    ['CREATE TABLE IF NOT EXISTS public.notifications (id VARCHAR(36) PRIMARY KEY, user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, title VARCHAR(255) NOT NULL, message TEXT NOT NULL, type VARCHAR(50) NOT NULL DEFAULT \'INFO\' CHECK (type IN (\'INFO\',\'SUCCESS\',\'WARNING\',\'ALERT\',\'URGENT\')), read BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())', 'notifications table'],
  ];
  
  let worked = false;
  for (const [sql, label] of statements) {
    worked = await execSQL(sql, label);
    if (!worked) break;
  }
  
  if (!worked) {
    console.log('\n⚠️  Automatic migration not available (Supabase exec RPC not installed).');
    console.log('\n📋 MANUAL STEP REQUIRED — takes 30 seconds:');
    console.log('──────────────────────────────────────────────────────────');
    console.log('1. Open: https://supabase.com/dashboard/project/ofgnfdjpvyjfgmfmchrl/sql/new');
    console.log('2. Paste and run the SQL from: backend/src/db/schema.sql');
    console.log('3. Then run: npm run seed');
    console.log('──────────────────────────────────────────────────────────');
  } else {
    console.log('\n✅ Schema applied! Now running seed...');
  }
}

applySchema().catch(console.error);
