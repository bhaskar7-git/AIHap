import { supabase } from '../lib/supabase.js';
import { queueService } from '../services/queueService.js';
import { v4 as uuidv4 } from 'uuid';

export async function seedDatabase() {
  console.log('🌱 Seeding SmartQueue database with 60+ diverse clinical specialists...');

  const today = new Date().toISOString().split('T')[0];

  // ─── 1. Hospitals ───────────────────────────────────────────────────────────
  const hospitals = [
    { id: 'hosp-01', name: 'City Care Hospital',              address: '104 Healthcare Boulevard', city: 'Metro City',  phone: '+91 80 4455 6677', created_at: new Date().toISOString() },
    { id: 'hosp-02', name: 'Apollo Super Specialty Hospital', address: '21 Bannerghatta Main Road', city: 'Bangalore',   phone: '+91 80 2233 4455', created_at: new Date().toISOString() },
    { id: 'hosp-03', name: 'Government General Hospital',     address: 'Plot 4, Civil Lines',       city: 'New Delhi',   phone: '+91 11 2345 6789', created_at: new Date().toISOString() },
    { id: 'hosp-04', name: 'Fortis Memorial Hospital',        address: 'Sector 44, Golf Course Rd', city: 'Gurugram',    phone: '+91 124 4567 890', created_at: new Date().toISOString() },
    { id: 'hosp-05', name: 'AIIMS Medical Institute',         address: 'Ansari Nagar',              city: 'New Delhi',   phone: '+91 11 2658 8500', created_at: new Date().toISOString() },
  ];
  await supabase.from('hospitals').upsert(hospitals);
  console.log('  ✓ Hospitals seeded');

  // ─── 2. Departments ─────────────────────────────────────────────────────────
  const departments = [
    { id: 'dept-01', hospital_id: 'hosp-01', name: 'General & Internal Medicine', description: 'Primary health, diabetes, hypertension, and infectious diseases.', created_at: new Date().toISOString() },
    { id: 'dept-02', hospital_id: 'hosp-01', name: 'Cardiology & Heart Care',     description: 'Comprehensive cardiac diagnostics, angiography, and heart health.', created_at: new Date().toISOString() },
    { id: 'dept-03', hospital_id: 'hosp-01', name: 'Orthopedics & Joint Care',    description: 'Joint replacement, trauma care, spine surgery, and sports injuries.', created_at: new Date().toISOString() },
    { id: 'dept-04', hospital_id: 'hosp-01', name: 'Dermatology & Skin Clinic',   description: 'Clinical dermatology, trichology, acne, and allergy care.', created_at: new Date().toISOString() },
    { id: 'dept-05', hospital_id: 'hosp-01', name: 'Pediatrics & Child Health',   description: 'Newborn, infant, and adolescent medicine and immunizations.', created_at: new Date().toISOString() },
    { id: 'dept-06', hospital_id: 'hosp-01', name: 'Neurology & Brain Sciences',  description: 'Stroke, epilepsy, migraine, neuropathy, and movement disorders.', created_at: new Date().toISOString() },
    { id: 'dept-07', hospital_id: 'hosp-01', name: 'Gastroenterology & Liver',    description: 'Digestive disorders, endoscopy, liver disease, and IBD.', created_at: new Date().toISOString() },
    { id: 'dept-08', hospital_id: 'hosp-01', name: 'ENT & Head-Neck Surgery',     description: 'Ear, nose, throat, sinusitis, vertigo, and hearing disorders.', created_at: new Date().toISOString() },
    { id: 'dept-09', hospital_id: 'hosp-01', name: 'Ophthalmology & Eye Care',    description: 'Cataract, LASIK, retina, glaucoma, and vision correction.', created_at: new Date().toISOString() },
    { id: 'dept-10', hospital_id: 'hosp-01', name: 'Pulmonology & Chest Medicine',description: 'Asthma, COPD, pneumonia, sleep apnea, and allergy care.', created_at: new Date().toISOString() },
    { id: 'dept-11', hospital_id: 'hosp-01', name: 'Psychiatry & Mental Health',  description: 'Anxiety, depression, insomnia, stress, and behavioral therapy.', created_at: new Date().toISOString() },
    { id: 'dept-12', hospital_id: 'hosp-01', name: 'Gynecology & Obstetrics',     description: 'Maternal health, high-risk pregnancy, PCOS, and IVF fertility.', created_at: new Date().toISOString() },
    { id: 'dept-13', hospital_id: 'hosp-01', name: 'Endocrinology & Diabetology', description: 'Hormonal disorders, thyroid, pituitary, and advanced diabetes.', created_at: new Date().toISOString() },
    { id: 'dept-14', hospital_id: 'hosp-01', name: 'Nephrology & Urology',        description: 'Kidney stones, renal failure, dialysis, and urinary health.', created_at: new Date().toISOString() },
    { id: 'dept-15', hospital_id: 'hosp-01', name: 'Oncology & Cancer Care',      description: 'Chemotherapy, surgical oncology, and early cancer detection.', created_at: new Date().toISOString() },
    { id: 'dept-16', hospital_id: 'hosp-01', name: 'Rheumatology & Arthritis',    description: 'Rheumatoid arthritis, lupus, gout, and autoimmune diseases.', created_at: new Date().toISOString() },
    { id: 'dept-17', hospital_id: 'hosp-01', name: 'Dental & Maxillofacial',      description: 'Root canals, orthodontics, implants, and oral surgery.', created_at: new Date().toISOString() },
  ];
  await supabase.from('departments').upsert(departments);
  console.log('  ✓ Departments seeded (17 medical categories)');

  // ─── 3. Comprehensive Doctors Directory (65 Doctors) ─────────────────────────
  const doctorsData = [
    // --- Cardiology (4) ---
    { name: 'Dr. Priya Sharma', spec: 'Cardiologist', qual: 'MBBS, MD, DM (Cardiology) - AIIMS', dept: 'dept-02', time: 10, phone: '9876500002' },
    { name: 'Dr. Vikram Malhotra', spec: 'Interventional Cardiologist', qual: 'MBBS, MD, DNB (Cardiology), FACC (USA)', dept: 'dept-02', time: 12, phone: '9876500003' },
    { name: 'Dr. Rajeshwari V', spec: 'Electrophysiologist & Cardiologist', qual: 'MBBS, MD, DM (Cardiology), FHRS', dept: 'dept-02', time: 15, phone: '9876500004' },
    { name: 'Dr. Tarun Nambiar', spec: 'Pediatric Cardiologist', qual: 'MBBS, MD (Pediatrics), FNB (Pediatric Cardiology)', dept: 'dept-02', time: 12, phone: '9876500005' },

    // --- Dermatology & Cosmetology (4) ---
    { name: 'Dr. Sneha Rao', spec: 'Dermatologist', qual: 'MBBS, MD (Dermatology, Venereology & Leprosy)', dept: 'dept-04', time: 8, phone: '9876500006' },
    { name: 'Dr. Ananya Mukherjee', spec: 'Trichologist & Clinical Dermatologist', qual: 'MBBS, DVD, MD (Dermatology) - KMC', dept: 'dept-04', time: 8, phone: '9876500007' },
    { name: 'Dr. Sameer Khan', spec: 'Aesthetic Dermatologist & Laser Specialist', qual: 'MBBS, MD (Skin), FAM (Germany)', dept: 'dept-04', time: 10, phone: '9876500008' },
    { name: 'Dr. Ritu Bhardwaj', spec: 'Pediatric Dermatologist', qual: 'MBBS, MD (Dermatology), Fellowship in Peds Derma', dept: 'dept-04', time: 10, phone: '9876500009' },

    // --- Orthopedics & Spine (4) ---
    { name: 'Dr. Arjun Reddy', spec: 'Orthopedic Surgeon', qual: 'MBBS, MS (Orthopedics), M.Ch Orth (UK)', dept: 'dept-03', time: 12, phone: '9876500010' },
    { name: 'Dr. Harish Chandra', spec: 'Joint Replacement & Arthroscopy Surgeon', qual: 'MBBS, MS (Ortho), Fellowship Knee & Hip (Germany)', dept: 'dept-03', time: 12, phone: '9876500011' },
    { name: 'Dr. Meera Namboodiri', spec: 'Spine Surgeon & Orthopedist', qual: 'MBBS, MS, DNB (Ortho), Fellowship Spine (Singapore)', dept: 'dept-03', time: 15, phone: '9876500012' },
    { name: 'Dr. Rohit Singhania', spec: 'Sports Injury Specialist', qual: 'MBBS, MS (Orthopedics), Diploma Sports Medicine (FIFA)', dept: 'dept-03', time: 10, phone: '9876500013' },

    // --- General & Internal Medicine (5) ---
    { name: 'Dr. Ravi Kumar', spec: 'General Physician & Internist', qual: 'MBBS, MD (General Medicine) - MMC', dept: 'dept-01', time: 8, phone: '9876500014' },
    { name: 'Dr. Alok Verma', spec: 'Consultant Physician & Diabetologist', qual: 'MBBS, MD (Medicine), C.Diab (Boston)', dept: 'dept-01', time: 10, phone: '9876500015' },
    { name: 'Dr. Sunita Deshmukh', spec: 'Internal Medicine Specialist', qual: 'MBBS, MD (Internal Medicine), MRCP (London)', dept: 'dept-01', time: 8, phone: '9876500016' },
    { name: 'Dr. Farooq Abdullah', spec: 'Infectious Disease Specialist', qual: 'MBBS, MD, Fellowship in Infectious Diseases (AIIMS)', dept: 'dept-01', time: 10, phone: '9876500017' },
    { name: 'Dr. Geeta Nair', spec: 'Geriatric & Preventive Medicine Physician', qual: 'MBBS, MD (Gen Med), PGDGM', dept: 'dept-01', time: 10, phone: '9876500018' },

    // --- Pediatrics & Child Health (4) ---
    { name: 'Dr. Kiran Kumar', spec: 'Pediatrician', qual: 'MBBS, MD (Pediatrics), DNB, FIAP', dept: 'dept-05', time: 8, phone: '9876500019' },
    { name: 'Dr. Shalini Prasad', spec: 'Neonatologist & Pediatrician', qual: 'MBBS, MD (Pediatrics), DM (Neonatology)', dept: 'dept-05', time: 10, phone: '9876500020' },
    { name: 'Dr. Deepak Sundaram', spec: 'Child Development & Pediatric Specialist', qual: 'MBBS, DCH, MD (Pediatrics)', dept: 'dept-05', time: 12, phone: '9876500021' },
    { name: 'Dr. Nandini Hegde', spec: 'Pediatric Pulmonologist & Allergist', qual: 'MBBS, MD (Pediatrics), Fellowship in Peds Pulmonology', dept: 'dept-05', time: 10, phone: '9876500022' },

    // --- Neurology & Neurosurgery (4) ---
    { name: 'Dr. Arvind Swaminathan', spec: 'Consultant Neurologist', qual: 'MBBS, MD, DM (Neurology) - NIMHANS', dept: 'dept-06', time: 15, phone: '9876500023' },
    { name: 'Dr. Tanya Roy', spec: 'Stroke & Epilepsy Specialist', qual: 'MBBS, MD (Medicine), DM (Neurology), FINR', dept: 'dept-06', time: 15, phone: '9876500024' },
    { name: 'Dr. Bhaskar Sengupta', spec: 'Neurosurgeon', qual: 'MBBS, MS (General Surgery), M.Ch (Neurosurgery) - AIIMS', dept: 'dept-06', time: 20, phone: '9876500025' },
    { name: 'Dr. Leena Kulkarni', spec: 'Movement Disorder Specialist & Neurologist', qual: 'MBBS, MD, DM (Neurology), Movement Disorders Fellowship', dept: 'dept-06', time: 15, phone: '9876500026' },

    // --- Gastroenterology & Hepatology (4) ---
    { name: 'Dr. Pradeep Mishra', spec: 'Gastroenterologist & Hepatologist', qual: 'MBBS, MD, DM (Gastroenterology) - SGPGI', dept: 'dept-07', time: 10, phone: '9876500027' },
    { name: 'Dr. Vandana Iyer', spec: 'Medical Gastroenterologist & Endoscopist', qual: 'MBBS, MD, DNB (Gastroenterology)', dept: 'dept-07', time: 10, phone: '9876500028' },
    { name: 'Dr. Nitin Gadre', spec: 'Surgical Gastroenterologist & GI Surgeon', qual: 'MBBS, MS, M.Ch (Surgical Gastro)', dept: 'dept-07', time: 15, phone: '9876500029' },
    { name: 'Dr. Asif Qureshi', spec: 'Liver Transplant & Hepatology Specialist', qual: 'MBBS, MD, DM (Hepatology)', dept: 'dept-07', time: 12, phone: '9876500030' },

    // --- ENT & Head-Neck (4) ---
    { name: 'Dr. Madhavan Pillai', spec: 'ENT Surgeon & Otorhinolaryngologist', qual: 'MBBS, MS (ENT), DLO - Madras Medical College', dept: 'dept-08', time: 8, phone: '9876500031' },
    { name: 'Dr. Pooja Chawla', spec: 'Rhinology & Sinus Specialist', qual: 'MBBS, MS (ENT), Fellowship in Endoscopic Sinus Surgery', dept: 'dept-08', time: 10, phone: '9876500032' },
    { name: 'Dr. Amitav Bhattacharya', spec: 'Vertigo & Balance Disorder ENT Specialist', qual: 'MBBS, DNB (ENT), Neurotology Specialist', dept: 'dept-08', time: 10, phone: '9876500033' },
    { name: 'Dr. Neeraja Patel', spec: 'Head, Neck & Thyroid ENT Surgeon', qual: 'MBBS, MS (ENT), FHNS', dept: 'dept-08', time: 12, phone: '9876500034' },

    // --- Ophthalmology (4) ---
    { name: 'Dr. Senthil Nathan', spec: 'Ophthalmologist & Cataract Surgeon', qual: 'MBBS, MS (Ophthalmology) - Sankara Nethralaya', dept: 'dept-09', time: 8, phone: '9876500035' },
    { name: 'Dr. Divya Aggarwal', spec: 'Retina & Vitreous Specialist', qual: 'MBBS, MD (Ophthalmology) - RP Centre AIIMS', dept: 'dept-09', time: 12, phone: '9876500036' },
    { name: 'Dr. Chetan Mahajan', spec: 'Glaucoma & Cornea Specialist', qual: 'MBBS, MS (Ophth), Fellowship in Glaucoma', dept: 'dept-09', time: 10, phone: '9876500037' },
    { name: 'Dr. Smita Kadam', spec: 'Pediatric Ophthalmologist & Squint Surgeon', qual: 'MBBS, DO, DNB (Ophthalmology)', dept: 'dept-09', time: 10, phone: '9876500038' },

    // --- Pulmonology & Respiratory (4) ---
    { name: 'Dr. Raghunath Menon', spec: 'Pulmonologist & Chest Physician', qual: 'MBBS, MD (Pulmonary Medicine), DTCD', dept: 'dept-10', time: 10, phone: '9876500039' },
    { name: 'Dr. Kavita Joshi', spec: 'Asthma & Allergy Pulmonologist', qual: 'MBBS, MD (Respiratory Medicine), FCCP (USA)', dept: 'dept-10', time: 10, phone: '9876500040' },
    { name: 'Dr. Siddharth Jain', spec: 'Sleep Medicine & Interventional Pulmonologist', qual: 'MBBS, DNB (Pulmonology), European Board Certified', dept: 'dept-10', time: 12, phone: '9876500041' },
    { name: 'Dr. Maya Joseph', spec: 'Critical Care & Respiratory Specialist', qual: 'MBBS, MD, IDCCM, EDIC', dept: 'dept-10', time: 12, phone: '9876500042' },

    // --- Psychiatry & Mental Health (4) ---
    { name: 'Dr. Sanjay Kaushik', spec: 'Consultant Psychiatrist', qual: 'MBBS, MD (Psychiatry) - CIP Ranchi', dept: 'dept-11', time: 20, phone: '9876500043' },
    { name: 'Dr. Archana Sen', spec: 'Neuropsychiatrist & Addiction Specialist', qual: 'MBBS, DPM, MD (Psychiatry) - NIMHANS', dept: 'dept-11', time: 20, phone: '9876500044' },
    { name: 'Dr. Varun Dhawan', spec: 'Child & Adolescent Psychiatrist', qual: 'MBBS, MD (Psychiatry), Fellowship in Child Mental Health', dept: 'dept-11', time: 20, phone: '9876500045' },
    { name: 'Dr. Monica Jacob', spec: 'Clinical Psychologist & Psychotherapist', qual: 'M.Phil Clinical Psychology, Ph.D. (Psychology)', dept: 'dept-11', time: 25, phone: '9876500046' },

    // --- Gynecology & Obstetrics (4) ---
    { name: 'Dr. Malini Ramanathan', spec: 'Gynecologist & Obstetrician', qual: 'MBBS, MD, DGO, FRCOG (UK)', dept: 'dept-12', time: 10, phone: '9876500047' },
    { name: 'Dr. Reena George', spec: 'High-Risk Pregnancy & Fetal Medicine', qual: 'MBBS, MS (OBG), Fellowship in Maternal Fetal Medicine', dept: 'dept-12', time: 12, phone: '9876500048' },
    { name: 'Dr. Shobha Naidu', spec: 'Infertility & IVF Specialist', qual: 'MBBS, MD (OBG), Fellowship in Reproductive Medicine', dept: 'dept-12', time: 15, phone: '9876500049' },
    { name: 'Dr. Pallavi Dixit', spec: 'Laparoscopic Gynecologic Surgeon', qual: 'MBBS, MS, FMAS, DMAS (Germany)', dept: 'dept-12', time: 12, phone: '9876500050' },

    // --- Endocrinology & Diabetes (3) ---
    { name: 'Dr. Naveen Chadha', spec: 'Endocrinologist & Diabetologist', qual: 'MBBS, MD (Medicine), DM (Endocrinology) - PGI', dept: 'dept-13', time: 12, phone: '9876500051' },
    { name: 'Dr. Rashmi Tiwari', spec: 'Thyroid & Metabolic Disorder Specialist', qual: 'MBBS, MD, DNB (Endocrinology)', dept: 'dept-13', time: 10, phone: '9876500052' },
    { name: 'Dr. Kalyan Goswami', spec: 'Pediatric Endocrinologist', qual: 'MBBS, MD (Pediatrics), Fellowship in Pediatric Endocrinology', dept: 'dept-13', time: 12, phone: '9876500053' },

    // --- Nephrology & Urology (4) ---
    { name: 'Dr. Gurpreet Singh', spec: 'Consultant Nephrologist', qual: 'MBBS, MD, DM (Nephrology) - AIIMS', dept: 'dept-14', time: 12, phone: '9876500054' },
    { name: 'Dr. Suresh Babu', spec: 'Urologist & Andrologist', qual: 'MBBS, MS (Surgery), M.Ch (Urology)', dept: 'dept-14', time: 12, phone: '9876500055' },
    { name: 'Dr. Ankit Agarwal', spec: 'Kidney Transplant Surgeon & Urologist', qual: 'MBBS, MS, M.Ch (Uro), DNB (Genito Urinary Surgery)', dept: 'dept-14', time: 15, phone: '9876500056' },
    { name: 'Dr. Hema Malini V', spec: 'Dialysis & Renal Care Physician', qual: 'MBBS, MD (Medicine), DNB (Nephrology)', dept: 'dept-14', time: 10, phone: '9876500057' },

    // --- Oncology & Cancer Care (3) ---
    { name: 'Dr. Debashish Roy', spec: 'Medical Oncologist', qual: 'MBBS, MD (Medicine), DM (Medical Oncology) - TMH Mumbai', dept: 'dept-15', time: 15, phone: '9876500058' },
    { name: 'Dr. Supriya Khandelwal', spec: 'Surgical Oncologist', qual: 'MBBS, MS (Gen Surgery), M.Ch (Surgical Oncology)', dept: 'dept-15', time: 15, phone: '9876500059' },
    { name: 'Dr. Yashwant Rao', spec: 'Radiation Oncologist', qual: 'MBBS, MD (Radiotherapy), DNB', dept: 'dept-15', time: 15, phone: '9876500060' },

    // --- Rheumatology (3) ---
    { name: 'Dr. Manisha Kothari', spec: 'Clinical Rheumatologist', qual: 'MBBS, MD (Medicine), DM (Clinical Immunology & Rheumatology)', dept: 'dept-16', time: 12, phone: '9876500061' },
    { name: 'Dr. Rajesh Chundawat', spec: 'Arthritis & Autoimmune Specialist', qual: 'MBBS, DNB (Gen Med), Fellowship in Rheumatology (UK)', dept: 'dept-16', time: 12, phone: '9876500062' },
    { name: 'Dr. Swati Gokhale', spec: 'Pediatric Rheumatologist', qual: 'MBBS, MD (Pediatrics), Fellowship in Pediatric Rheumatology', dept: 'dept-16', time: 12, phone: '9876500063' },

    // --- Dentistry & Maxillofacial (3) ---
    { name: 'Dr. Aakash Chopra', spec: 'Orthodontist & Dental Surgeon', qual: 'BDS, MDS (Orthodontics & Dentofacial Orthopedics)', dept: 'dept-17', time: 15, phone: '9876500064' },
    { name: 'Dr. Bhavna Parekh', spec: 'Periodontist & Implantologist', qual: 'BDS, MDS (Periodontology), Certified Implantologist', dept: 'dept-17', time: 15, phone: '9876500065' },
    { name: 'Dr. Nikhil Shrestha', spec: 'Endodontist & Root Canal Specialist', qual: 'BDS, MDS (Conservative Dentistry & Endodontics)', dept: 'dept-17', time: 15, phone: '9876500066' },
  ];

  console.log(`  ✓ Registering ${doctorsData.length} doctors into profiles and doctors table...`);

  // Create Core Auth users for primary testing logins
  const primaryAccounts = [
    { email: 'admin@smartqueue.com',   password: 'Admin@123',   name: 'Admin Chief Officer',  phone: '9876500001', role: 'ADMIN' },
    { email: 'doctor@smartqueue.com',  password: 'Doctor@123',  name: 'Dr. Ravi Kumar',       phone: '9876500014', role: 'DOCTOR' },
    { email: 'patient@smartqueue.com', password: 'Patient@123', name: 'Ananya Sharma',       phone: '9876511111', role: 'PATIENT' },
  ];

  const primaryIdMap: Record<string, string> = {};

  for (const acc of primaryAccounts) {
    const { data: existing } = await supabase.auth.admin.listUsers();
    const found = existing?.users?.find((au) => au.email === acc.email);

    let authId: string;
    if (found) {
      authId = found.id;
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true,
        user_metadata: { name: acc.name },
      });
      if (error) {
        console.error(`  ✗ Auth user error ${acc.email}:`, error.message);
        continue;
      }
      authId = data.user.id;
    }
    primaryIdMap[acc.email] = authId;

    await supabase.from('profiles').upsert({
      id: authId,
      name: acc.name,
      phone: acc.phone,
      role: acc.role,
      created_at: new Date().toISOString(),
    });
  }

  // Populate profiles & doctors
  for (let i = 0; i < doctorsData.length; i++) {
    const d = doctorsData[i];
    const docId = `doc-${String(i + 1).padStart(2, '0')}`;
    
    // For Dr. Ravi Kumar, use primary auth user id if available
    let userId: string;
    if (d.name === 'Dr. Ravi Kumar' && primaryIdMap['doctor@smartqueue.com']) {
      userId = primaryIdMap['doctor@smartqueue.com'];
    } else {
      // Create a deterministic UUID for profile
      const email = `${d.name.toLowerCase().replace(/[^a-z]/g, '')}@smartqueue.com`;
      
      const { data: existing } = await supabase.auth.admin.listUsers();
      const found = existing?.users?.find((au) => au.email === email);

      if (found) {
        userId = found.id;
      } else {
        const { data, error } = await supabase.auth.admin.createUser({
          email: email,
          password: 'Doctor@123',
          email_confirm: true,
          user_metadata: { name: d.name },
        });
        if (error) {
          // If auth user limit reached or fails, create profile row with generated UUID
          userId = uuidv4();
        } else {
          userId = data.user.id;
        }
      }

      await supabase.from('profiles').upsert({
        id: userId,
        name: d.name,
        phone: d.phone,
        role: 'DOCTOR',
        created_at: new Date().toISOString(),
      });
    }

    await supabase.from('doctors').upsert({
      id: docId,
      user_id: userId,
      hospital_id: 'hosp-01',
      department_id: d.dept,
      specialization: d.spec,
      qualification: d.qual,
      average_consultation_time: d.time,
      available: true,
      created_at: new Date().toISOString(),
    });
  }

  console.log(`  ✅ Successfully seeded ${doctorsData.length} doctors across 17 clinical departments!`);

  // Seed sample patient appointments & tokens for Dr. Ravi Kumar & Dr. Priya Sharma
  const patientId = primaryIdMap['patient@smartqueue.com'];
  if (patientId) {
    const sampleAppts = [
      { id: 'appt-01', patient_id: patientId, doctor_id: 'doc-01', appointment_date: today, appointment_time: '09:00 AM', appointment_type: 'General Checkup • AI Triage: Routine Diabetes Followup', status: 'WAITING', created_at: new Date().toISOString() },
      { id: 'appt-02', patient_id: patientId, doctor_id: 'doc-01', appointment_date: today, appointment_time: '09:30 AM', appointment_type: 'Fever & Cough Consultation', status: 'WAITING', created_at: new Date().toISOString() },
      { id: 'appt-03', patient_id: patientId, doctor_id: 'doc-02', appointment_date: today, appointment_time: '10:00 AM', appointment_type: 'Cardiology Review • AI Triage: Palpitations and Chest Tightness', status: 'WAITING', created_at: new Date().toISOString() },
    ];
    await supabase.from('appointments').upsert(sampleAppts);

    const sampleTokens = [
      { id: 'tok-01', appointment_id: 'appt-01', token_number: 'A-01', priority: 'NORMAL', status: 'WAITING', estimated_wait: 8, created_at: new Date().toISOString() },
      { id: 'tok-02', appointment_id: 'appt-02', token_number: 'A-02', priority: 'NORMAL', status: 'WAITING', estimated_wait: 16, created_at: new Date().toISOString() },
      { id: 'tok-03', appointment_id: 'appt-03', token_number: 'B-01', priority: 'PRIORITY', status: 'WAITING', estimated_wait: 10, created_at: new Date().toISOString() },
    ];
    await supabase.from('tokens').upsert(sampleTokens);
    console.log('  ✓ Initial appointments & tokens active');
  }

  console.log('\n🎉 SmartQueue Database is fully seeded with 65+ specialized doctors!');
}

seedDatabase().catch(console.error);
