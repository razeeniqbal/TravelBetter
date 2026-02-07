import type { VercelRequest, VercelResponse } from '@vercel/node';

function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function normalizeLimit(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 5;
  if (numeric < 1) return 1;
  if (numeric > 5) return 5;
  return Math.floor(numeric);
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
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
    const placeId = asString(req.query.placeId);
    if (!placeId) {
      return res.status(400).json({ error: 'placeId is required' });
    }

    const limit = normalizeLimit(req.query.limit);
    const googleApiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY;

    if (!googleApiKey) {
      return res.status(200).json({
        placeId,
        totalReturned: 0,
        reviews: [],
      });
    }

    const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    detailsUrl.searchParams.set('place_id', placeId);
    detailsUrl.searchParams.set('fields', 'reviews,url');
    detailsUrl.searchParams.set('key', googleApiKey);

    const response = await fetch(detailsUrl.toString());
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch Google Place details:', response.status, errorText);
      return res.status(200).json({
        placeId,
        totalReturned: 0,
        reviews: [],
      });
    }

    const payload = await response.json();
    const result = payload?.result || {};
    const sourceUrl = asString(result.url);
    const reviews = Array.isArray(result.reviews) ? result.reviews : [];

    const normalized = reviews
      .sort((a, b) => (Number(b?.time) || 0) - (Number(a?.time) || 0))
      .slice(0, limit)
      .map((review: Record<string, unknown>, index: number) => {
        const timestamp = Number(review.time) || 0;
        return {
          reviewId: `${placeId}-${timestamp || index}`,
          authorName: asString(review.author_name) || 'Unknown',
          authorAvatarUrl: asString(review.profile_photo_url),
          rating: Number(review.rating) || 0,
          text: asString(review.text) || '',
          createdAt: timestamp > 0 ? new Date(timestamp * 1000).toISOString() : new Date().toISOString(),
          relativeTimeText: asString(review.relative_time_description),
          source: 'google',
          sourceUrl,
        };
      })
      .filter(item => item.text && item.rating > 0);

    return res.status(200).json({
      placeId,
      totalReturned: normalized.length,
      reviews: normalized,
    });
  } catch (error) {
    console.error('Error fetching place reviews:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
