import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../db/store.js';
import { Hospital } from '../types/index.js';

export const getHospitals = async (req: Request, res: Response): Promise<void> => {
  try {
    const hospitals = await store.getAllHospitals();
    res.status(200).json({ success: true, count: hospitals.length, data: hospitals });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getHospitalById = async (req: Request, res: Response): Promise<void> => {
  try {
    const hospital = await store.getHospitalById(req.params.id as string);
    if (!hospital) {
      res.status(404).json({ success: false, message: 'Hospital not found' });
      return;
    }
    const departments = await store.getAllDepartments(hospital.id);
    res.status(200).json({ success: true, data: { ...hospital, departments } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createHospital = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, address, city, phone } = req.body;
    if (!name || !address || !city || !phone) {
      res.status(400).json({ success: false, message: 'All fields (name, address, city, phone) are required.' });
      return;
    }

    const newHospital: Hospital = {
      id: uuidv4(),
      name,
      address,
      city,
      phone,
      created_at: new Date().toISOString(),
    };

    await store.createHospital(newHospital);
    res.status(201).json({ success: true, data: newHospital });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
