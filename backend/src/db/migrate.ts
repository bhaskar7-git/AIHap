/**
 * One-time migration runner.
 * Applies schema.sql to Supabase using the pg driver via the Supabase transaction pooler.
 * Run: npx tsx src/db/migrate.ts
 */
import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const schema = `
-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  phone       VARCHAR(50)  NOT NULL DEFAULT '',
  role        VARCHAR(50)  NOT NULL DEFAULT 'PATIENT' CHECK (role IN ('PATIENT', 'DOCTOR', 'ADMIN')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Hospitals
CREATE TABLE IF NOT EXISTS public.hospitals (
  id          VARCHAR(36)  PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  address     TEXT         NOT NULL,
  city        VARCHAR(100) NOT NULL,
  phone       VARCHAR(50)  NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Departments
CREATE TABLE IF NOT EXISTS public.departments (
  id          VARCHAR(36)  PRIMARY KEY,
  hospital_id VARCHAR(36)  NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Doctors
CREATE TABLE IF NOT EXISTS public.doctors (
  id                        VARCHAR(36)  PRIMARY KEY,
  user_id                   UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hospital_id               VARCHAR(36)  NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  department_id             VARCHAR(36)  NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  specialization            VARCHAR(255) NOT NULL,
  qualification             VARCHAR(255) NOT NULL,
  average_consultation_time INTEGER      NOT NULL DEFAULT 10,
  available                 BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Appointments
CREATE TABLE IF NOT EXISTS public.appointments (
  id               VARCHAR(36)  PRIMARY KEY,
  patient_id       UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id        VARCHAR(36)  NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  appointment_date VARCHAR(50)  NOT NULL,
  appointment_time VARCHAR(50)  NOT NULL,
  appointment_type VARCHAR(100) NOT NULL DEFAULT 'CONSULTATION',
  status           VARCHAR(50)  NOT NULL DEFAULT 'BOOKED'
    CHECK (status IN ('BOOKED','WAITING','CALLED','IN_CONSULTATION','COMPLETED','CANCELLED','NO_SHOW')),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Tokens
CREATE TABLE IF NOT EXISTS public.tokens (
  id             VARCHAR(36)  PRIMARY KEY,
  appointment_id VARCHAR(36)  NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  token_number   VARCHAR(50)  NOT NULL,
  priority       VARCHAR(50)  NOT NULL DEFAULT 'NORMAL'
    CHECK (priority IN ('NORMAL','PRIORITY','EMERGENCY')),
  status         VARCHAR(50)  NOT NULL DEFAULT 'WAITING'
    CHECK (status IN ('WAITING','CALLED','IN_CONSULTATION','COMPLETED','CANCELLED','NO_SHOW')),
  estimated_wait INTEGER      NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  called_at      TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ
);

-- Queue events
CREATE TABLE IF NOT EXISTS public.queue_events (
  id         VARCHAR(36)  PRIMARY KEY,
  token_id   VARCHAR(36)  NOT NULL REFERENCES public.tokens(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id         VARCHAR(36)  PRIMARY KEY,
  user_id    UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      VARCHAR(255) NOT NULL,
  message    TEXT         NOT NULL,
  type       VARCHAR(50)  NOT NULL DEFAULT 'INFO'
    CHECK (type IN ('INFO','SUCCESS','WARNING','ALERT','URGENT')),
  read       BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_doctors_user_id    ON public.doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_dept       ON public.doctors(department_id);
CREATE INDEX IF NOT EXISTS idx_appts_doctor       ON public.appointments(doctor_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appts_patient      ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_tokens_appt        ON public.tokens(appointment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
`;

async function migrate() {
  console.log('🔄 Running Supabase migration via RPC...');

  // Use Supabase's pg function to run arbitrary SQL (requires pg_execute or similar)
  // Alternative: use supabase.rpc with a custom function. 
  // We'll instead call the Postgres REST endpoint via fetch with service key.
  const res = await fetch(`${config.SUPABASE_URL}/rest/v1/rpc/run_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': config.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${config.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ sql: schema }),
  });

  if (!res.ok) {
    // The run_sql RPC might not exist — that's OK, user needs to run schema.sql manually
    console.log('ℹ️  Auto-migration via RPC not available (expected).');
    console.log('📋 Please run the schema manually in Supabase SQL Editor:');
    console.log('   → https://supabase.com/dashboard/project/ofgnfdjpvyjfgmfmchrl/sql/new');
    console.log('   → Copy contents of: backend/src/db/schema.sql');
    return;
  }

  console.log('✅ Migration applied successfully!');
}

migrate().catch(console.error);
