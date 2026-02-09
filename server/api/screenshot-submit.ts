import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseItineraryText } from './lib/itinerary-parser.js';
import { validateScreenshotSubmitPayload } from './lib/itinerary-validator.js';

function normalizePlaceName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function collectReviewWarnings(text: string, days: Array<{ places: Array<{ name: string }> }>) {
  const warnings: string[] = [];
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const day of days) {
    for (const place of day.places) {
      const normalized = normalizePlaceName(place.name);
      if (!normalized) continue;
      if (seen.has(normalized)) {
        duplicates.add(place.name);
        continue;
      }
      seen.add(normalized);
    }
  }

  if (duplicates.size > 0) {
    warnings.push('DUPLICATE_PLACE_NAMES');
  }

  if (/\?|\b(tbd|unknown|maybe)\b/i.test(text)) {
    warnings.push('AMBIGUOUS_TEXT_DETECTED');
  }

  return warnings;
}

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
    const parsed = validateScreenshotSubmitPayload(req.body);
    if (!parsed.ok) {
      return res.status(400).json({ error: parsed.error });
    }

    const { text, destination, durationDays } = parsed.data;
    const itinerary = parseItineraryText(text, destination || null, durationDays || null);
    const reviewWarnings = collectReviewWarnings(text, itinerary.days);
    const warnings = [...new Set([...(itinerary.warnings || []), ...reviewWarnings])];

    return res.status(200).json({
      cleanedRequest: itinerary.cleanedRequest,
      previewText: itinerary.previewText,
      destination: itinerary.destination || null,
      days: itinerary.days,
      warnings,
      success: true,
    });
  } catch (error) {
    console.error('Error submitting screenshot text:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
