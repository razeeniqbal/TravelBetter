import type { VercelRequest, VercelResponse } from '@vercel/node';
import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from './place-details.js';

function createResponse(): VercelResponse {
  return {
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
  } as unknown as VercelResponse;
}

function createRequest(query: Record<string, unknown>, method = 'GET'): VercelRequest {
  return {
    method,
    query,
    headers: {},
  } as unknown as VercelRequest;
}

function createJsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('place-details', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('returns 400 when both providerPlaceId and queryText are missing', async () => {
    const req = createRequest({});
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns normalized canonical details and reviews using providerPlaceId', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', 'test-key');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      createJsonResponse(200, {
        id: 'provider-place-1',
        displayName: { text: 'Kuala Lumpur City Centre (KLCC)' },
        formattedAddress: 'Kuala Lumpur City Centre, Kuala Lumpur, Malaysia',
        googleMapsUri: 'https://maps.google.com/?cid=123',
        rating: 4.6,
        userRatingCount: 321,
        reviews: [
          {
            authorAttribution: {
              displayName: 'Alice',
              photoUri: 'https://example.com/alice.jpg',
              uri: 'https://maps.google.com/review/1',
            },
            rating: 5,
            originalText: { text: 'Amazing view and easy access.' },
            publishTime: '2026-01-01T00:00:00.000Z',
            relativePublishTimeDescription: 'a month ago',
          },
        ],
      })
    );

    const req = createRequest({ providerPlaceId: 'provider-place-1', reviewLimit: '5' });
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.details).toMatchObject({
      providerPlaceId: 'provider-place-1',
      canonicalName: 'Kuala Lumpur City Centre (KLCC)',
      formattedAddress: 'Kuala Lumpur City Centre, Kuala Lumpur, Malaysia',
      resolvedBy: 'provider_place_id',
      source: 'google',
    });
    expect(payload.reviews).toHaveLength(1);
    expect(payload.reviewState).toBe('available');
  });

  it('uses text query fallback when providerPlaceId is missing', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', 'test-key');
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock
      .mockResolvedValueOnce(createJsonResponse(200, {
        places: [{ id: 'provider-from-search' }],
      }))
      .mockResolvedValueOnce(createJsonResponse(200, {
        id: 'provider-from-search',
        displayName: { text: 'The Exchange TRX' },
        formattedAddress: 'Kuala Lumpur, Malaysia',
        reviews: [
          {
            authorAttribution: { displayName: 'Bob' },
            rating: 4,
            originalText: { text: 'Great mall and train access.' },
            publishTime: '2026-01-07T00:00:00.000Z',
          },
        ],
      }));

    const req = createRequest({ queryText: 'The Exchange TRX', destinationContext: 'Kuala Lumpur' });
    const res = createResponse();

    await handler(req, res);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.details.resolvedBy).toBe('text_query');
    expect(payload.details.providerPlaceId).toBe('provider-from-search');
  });

  it('falls back to similar place reviews when primary details have none', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', 'test-key');
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock
      .mockResolvedValueOnce(createJsonResponse(200, {
        id: 'provider-place-2',
        displayName: { text: 'Kuala Lumpur City Centre' },
        formattedAddress: 'Kuala Lumpur, Malaysia',
        reviews: [],
      }))
      .mockResolvedValueOnce(createJsonResponse(200, {
        places: [
          { id: 'provider-place-2', userRatingCount: 0 },
          { id: 'provider-place-alt', userRatingCount: 500 },
        ],
      }))
      .mockResolvedValueOnce(createJsonResponse(200, {
        id: 'provider-place-alt',
        displayName: { text: 'KLCC Park' },
        formattedAddress: 'Kuala Lumpur, Malaysia',
        reviews: [
          {
            authorAttribution: { displayName: 'Nearby User' },
            rating: 5,
            originalText: { text: 'Excellent atmosphere and skyline views.' },
            publishTime: '2026-01-09T00:00:00.000Z',
          },
        ],
      }));

    const req = createRequest({
      providerPlaceId: 'provider-place-2',
      queryText: 'Kuala Lumpur City Centre',
      destinationContext: 'Kuala Lumpur',
    });
    const res = createResponse();

    await handler(req, res);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.reviews.length).toBeGreaterThan(0);
    expect(payload.reviewState).toBe('available');
  });

  it('returns empty review state when no reviews are available', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', 'test-key');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      createJsonResponse(200, {
        id: 'provider-place-2',
        displayName: { text: 'Merdeka Square' },
        formattedAddress: 'Kuala Lumpur, Malaysia',
        reviews: [],
      })
    );

    const req = createRequest({ providerPlaceId: 'provider-place-2' });
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.reviews).toEqual([]);
    expect(payload.reviewState).toBe('empty');
  });

  it('returns 502 when provider request fails', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', 'test-key');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      createJsonResponse(500, { error: { message: 'Provider down' } })
    );

    const req = createRequest({ providerPlaceId: 'provider-place-3' });
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(502);
  });
});
