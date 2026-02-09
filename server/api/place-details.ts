import type { VercelRequest, VercelResponse } from '@vercel/node';

type ResolvedBy = 'provider_place_id' | 'text_query';

interface PlaceSearchCandidate {
  id: string;
  displayName: string | null;
  formattedAddress: string | null;
  userRatingCount: number;
  rating: number | null;
}

interface NormalizedPhoto {
  photoName: string;
  photoUri: string;
  widthPx: number | null;
  heightPx: number | null;
  attribution: string | null;
}

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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
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
  const results = await searchPlaceCandidates(apiKey, queryText, destinationContext, 1);
  return results[0]?.id || null;
}

async function searchPlaceCandidates(
  apiKey: string,
  queryText: string,
  destinationContext?: string | null,
  pageSize = 5
): Promise<PlaceSearchCandidate[]> {
  const textQuery = destinationContext ? `${queryText}, ${destinationContext}` : queryText;

  const response = await fetchWithTimeout(
    'https://places.googleapis.com/v1/places:searchText',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.userRatingCount',
          'places.rating',
        ].join(','),
      },
      body: JSON.stringify({
        textQuery,
        languageCode: 'en',
        pageSize,
      }),
    },
    4500
  );

  if (!response.ok) {
    throw new Error('Place lookup failed');
  }

  const payload = await response.json().catch(() => ({}));
  const places = asArray(payload?.places);

  return places
    .map((entry) => {
      const record = asRecord(entry);
      const id = asString(record.id);
      if (!id) return null;
      const ratingRaw = Number(record.rating);
      const userRatingCountRaw = Number(record.userRatingCount);
      return {
        id,
        displayName: parseDisplayName(record.displayName),
        formattedAddress: asString(record.formattedAddress),
        userRatingCount: Number.isFinite(userRatingCountRaw) ? userRatingCountRaw : 0,
        rating: Number.isFinite(ratingRaw) ? ratingRaw : null,
      };
    })
    .filter((entry): entry is PlaceSearchCandidate => Boolean(entry));
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
          'photos.name',
          'photos.widthPx',
          'photos.heightPx',
          'photos.authorAttributions.displayName',
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

async function fetchPhotoUri(apiKey: string, photoName: string): Promise<string | null> {
  const response = await fetchWithTimeout(
    `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1400&skipHttpRedirect=true`,
    {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
      },
    },
    4500
  );

  if (!response.ok) return null;
  const payload = await response.json().catch(() => ({}));
  return asString(payload?.photoUri);
}

function parsePhotoAttribution(photoRecord: Record<string, unknown>): string | null {
  const firstAttribution = asArray(photoRecord.authorAttributions)[0];
  if (!firstAttribution) return null;
  const attributionRecord = asRecord(firstAttribution);
  return asString(attributionRecord.displayName);
}

async function normalizePhotos(apiKey: string, photos: unknown, limit = 4): Promise<NormalizedPhoto[]> {
  const rawPhotos = asArray(photos).slice(0, limit);
  const normalized = await Promise.all(rawPhotos.map(async (photo) => {
    const photoRecord = asRecord(photo);
    const photoName = asString(photoRecord.name);
    if (!photoName) return null;

    const photoUri = await fetchPhotoUri(apiKey, photoName);
    if (!photoUri) return null;

    const widthPxRaw = Number(photoRecord.widthPx);
    const heightPxRaw = Number(photoRecord.heightPx);

    return {
      photoName,
      photoUri,
      widthPx: Number.isFinite(widthPxRaw) ? widthPxRaw : null,
      heightPx: Number.isFinite(heightPxRaw) ? heightPxRaw : null,
      attribution: parsePhotoAttribution(photoRecord),
    };
  }));

  return normalized.filter((photo): photo is NormalizedPhoto => Boolean(photo));
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
      const record = asRecord(review);
      const authorAttribution = asRecord(record.authorAttribution);

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

    const detailsRecord = asRecord(details);
    const canonicalName = parseDisplayName(detailsRecord.displayName)
      || queryText
      || 'Unknown place';
    const formattedAddress = asString(detailsRecord.formattedAddress);
    const googleMapsUri = asString(detailsRecord.googleMapsUri);
    const ratingValue = Number(detailsRecord.rating);
    const userRatingCountValue = Number(detailsRecord.userRatingCount);

    let reviews = normalizeReviews(
      detailsRecord.reviews,
      finalPlaceId,
      googleMapsUri,
      reviewLimit
    );

    let photos = await normalizePhotos(apiKey, detailsRecord.photos);

    const reviewFallbackQuery = queryText;
    if (reviews.length === 0 && reviewFallbackQuery) {
      const fallbackCandidates = await searchPlaceCandidates(apiKey, reviewFallbackQuery, destinationContext, 5);

      for (const candidate of fallbackCandidates) {
        if (!candidate.id || candidate.id === finalPlaceId) continue;
        if (candidate.userRatingCount <= 0) continue;

        const candidateDetails = await fetchPlaceDetailsById(apiKey, candidate.id);
        if (!candidateDetails) continue;

        const candidateDetailsRecord = asRecord(candidateDetails);
        const candidateReviews = normalizeReviews(
          candidateDetailsRecord.reviews,
          candidate.id,
          asString(candidateDetailsRecord.googleMapsUri),
          reviewLimit
        );

        if (candidateReviews.length > 0) {
          reviews = candidateReviews;
          if (photos.length === 0) {
            photos = await normalizePhotos(apiKey, candidateDetailsRecord.photos);
          }
          break;
        }
      }
    }

    return res.status(200).json({
      details: {
        providerPlaceId: finalPlaceId,
        canonicalName,
        formattedAddress,
        googleMapsUri,
        rating: Number.isFinite(ratingValue) ? ratingValue : null,
        userRatingCount: Number.isFinite(userRatingCountValue) ? userRatingCountValue : null,
        photos,
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
