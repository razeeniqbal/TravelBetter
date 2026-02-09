import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isValidationFailure, validateDraftPayload } from './lib/itinerary-validator.js';

function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const parsed = validateDraftPayload(req.body);
    if (isValidationFailure(parsed)) {
      return res.status(400).json({ error: parsed.error });
    }

    const { tripId, days } = parsed.data;

    return res.status(200).json({
      tripId,
      savedAt: new Date().toISOString(),
      days,
    });
  } catch (error) {
    console.error('Error saving itinerary draft:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
