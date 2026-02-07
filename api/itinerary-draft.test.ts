import type { VercelRequest, VercelResponse } from '@vercel/node';
import { describe, expect, it, vi } from 'vitest';
import handler from './itinerary-draft.js';

function createResponse(): VercelResponse {
  return {
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
  } as unknown as VercelResponse;
}

describe('itinerary-draft', () => {
  it('rejects unsupported methods', async () => {
    const req = { method: 'POST', body: {} } as VercelRequest;
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 400 for invalid payload', async () => {
    const req = {
      method: 'PUT',
      body: {
        tripId: 'trip-1',
        editSession: { draftId: 'd-1' },
      },
    } as VercelRequest;
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns normalized save response for valid payload', async () => {
    const req = {
      method: 'PUT',
      body: {
        tripId: 'trip-1',
        editSession: {
          draftId: 'draft-1',
          baselineHash: 'base-1',
        },
        days: [
          {
            dayNumber: 1,
            stops: [
              {
                stopId: 'stop-1',
                position: 0,
                stayDurationMinutes: 90,
              },
            ],
          },
        ],
      },
    } as VercelRequest;
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.tripId).toBe('trip-1');
    expect(payload.days).toHaveLength(1);
  });
});
