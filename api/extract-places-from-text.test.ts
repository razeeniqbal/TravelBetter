import type { VercelRequest, VercelResponse } from '@vercel/node';
import { describe, expect, it, vi } from 'vitest';
import handler from './extract-places-from-text.js';
import { mockFetchOnce } from '../src/test/utils/mockFetch.js';

function createResponse(): VercelResponse {
  return {
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
  } as unknown as VercelResponse;
}

describe('extract-places-from-text', () => {
  it('normalizes places and infers destination from resolved city', async () => {
    const previousApiKey = process.env.GOOGLE_API_KEY;
    const previousPlacesKey = process.env.GOOGLE_PLACES_API_KEY;
    process.env.GOOGLE_API_KEY = 'test';
    process.env.GOOGLE_PLACES_API_KEY = 'test';

    const req = {
      method: 'POST',
      body: {
        text: '2 days in klcc, trx, midvalley',
        duration_days: 2,
      },
    } as VercelRequest;
    const res = createResponse();

    mockFetchOnce({
      json: {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    places: [
                      { name: 'klcc', category: 'attraction' },
                      { name: 'trx', category: 'shop' },
                      { name: 'midvalley', category: 'shop' },
                    ],
                    summary: 'Found 3 places',
                    destination: '',
                  }),
                },
              ],
            },
          },
        ],
      },
    });

    mockFetchOnce({
      json: {
        results: [
          {
            name: 'Kuala Lumpur City Centre (KLCC)',
            formatted_address: 'Kuala Lumpur, Malaysia',
            place_id: 'place-klcc',
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

    mockFetchOnce({
      json: {
        results: [
          {
            name: 'Tun Razak Exchange (TRX)',
            formatted_address: 'Kuala Lumpur, Malaysia',
            place_id: 'place-trx',
            geometry: { location: { lat: 3.1402, lng: 101.728 } },
          },
        ],
      },
    });
    mockFetchOnce({
      json: {
        result: {
          name: 'Tun Razak Exchange (TRX)',
          formatted_address: 'Kuala Lumpur, Malaysia',
          address_components: [
            { long_name: 'Kuala Lumpur', types: ['locality'] },
            { long_name: 'Malaysia', types: ['country'] },
          ],
          geometry: { location: { lat: 3.1402, lng: 101.728 } },
        },
      },
    });

    mockFetchOnce({
      json: {
        results: [
          {
            name: 'Mid Valley Megamall',
            formatted_address: 'Kuala Lumpur, Malaysia',
            place_id: 'place-midvalley',
            geometry: { location: { lat: 3.1178, lng: 101.676 } },
          },
        ],
      },
    });
    mockFetchOnce({
      json: {
        result: {
          name: 'Mid Valley Megamall',
          formatted_address: 'Kuala Lumpur, Malaysia',
          address_components: [
            { long_name: 'Kuala Lumpur', types: ['locality'] },
            { long_name: 'Malaysia', types: ['country'] },
          ],
          geometry: { location: { lat: 3.1178, lng: 101.676 } },
        },
      },
    });

    try {
      await handler(req, res);

      const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(payload.destination).toBe('Kuala Lumpur');
      expect(payload.cleanedRequest).toContain('Kuala Lumpur City Centre (KLCC)');
      expect(payload.cleanedRequest).toContain('Tun Razak Exchange (TRX)');
      expect(payload.cleanedRequest).toContain('Mid Valley Megamall');
      expect(payload.days[0].places[0].name).toBe('Kuala Lumpur City Centre (KLCC)');
    } finally {
      process.env.GOOGLE_API_KEY = previousApiKey;
      process.env.GOOGLE_PLACES_API_KEY = previousPlacesKey;
    }
  });
});
