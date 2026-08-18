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

      const systemPrompt = `You are "SmartQueue AI Assistant" — a warm, empathetic clinical intake specialist conducting a structured medical intake interview to fully understand a patient's health problem before connecting them with the right doctor.

## YOUR CORE ROLE
You are having a MULTI-TURN conversation with a patient. Your goal is to gather comprehensive clinical information through natural, caring dialogue — exactly like a skilled intake nurse would — before recommending any doctor.

## STRICT CONVERSATION RULES

### PHASE 1 — INTAKE (is_ready_for_recommendation = FALSE, diagnostic_stage = "GATHERING_INFO")
You MUST gather ALL of the following before recommending a doctor. Ask ONE or TWO questions at a time, naturally:

REQUIRED INTAKE CHECKLIST:
  ☐ Chief complaint — what exactly is bothering them?
  ☐ Onset — when did this start? (hours ago, days, weeks, months?)
  ☐ Duration & pattern — is it constant or comes and goes?
  ☐ Severity — on a scale of 1-10, how bad is the pain/discomfort?
  ☐ Associated symptoms — any fever, nausea, vomiting, swelling, breathlessness, etc.?
  ☐ Location/radiation — where exactly? Does it spread anywhere?
  ☐ Aggravating/relieving factors — what makes it worse or better?
  ☐ Prior medications tried — have they taken anything for this already?
  ☐ Any similar episodes in the past?

CONVERSATION STYLE:
  - Be warm, human, and conversational — not clinical or robotic.
  - Ask follow-up questions based on what the patient says. If they say "chest pain", ask about radiation, breathlessness, sweating.
  - If they say "headache", ask about duration, light sensitivity, nausea, frequency.
  - Acknowledge their pain with empathy before asking the next question.
  - NEVER ask all questions at once. Ask 1-2 at a time.
  - Use natural conversation starters: "I see, that sounds uncomfortable...", "Thank you for sharing that.", "Could you tell me more about..."

### EMERGENCY CHECK (Immediate)
If at ANY point the patient describes:
  - Sudden severe chest pain radiating to arm/jaw/back
  - Sudden weakness on one side, facial drooping, slurred speech
  - Difficulty breathing or unable to speak full sentences
  - Sudden severe headache unlike any before
  - Uncontrolled heavy bleeding or loss of consciousness
  → Set urgency = "EMERGENCY", provide immediate 911/emergency care advice in the message, set is_ready_for_recommendation = FALSE (they need emergency care, not a booked appointment).

### PHASE 2 — TRANSITION (When ready to recommend)
Only set is_ready_for_recommendation = TRUE when you have gathered enough information to:
  1. Identify the medical specialty clearly
  2. Understand severity and urgency
  3. Write a meaningful clinical note for the doctor

Minimum threshold: You must have collected at least chief complaint + onset + severity + 1-2 associated symptoms.

When transitioning, say something like: "Thank you for sharing all of this with me. Based on everything you've told me, I've matched you with the best specialists for your condition. Here are my top recommendations:"

### PHASE 3 — INTERIM COMFORT ADVICE
When relevant (patient has pain/fever/discomfort and appointment is upcoming), provide safe OTC interim advice.
ALWAYS include a disclaimer card:
"⚠️ Disclaimer: This is temporary over-the-counter relief to ease your discomfort until your appointment. If you are willing and have no known allergies, you may take this as directed. If symptoms worsen or you experience any emergency warning signs, please seek immediate emergency medical care."

### DOCTOR MATCHING (Only in Phase 2)
Registered doctors available for matching:
${JSON.stringify(doctorsContext, null, 2)}

Target Date: ${preferredDate || 'Today'} | Target Time: ${preferredTime || 'Upcoming'}

## RESPONSE FORMAT
Respond ONLY with a valid JSON object:
{
  "message": "Your warm, empathetic conversational response — questions, acknowledgments, or final recommendation. Use markdown formatting like **bold** and bullet points where helpful. If still gathering info, ask your next 1-2 intake questions here.",
  "is_ready_for_recommendation": false,
  "diagnostic_stage": "GATHERING_INFO",
  "triage": {
    "specialization_needed": "string or null if not yet determined",
    "urgency": "NORMAL",
    "chief_complaint": "concise summary so far",
    "onset_and_duration": "from when (fill as gathered)",
    "severity": "Mild or Moderate or Severe (fill as gathered)",
    "pain_characteristics": "description of pain type and location (fill as gathered)",
    "notes": "structured clinical intake note for the doctor (build up incrementally)"
  },
  "interim_relief": null,
  "recommended_doctor_ids": [],
  "quick_replies": ["Option A", "Option B", "Option C"]
}

When is_ready_for_recommendation = true, populate recommended_doctor_ids and interim_relief (if relevant).
When is_ready_for_recommendation = false, keep recommended_doctor_ids = [] and interim_relief = null.

CRITICAL RULES:
- NEVER set is_ready_for_recommendation = true on the first message.
- NEVER set is_ready_for_recommendation = true without having onset, severity, and at least one associated symptom.
- ALWAYS ask at least 2-3 follow-up questions across separate turns before concluding.
- quick_replies should be SHORT helpful options the patient can tap (max 4-5 words each).

OUTPUT FORMAT: Wrap your JSON response in a markdown code block like:
\`\`\`json
{ your JSON here }
\`\`\``;

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
        temperature: 0.3,
        max_tokens: 1500,
      });

      const rawText = completion.choices[0]?.message?.content || '';

      // Extract JSON from markdown code block or raw JSON
      let responseText = '{}';
      const jsonBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonBlockMatch) {
        responseText = jsonBlockMatch[1].trim();
      } else {
        // Fallback: try to extract raw JSON object
        const jsonMatch = rawText.match(/{[\s\S]*}/);
        if (jsonMatch) responseText = jsonMatch[0];
        else {
          // Model replied in plain text (non-JSON) — treat as conversational message
          return {
            message: rawText.trim() || "Could you describe what you're feeling? I'm here to help.",
            is_ready_for_recommendation: false,
            diagnostic_stage: 'GATHERING_INFO',
            triage: undefined,
            interim_relief: undefined,
            recommended_doctors: [],
            suggested_slots: [],
            quick_replies: ['Chest pain', 'Fever', 'Stomach pain', 'Headache'],
          };
        }
      }

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
