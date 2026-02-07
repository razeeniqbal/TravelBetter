import type { VercelRequest, VercelResponse } from '@vercel/node';
import { describe, expect, it, vi } from 'vitest';
import handler from './suggestion-placement-commit.js';

function createResponse(): VercelResponse {
  return {
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
  } as unknown as VercelResponse;
}

describe('suggestion-placement-commit', () => {
  it('rejects unsupported methods', async () => {
    const req = { method: 'GET', body: {} } as VercelRequest;
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 400 for invalid payload', async () => {
    const req = {
      method: 'POST',
      body: {
        tripId: 'trip-1',
        placements: [],
      },
    } as VercelRequest;
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns normalized commit response with affected days', async () => {
    const req = {
      method: 'POST',
      body: {
        tripId: 'trip-1',
        placements: [
          {
            suggestionId: 'sug-1',
            confirmedDayNumber: 3,
          },
          {
            suggestionId: 'sug-2',
            confirmedDayNumber: 1,
          },
          {
            suggestionId: 'sug-3',
            confirmedDayNumber: 3,
          },
        ],
      },
    } as VercelRequest;
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload).toEqual({
      tripId: 'trip-1',
      addedCount: 3,
      affectedDays: [1, 3],
    });
  });
});
