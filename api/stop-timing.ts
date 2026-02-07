import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateStopTimingPayload } from './lib/itinerary-validator.js';

function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const parsed = validateStopTimingPayload(req.body);
    if (!parsed.ok) {
      return res.status(400).json({ error: parsed.error });
    }

    const { stopId, arrivalTime, stayDurationMinutes } = parsed.data;
    const commuteFromPrevious = {
      distanceMeters: null,
      durationMinutes: null,
    };

    return res.status(200).json({
      stopId,
      arrivalTime: arrivalTime ?? null,
      stayDurationMinutes,
      commuteFromPrevious,
    });
  } catch (error) {
    console.error('Error updating stop timing:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
