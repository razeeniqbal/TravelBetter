import type { VercelRequest, VercelResponse } from '@vercel/node';
import { describe, expect, it, vi } from 'vitest';
import handler from './suggestion-placement-preview.js';

function createResponse(): VercelResponse {
  return {
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
  } as unknown as VercelResponse;
}

describe('suggestion-placement-preview', () => {
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
        mode: 'ai',
        selectedSuggestions: [],
      },
    } as VercelRequest;
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns manual day placement previews', async () => {
    const req = {
      method: 'POST',
      body: {
        tripId: 'trip-1',
        mode: 'manual',
        selectedSuggestions: [
          {
            suggestionId: 'sug-1',
            displayName: 'KLCC Park',
            manualDayNumber: 2,
          },
        ],
      },
    } as VercelRequest;
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.mode).toBe('manual');
    expect(payload.placements[0]).toMatchObject({
      suggestionId: 'sug-1',
      proposedDayNumber: 2,
      confidence: 'high',
    });
  });

  it('returns ai-assisted placement previews', async () => {
    const req = {
      method: 'POST',
      body: {
        tripId: 'trip-1',
        mode: 'ai',
        selectedSuggestions: [
          {
            suggestionId: 'sug-1',
            displayName: 'KLCC Park',
          },
          {
            suggestionId: 'sug-2',
            displayName: 'Bukit Bintang',
          },
        ],
      },
    } as VercelRequest;
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.mode).toBe('ai');
    expect(payload.placements).toHaveLength(2);
    expect(payload.placements[0].confidence).toBe('high');
    expect(payload.placements[1].confidence).toBe('medium');
  });
});
