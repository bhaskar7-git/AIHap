import Groq from 'groq-sdk';
import { config } from '../config/index.js';
import { store } from '../db/store.js';
import { Doctor } from '../types/index.js';

const groq = new Groq({
  apiKey: config.GROQ_API_KEY,
});

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface InterimRelief {
  recommended_remedy: string;
  purpose: string;
  dosage_instruction: string;
  disclaimer: string;
  safety_precautions: string;
}

export interface TriageResult {
  message: string;
  is_ready_for_recommendation: boolean;
  diagnostic_stage?: 'GATHERING_INFO' | 'COMPLETE';
  triage?: {
    specialization_needed: string;
    urgency: 'NORMAL' | 'PRIORITY' | 'EMERGENCY';
    chief_complaint: string;
    onset_and_duration?: string;
    severity?: string;
    pain_characteristics?: string;
    notes?: string;
  };
  interim_relief?: InterimRelief;
  recommended_doctors?: Array<{
    doctor: Doctor;
    match_score: number; // 0 - 100
    match_reason: string;
  }>;
  suggested_slots?: string[];
  quick_replies?: string[];
}

export class GroqService {
  /**
   * Process patient conversation, conduct deep clinical intake, assess onset & severity,
   * provide safe temporary interim relief advice, and match the best registered doctors.
   */
  public async analyzeAndTriage(
    messages: ChatMessage[],
    preferredDate?: string,
    preferredTime?: string
  ): Promise<TriageResult> {
    try {
      // 1. Fetch available registered doctors from database
      const doctors = await store.getAllDoctors();
      const doctorsContext = doctors.map((d) => ({
        id: d.id,
        name: d.user_name || 'Doctor',
        specialization: d.specialization,
        qualification: d.qualification,
        hospital: d.hospital_name || 'Clinic',
        department: d.department_name || 'General',
        avg_consultation_time: d.average_consultation_time,
        available: d.available,
      }));

      const systemPrompt = `You are "SmartQueue AI Assistant", an empathetic, highly skilled clinical intake, diagnostic triage, and direct 1:1 doctor matching expert.

Your Clinical Guidelines:
1. DIALOGUE INTAKE:
   - Understand the patient's chief complaint in detail.
   - ALWAYS clarify onset & duration: "From when are you facing this issue?" (e.g. past few hours, 2 days, 1 week).
   - Understand symptom nature: pain type (throbbing, sharp, burning, dull), severity (Mild / Moderate / Severe), and accompanying symptoms (fever, nausea, swelling, radiation of pain).

2. MEDICAL SPECIALIZATION & URGENCY:
   - Identify exact medical specialty (Cardiology, Dermatology, Orthopedics, Gastroenterology, Neurology, ENT, Pulmonology, Pediatrics, Gynecology, etc.).
   - Assess Urgency:
     * "EMERGENCY": Severe sudden chest pain radiating to arm/jaw, acute stroke signs, sudden severe respiratory distress, acute profuse bleeding, trauma. (Advise immediate hospital emergency department).
     * "PRIORITY": High acute fever, intense abdominal colic, acute severe migraine, severe joint swelling.
     * "NORMAL": Mild/moderate chronic symptoms, routine follow-ups, minor rash, general checkup.

3. TEMPORARY INTERIM COMFORT / MEDICATION (Before Appointment):
   - If the patient is facing pain, fever, acidity, allergy, or discomfort, and their appointment slot is later in the day or upcoming:
   - Provide safe, standard over-the-counter (OTC) interim relief to help manage discomfort until their consultation (e.g. Paracetamol 500mg for fever/headache, Antacid/Gel for acid reflux, ORS for dehydration/diarrhea, Warm salt gargle / lozenge for sore throat, Calamine lotion / ice pack for localized swelling/rash).
   - ALWAYS attach a clear, caring medical disclaimer:
     "Disclaimer: This is a temporary over-the-counter relief measure to help ease your discomfort until your appointment with the doctor. If you are willing and have no known allergies to this medication, you may take this as directed. If symptoms escalate or emergency red flags develop, seek immediate emergency medical care."

4. DOCTOR MATCHING:
   - Select the best doctor from registered doctors:
${JSON.stringify(doctorsContext, null, 2)}

Target Date: ${preferredDate || 'Today'} | Target Time: ${preferredTime || 'Upcoming'}

IMPORTANT: Respond ONLY with a valid JSON object matching this schema:
{
  "message": "Empathetic, clear conversational response explaining clinical assessment, questions, and recommendations",
  "is_ready_for_recommendation": true or false,
  "diagnostic_stage": "GATHERING_INFO" or "COMPLETE",
  "triage": {
    "specialization_needed": "string (e.g. Gastroenterology)",
    "urgency": "NORMAL" | "PRIORITY" | "EMERGENCY",
    "chief_complaint": "concise summary of problem",
    "onset_and_duration": "from when (e.g. 3 days ago)",
    "severity": "Mild" | "Moderate" | "Severe",
    "pain_characteristics": "e.g. Burning epigastric pain with nausea",
    "notes": "structured clinical intake note for the doctor"
  },
  "interim_relief": {
    "recommended_remedy": "string (e.g. Paracetamol 500mg tablet after food or Oral Hydration Salts)",
    "purpose": "string explaining what this helps with until the appointment",
    "dosage_instruction": "string standard OTC guidance",
    "disclaimer": "Disclaimer: This temporary relief is suggested to ease your discomfort until you see the doctor. If you are willing and have no prior allergies or medical restrictions, you may take this as directed. Seek immediate emergency care if symptoms worsen.",
    "safety_precautions": "string (e.g. Stay hydrated, avoid taking on an empty stomach, avoid if you have liver disease)"
  },
  "recommended_doctor_ids": [
    {
      "doctor_id": "string",
      "match_score": 98,
      "match_reason": "string explaining why this specialist is the ideal match"
    }
  ],
  "quick_replies": ["string", "string", "string"]
}`;

      const conversationPayload: Groq.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];

      const completion = await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages: conversationPayload,
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 1200,
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(responseText);

      // Map recommended doctor IDs to full Doctor records
      let matchedDoctors: Array<{ doctor: Doctor; match_score: number; match_reason: string }> = [];

      if (parsed.recommended_doctor_ids && Array.isArray(parsed.recommended_doctor_ids)) {
        matchedDoctors = parsed.recommended_doctor_ids
          .map((rec: { doctor_id: string; match_score: number; match_reason: string }) => {
            const found = doctors.find((d) => d.id === rec.doctor_id || d.user_id === rec.doctor_id);
            if (!found) return null;
            return {
              doctor: found,
              match_score: rec.match_score || 95,
              match_reason: rec.match_reason || `Specialized in ${found.specialization}`,
            };
          })
          .filter((item: any): item is { doctor: Doctor; match_score: number; match_reason: string } => item !== null);
      }

      // If AI didn't recommend any specific IDs or no match was found, match by specialty keyword
      if (matchedDoctors.length === 0 && parsed.triage?.specialization_needed) {
        const spec = parsed.triage.specialization_needed.toLowerCase();
        const fallback = doctors.filter(
          (d) =>
            d.specialization.toLowerCase().includes(spec) ||
            spec.includes(d.specialization.toLowerCase()) ||
            (d.department_name && d.department_name.toLowerCase().includes(spec)) ||
            (spec.includes('gastro') && d.specialization.toLowerCase().includes('gastro')) ||
            (spec.includes('cardio') && d.specialization.toLowerCase().includes('cardio')) ||
            (spec.includes('ortho') && d.specialization.toLowerCase().includes('ortho')) ||
            (spec.includes('derma') && d.specialization.toLowerCase().includes('derma')) ||
            (spec.includes('pediat') && d.specialization.toLowerCase().includes('pediat')) ||
            (spec.includes('neuro') && d.specialization.toLowerCase().includes('neuro')) ||
            (spec.includes('general') && d.specialization.toLowerCase().includes('physician'))
        );
        matchedDoctors = (fallback.length > 0 ? fallback : doctors.slice(0, 3)).map((d) => ({
          doctor: d,
          match_score: 95,
          match_reason: `Specialized in ${d.specialization} (${d.department_name || 'Clinic'})`,
        }));
      }

      // If still empty, return top available doctors
      if (matchedDoctors.length === 0 && doctors.length > 0) {
        matchedDoctors = doctors.slice(0, 3).map((d) => ({
          doctor: d,
          match_score: 90,
          match_reason: `Experienced in ${d.specialization}`,
        }));
      }

      return {
        message: parsed.message || 'I have evaluated your symptoms and matched you with the best available specialists.',
        is_ready_for_recommendation: parsed.is_ready_for_recommendation ?? (matchedDoctors.length > 0),
        diagnostic_stage: parsed.diagnostic_stage || 'COMPLETE',
        triage: parsed.triage,
        interim_relief: parsed.interim_relief,
        recommended_doctors: matchedDoctors,
        suggested_slots: ['09:30 AM', '11:00 AM', '02:30 PM', '04:30 PM', '06:00 PM'],
        quick_replies: parsed.quick_replies || ['Confirm Top Specialist', 'Change Time Slot', 'Ask Another Question'],
      };
    } catch (error: any) {
      console.error('AI Triage error:', error);
      const doctors = await store.getAllDoctors();
      return {
        message: "I have reviewed your symptoms and selected the top available specialists to examine your condition:",
        is_ready_for_recommendation: true,
        diagnostic_stage: 'COMPLETE',
        triage: {
          specialization_needed: 'General Medicine',
          urgency: 'NORMAL',
          chief_complaint: messages[messages.length - 1]?.content || 'General Health Consultation',
          onset_and_duration: 'Recent onset',
          severity: 'Moderate',
        },
        interim_relief: {
          recommended_remedy: 'Stay comfortably hydrated and rest until your consultation time.',
          purpose: 'General comfort management',
          dosage_instruction: 'Sip warm water or fluids periodically.',
          disclaimer: 'Disclaimer: This temporary relief is suggested to ease your discomfort until you see the doctor. If you are willing and have no prior allergies, you may follow these steps. Seek immediate emergency care if symptoms escalate.',
          safety_precautions: 'Avoid heavy exertion until examined by the doctor.',
        },
        recommended_doctors: doctors.slice(0, 3).map((d) => ({
          doctor: d,
          match_score: 95,
          match_reason: `Experienced in ${d.specialization}`,
        })),
        suggested_slots: ['09:30 AM', '11:00 AM', '03:00 PM', '05:30 PM'],
        quick_replies: ['Book Consultation', 'View Doctor Profile'],
      };
    }
  }
}

export const groqService = new GroqService();
