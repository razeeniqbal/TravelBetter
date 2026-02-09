import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isValidationFailure, validatePlacementCommitPayload } from './lib/itinerary-validator.js';

function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const parsed = validatePlacementCommitPayload(req.body);
    if (isValidationFailure(parsed)) {
      return res.status(400).json({ error: parsed.error });
    }

    const { tripId, placements } = parsed.data;
    const affectedDays = [...new Set(placements.map(item => item.confirmedDayNumber))]
      .sort((a, b) => a - b);

    return res.status(200).json({
      tripId,
      addedCount: placements.length,
      affectedDays,
    });
  } catch (error) {
    console.error('Error committing suggestion placement:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
