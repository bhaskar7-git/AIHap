-- SmartQueue Supabase Schema
-- Run this entire script in the Supabase SQL Editor once.

-- ─── Profiles (replaces users table — Supabase Auth handles passwords) ───────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  phone       VARCHAR(50)  NOT NULL DEFAULT '',
  role        VARCHAR(50)  NOT NULL DEFAULT 'PATIENT' CHECK (role IN ('PATIENT', 'DOCTOR', 'ADMIN')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Hospitals ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hospitals (
  id          VARCHAR(36)  PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  address     TEXT         NOT NULL,
  city        VARCHAR(100) NOT NULL,
  phone       VARCHAR(50)  NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Departments ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.departments (
  id          VARCHAR(36)  PRIMARY KEY,
  hospital_id VARCHAR(36)  NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Doctors ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.doctors (
  id                          VARCHAR(36)  PRIMARY KEY,
  user_id                     UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hospital_id                 VARCHAR(36)  NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  department_id               VARCHAR(36)  NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  specialization              VARCHAR(255) NOT NULL,
  qualification               VARCHAR(255) NOT NULL,
  average_consultation_time   INTEGER      NOT NULL DEFAULT 10,
  available                   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Appointments ─────────────────────────────────────────────────────────────
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

-- ─── Tokens ───────────────────────────────────────────────────────────────────
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

-- ─── Queue Events ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.queue_events (
  id         VARCHAR(36)  PRIMARY KEY,
  token_id   VARCHAR(36)  NOT NULL REFERENCES public.tokens(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Notifications ────────────────────────────────────────────────────────────
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

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_doctors_user_id    ON public.doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_dept       ON public.doctors(department_id);
CREATE INDEX IF NOT EXISTS idx_appts_doctor       ON public.appointments(doctor_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appts_patient      ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_tokens_appt        ON public.tokens(appointment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tokens         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications  ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read their own; service_role can do anything
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Public read for hospitals, departments, doctors (needed by unauthenticated queue page)
CREATE POLICY "hospitals_public_read"   ON public.hospitals   FOR SELECT USING (true);
CREATE POLICY "departments_public_read" ON public.departments FOR SELECT USING (true);
CREATE POLICY "doctors_public_read"     ON public.doctors     FOR SELECT USING (true);

-- Appointments: patients see their own; doctors see their patients
CREATE POLICY "appointments_select" ON public.appointments FOR SELECT
  USING (
    auth.uid() = patient_id
    OR EXISTS (SELECT 1 FROM public.doctors WHERE id = doctor_id AND user_id = auth.uid())
  );
CREATE POLICY "appointments_insert" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "appointments_update" ON public.appointments FOR UPDATE
  USING (
    auth.uid() = patient_id
    OR EXISTS (SELECT 1 FROM public.doctors WHERE id = doctor_id AND user_id = auth.uid())
  );

-- Tokens: same as appointments
CREATE POLICY "tokens_select" ON public.tokens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_id
        AND (a.patient_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = a.doctor_id AND d.user_id = auth.uid()))
    )
  );
CREATE POLICY "tokens_insert" ON public.tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "tokens_update" ON public.tokens FOR UPDATE USING (true);

-- Queue events and notifications
CREATE POLICY "queue_events_all"    ON public.queue_events  FOR ALL USING (true);
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
