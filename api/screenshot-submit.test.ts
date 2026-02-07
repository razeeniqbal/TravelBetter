import type { VercelRequest, VercelResponse } from '@vercel/node';
import { describe, expect, it, vi } from 'vitest';
import handler from './screenshot-submit.js';

function createResponse(): VercelResponse {
  return {
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
  } as unknown as VercelResponse;
}

describe('screenshot-submit', () => {
  it('returns 400 for invalid payloads', async () => {
    const req = {
      method: 'POST',
      body: {
        batchId: 'batch-1',
      },
    } as VercelRequest;
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('hands off reviewed OCR text to itinerary parser', async () => {
    const req = {
      method: 'POST',
      body: {
        batchId: 'batch-1',
        destination: 'Tokyo',
        durationDays: 2,
        text: 'Day 1\nSenso-ji Temple\nDay 2\nSenso-ji Temple\nMaybe TeamLab?',
      },
    } as VercelRequest;
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.cleanedRequest).toContain('Senso-ji Temple');
    expect(payload.days.length).toBeGreaterThan(0);
    expect(payload.warnings).toEqual(expect.arrayContaining(['DUPLICATE_PLACE_NAMES', 'AMBIGUOUS_TEXT_DETECTED']));
  });
});
