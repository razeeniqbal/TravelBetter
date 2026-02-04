import type { VercelRequest, VercelResponse } from '@vercel/node';

function normalizeText(value: string) {
  return value.toLowerCase().trim();
}

function matchesDestination(
  result: Record<string, unknown>,
  destination: string,
  mode: 'all' | 'any' = 'all'
) {
  const destinationParts = destination
    .split(',')
    .map(part => normalizeText(part))
    .filter(Boolean);
  if (destinationParts.length === 0) return true;

  const haystacks: string[] = [];
  const displayName = typeof result.display_name === 'string'
    ? normalizeText(result.display_name)
    : '';
  if (displayName) haystacks.push(displayName);

  const formattedAddress = typeof result.formatted_address === 'string'
    ? normalizeText(result.formatted_address)
    : '';
  if (formattedAddress) haystacks.push(formattedAddress);

  const address = result.address && typeof result.address === 'object'
    ? Object.values(result.address as Record<string, unknown>)
        .filter((value): value is string => typeof value === 'string')
        .map(value => normalizeText(value))
    : [];
  haystacks.push(...address);

  const addressComponents = Array.isArray(result.address_components)
    ? result.address_components
    : [];
  for (const component of addressComponents) {
    if (!component || typeof component !== 'object') continue;
    const record = component as Record<string, unknown>;
    const longName = typeof record.long_name === 'string'
      ? normalizeText(record.long_name)
      : '';
    const shortName = typeof record.short_name === 'string'
      ? normalizeText(record.short_name)
      : '';
    if (longName) haystacks.push(longName);
    if (shortName) haystacks.push(shortName);
  }

  if (mode === 'any') {
    return destinationParts.some(part => haystacks.some(value => value.includes(part)));
  }

  return destinationParts.every(part => haystacks.some(value => value.includes(part)));
}

interface ResolveResult {
  resolved: boolean;
  lat?: number;
  lng?: number;
  address?: string | null;
  bestGuess?: boolean;
  confidence?: 'high' | 'medium' | 'low';
}

async function resolvePlace(query: string, destination?: string): Promise<ResolveResult> {
  const searchQuery = destination ? `${query}, ${destination}` : query;
  const googleApiKey = process.env.GOOGLE_GEOCODING_API_KEY || process.env.GOOGLE_API_KEY;

  if (googleApiKey) {
    const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${googleApiKey}&language=en`;
    const googleResponse = await fetch(googleUrl);
    if (googleResponse.ok) {
      const googleData = await googleResponse.json();
      const googleResults = Array.isArray(googleData?.results)
        ? googleData.results
        : [];
      const googleMatch = destination
        ? googleResults.find(result => matchesDestination(result as Record<string, unknown>, destination, 'all'))
          || googleResults.find(result => matchesDestination(result as Record<string, unknown>, destination, 'any'))
        : googleResults[0];
      const location = googleMatch && typeof googleMatch === 'object'
        ? (googleMatch as Record<string, unknown>)?.geometry
        : null;
      const coords = location && typeof location === 'object'
        ? (location as Record<string, unknown>)?.location
        : null;
      const lat = coords && typeof coords === 'object'
        ? (coords as Record<string, unknown>)?.lat
        : null;
      const lng = coords && typeof coords === 'object'
        ? (coords as Record<string, unknown>)?.lng
        : null;

      if (typeof lat === 'number' && typeof lng === 'number') {
      return {
        resolved: true,
        lat,
        lng,
        address: typeof googleMatch?.formatted_address === 'string'
          ? googleMatch.formatted_address
          : null,
        bestGuess: !destination,
        confidence: destination ? 'high' : 'medium',
      };
      }
    }
  }

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(searchQuery)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'TravelBetterAI/1.0',
      'Accept-Language': 'en',
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Nominatim error:', response.status, errorText);
    return { resolved: false };
  }

  const results = await response.json();
  const list = Array.isArray(results) ? results : [];
  const matched = destination
    ? list.find(result => matchesDestination(result as Record<string, unknown>, destination, 'all'))
      || list.find(result => matchesDestination(result as Record<string, unknown>, destination, 'any'))
      || list[0]
    : list[0];

  if (matched?.lat && matched?.lon) {
    return {
      resolved: true,
      lat: Number(matched.lat),
      lng: Number(matched.lon),
      address: typeof matched.display_name === 'string' ? matched.display_name : null,
      bestGuess: true,
      confidence: 'low',
    };
  }

  return { resolved: false };
}

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
      address?: string | null;
      lat?: number | null;
      lng?: number | null;
      bestGuess?: boolean;
      confidence?: 'high' | 'medium' | 'low';
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
      const result = await resolvePlace(name, destination);
      resolved.push({
        name,
        resolved: result.resolved,
        address: result.address || null,
        lat: typeof result.lat === 'number' ? result.lat : null,
        lng: typeof result.lng === 'number' ? result.lng : null,
        bestGuess: result.bestGuess,
        confidence: result.confidence,
      });
    }

    return res.status(200).json({ places: resolved });
  } catch (error) {
    console.error('Error resolving places:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
