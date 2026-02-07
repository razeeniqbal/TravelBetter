import type { VercelRequest, VercelResponse } from '@vercel/node';
import { describe, expect, it, vi } from 'vitest';
import handler from './place-map-link.js';

function createResponse(): VercelResponse {
  return {
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
  } as unknown as VercelResponse;
}

describe('place-map-link', () => {
  it('rejects unsupported methods', async () => {
    const req = { method: 'POST', query: {} } as unknown as VercelRequest;
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('builds place-id map links', async () => {
    const req = {
      method: 'GET',
      query: {
        placeId: 'place-abc',
        placeName: 'KLCC Park',
      },
    } as unknown as VercelRequest;
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.url).toContain('query_place_id=place-abc');
    expect(payload.url).toContain('KLCC%20Park');
  });
});
