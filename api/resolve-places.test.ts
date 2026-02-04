import type { VercelRequest, VercelResponse } from '@vercel/node';
import { describe, expect, it, vi } from 'vitest';
import handler from './resolve-places';
import { mockFetchOnce } from '../src/test/utils/mockFetch';

function createResponse(): VercelResponse {
  return {
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
  } as unknown as VercelResponse;
}

describe('resolve-places', () => {
  it('prefers destination-matching results when available', async () => {
    const previousGeocodeKey = process.env.GOOGLE_GEOCODING_API_KEY;
    const previousApiKey = process.env.GOOGLE_API_KEY;
    process.env.GOOGLE_GEOCODING_API_KEY = '';
    process.env.GOOGLE_API_KEY = '';
    const req = {
      method: 'POST',
      body: {
        places: [{ name: 'Central Park' }],
        destination_context: 'New York',
      },
    } as VercelRequest;
    const res = createResponse();

    mockFetchOnce({
      json: [
        { display_name: 'Central Park, Sydney, Australia', lat: '-33.867', lon: '151.207' },
        { display_name: 'Central Park, New York, USA', lat: '40.785', lon: '-73.968' },
      ],
    });

    try {
      await handler(req, res);

      const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(payload.places[0].lat).toBeCloseTo(40.785, 3);
      expect(payload.places[0].lng).toBeCloseTo(-73.968, 3);
    } finally {
      process.env.GOOGLE_GEOCODING_API_KEY = previousGeocodeKey;
      process.env.GOOGLE_API_KEY = previousApiKey;
    }
  });
});
