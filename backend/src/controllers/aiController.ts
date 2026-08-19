import { Request, Response } from 'express';
import { groqService } from '../services/groqService.js';

// Maps Web Speech API locale codes → human-readable language name for the AI prompt
const LOCALE_TO_LANGUAGE: Record<string, string> = {
  'en-IN': 'English',
  'en-US': 'English',
  'hi-IN': 'Hindi',
  'ta-IN': 'Tamil',
  'te-IN': 'Telugu',
  'bn-IN': 'Bengali',
  'mr-IN': 'Marathi',
  'gu-IN': 'Gujarati',
  'kn-IN': 'Kannada',
  'pa-IN': 'Punjabi',
};

export const chatTriageAndRecommend = async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages, preferredDate, preferredTime, language: localeCode } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ success: false, message: 'Messages array is required.' });
      return;
    }

    // Convert locale code (e.g. "hi-IN") to language name (e.g. "Hindi")
    const language = LOCALE_TO_LANGUAGE[localeCode] || 'English';

    const triageResult = await groqService.analyzeAndTriage(messages, preferredDate, preferredTime, language);

    res.status(200).json({
      success: true,
      data: triageResult,
    });
  } catch (error: any) {
    console.error('aiController error:', error);
    res.status(500).json({ success: false, message: error.message || 'AI Triage service error.' });
  }
};
