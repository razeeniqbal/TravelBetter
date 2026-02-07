import type { VercelRequest, VercelResponse } from '@vercel/node';
import { describe, expect, it, vi } from 'vitest';
import handler from './route-link.js';

function createResponse(): VercelResponse {
  return {
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
  } as unknown as VercelResponse;
}

describe('route-link', () => {
  it('returns 400 when fewer than two stops are provided', async () => {
    const req = {
      method: 'POST',
      body: {
        stops: [{ label: 'Only one stop' }],
      },
    } as VercelRequest;
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('builds a non-segmented route link for small itineraries', async () => {
    const req = {
      method: 'POST',
      body: {
        mode: 'walk',
        stops: [
          { label: 'KLCC Park', placeId: 'place-1' },
          { label: 'Bukit Bintang', placeId: 'place-2' },
          { label: 'Merdeka Square', placeId: 'place-3' },
        ],
      },
    } as VercelRequest;
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.segmented).toBe(false);
    expect(payload.url).toContain('google.com/maps/dir');
  });

  it('segments route links for large itineraries', async () => {
    const stops = Array.from({ length: 15 }, (_, index) => ({
      label: `Stop ${index + 1}`,
      placeId: `place-${index + 1}`,
    }));

    const req = {
      method: 'POST',
      body: {
        mode: 'walk',
        stops,
      },
    } as VercelRequest;
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.segmented).toBe(true);
    expect(payload.segments.length).toBeGreaterThan(1);
  });
});
