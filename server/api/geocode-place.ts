import type { VercelRequest, VercelResponse } from '@vercel/node';

const cache = new Map<string, { coordinates: { lat: number; lng: number } | null; timestamp: number }>();
const rateLimit = new Map<string, number>();
const CACHE_TTL_MS = 1000 * 60 * 60;
const RATE_LIMIT_MS = 1100;

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

function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function getCacheKey(query: string, destination?: string) {
  return `${query.toLowerCase()}|${destination?.toLowerCase() || ''}`;
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
    const { query, destination } = req.body || {};

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    const cacheKey = getCacheKey(query, destination);
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.status(200).json({ coordinates: cached.coordinates, success: Boolean(cached.coordinates) });
    }

    const ip = getClientIp(req);
    const lastRequestAt = rateLimit.get(ip) || 0;
    const now = Date.now();
    if (now - lastRequestAt < RATE_LIMIT_MS) {
      return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
    }
    rateLimit.set(ip, now);

    const searchQuery = destination ? `${query}, ${destination}` : query;
    const googleApiKey = process.env.GOOGLE_GEOCODING_API_KEY || process.env.GOOGLE_API_KEY;
    let coordinates: { lat: number; lng: number } | null = null;

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
          coordinates = { lat, lng };
        } else {
          const status = typeof googleData?.status === 'string' ? googleData.status : '';
          if (status && status !== 'OK' && status !== 'ZERO_RESULTS') {
            console.error('Google Geocoding status:', status, googleData.error_message || '');
          }
        }
      } else {
        const errorText = await googleResponse.text();
        console.error('Google Geocoding error:', googleResponse.status, errorText);
      }
    }

    if (!coordinates) {
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
        return res.status(500).json({ error: 'Failed to geocode place' });
      }

      const results = await response.json();
      const list = Array.isArray(results) ? results : [];
      const matched = destination
        ? list.find(result => matchesDestination(result as Record<string, unknown>, destination, 'all'))
          || list.find(result => matchesDestination(result as Record<string, unknown>, destination, 'any'))
          || list[0]
        : list[0];
      coordinates = matched?.lat && matched?.lon
        ? { lat: Number(matched.lat), lng: Number(matched.lon) }
        : null;
    }

    cache.set(cacheKey, { coordinates, timestamp: Date.now() });

    return res.status(200).json({ coordinates, success: Boolean(coordinates) });
  } catch (error) {
    console.error('Error geocoding place:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
