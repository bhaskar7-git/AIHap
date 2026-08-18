import { Request, Response } from 'express';
import { queueService } from '../services/queueService.js';
import { AuthRequest } from '../middleware/auth.js';
import { PriorityLevel } from '../types/index.js';

export const getDoctorQueue = async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    const queueState = await queueService.getQueueState(doctorId, date as string | undefined);
    res.status(200).json({ success: true, data: queueState });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const callNextPatient = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { doctorId } = req.params;
    const result = await queueService.callNext(doctorId);
    res.status(200).json({
      success: true,
      message: result.calledToken ? `Called token ${result.calledToken.token_number}` : 'No waiting patients in queue.',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const startConsultation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { doctorId, tokenId } = req.params;
    const targetTokenId = tokenId || req.body.tokenId;
    if (!targetTokenId) {
      res.status(400).json({ success: false, message: 'Token ID is required' });
      return;
    }
    const updatedQueue = await queueService.startConsultation(doctorId, targetTokenId);
    res.status(200).json({ success: true, message: 'Consultation started', data: updatedQueue });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const completeConsultation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { doctorId, tokenId } = req.params;
    const targetTokenId = tokenId || req.body.tokenId;
    if (!targetTokenId) {
      res.status(400).json({ success: false, message: 'Token ID is required' });
      return;
    }
    const updatedQueue = await queueService.completeConsultation(doctorId, targetTokenId);
    res.status(200).json({ success: true, message: 'Consultation completed', data: updatedQueue });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markNoShow = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { doctorId, tokenId } = req.params;
    const targetTokenId = tokenId || req.body.tokenId;
    if (!targetTokenId) {
      res.status(400).json({ success: false, message: 'Token ID is required' });
      return;
    }
    const updatedQueue = await queueService.markNoShow(doctorId, targetTokenId);
    res.status(200).json({ success: true, message: 'Marked as No Show', data: updatedQueue });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const setTokenPriority = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tokenId } = req.params;
    const targetTokenId = tokenId || req.body.tokenId;
    const priority: PriorityLevel = req.body.priority || 'PRIORITY';

    if (!targetTokenId) {
      res.status(400).json({ success: false, message: 'Token ID is required' });
      return;
    }

    const result = await queueService.setPriority(targetTokenId, priority);
    res.status(200).json({
      success: true,
      message: `Token priority set to ${priority}. Queue reordered.`,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
