import type { VercelRequest, VercelResponse } from '@vercel/node';
import { describe, expect, it, vi } from 'vitest';
import handler from './place-reviews.js';
import { mockFetchOnce, resetFetchMock } from '../../src/test/utils/mockFetch.js';

function createResponse(): VercelResponse {
  return {
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
  } as unknown as VercelResponse;
}

describe('place-reviews', () => {
  it('returns 400 when placeId is missing', async () => {
    const req = {
      method: 'GET',
      query: {},
    } as unknown as VercelRequest;
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns top authentic reviews with attribution', async () => {
    const previousKey = process.env.GOOGLE_PLACES_API_KEY;
    process.env.GOOGLE_PLACES_API_KEY = 'test-key';

    mockFetchOnce({
      json: {
        result: {
          url: 'https://maps.google.com/?cid=123',
          reviews: [
            {
              author_name: 'Alice',
              profile_photo_url: 'https://example.com/alice.jpg',
              rating: 5,
              text: 'Amazing visit',
              time: 1736200000,
              relative_time_description: '2 days ago',
            },
            {
              author_name: 'Bob',
              rating: 4,
              text: 'Great location',
              time: 1736100000,
              relative_time_description: '3 days ago',
            },
          ],
        },
      },
    });

    const req = {
      method: 'GET',
      query: {
        placeId: 'place-123',
        limit: '5',
      },
    } as unknown as VercelRequest;
    const res = createResponse();

    try {
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(payload.placeId).toBe('place-123');
      expect(payload.totalReturned).toBe(2);
      expect(payload.reviews[0]).toMatchObject({
        authorName: 'Alice',
        source: 'google',
        sourceUrl: 'https://maps.google.com/?cid=123',
      });
    } finally {
      process.env.GOOGLE_PLACES_API_KEY = previousKey;
      resetFetchMock();
    }
  });
});
