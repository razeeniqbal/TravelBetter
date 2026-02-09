import type { VercelRequest, VercelResponse } from '@vercel/node';

type ResolvedBy = 'provider_place_id' | 'text_query';

function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function asString(value: unknown): string | null {
  if (Array.isArray(value)) {
    return asString(value[0]);
  }
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  const stringValue = asString(value);
  if (!stringValue) return null;
  const numeric = Number(stringValue);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseDisplayName(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value && typeof value === 'object') {
    const text = (value as { text?: unknown }).text;
    if (typeof text === 'string' && text.trim()) return text.trim();
  }
  return null;
}

function parseReviewText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const text = (value as { text?: unknown }).text;
    if (typeof text === 'string') return text;
  }
  return '';
}

function normalizeReviewLimit(value: unknown): number {
  const numeric = asNumber(value);
  if (!numeric || numeric < 1) return 5;
  if (numeric > 5) return 5;
  return Math.floor(numeric);
}

function toPlaceResource(placeId: string): string {
  return placeId.startsWith('places/') ? placeId : `places/${placeId}`;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function resolveProviderPlaceId(apiKey: string, queryText: string, destinationContext?: string | null) {
  const textQuery = destinationContext ? `${queryText}, ${destinationContext}` : queryText;

  const response = await fetchWithTimeout(
    'https://places.googleapis.com/v1/places:searchText',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
      },
      body: JSON.stringify({
        textQuery,
        languageCode: 'en',
        pageSize: 1,
      }),
    },
    4500
  );

  if (!response.ok) {
    throw new Error('Place lookup failed');
  }

  const payload = await response.json().catch(() => ({}));
  const firstPlace = Array.isArray(payload?.places) ? payload.places[0] : null;
  if (!firstPlace || typeof firstPlace !== 'object') return null;

  return asString((firstPlace as Record<string, unknown>).id);
}

async function fetchPlaceDetailsById(apiKey: string, placeId: string) {
  const response = await fetchWithTimeout(
    `https://places.googleapis.com/v1/${toPlaceResource(placeId)}`,
    {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': [
          'id',
          'displayName',
          'formattedAddress',
          'googleMapsUri',
          'rating',
          'userRatingCount',
          'reviews',
        ].join(','),
      },
    },
    4500
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Place details lookup failed');
  }

  return response.json().catch(() => ({}));
}

function normalizeReviews(
  reviews: unknown,
  providerPlaceId: string,
  fallbackSourceUrl: string | null,
  limit: number
) {
  if (!Array.isArray(reviews)) return [];

  return reviews
    .slice(0, limit)
    .map((review, index) => {
      const record = review && typeof review === 'object'
        ? review as Record<string, unknown>
        : {};
      const authorAttribution = record.authorAttribution && typeof record.authorAttribution === 'object'
        ? record.authorAttribution as Record<string, unknown>
        : {};

      const authorName = asString(authorAttribution.displayName) || 'Anonymous';
      const text = parseReviewText(record.originalText) || parseReviewText(record.text);
      const publishedTime = asString(record.publishTime) || new Date().toISOString();
      const ratingRaw = Number(record.rating);
      const rating = Number.isFinite(ratingRaw) ? ratingRaw : 0;

      return {
        reviewId: `${providerPlaceId}-${index}-${publishedTime}`,
        authorName,
        authorAvatarUrl: asString(authorAttribution.photoUri),
        rating,
        text,
        createdAt: publishedTime,
        relativeTimeText: asString(record.relativePublishTimeDescription),
        source: 'google' as const,
        sourceUrl: asString(authorAttribution.uri) || fallbackSourceUrl,
      };
    })
    .filter((review) => review.text.trim().length > 0 || review.rating > 0);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const providerPlaceId = asString(req.query.providerPlaceId);
    const queryText = asString(req.query.queryText);
    const destinationContext = asString(req.query.destinationContext);
    const reviewLimit = normalizeReviewLimit(req.query.reviewLimit);
    if (!providerPlaceId && !queryText) {
      return res.status(400).json({ error: 'providerPlaceId or queryText is required' });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return res.status(502).json({ error: 'Google Places API key is not configured' });
    }

    let resolvedBy: ResolvedBy = providerPlaceId ? 'provider_place_id' : 'text_query';
    let finalPlaceId = providerPlaceId;
    let details = finalPlaceId ? await fetchPlaceDetailsById(apiKey, finalPlaceId) : null;

    if (!details && queryText) {
      const fallbackPlaceId = await resolveProviderPlaceId(apiKey, queryText, destinationContext);
      if (fallbackPlaceId) {
        finalPlaceId = fallbackPlaceId;
        details = await fetchPlaceDetailsById(apiKey, finalPlaceId);
        resolvedBy = 'text_query';
      }
    }

    if (!finalPlaceId || !details) {
      return res.status(404).json({ error: 'Place could not be resolved' });
    }

    const canonicalName = parseDisplayName((details as Record<string, unknown>).displayName)
      || queryText
      || 'Unknown place';
    const formattedAddress = asString((details as Record<string, unknown>).formattedAddress);
    const googleMapsUri = asString((details as Record<string, unknown>).googleMapsUri);
    const ratingValue = Number((details as Record<string, unknown>).rating);
    const userRatingCountValue = Number((details as Record<string, unknown>).userRatingCount);

    const reviews = normalizeReviews(
      (details as Record<string, unknown>).reviews,
      finalPlaceId,
      googleMapsUri,
      reviewLimit
    );

    return res.status(200).json({
      details: {
        providerPlaceId: finalPlaceId,
        canonicalName,
        formattedAddress,
        googleMapsUri,
        rating: Number.isFinite(ratingValue) ? ratingValue : null,
        userRatingCount: Number.isFinite(userRatingCountValue) ? userRatingCountValue : null,
        resolvedBy,
        source: 'google',
      },
      reviews,
      reviewState: reviews.length > 0 ? 'available' : 'empty',
    });
  } catch (error) {
    console.error('Error fetching place details:', error);
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'Place details provider unavailable',
    });
  }
}
