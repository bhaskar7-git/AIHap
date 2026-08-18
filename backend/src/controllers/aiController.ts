import { Request, Response } from 'express';
import { groqService } from '../services/groqService.js';

export const chatTriageAndRecommend = async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages, preferredDate, preferredTime } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ success: false, message: 'Messages array is required.' });
      return;
    }

    const triageResult = await groqService.analyzeAndTriage(messages, preferredDate, preferredTime);

    res.status(200).json({
      success: true,
      data: triageResult,
    });
  } catch (error: any) {
    console.error('aiController error:', error);
    res.status(500).json({ success: false, message: error.message || 'AI Triage service error.' });
  }
};
