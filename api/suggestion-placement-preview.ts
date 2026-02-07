import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validatePlacementPreviewPayload } from './lib/itinerary-validator.js';

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
    const parsed = validatePlacementPreviewPayload(req.body);
    if (!parsed.ok) {
      return res.status(400).json({ error: parsed.error });
    }

    const { mode, selectedSuggestions } = parsed.data;
    const placements = selectedSuggestions.map((suggestion, index) => {
      if (mode === 'manual') {
        return {
          suggestionId: suggestion.suggestionId,
          displayName: suggestion.displayName,
          proposedDayNumber: suggestion.manualDayNumber || 1,
          confidence: 'high' as const,
        };
      }

      return {
        suggestionId: suggestion.suggestionId,
        displayName: suggestion.displayName,
        proposedDayNumber: (index % 3) + 1,
        confidence: index === 0 ? 'high' as const : 'medium' as const,
      };
    });

    return res.status(200).json({
      mode,
      placements,
    });
  } catch (error) {
    console.error('Error generating suggestion placement preview:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
