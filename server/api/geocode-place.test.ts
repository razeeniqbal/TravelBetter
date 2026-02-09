import type { VercelRequest, VercelResponse } from '@vercel/node';
import { describe, expect, it, vi } from 'vitest';
import handler from './geocode-place.js';
import { mockFetchOnce } from '../../src/test/utils/mockFetch.js';

function createResponse(): VercelResponse {
  return {
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
  } as unknown as VercelResponse;
}

describe('geocode-place', () => {
  it('falls back to the first result when destination bias has no matches', async () => {
    const previousGeocodeKey = process.env.GOOGLE_GEOCODING_API_KEY;
    const previousApiKey = process.env.GOOGLE_API_KEY;
    process.env.GOOGLE_GEOCODING_API_KEY = '';
    process.env.GOOGLE_API_KEY = '';
    const req = {
      method: 'POST',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      body: {
        query: 'Central Park',
        destination: 'Lisbon',
      },
    } as VercelRequest;
    const res = createResponse();

    mockFetchOnce({
      json: [
        { display_name: 'Central Park, Sydney, Australia', lat: '-33.867', lon: '151.207' },
      ],
    });

    try {
      await handler(req, res);

      const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(payload.coordinates).toEqual({ lat: -33.867, lng: 151.207 });
      expect(payload.success).toBe(true);
    } finally {
      process.env.GOOGLE_GEOCODING_API_KEY = previousGeocodeKey;
      process.env.GOOGLE_API_KEY = previousApiKey;
    }
  });
});
