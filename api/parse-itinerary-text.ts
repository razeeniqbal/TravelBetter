import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseItineraryText } from './lib/itinerary-parser.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { raw_text, destination_hint } = req.body || {};
    if (!raw_text || typeof raw_text !== 'string') {
      return res.status(400).json({ error: 'raw_text is required' });
    }

    const parsed = parseItineraryText(raw_text, destination_hint || null);

    return res.status(200).json({
      cleanedRequest: parsed.cleanedRequest,
      previewText: parsed.previewText,
      cleaned_request: parsed.cleanedRequest,
      preview_text: parsed.previewText,
      destination: parsed.destination || null,
      days: parsed.days,
      warnings: parsed.warnings,
      success: true,
    });
  } catch (error) {
    console.error('Error parsing itinerary text:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
