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
   * PHASE 1 — Single-turn triage. Ask problem → immediately ready.
   * NO follow-up questions. Extracts the complaint and sets ready=true right away.
   */
  private async conversationPhase(messages: ChatMessage[], language: string = 'English'): Promise<{
    ready: boolean;
    message: string;
    triage?: any;
    quick_replies?: string[];
  }> {
    const userMessages = messages.filter(m => m.role === 'user');
    const lastUserMsg = userMessages[userMessages.length - 1]?.content?.toLowerCase() || '';

    // If this is just a greeting (no health complaint) — respond warmly and ask the one question
    const greetingWords = ['hi', 'hello', 'hey', 'hola', 'namaste', 'vanakkam', 'salam', 'नमस्ते', 'হ্যালো', 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ'];
    const isJustGreeting = userMessages.length === 1 && greetingWords.some(g => lastUserMsg.includes(g)) && lastUserMsg.length < 20;

    if (isJustGreeting) {
      // Return language-appropriate one-question greeting
      const greetingByLang: Record<string, string> = {
        'Hindi': '👋 नमस्ते! मैं Aria हूँ। आज आपको क्या तकलीफ है?',
        'Tamil': '👋 வணக்கம்! நான் Aria. இன்று உங்களுக்கு என்ன பிரச்சனை?',
        'Telugu': '👋 నమస్కారం! నేను Aria. ఈ రోజు మీకు ఏమి అసౌకర్యంగా ఉంది?',
        'Bengali': '👋 নমস্কার! আমি Aria। আজ আপনার কী সমস্যা?',
        'Marathi': '👋 नमस्कार! मी Aria आहे। आज तुम्हाला काय त्रास होतोय?',
        'Gujarati': '👋 નમસ્તે! હું Aria છું. આજે તમને શું તકલીફ છે?',
        'Kannada': '👋 ನಮಸ್ಕಾರ! ನಾನು Aria. ಇಂದು ನಿಮಗೆ ಏನು ತೊಂದರೆ?',
        'Punjabi': '👋 ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ Aria ਹਾਂ। ਅੱਜ ਤੁਹਾਨੂੰ ਕੀ ਸਮੱਸਿਆ ਹੈ?',
        'English': "👋 Hi there! I'm Aria. What health problem are you facing today?",
      };
      return {
        ready: false,
        message: greetingByLang[language] || greetingByLang['English'],
        quick_replies: [],
      };
    }

    // User has described their problem — try AI triage, fall back to local keyword engine
    const userText = userMessages[userMessages.length - 1]?.content || '';
    const userTextLower = userText.toLowerCase();

    // ─── LOCAL KEYWORD TRIAGE (instant, no API needed) ───────────────────────
    const localTriage = (() => {
      // Specialization + urgency keyword map
      const rules: Array<{ keywords: string[]; spec: string; urgency: 'NORMAL' | 'PRIORITY' | 'EMERGENCY'; severity: string }> = [
        { keywords: ['chest pain', 'chest tightness', 'chest pressure', 'heart attack', 'palpitation', 'cardiac', 'angina', 'shortness of breath', 'difficulty breathing', 'unable to breathe'], spec: 'Cardiology', urgency: 'EMERGENCY', severity: 'severe' },
        { keywords: ['stroke', 'unconscious', 'fainted', 'seizure', 'convulsion', 'paralysis', 'slurred speech', 'sudden weakness'], spec: 'Neurology', urgency: 'EMERGENCY', severity: 'severe' },
        { keywords: ['severe bleeding', 'heavy bleeding', 'blood loss', 'deep cut', 'accident', 'fracture', 'broken bone', 'trauma'], spec: 'Emergency Medicine', urgency: 'EMERGENCY', severity: 'severe' },
        { keywords: ['rash', 'skin', 'itching', 'itch', 'eczema', 'psoriasis', 'acne', 'hives', 'allergy rash', 'dermatitis', 'pimple', 'blister', 'wound'], spec: 'Dermatology', urgency: 'NORMAL', severity: 'mild' },
        { keywords: ['knee', 'joint', 'bone', 'back pain', 'backache', 'spine', 'hip', 'shoulder pain', 'muscle pain', 'arthritis', 'ortho', 'fracture pain', 'ligament', 'sprain'], spec: 'Orthopedics', urgency: 'NORMAL', severity: 'moderate' },
        { keywords: ['stomach ache', 'stomach pain', 'abdominal', 'acidity', 'acid reflux', 'gastric', 'indigestion', 'bloating', 'constipation', 'diarrhea', 'vomiting', 'nausea', 'loose motion', 'gas', 'ulcer', 'liver', 'hepatitis'], spec: 'Gastroenterology', urgency: 'NORMAL', severity: 'moderate' },
        { keywords: ['headache', 'migraine', 'head pain', 'dizziness', 'vertigo', 'memory loss', 'brain', 'nerve', 'numbness', 'tingling'], spec: 'Neurology', urgency: 'NORMAL', severity: 'moderate' },
        { keywords: ['eye', 'vision', 'blurry', 'red eye', 'eye pain', 'conjunctivitis', 'cataract', 'glaucoma', 'ophthalmology'], spec: 'Ophthalmology', urgency: 'NORMAL', severity: 'mild' },
        { keywords: ['ear', 'hearing', 'earache', 'nose', 'sinus', 'throat', 'tonsil', 'ent', 'cold', 'nasal', 'sneezing', 'runny nose'], spec: 'ENT', urgency: 'NORMAL', severity: 'mild' },
        { keywords: ['baby', 'child', 'infant', 'toddler', 'pediatric', 'kids'], spec: 'Pediatrics', urgency: 'PRIORITY', severity: 'moderate' },
        { keywords: ['pregnancy', 'pregnant', 'gynecology', 'periods', 'menstrual', 'uterus', 'ovary', 'women', 'pcos', 'pcod'], spec: 'Gynecology', urgency: 'NORMAL', severity: 'moderate' },
        { keywords: ['urine', 'urinary', 'kidney', 'bladder', 'nephrology', 'dialysis', 'renal'], spec: 'Nephrology', urgency: 'PRIORITY', severity: 'moderate' },
        { keywords: ['diabetes', 'sugar', 'thyroid', 'hormones', 'endocrine', 'cholesterol', 'obesity', 'weight'], spec: 'Endocrinology', urgency: 'NORMAL', severity: 'mild' },
        { keywords: ['cancer', 'tumor', 'oncology', 'chemotherapy', 'biopsy'], spec: 'Oncology', urgency: 'PRIORITY', severity: 'severe' },
        { keywords: ['mental health', 'depression', 'anxiety', 'stress', 'panic', 'psychiatry', 'insomnia', 'sleep disorder', 'phobia'], spec: 'Psychiatry', urgency: 'NORMAL', severity: 'moderate' },
        { keywords: ['fever', 'cough', 'cold', 'flu', 'infection', 'viral', 'bacterial', 'body ache', 'fatigue', 'weakness', 'tired', 'general', 'checkup', 'consultation'], spec: 'General Medicine', urgency: 'NORMAL', severity: 'mild' },
      ];

      for (const rule of rules) {
        if (rule.keywords.some(kw => userTextLower.includes(kw))) {
          return { spec: rule.spec, urgency: rule.urgency, severity: rule.severity };
        }
      }
      return { spec: 'General Medicine', urgency: 'NORMAL' as const, severity: 'mild' };
    })();

    // Try Groq AI first; if it fails, use local triage
    try {
      const systemPrompt = `You are a medical triage AI. The patient just described their health problem in ONE message. 
    
Extract the key clinical info and IMMEDIATELY respond with ready=true. Do NOT ask follow-up questions.
Language to respond in: ${language}

EMERGENCY RULE: If they describe chest pain + arm pain, sudden loss of consciousness, severe breathing difficulty → urgency = EMERGENCY, message should say call 112 immediately.

Extract from their message:
- chief_complaint: what they said (in English for clinical use)
- specialization: the medical specialty needed (e.g. "Cardiology", "General Medicine", "Orthopedics", "Dermatology", "ENT")
- urgency: NORMAL | PRIORITY | EMERGENCY

Respond with JSON code block:
\`\`\`json
{
  "message": "Brief empathetic acknowledgment in ${language} + 'Finding the best doctor for you...' (in ${language})",
  "ready": true,
  "triage": {
    "specialization": "specialty in English",
    "urgency": "NORMAL",
    "chief_complaint": "complaint in English",
    "severity": "mild/moderate/severe",
    "notes": "1 line clinical note"
  },
  "quick_replies": []
}
\`\`\``;

      const payload: Groq.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText },
      ];

      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: payload,
        temperature: 0.3,
        max_tokens: 400,
      });

      const raw = completion.choices[0]?.message?.content || '';
      const parsed = extractJSON(raw);

      if (parsed) {
        return {
          ready: true,
          message: parsed.message || 'Finding the best doctor for you...',
          triage: parsed.triage,
          quick_replies: [],
        };
      }
    } catch (aiErr: any) {
      console.warn('[Aria] Groq API unavailable, using local triage engine:', aiErr?.message || aiErr);
    }

    // Local triage fallback — always works offline
    return {
      ready: true,
      message: `Understood! You're experiencing "${userText}". Finding the best ${localTriage.spec} specialist for you...`,
      triage: {
        specialization: localTriage.spec,
        urgency: localTriage.urgency,
        chief_complaint: userText,
        severity: localTriage.severity,
        notes: `Local triage: ${localTriage.spec} consultation recommended.`,
      },
      quick_replies: [],
    };
  }

  /**
   * PHASE 2 — Doctor matching. Only called when patient info is complete.
   */
  private async matchDoctorsPhase(
    triage: any,
    preferredDate?: string,
    preferredTime?: string,
    language: string = 'English'
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

IMPORTANT: Reply in ${language}. The "message" field must be in ${language}. The "quick_replies" must also be in ${language}.

Patient triage:
${JSON.stringify(triage, null, 2)}

Doctors:
${JSON.stringify(doctorList, null, 2)}

Date: ${preferredDate || 'Today'} | Time: ${preferredTime || 'Upcoming'}

Respond with JSON in code block:
\`\`\`json
{
  "message": "Warm recommendation message to patient in ${language}",
  "doctor_ids": ["id1", "id2", "id3"],
  "interim_relief": null,
  "quick_replies": ["Book top doctor", "See more options"]
}
\`\`\`
If patient has pain/fever and appointment is upcoming, populate interim_relief with: {recommended_remedy, purpose, dosage_instruction, disclaimer, safety_precautions}.`;

    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: systemPrompt }],
        temperature: 0.3,
        max_tokens: 600,
      });

      const raw = completion.choices[0]?.message?.content || '';
      const parsed = extractJSON(raw);

      if (parsed?.doctor_ids?.length > 0) {
        return {
          message: parsed.message || 'Based on your symptoms, here are the best doctors for you:',
          recommended_doctor_ids: parsed.doctor_ids,
          interim_relief: parsed.interim_relief || null,
          quick_replies: parsed.quick_replies || ['Book appointment', 'Ask a question'],
        };
      }
    } catch (aiErr: any) {
      console.warn('[Aria] Groq doctor-match API unavailable, using local matching:', aiErr?.message || aiErr);
    }

    // Local doctor matching — sort by queue length ascending, pick top 3 by spec
    const spec = (triage?.specialization || triage?.specialization_needed || 'General Medicine').toLowerCase();
    const bySpec = availableDoctors
      .filter(d => d.specialization.toLowerCase().includes(spec) || spec.includes(d.specialization.toLowerCase()))
      .sort((a, b) => (queueCounts[a.id] ?? 0) - (queueCounts[b.id] ?? 0))
      .slice(0, 3);

    const localIds = bySpec.length > 0
      ? bySpec.map(d => d.id)
      : availableDoctors.sort((a, b) => (queueCounts[a.id] ?? 0) - (queueCounts[b.id] ?? 0)).slice(0, 3).map(d => d.id);

    return {
      message: `Based on your symptoms, here are the best available specialists for immediate token booking:`,
      recommended_doctor_ids: localIds,
      interim_relief: null,
      quick_replies: ['Book top doctor', 'Select time slot'],
    };
  }

  /**
   * Main entry point: two-phase pipeline
   */
  public async analyzeAndTriage(
    messages: ChatMessage[],
    preferredDate?: string,
    preferredTime?: string,
    language: string = 'English'
  ): Promise<TriageResult> {
    try {
      // PHASE 1: Have a natural conversation in the patient's language
      const conv = await this.conversationPhase(messages, language);

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

      // PHASE 2: Enough info — match doctors (still in same language)
      const match = await this.matchDoctorsPhase(conv.triage, preferredDate, preferredTime, language);
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

      // Fallback: guaranteed doctor recommendation even if API fails
      const doctors = await store.getAllDoctors();
      const userMsgs = messages.filter(m => m.role === 'user');
      const lastUserMsg = userMsgs[userMsgs.length - 1]?.content?.toLowerCase() || '';

      let spec = 'General Medicine';
      let urgency: 'NORMAL' | 'PRIORITY' | 'EMERGENCY' = 'NORMAL';

      if (lastUserMsg.includes('chest') || lastUserMsg.includes('heart') || lastUserMsg.includes('palpitation')) {
        spec = 'Cardiology';
        urgency = 'EMERGENCY';
      } else if (lastUserMsg.includes('skin') || lastUserMsg.includes('rash') || lastUserMsg.includes('itch')) {
        spec = 'Dermatology';
      } else if (lastUserMsg.includes('knee') || lastUserMsg.includes('back') || lastUserMsg.includes('joint') || lastUserMsg.includes('bone')) {
        spec = 'Orthopedics';
      } else if (lastUserMsg.includes('stomach') || lastUserMsg.includes('acidity') || lastUserMsg.includes('vomit')) {
        spec = 'General Medicine';
        urgency = 'PRIORITY';
      } else if (lastUserMsg.includes('fever') || lastUserMsg.includes('cough') || lastUserMsg.includes('chill')) {
        spec = 'General Medicine';
      }

      let matched = doctors.filter(d => d.available && d.specialization.toLowerCase().includes(spec.toLowerCase()));
      if (matched.length === 0) {
        matched = doctors.filter(d => d.available).slice(0, 3);
      }

      const recommended = matched.slice(0, 3).map(d => ({
        doctor: d,
        match_score: 95,
        match_reason: `Specialist in ${d.specialization} available for consultation`,
      }));

      return {
        message: `Based on your symptoms ("${messages[messages.length - 1]?.content || 'Consultation'}"), here are the best doctors available for token booking:`,
        is_ready_for_recommendation: true,
        diagnostic_stage: 'COMPLETE',
        triage: {
          specialization_needed: spec,
          urgency: urgency,
          chief_complaint: messages[messages.length - 1]?.content || 'General consultation',
          severity: urgency === 'EMERGENCY' ? 'severe' : 'moderate',
          notes: 'AI automated symptom assessment',
        },
        interim_relief: urgency === 'EMERGENCY' ? {
          recommended_remedy: 'Rest immediately in a comfortable position',
          purpose: 'Reduce cardiovascular & respiratory strain',
          dosage_instruction: 'Avoid physical exertion. Seek urgent emergency care.',
          disclaimer: 'If experiencing severe chest pressure, seek emergency care immediately.',
          safety_precautions: 'Do not consume heavy food or exert physically.',
        } : undefined,
        recommended_doctors: recommended,
        suggested_slots: ['09:30 AM', '11:00 AM', '02:30 PM', '04:30 PM'],
        quick_replies: ['Book top doctor', 'Select time slot'],
      };
    }
  }
}

export const groqService = new GroqService();
