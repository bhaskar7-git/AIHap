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
   * Process patient conversation in a truly human-like way.
   * Handles casual chat, off-topic questions, and medical intake naturally.
   */
  public async analyzeAndTriage(
    messages: ChatMessage[],
    preferredDate?: string,
    preferredTime?: string
  ): Promise<TriageResult> {
    try {
      // Fetch available registered doctors from database
      const doctors = await store.getAllDoctors();
      const today = new Date().toISOString().split('T')[0];

      // Fetch live queue count per doctor to help score by wait time
      const doctorQueueCounts: Record<string, number> = {};
      for (const d of doctors.slice(0, 20)) { // limit to avoid too many DB calls
        try {
          const tokens = await store.getTokensByDoctor(d.id, today);
          doctorQueueCounts[d.id] = tokens.filter(t => t.status === 'WAITING' || t.status === 'CALLED' || t.status === 'IN_CONSULTATION').length;
        } catch { doctorQueueCounts[d.id] = 0; }
      }

      const doctorsContext = doctors.map((d) => ({
        id: d.id,
        name: d.user_name || 'Doctor',
        specialization: d.specialization,
        qualification: d.qualification,
        avg_consultation_time: d.average_consultation_time,
        available: d.available,
        current_queue_size: doctorQueueCounts[d.id] ?? 0,
        estimated_wait_min: (doctorQueueCounts[d.id] ?? 0) * (d.average_consultation_time || 10),
      }));

      const systemPrompt = `You are Aria, a warm and caring medical intake assistant at SmartQueue clinic. You talk like a real human being — friendly, empathetic, natural, and smart. You are NOT a robot and should NEVER sound like one.

## YOUR PERSONALITY
- You are warm, genuine, and conversational — like a caring friend who happens to work at a clinic
- You respond naturally to WHATEVER the patient says — casual greetings, off-topic questions, jokes, or medical symptoms
- If someone says "hi" or "hello", greet them warmly and ask what brings them in today
- If someone asks "where are you from?" or something off-topic, you answer naturally with a light response and gently steer back to health
- If someone is rude, stay calm and professional
- You NEVER repeat the same response twice — always react to what was just said
- You speak in simple, everyday language — not medical jargon

## YOUR JOB
Your goal is to understand the patient's health problem through natural conversation, then connect them with the right doctor.

## HOW YOU GATHER INFORMATION (naturally, not like a form)
Ask about these through conversation — but organically, based on what they say:
- What's bothering them (chief complaint)
- Since when (onset/duration)
- How bad on a scale of 1-10 (severity)
- Other symptoms (fever, nausea, swelling, breathlessness, etc.)
- What makes it worse/better
- Any meds tried already
- Past history of similar problem

IMPORTANT: Ask 1-2 questions at a time maximum. Never interrogate them with a list.

## EMERGENCY
If the patient describes: sudden severe chest pain spreading to arm/jaw, sudden one-sided weakness or drooping, unable to breathe, sudden worst headache of life, heavy uncontrolled bleeding — tell them immediately to call emergency services (112/911). Set urgency = "EMERGENCY".

## WHEN TO RECOMMEND A DOCTOR
Only recommend doctors AFTER you have gathered: chief complaint + onset + severity + at least one associated symptom.
Minimum 2-3 back-and-forth exchanges before recommending.
When ready, say something like: "Based on everything you've shared, here's who I'd recommend for you:"

## AVAILABLE DOCTORS (use these IDs for recommendation):
${JSON.stringify(doctorsContext, null, 2)}

Appointment Date: ${preferredDate || 'Today'} | Time: ${preferredTime || 'Upcoming'}

## RESPONSE FORMAT
Always respond with this JSON (wrap in \`\`\`json ... \`\`\`):

\`\`\`json
{
  "message": "Your natural, human response here. React to what was said. If asking questions, ask 1-2 max.",
  "is_ready_for_recommendation": false,
  "triage": {
    "specialization_needed": "null or specialty name when known",
    "urgency": "NORMAL",
    "chief_complaint": "brief summary of problem so far",
    "onset_and_duration": "when it started",
    "severity": "Mild / Moderate / Severe",
    "pain_characteristics": "describe the symptom",
    "notes": "clinical note for doctor"
  },
  "interim_relief": null,
  "recommended_doctor_ids": [],
  "quick_replies": ["short option 1", "short option 2"]
}
\`\`\`

Rules:
- is_ready_for_recommendation = true ONLY when you have enough to recommend. Also populate recommended_doctor_ids and interim_relief then.
- quick_replies = 2-4 SHORT tap-able options relevant to what you just asked (or empty array [] if not needed)
- interim_relief = null unless recommending. If patient has pain/fever and appointment is later, suggest safe OTC remedy WITH disclaimer.
- For non-medical messages (greetings, off-topic), still respond naturally in "message" but keep is_ready_for_recommendation = false`;

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
        temperature: 0.7, // higher temperature = more natural, varied responses
        max_tokens: 1200,
      });

      const rawText = completion.choices[0]?.message?.content || '';

      // Robust JSON extraction — multiple strategies
      let parsed: any = null;

      // Strategy 1: JSON code block
      const jsonBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonBlockMatch) {
        try { parsed = JSON.parse(jsonBlockMatch[1].trim()); } catch { /* try next */ }
      }

      // Strategy 2: First JSON object in response
      if (!parsed) {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try { parsed = JSON.parse(jsonMatch[0]); } catch { /* try next */ }
        }
      }

      // Strategy 3: Model replied in plain text — use it directly as message
      if (!parsed) {
        return {
          message: rawText.trim() || "I'm here to help! What health concern brings you in today?",
          is_ready_for_recommendation: false,
          diagnostic_stage: 'GATHERING_INFO',
          triage: undefined,
          interim_relief: undefined,
          recommended_doctors: [],
          suggested_slots: [],
          quick_replies: [],
        };
      }

      // If AI isn't ready to recommend, return just the conversation
      if (!parsed.is_ready_for_recommendation) {
        return {
          message: parsed.message || "Tell me more about how you're feeling.",
          is_ready_for_recommendation: false,
          diagnostic_stage: 'GATHERING_INFO',
          triage: parsed.triage,
          interim_relief: undefined,
          recommended_doctors: [],
          suggested_slots: [],
          quick_replies: parsed.quick_replies || [],
        };
      }

      // AI is ready to recommend — map doctor IDs to full Doctor records
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

      // Only do fallback doctor matching when AI explicitly says ready
      if (!parsed.is_ready_for_recommendation) {
        return {
          message: parsed.message || "Could you tell me more about what you're experiencing?",
          is_ready_for_recommendation: false,
          diagnostic_stage: 'GATHERING_INFO',
          triage: parsed.triage,
          interim_relief: undefined,
          recommended_doctors: [],
          suggested_slots: [],
          quick_replies: parsed.quick_replies || ['Tell me more', 'Chest pain', 'Fever', 'Headache'],
        };
      }

      // Fallback doctor matching by specialty keyword (only runs when is_ready_for_recommendation = true)
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
      console.error('AI Triage error:', error?.message || error);
      // Return a friendly conversational reply — never dump doctors on error
      return {
        message: "I'm here to help you find the right doctor. 😊\n\nCould you please tell me — **what symptoms or health concerns** are you experiencing today? For example, are you feeling pain, fever, or discomfort somewhere?",
        is_ready_for_recommendation: false,
        diagnostic_stage: 'GATHERING_INFO',
        triage: undefined,
        interim_relief: undefined,
        recommended_doctors: [],
        suggested_slots: [],
        quick_replies: ['I have chest pain', 'I have a fever', 'Stomach ache', 'Headache / migraine'],
      };
    }
  }
}

export const groqService = new GroqService();
