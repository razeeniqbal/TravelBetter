import { api } from '@/lib/api';

const geocodeCache = new Map<string, { lat: number; lng: number } | null>();
const GEOCODE_THROTTLE_MS = 1100;
let lastGeocodeAt = 0;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function geocodePlaceCoordinates(query: string, destination?: string) {
  const normalizedQuery = query.trim().replace(/\s+/g, ' ');
  const normalizedDestination = destination?.trim().replace(/\s+/g, ' ');
  const attempts = normalizedDestination
    ? [
      { query: normalizedQuery, destination: normalizedDestination },
      { query: normalizedQuery },
    ]
    : [{ query: normalizedQuery }];

  for (const attempt of attempts) {
    const cacheKey = `${attempt.query.toLowerCase()}|${attempt.destination?.toLowerCase() || ''}`;
    if (geocodeCache.has(cacheKey)) {
      const cached = geocodeCache.get(cacheKey) || null;
      if (cached) return cached;
      continue;
    }

    const now = Date.now();
    const waitMs = GEOCODE_THROTTLE_MS - (now - lastGeocodeAt);
    if (waitMs > 0) {
      await wait(waitMs);
    }

    const { data, error } = await api.geocodePlace(attempt.query, attempt.destination);
    lastGeocodeAt = Date.now();

    if (error || !data?.success || !data.coordinates) {
      geocodeCache.set(cacheKey, null);
      continue;
    }

    geocodeCache.set(cacheKey, data.coordinates);
    return data.coordinates;
  }

  return null;
}
