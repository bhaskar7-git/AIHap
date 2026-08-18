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

export interface TriageResult {
  message: string;
  is_ready_for_recommendation: boolean;
  triage?: {
    specialization_needed: string;
    urgency: 'NORMAL' | 'PRIORITY' | 'EMERGENCY';
    chief_complaint: string;
    duration?: string;
    severity?: string;
    notes?: string;
  };
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
   * Process patient conversation, assess symptoms, determine urgency & match registered doctors.
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

      const systemPrompt = `You are "SmartQueue AI Assistant", an empathetic, highly skilled clinical triage and direct 1:1 doctor matching expert.
Your job:
1. Converse with the patient to understand their health symptoms, duration, pain/severity, and any relevant context.
2. Identify the exact medical specialization needed (e.g. Cardiology, Dermatology, Orthopedics, General Medicine, Pediatrics, Neurology, etc.).
3. Assess medical urgency:
   - "EMERGENCY": Severe chest pain, stroke signs, respiratory distress, acute trauma, severe bleeding.
   - "PRIORITY": High fever, acute severe pain, rapidly spreading rash, acute asthma attack.
   - "NORMAL": Routine checkup, mild cold/cough, joint stiffness, chronic follow-ups, minor rash.
4. Match against the registered doctors in our platform:
${JSON.stringify(doctorsContext, null, 2)}

5. If you do not have enough clarity on symptoms (e.g. just said "hi" or "I am sick"), ask ONE warm, concise clarifying question and set "is_ready_for_recommendation": false.
6. Once the patient has shared their symptoms, set "is_ready_for_recommendation": true, provide a warm supportive response, and recommend the best matching doctor(s).
7. If preferred date/time is mentioned (Date: ${preferredDate || 'Not specified'}, Time: ${preferredTime || 'Not specified'}), factor that in.

IMPORTANT: Respond ONLY with a valid JSON object matching this structure:
{
  "message": "Empathetic, clear conversational response explaining findings & recommendations to the patient",
  "is_ready_for_recommendation": true or false,
  "triage": {
    "specialization_needed": "string (e.g. Cardiology)",
    "urgency": "NORMAL" | "PRIORITY" | "EMERGENCY",
    "chief_complaint": "string summary",
    "duration": "string (e.g. 2 days)",
    "severity": "Mild" | "Moderate" | "Severe",
    "notes": "concise clinical summary for doctor"
  },
  "recommended_doctor_ids": [
    {
      "doctor_id": "string",
      "match_score": 95,
      "match_reason": "string explaining why this doctor is best suited"
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
        max_tokens: 1000,
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
            (spec.includes('cardio') && d.specialization.toLowerCase().includes('cardio')) ||
            (spec.includes('ortho') && d.specialization.toLowerCase().includes('ortho')) ||
            (spec.includes('derma') && d.specialization.toLowerCase().includes('derma')) ||
            (spec.includes('pediat') && d.specialization.toLowerCase().includes('pediat')) ||
            (spec.includes('general') && d.specialization.toLowerCase().includes('physician'))
        );
        matchedDoctors = (fallback.length > 0 ? fallback : doctors.slice(0, 2)).map((d) => ({
          doctor: d,
          match_score: 95,
          match_reason: `Specialized in ${d.specialization} (${d.department_name || 'General Clinic'})`,
        }));
      }

      // If still empty, return top available doctors
      if (matchedDoctors.length === 0 && doctors.length > 0) {
        matchedDoctors = doctors.slice(0, 2).map((d) => ({
          doctor: d,
          match_score: 90,
          match_reason: `Experienced in ${d.specialization}`,
        }));
      }

      return {
        message: parsed.message || 'I have evaluated your symptoms and matched you with the best available specialists.',
        is_ready_for_recommendation: parsed.is_ready_for_recommendation ?? (matchedDoctors.length > 0),
        triage: parsed.triage,
        recommended_doctors: matchedDoctors,
        suggested_slots: ['09:00 AM', '10:30 AM', '02:00 PM', '04:30 PM', '06:00 PM'],
        quick_replies: parsed.quick_replies || ['Book 1st Doctor', 'Choose Morning Slot', 'Check live queue'],
      };
    } catch (error: any) {
      console.error('Groq AI Triage error:', error);
      const doctors = await store.getAllDoctors();
      return {
        message: "I understand your health concern. Here are the top available specialists ready to assist you:",
        is_ready_for_recommendation: true,
        triage: {
          specialization_needed: 'General Medicine',
          urgency: 'NORMAL',
          chief_complaint: messages[messages.length - 1]?.content || 'General Consultation',
          duration: 'Recent',
          severity: 'Moderate',
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
