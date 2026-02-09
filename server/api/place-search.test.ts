import type { VercelRequest, VercelResponse } from '@vercel/node';
import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from './place-search.js';

function createResponse(): VercelResponse {
  return {
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
  } as unknown as VercelResponse;
}

function createJsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function createRequest(
  body: Record<string, unknown>,
  options?: { method?: string; ip?: string }
): VercelRequest {
  return {
    method: options?.method || 'POST',
    body,
    headers: {},
    socket: { remoteAddress: options?.ip || '127.0.0.1' },
  } as unknown as VercelRequest;
}

describe('place-search', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('rejects unsupported methods', async () => {
    const req = createRequest({}, { method: 'GET' });
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 400 for empty query', async () => {
    const req = createRequest({ query: '   ' }, { ip: '127.0.0.2' });
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.error).toMatch(/query/i);
  });

  it('returns normalized place results with display and secondary text', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', 'test-key');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      createJsonResponse(200, {
        places: [
          {
            id: 'google-place-id',
            displayName: { text: 'Kuala Lumpur City Centre (KLCC)' },
            formattedAddress: 'Kuala Lumpur, Malaysia',
            location: { latitude: 3.1579, longitude: 101.7123 },
            types: ['tourist_attraction', 'point_of_interest'],
            googleMapsUri: 'https://maps.google.com/?cid=123',
          },
        ],
      })
    );

    const req = createRequest(
      { query: 'klcc', destinationContext: 'Kuala Lumpur', dayNumber: 2, limit: 5 },
      { ip: '127.0.0.3' }
    );
    const res = createResponse();

    await handler(req, res);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.query).toBe('klcc');
    expect(payload.results[0]).toMatchObject({
      providerPlaceId: 'google-place-id',
      displayName: 'Kuala Lumpur City Centre (KLCC)',
      secondaryText: 'Kuala Lumpur, Malaysia',
      formattedAddress: 'Kuala Lumpur, Malaysia',
      mapsUri: 'https://maps.google.com/?cid=123',
    });
  });

  it('returns 429 when upstream provider is rate-limited', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', 'test-key');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      createJsonResponse(429, { error: { message: 'Rate limited' } })
    );

    const req = createRequest({ query: 'klcc' }, { ip: '127.0.0.4' });
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(429);
  });

  it('returns 502 when upstream provider is unavailable', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', 'test-key');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      createJsonResponse(500, { error: { message: 'Server error' } })
    );

    const req = createRequest({ query: 'klcc' }, { ip: '127.0.0.5' });
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(502);
  });
});
