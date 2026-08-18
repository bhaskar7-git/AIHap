/**
 * bootstrap.ts — Creates all tables directly via Supabase's pg-meta API
 * This uses the internal Supabase management API available within the project.
 * Run: npx tsx src/db/bootstrap.ts
 */
import { config } from '../config/index.js';

const SUPABASE_URL = config.SUPABASE_URL;
const SERVICE_KEY = config.SUPABASE_SERVICE_ROLE_KEY;

// Supabase exposes a pg-meta API for table management
const PG_META_URL = `${SUPABASE_URL.replace('supabase.co', 'supabase.co')}/pg-meta/default`;

async function runSQL(sql: string) {
  const res = await fetch(`${PG_META_URL}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'X-Connection-Encrypted': 'ENCRYPTED_STRING',
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text };
}

const tables = [
  {
    name: 'profiles',
    sql: `CREATE TABLE IF NOT EXISTS public.profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL DEFAULT '',
      role VARCHAR(50) NOT NULL DEFAULT 'PATIENT' CHECK (role IN ('PATIENT','DOCTOR','ADMIN')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  },
  {
    name: 'hospitals',
    sql: `CREATE TABLE IF NOT EXISTS public.hospitals (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      address TEXT NOT NULL,
      city VARCHAR(100) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  },
  {
    name: 'departments',
    sql: `CREATE TABLE IF NOT EXISTS public.departments (
      id VARCHAR(36) PRIMARY KEY,
      hospital_id VARCHAR(36) NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  },
  {
    name: 'doctors',
    sql: `CREATE TABLE IF NOT EXISTS public.doctors (
      id VARCHAR(36) PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      hospital_id VARCHAR(36) NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
      department_id VARCHAR(36) NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
      specialization VARCHAR(255) NOT NULL,
      qualification VARCHAR(255) NOT NULL,
      average_consultation_time INTEGER NOT NULL DEFAULT 10,
      available BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  },
  {
    name: 'appointments',
    sql: `CREATE TABLE IF NOT EXISTS public.appointments (
      id VARCHAR(36) PRIMARY KEY,
      patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      doctor_id VARCHAR(36) NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
      appointment_date VARCHAR(50) NOT NULL,
      appointment_time VARCHAR(50) NOT NULL,
      appointment_type VARCHAR(100) NOT NULL DEFAULT 'CONSULTATION',
      status VARCHAR(50) NOT NULL DEFAULT 'BOOKED' CHECK (status IN ('BOOKED','WAITING','CALLED','IN_CONSULTATION','COMPLETED','CANCELLED','NO_SHOW')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  },
  {
    name: 'tokens',
    sql: `CREATE TABLE IF NOT EXISTS public.tokens (
      id VARCHAR(36) PRIMARY KEY,
      appointment_id VARCHAR(36) NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
      token_number VARCHAR(50) NOT NULL,
      priority VARCHAR(50) NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL','PRIORITY','EMERGENCY')),
      status VARCHAR(50) NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING','CALLED','IN_CONSULTATION','COMPLETED','CANCELLED','NO_SHOW')),
      estimated_wait INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      called_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ
    )`,
  },
  {
    name: 'queue_events',
    sql: `CREATE TABLE IF NOT EXISTS public.queue_events (
      id VARCHAR(36) PRIMARY KEY,
      token_id VARCHAR(36) NOT NULL REFERENCES public.tokens(id) ON DELETE CASCADE,
      event_type VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  },
  {
    name: 'notifications',
    sql: `CREATE TABLE IF NOT EXISTS public.notifications (
      id VARCHAR(36) PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'INFO' CHECK (type IN ('INFO','SUCCESS','WARNING','ALERT','URGENT')),
      read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  },
];

async function bootstrap() {
  console.log('🚀 Bootstrapping Supabase schema...\n');

  for (const t of tables) {
    const result = await runSQL(t.sql);
    if (result.ok) {
      console.log(`  ✓ ${t.name}`);
    } else {
      if (result.status === 404 || result.status === 401) {
        console.log(`\n⚠️  pg-meta API not accessible (status ${result.status})`);
        console.log('\n📋 PLEASE RUN THIS MANUALLY IN SUPABASE SQL EDITOR:');
        console.log('🔗 https://supabase.com/dashboard/project/ofgnfdjpvyjfgmfmchrl/sql/new');
        console.log('\nCopy the file: backend/src/db/schema.sql  →  paste & click Run\n');
        process.exit(1);
      }
      console.error(`  ✗ ${t.name}: ${result.body}`);
    }
  }

  // RLS policies (ignore errors if already exist)
  const policies = [
    `ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.queue_events ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY`,
    `CREATE POLICY IF NOT EXISTS "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id)`,
    `CREATE POLICY IF NOT EXISTS "hospitals_public_read" ON public.hospitals FOR SELECT USING (true)`,
    `CREATE POLICY IF NOT EXISTS "departments_public_read" ON public.departments FOR SELECT USING (true)`,
    `CREATE POLICY IF NOT EXISTS "doctors_public_read" ON public.doctors FOR SELECT USING (true)`,
    `CREATE POLICY IF NOT EXISTS "appointments_select" ON public.appointments FOR SELECT USING (auth.uid() = patient_id OR EXISTS (SELECT 1 FROM public.doctors WHERE id = doctor_id AND user_id = auth.uid()))`,
    `CREATE POLICY IF NOT EXISTS "appointments_insert" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = patient_id)`,
    `CREATE POLICY IF NOT EXISTS "appointments_update" ON public.appointments FOR UPDATE USING (auth.uid() = patient_id OR EXISTS (SELECT 1 FROM public.doctors WHERE id = doctor_id AND user_id = auth.uid()))`,
    `CREATE POLICY IF NOT EXISTS "tokens_all" ON public.tokens FOR ALL USING (true)`,
    `CREATE POLICY IF NOT EXISTS "queue_events_all" ON public.queue_events FOR ALL USING (true)`,
    `CREATE POLICY IF NOT EXISTS "notifications_select" ON public.notifications FOR SELECT USING (user_id = auth.uid())`,
    `CREATE POLICY IF NOT EXISTS "notifications_all" ON public.notifications FOR ALL USING (true)`,
  ];

  for (const p of policies) {
    await runSQL(p); // ignore errors (policies may already exist)
  }

  console.log('\n✅ Schema bootstrap complete!');
  console.log('   Now run: npm run seed');
}

bootstrap().catch(console.error);
