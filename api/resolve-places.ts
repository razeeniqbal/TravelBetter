import type { VercelRequest, VercelResponse } from '@vercel/node';
import { resolvePlaceCandidate } from './lib/place-normalizer.js';

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
    const { places = [], destination_context, destinationContext } = req.body || {};
    if (!Array.isArray(places)) {
      return res.status(400).json({ error: 'places must be an array' });
    }
    const destinationValue = typeof destination_context === 'string'
      ? destination_context
      : typeof destinationContext === 'string'
        ? destinationContext
        : undefined;

    const resolved = [] as Array<{
      name: string;
      resolved: boolean;
      displayName?: string | null;
      placeId?: string | null;
      formattedAddress?: string | null;
      addressComponents?: { city?: string | null; region?: string | null; country?: string | null };
      address?: string | null;
      lat?: number | null;
      lng?: number | null;
      bestGuess?: boolean;
      confidence?: 'high' | 'medium' | 'low';
      source?: string;
    }>;

    for (const place of places) {
      const name = typeof place?.name === 'string' ? place.name : '';
      if (!name) {
        resolved.push({ name, resolved: false });
        continue;
      }

      const destination = typeof place?.hint === 'string'
        ? place.hint
        : destinationValue;
      const result = await resolvePlaceCandidate(name, destination);
      resolved.push({
        name,
        resolved: result.resolved,
        displayName: result.displayName || null,
        placeId: result.placeId || null,
        formattedAddress: result.formattedAddress || null,
        addressComponents: result.addressComponents,
        address: result.address || null,
        lat: typeof result.lat === 'number' ? result.lat : null,
        lng: typeof result.lng === 'number' ? result.lng : null,
        bestGuess: result.bestGuess,
        confidence: result.confidence,
        source: result.source,
      });
    }

    return res.status(200).json({ places: resolved });
  } catch (error) {
    console.error('Error resolving places:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
