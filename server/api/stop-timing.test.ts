import type { VercelRequest, VercelResponse } from '@vercel/node';
import { describe, expect, it, vi } from 'vitest';
import handler from './stop-timing.js';

function createResponse(): VercelResponse {
  return {
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
  } as unknown as VercelResponse;
}

describe('stop-timing', () => {
  it('rejects unsupported methods', async () => {
    const req = { method: 'POST', body: {} } as VercelRequest;
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 400 for invalid payload', async () => {
    const req = {
      method: 'PATCH',
      body: {
        tripId: 'trip-1',
        stopId: 'stop-1',
        stayDurationMinutes: 0,
      },
    } as VercelRequest;
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns normalized timing response', async () => {
    const req = {
      method: 'PATCH',
      body: {
        tripId: 'trip-1',
        stopId: 'stop-1',
        arrivalTime: '09:30',
        stayDurationMinutes: 90,
      },
    } as VercelRequest;
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload).toEqual({
      stopId: 'stop-1',
      arrivalTime: '09:30',
      stayDurationMinutes: 90,
      commuteFromPrevious: {
        distanceMeters: null,
        durationMinutes: null,
      },
    });
  });
});
