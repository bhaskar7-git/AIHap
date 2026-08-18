import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { store } from '../db/store.js';
import { Doctor, Department, User } from '../types/index.js';

export const getDepartments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { hospitalId } = req.query;
    const departments = await store.getAllDepartments(hospitalId as string | undefined);
    res.status(200).json({ success: true, count: departments.length, data: departments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createDepartment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { hospital_id, name, description } = req.body;
    if (!hospital_id || !name) {
      res.status(400).json({ success: false, message: 'Hospital ID and Department Name are required.' });
      return;
    }

    const newDept: Department = {
      id: uuidv4(),
      hospital_id,
      name,
      description: description || '',
      created_at: new Date().toISOString(),
    };

    await store.createDepartment(newDept);
    res.status(201).json({ success: true, data: newDept });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDoctors = async (req: Request, res: Response): Promise<void> => {
  try {
    const { departmentId, hospitalId, search } = req.query;
    let doctors = await store.getAllDoctors(departmentId as string | undefined, hospitalId as string | undefined);

    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      doctors = doctors.filter(d => 
        (d.user_name && d.user_name.toLowerCase().includes(q)) ||
        (d.specialization && d.specialization.toLowerCase().includes(q)) ||
        (d.department_name && d.department_name.toLowerCase().includes(q)) ||
        (d.hospital_name && d.hospital_name.toLowerCase().includes(q))
      );
    }

    res.status(200).json({ success: true, count: doctors.length, data: doctors });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDoctorById = async (req: Request, res: Response): Promise<void> => {
  try {
    const doctor = await store.getDoctorById(req.params.id);
    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor not found.' });
      return;
    }
    res.status(200).json({ success: true, data: doctor });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateDoctor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { available, average_consultation_time, specialization, qualification } = req.body;
    
    const updated = await store.updateDoctor(id, {
      ...(typeof available === 'boolean' ? { available } : {}),
      ...(average_consultation_time ? { average_consultation_time: parseInt(average_consultation_time, 10) } : {}),
      ...(specialization ? { specialization } : {}),
      ...(qualification ? { qualification } : {}),
    });

    if (!updated) {
      res.status(404).json({ success: false, message: 'Doctor not found.' });
      return;
    }

    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createDoctor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, password, hospital_id, department_id, specialization, qualification, average_consultation_time } = req.body;

    if (!name || !email || !phone || !password || !hospital_id || !department_id) {
      res.status(400).json({ success: false, message: 'Missing required doctor fields.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const user: User = {
      id: uuidv4(),
      name,
      email: email.toLowerCase().trim(),
      phone,
      password_hash,
      role: 'DOCTOR',
      created_at: new Date().toISOString(),
    };

    await store.createUser(user);

    const doctor: Doctor = {
      id: uuidv4(),
      user_id: user.id,
      hospital_id,
      department_id,
      specialization: specialization || 'Specialist',
      qualification: qualification || 'MBBS, MD',
      average_consultation_time: average_consultation_time ? parseInt(average_consultation_time, 10) : 10,
      available: true,
      created_at: new Date().toISOString(),
    };

    await store.createDoctor(doctor);
    const enriched = await store.getDoctorById(doctor.id);

    res.status(201).json({ success: true, data: enriched });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
