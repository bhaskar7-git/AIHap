import dotenv from 'dotenv';
dotenv.config();

export const config = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'smartqueue-jwt-secret-2026-fallback',
  // Admin registration secret key — NEVER expose this to the frontend
  ADMIN_REGISTRATION_KEY: process.env.ADMIN_REGISTRATION_KEY || '',
};

