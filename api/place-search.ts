import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PlaceSearchProviderError, searchPlaceCandidates } from './lib/place-normalizer.js';

const requestRateLimit = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 300;

function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function normalizeLimit(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 5;
  if (numeric < 1) return 1;
  if (numeric > 10) return 10;
  return Math.floor(numeric);
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
    const rawQuery = typeof req.body?.query === 'string' ? req.body.query : '';
    const query = rawQuery.trim();
    const destinationContext = typeof req.body?.destinationContext === 'string'
      ? req.body.destinationContext.trim()
      : '';
    const limit = normalizeLimit(req.body?.limit);

    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    const clientIp = getClientIp(req);
    const lastRequestAt = requestRateLimit.get(clientIp) || 0;
    const now = Date.now();
    if (now - lastRequestAt < RATE_LIMIT_WINDOW_MS) {
      return res.status(429).json({ error: 'Too many requests. Please retry shortly.' });
    }
    requestRateLimit.set(clientIp, now);

    const results = await searchPlaceCandidates(
      query,
      destinationContext || undefined,
      limit
    );

    return res.status(200).json({
      query,
      results,
      warnings: results.length === 0 ? ['No matching places found for the query.'] : undefined,
    });
  } catch (error) {
    if (error instanceof PlaceSearchProviderError) {
      if (error.statusCode === 429) {
        return res.status(429).json({ error: 'Rate limited by search provider' });
      }
      return res.status(502).json({ error: 'Place search provider unavailable' });
    }

    console.error('Error searching places:', error);
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'Unknown place search failure',
    });
  }
}
