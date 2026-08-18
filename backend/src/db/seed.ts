import { supabase } from '../lib/supabase.js';
import { queueService } from '../services/queueService.js';

export async function seedDatabase() {
  console.log('🌱 Seeding SmartQueue database into Supabase...');

  const today = new Date().toISOString().split('T')[0];

  // ─── 1. Create Auth Users ───────────────────────────────────────────────────
  const usersToCreate = [
    { email: 'admin@smartqueue.com',   password: 'Admin@123',   name: 'Admin Chief Officer',  phone: '+91 98765 00001', role: 'ADMIN' },
    { email: 'doctor@smartqueue.com',  password: 'Doctor@123',  name: 'Dr. Ravi Kumar',       phone: '+91 98765 00002', role: 'DOCTOR' },
    { email: 'priya.cardio@smartqueue.com', password: 'Doctor@123', name: 'Dr. Priya Sharma',  phone: '+91 98765 00003', role: 'DOCTOR' },
    { email: 'arjun.ortho@smartqueue.com',  password: 'Doctor@123', name: 'Dr. Arjun Reddy',  phone: '+91 98765 00004', role: 'DOCTOR' },
    { email: 'sneha.derma@smartqueue.com',  password: 'Doctor@123', name: 'Dr. Sneha Rao',    phone: '+91 98765 00005', role: 'DOCTOR' },
    { email: 'kiran.peds@smartqueue.com',   password: 'Doctor@123', name: 'Dr. Kiran Kumar',  phone: '+91 98765 00006', role: 'DOCTOR' },
    { email: 'patient@smartqueue.com', password: 'Patient@123', name: 'Ananya Sharma',       phone: '+91 98765 11111', role: 'PATIENT' },
    // Extra queue patients
    { email: 'ramesh@demo.com',  password: 'Patient@123', name: 'Ramesh Gupta',  phone: '+91 98765 20018', role: 'PATIENT' },
    { email: 'deepa@demo.com',   password: 'Patient@123', name: 'Deepa Sen',     phone: '+91 98765 20019', role: 'PATIENT' },
    { email: 'kavita@demo.com',  password: 'Patient@123', name: 'Kavita Das',    phone: '+91 98765 20020', role: 'PATIENT' },
    { email: 'rajesh@demo.com',  password: 'Patient@123', name: 'Rajesh Verma',  phone: '+91 98765 20021', role: 'PATIENT' },
    { email: 'rohit@demo.com',   password: 'Patient@123', name: 'Rohit Mehta',   phone: '+91 98765 20022', role: 'PATIENT' },
    { email: 'sunita@demo.com',  password: 'Patient@123', name: 'Sunita Patel',  phone: '+91 98765 20023', role: 'PATIENT' },
    { email: 'vikram@demo.com',  password: 'Patient@123', name: 'Vikram Singh',  phone: '+91 98765 20024', role: 'PATIENT' },
    { email: 'neha@demo.com',    password: 'Patient@123', name: 'Neha Gupta',    phone: '+91 98765 20025', role: 'PATIENT' },
    { email: 'amit@demo.com',    password: 'Patient@123', name: 'Amit Roy',      phone: '+91 98765 20026', role: 'PATIENT' },
  ];

  const userIdMap: Record<string, string> = {};

  for (const u of usersToCreate) {
    // Try to find existing auth user first
    const { data: existing } = await supabase.auth.admin.listUsers();
    const found = existing?.users?.find((au) => au.email === u.email);

    let authId: string;
    if (found) {
      authId = found.id;
      console.log(`  ↺ Auth user exists: ${u.email}`);
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { name: u.name },
      });
      if (error) {
        console.error(`  ✗ Failed to create auth user ${u.email}:`, error.message);
        continue;
      }
      authId = data.user.id;
      console.log(`  ✓ Created auth user: ${u.email}`);
    }

    userIdMap[u.email] = authId;

    // Upsert profile
    await supabase.from('profiles').upsert({
      id: authId,
      name: u.name,
      phone: u.phone,
      role: u.role,
      created_at: new Date().toISOString(),
    });
  }

  // ─── 2. Hospitals ───────────────────────────────────────────────────────────
  const hospitals = [
    { id: 'hosp-01', name: 'City Care Hospital',              address: '104 Healthcare Boulevard', city: 'Metro City',  phone: '+91 80 4455 6677', created_at: new Date().toISOString() },
    { id: 'hosp-02', name: 'Apollo Super Specialty Hospital', address: '21 Bannerghatta Main Road', city: 'Bangalore',   phone: '+91 80 2233 4455', created_at: new Date().toISOString() },
    { id: 'hosp-03', name: 'Government General Hospital',     address: 'Plot 4, Civil Lines',       city: 'New Delhi',   phone: '+91 11 2345 6789', created_at: new Date().toISOString() },
  ];
  await supabase.from('hospitals').upsert(hospitals);
  console.log('  ✓ Hospitals seeded');

  // ─── 3. Departments ─────────────────────────────────────────────────────────
  const departments = [
    { id: 'dept-01', hospital_id: 'hosp-01', name: 'General Medicine', description: 'Primary care and internal medicine.',              created_at: new Date().toISOString() },
    { id: 'dept-02', hospital_id: 'hosp-01', name: 'Cardiology',       description: 'Heart and vascular diagnosis.',                   created_at: new Date().toISOString() },
    { id: 'dept-03', hospital_id: 'hosp-01', name: 'Orthopedics',      description: 'Joint replacement and trauma care.',              created_at: new Date().toISOString() },
    { id: 'dept-04', hospital_id: 'hosp-01', name: 'Dermatology',      description: 'Clinical dermatology and cosmetology.',           created_at: new Date().toISOString() },
    { id: 'dept-05', hospital_id: 'hosp-01', name: 'Pediatrics',       description: 'Child healthcare and vaccinations.',              created_at: new Date().toISOString() },
  ];
  await supabase.from('departments').upsert(departments);
  console.log('  ✓ Departments seeded');

  // ─── 4. Doctors ─────────────────────────────────────────────────────────────
  const doctorRows = [
    { id: 'doc-01', email: 'doctor@smartqueue.com',         hospital_id: 'hosp-01', department_id: 'dept-01', specialization: 'General Physician & Internist',  qualification: 'MBBS, MD (General Medicine)',  average_consultation_time: 5,  available: true },
    { id: 'doc-02', email: 'priya.cardio@smartqueue.com',   hospital_id: 'hosp-01', department_id: 'dept-02', specialization: 'Cardiologist',                   qualification: 'MBBS, MD, DM (Cardiology)',    average_consultation_time: 8,  available: true },
    { id: 'doc-03', email: 'arjun.ortho@smartqueue.com',    hospital_id: 'hosp-01', department_id: 'dept-03', specialization: 'Orthopedic Surgeon',             qualification: 'MBBS, MS (Orthopedics)',       average_consultation_time: 10, available: true },
    { id: 'doc-04', email: 'sneha.derma@smartqueue.com',    hospital_id: 'hosp-01', department_id: 'dept-04', specialization: 'Dermatologist',                  qualification: 'MBBS, MD (Dermatology)',       average_consultation_time: 6,  available: true },
    { id: 'doc-05', email: 'kiran.peds@smartqueue.com',     hospital_id: 'hosp-01', department_id: 'dept-05', specialization: 'Pediatrician',                   qualification: 'MBBS, MD (Pediatrics), DNB',  average_consultation_time: 7,  available: true },
  ];

  for (const d of doctorRows) {
    const userId = userIdMap[d.email];
    if (!userId) { console.warn(`  ⚠ No userId for ${d.email}`); continue; }
    await supabase.from('doctors').upsert({
      id: d.id,
      user_id: userId,
      hospital_id: d.hospital_id,
      department_id: d.department_id,
      specialization: d.specialization,
      qualification: d.qualification,
      average_consultation_time: d.average_consultation_time,
      available: d.available,
      created_at: new Date().toISOString(),
    });
  }
  console.log('  ✓ Doctors seeded');

  // ─── 5. Appointments & Tokens for Dr. Ravi ────────────────────────────────
  const raviId = 'doc-01';
  const queueEmails = [
    'ramesh@demo.com', 'deepa@demo.com', 'kavita@demo.com',
    'rajesh@demo.com', 'rohit@demo.com', 'sunita@demo.com',
    'vikram@demo.com', 'neha@demo.com',  'amit@demo.com',
  ];

  const tokenDefs = [
    { num: 'A-18', emailIdx: 0, time: '09:00 AM', status: 'COMPLETED', priority: 'NORMAL', wait: 0 },
    { num: 'A-19', emailIdx: 1, time: '09:10 AM', status: 'COMPLETED', priority: 'NORMAL', wait: 0 },
    { num: 'A-20', emailIdx: 2, time: '09:20 AM', status: 'COMPLETED', priority: 'NORMAL', wait: 0 },
    { num: 'A-21', emailIdx: 3, time: '09:30 AM', status: 'CALLED',    priority: 'NORMAL', wait: 0 },
    { num: 'A-22', emailIdx: 4, time: '09:40 AM', status: 'WAITING',   priority: 'NORMAL', wait: 5 },
    { num: 'A-23', emailIdx: 5, time: '09:50 AM', status: 'WAITING',   priority: 'NORMAL', wait: 10 },
    { num: 'A-24', emailIdx: 6, time: '10:00 AM', status: 'WAITING',   priority: 'NORMAL', wait: 15 },
    { num: 'A-25', emailIdx: 7, time: '10:10 AM', status: 'WAITING',   priority: 'NORMAL', wait: 20 },
    { num: 'A-26', emailIdx: 8, time: '10:20 AM', status: 'WAITING',   priority: 'NORMAL', wait: 25 },
  ];

  for (let i = 0; i < tokenDefs.length; i++) {
    const def = tokenDefs[i];
    const patientEmail = queueEmails[def.emailIdx];
    const patientId = userIdMap[patientEmail];
    if (!patientId) continue;

    const apptId = `appt-seed-${i + 1}`;
    const tokenId = `token-seed-${i + 1}`;
    const now = Date.now();

    await supabase.from('appointments').upsert({
      id: apptId,
      patient_id: patientId,
      doctor_id: raviId,
      appointment_date: today,
      appointment_time: def.time,
      appointment_type: 'General Consultation',
      status: def.status,
      created_at: new Date(now - (30 - i) * 60000).toISOString(),
    });

    await supabase.from('tokens').upsert({
      id: tokenId,
      appointment_id: apptId,
      token_number: def.num,
      priority: def.priority,
      status: def.status,
      estimated_wait: def.wait,
      created_at: new Date(now - (30 - i) * 60000).toISOString(),
      called_at: def.status === 'CALLED' ? new Date(now - 2 * 60000).toISOString() : (def.status === 'COMPLETED' ? new Date(now - 15 * 60000).toISOString() : null),
      completed_at: def.status === 'COMPLETED' ? new Date(now - 10 * 60000).toISOString() : null,
    });
  }

  // Cardiology appointment
  const rameshId = userIdMap['ramesh@demo.com'];
  if (rameshId) {
    await supabase.from('appointments').upsert({
      id: 'appt-seed-cardio-1', patient_id: rameshId, doctor_id: 'doc-02',
      appointment_date: today, appointment_time: '11:00 AM', appointment_type: 'Cardiac Checkup',
      status: 'WAITING', created_at: new Date().toISOString(),
    });
    await supabase.from('tokens').upsert({
      id: 'token-seed-cardio-1', appointment_id: 'appt-seed-cardio-1',
      token_number: 'C-01', priority: 'NORMAL', status: 'WAITING',
      estimated_wait: 8, created_at: new Date().toISOString(),
    });
  }
  console.log('  ✓ Appointments & tokens seeded');

  // Notification for demo patient
  const patientId = userIdMap['patient@smartqueue.com'];
  if (patientId) {
    await supabase.from('notifications').upsert({
      id: 'notif-welcome-01',
      user_id: patientId,
      title: 'Welcome to SmartQueue',
      message: 'Your healthcare account is active. Book your digital appointment without standing in queues.',
      type: 'INFO',
      read: false,
      created_at: new Date().toISOString(),
    });
  }
  console.log('  ✓ Notifications seeded');

  console.log('\n✅ Supabase seeded successfully!');
  console.log('   Admin:   admin@smartqueue.com  / Admin@123');
  console.log('   Doctor:  doctor@smartqueue.com / Doctor@123 (Dr. Ravi Kumar)');
  console.log('   Patient: patient@smartqueue.com / Patient@123 (Ananya Sharma)');
}

// Run standalone
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase().then(() => {
    console.log('Done.');
    process.exit(0);
  }).catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}
