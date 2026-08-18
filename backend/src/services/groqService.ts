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
    match_score: number;
    match_reason: string;
  }>;
  suggested_slots?: string[];
  quick_replies?: string[];
}

// Extracts JSON from model output — handles ```json blocks, raw objects, or plain text
function extractJSON(raw: string): any | null {
  // Strategy 1: markdown code block
  const blockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (blockMatch) {
    try { return JSON.parse(blockMatch[1].trim()); } catch { /* fall through */ }
  }
  // Strategy 2: first { ... } object in text
  const objMatch = raw.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]); } catch { /* fall through */ }
  }
  return null;
}

export class GroqService {

  /**
   * PHASE 1 — Pure conversation. NO doctor list. Tiny prompt, fast model.
   * Returns {ready: false, parsed} or {ready: true, triage} when enough info gathered.
   */
  private async conversationPhase(messages: ChatMessage[]): Promise<{
    ready: boolean;
    message: string;
    triage?: any;
    quick_replies?: string[];
  }> {
    // COMPACT system prompt — no doctor list, no huge JSON blocks
    const systemPrompt = `You are Aria, a friendly health assistant at SmartQueue clinic. Talk like a real human — warm, natural, caring. Never robotic.

BEHAVIOR:
- Respond naturally to ANYTHING the patient says (greetings, jokes, off-topic, medical concerns)
- "hi/hello" → warm greeting, ask what's bothering them today
- Off-topic questions (where are you from, what's your name, etc.) → answer naturally then gently ask about their health
- Medical complaint → ask follow-up questions naturally, 1-2 at a time
- Never repeat the same message twice
- Never list questions like a form

GOAL: Understand their health problem naturally. Gather: what's wrong, since when, how bad (1-10), any other symptoms. Once you have chief complaint + duration + severity + 1 associated symptom, set ready=true.

EMERGENCY: If they describe chest pain spreading to arm, sudden weakness, can't breathe, worst headache ever → tell them to call 112/911 immediately.

RESPOND WITH JSON in a code block:
\`\`\`json
{
  "message": "your natural human reply",
  "ready": false,
  "triage": {
    "specialization": "specialty needed or null",
    "urgency": "NORMAL",
    "chief_complaint": "what they said",
    "duration": "since when",
    "severity": "mild/moderate/severe or null",
    "notes": "brief clinical note"
  },
  "quick_replies": ["option1", "option2"]
}
\`\`\`
Set ready=true only when you have enough info to recommend a doctor. quick_replies can be [] if not needed.`;

    const payload: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ];

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',  // smaller/faster model, ~4x lower token cost
      messages: payload,
      temperature: 0.8,
      max_tokens: 500,
    });

    const raw = completion.choices[0]?.message?.content || '';
    const parsed = extractJSON(raw);

    if (!parsed) {
      // Model replied in plain text — use it directly
      return {
        ready: false,
        message: raw.trim() || "Could you tell me more about what you're feeling?",
        quick_replies: [],
      };
    }

    return {
      ready: !!parsed.ready,
      message: parsed.message || "Tell me more — what's been bothering you?",
      triage: parsed.triage,
      quick_replies: parsed.quick_replies || [],
    };
  }

  /**
   * PHASE 2 — Doctor matching. Only called when patient info is complete.
   * Sends compact doctor list and triage summary to match best doctors.
   */
  private async matchDoctorsPhase(
    triage: any,
    preferredDate?: string,
    preferredTime?: string
  ): Promise<{
    message: string;
    recommended_doctor_ids: string[];
    interim_relief: any | null;
    quick_replies: string[];
  }> {
    const doctors = await store.getAllDoctors();
    const today = new Date().toISOString().split('T')[0];

    // Get live queue count — limit to 15 doctors to save tokens
    const availableDoctors = doctors.filter(d => d.available).slice(0, 15);
    const queueCounts: Record<string, number> = {};
    for (const d of availableDoctors) {
      try {
        const tokens = await store.getTokensByDoctor(d.id, today);
        queueCounts[d.id] = tokens.filter(t =>
          t.status === 'WAITING' || t.status === 'CALLED' || t.status === 'IN_CONSULTATION'
        ).length;
      } catch { queueCounts[d.id] = 0; }
    }

    // Compact doctor list — only essential fields
    const doctorList = availableDoctors.map(d => ({
      id: d.id,
      name: d.user_name || 'Doctor',
      spec: d.specialization,
      qual: d.qualification,
      wait: queueCounts[d.id] ?? 0,
    }));

    const systemPrompt = `You are a doctor-matching AI. Given a patient's triage, pick the 3 best-fit doctors from the list. Prefer doctors with lower queue wait (wait field). If urgency is EMERGENCY/PRIORITY, pick fastest available.

Patient triage:
${JSON.stringify(triage, null, 2)}

Doctors:
${JSON.stringify(doctorList, null, 2)}

Date: ${preferredDate || 'Today'} | Time: ${preferredTime || 'Upcoming'}

Respond with JSON in code block:
\`\`\`json
{
  "message": "Warm recommendation message to patient",
  "doctor_ids": ["id1", "id2", "id3"],
  "interim_relief": null,
  "quick_replies": ["Book top doctor", "See more options"]
}
\`\`\`
If patient has pain/fever and appointment is upcoming, populate interim_relief with: {recommended_remedy, purpose, dosage_instruction, disclaimer, safety_precautions}.`;

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.3,
      max_tokens: 600,
    });

    const raw = completion.choices[0]?.message?.content || '';
    const parsed = extractJSON(raw);

    return {
      message: parsed?.message || 'Based on your symptoms, here are the best doctors for you:',
      recommended_doctor_ids: parsed?.doctor_ids || [],
      interim_relief: parsed?.interim_relief || null,
      quick_replies: parsed?.quick_replies || ['Book appointment', 'Ask a question'],
    };
  }

  /**
   * Main entry point: two-phase pipeline
   */
  public async analyzeAndTriage(
    messages: ChatMessage[],
    preferredDate?: string,
    preferredTime?: string
  ): Promise<TriageResult> {
    try {
      // PHASE 1: Have a natural conversation to gather symptoms
      const conv = await this.conversationPhase(messages);

      if (!conv.ready) {
        // Still gathering info — return conversation response
        return {
          message: conv.message,
          is_ready_for_recommendation: false,
          diagnostic_stage: 'GATHERING_INFO',
          triage: conv.triage,
          interim_relief: undefined,
          recommended_doctors: [],
          suggested_slots: [],
          quick_replies: conv.quick_replies || [],
        };
      }

      // PHASE 2: Enough info — match doctors
      const match = await this.matchDoctorsPhase(conv.triage, preferredDate, preferredTime);
      const doctors = await store.getAllDoctors();

      const matchedDoctors = match.recommended_doctor_ids
        .map(id => {
          const doctor = doctors.find(d => d.id === id);
          if (!doctor) return null;
          return {
            doctor,
            match_score: 96,
            match_reason: `Best match for ${conv.triage?.specialization || 'your condition'} — shortest wait time`,
          };
        })
        .filter(Boolean) as Array<{ doctor: Doctor; match_score: number; match_reason: string }>;

      // Fallback: keyword match if AI didn't return valid IDs
      if (matchedDoctors.length === 0 && conv.triage?.specialization) {
        const spec = conv.triage.specialization.toLowerCase();
        const fallback = doctors.filter(d =>
          d.available &&
          (d.specialization.toLowerCase().includes(spec) ||
           spec.includes(d.specialization.toLowerCase()))
        ).slice(0, 3);

        fallback.forEach(d => matchedDoctors.push({
          doctor: d,
          match_score: 93,
          match_reason: `Specializes in ${d.specialization}`,
        }));
      }

      // Last resort: top 3 available
      if (matchedDoctors.length === 0) {
        doctors.filter(d => d.available).slice(0, 3).forEach(d => {
          matchedDoctors.push({ doctor: d, match_score: 88, match_reason: `Available specialist` });
        });
      }

      return {
        message: match.message,
        is_ready_for_recommendation: true,
        diagnostic_stage: 'COMPLETE',
        triage: conv.triage ? {
          specialization_needed: conv.triage.specialization || 'General',
          urgency: conv.triage.urgency || 'NORMAL',
          chief_complaint: conv.triage.chief_complaint || '',
          onset_and_duration: conv.triage.duration,
          severity: conv.triage.severity,
          pain_characteristics: conv.triage.notes,
          notes: conv.triage.notes,
        } : undefined,
        interim_relief: match.interim_relief,
        recommended_doctors: matchedDoctors,
        suggested_slots: ['09:30 AM', '11:00 AM', '02:30 PM', '04:30 PM'],
        quick_replies: match.quick_replies,
      };

    } catch (error: any) {
      console.error('AI Triage error:', error?.message || error);

      // Human-like varied fallback messages — never the same twice
      const fallbacks = [
        "Hmm, I had a small hiccup there! 😅 Could you tell me a bit about what's been bothering you?",
        "Sorry about that — I got a bit confused! What health concern brings you in today?",
        "Oops, something went wrong on my end. I'm back now — what seems to be the problem?",
        "Let me try again! What symptoms have you been experiencing?",
      ];
      const msg = fallbacks[Math.floor(Math.random() * fallbacks.length)];

      return {
        message: msg,
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
}

export const groqService = new GroqService();
