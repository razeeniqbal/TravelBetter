import type { VercelRequest, VercelResponse } from '@vercel/node';
import { describe, expect, it, vi } from 'vitest';
import handler from './resolve-places.js';
import { mockFetchOnce } from '../src/test/utils/mockFetch.js';

function createResponse(): VercelResponse {
  return {
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
  } as unknown as VercelResponse;
}

describe('resolve-places', () => {
  it('uses Google Places results before geocoding', async () => {
    const previousPlacesKey = process.env.GOOGLE_PLACES_API_KEY;
    const previousGeocodeKey = process.env.GOOGLE_GEOCODING_API_KEY;
    const previousApiKey = process.env.GOOGLE_API_KEY;
    process.env.GOOGLE_PLACES_API_KEY = 'test';
    process.env.GOOGLE_GEOCODING_API_KEY = '';
    process.env.GOOGLE_API_KEY = '';
    const req = {
      method: 'POST',
      body: {
        places: [{ name: 'klcc' }],
        destination_context: 'Kuala Lumpur',
      },
    } as VercelRequest;
    const res = createResponse();

    mockFetchOnce({
      json: {
        results: [
          {
            name: 'Kuala Lumpur City Centre (KLCC)',
            formatted_address: 'Kuala Lumpur, Malaysia',
            place_id: 'place-1',
            geometry: { location: { lat: 3.1579, lng: 101.7123 } },
          },
        ],
      },
    });
    mockFetchOnce({
      json: {
        result: {
          name: 'Kuala Lumpur City Centre (KLCC)',
          formatted_address: 'Kuala Lumpur, Malaysia',
          address_components: [
            { long_name: 'Kuala Lumpur', types: ['locality'] },
            { long_name: 'Malaysia', types: ['country'] },
          ],
          geometry: { location: { lat: 3.1579, lng: 101.7123 } },
        },
      },
    });

    try {
      await handler(req, res);

      const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(payload.places[0].displayName).toBe('Kuala Lumpur City Centre (KLCC)');
      expect(payload.places[0].source).toBe('places');
    } finally {
      process.env.GOOGLE_PLACES_API_KEY = previousPlacesKey;
      process.env.GOOGLE_GEOCODING_API_KEY = previousGeocodeKey;
      process.env.GOOGLE_API_KEY = previousApiKey;
    }
  });

  it('falls back to geocoding when Places has no matches', async () => {
    const previousPlacesKey = process.env.GOOGLE_PLACES_API_KEY;
    const previousGeocodeKey = process.env.GOOGLE_GEOCODING_API_KEY;
    const previousApiKey = process.env.GOOGLE_API_KEY;
    process.env.GOOGLE_PLACES_API_KEY = 'test';
    process.env.GOOGLE_GEOCODING_API_KEY = 'test';
    process.env.GOOGLE_API_KEY = '';
    const req = {
      method: 'POST',
      body: {
        places: [{ name: 'trx' }],
        destination_context: 'Kuala Lumpur',
      },
    } as VercelRequest;
    const res = createResponse();

    mockFetchOnce({ json: { results: [] } });
    mockFetchOnce({
      json: {
        results: [
          {
            formatted_address: 'Tun Razak Exchange, Kuala Lumpur, Malaysia',
            address_components: [
              { long_name: 'Kuala Lumpur', types: ['locality'] },
              { long_name: 'Malaysia', types: ['country'] },
            ],
            geometry: { location: { lat: 3.139, lng: 101.718 } },
          },
        ],
      },
    });

    try {
      await handler(req, res);

      const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(payload.places[0].displayName).toBe('Tun Razak Exchange, Kuala Lumpur, Malaysia');
      expect(payload.places[0].source).toBe('geocoding');
    } finally {
      process.env.GOOGLE_PLACES_API_KEY = previousPlacesKey;
      process.env.GOOGLE_GEOCODING_API_KEY = previousGeocodeKey;
      process.env.GOOGLE_API_KEY = previousApiKey;
    }
  });

  it('prefers destination-matching results when available', async () => {
    const previousGeocodeKey = process.env.GOOGLE_GEOCODING_API_KEY;
    const previousApiKey = process.env.GOOGLE_API_KEY;
    const previousPlacesKey = process.env.GOOGLE_PLACES_API_KEY;
    process.env.GOOGLE_GEOCODING_API_KEY = '';
    process.env.GOOGLE_API_KEY = '';
    process.env.GOOGLE_PLACES_API_KEY = '';
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
      process.env.GOOGLE_PLACES_API_KEY = previousPlacesKey;
    }
  });
});
