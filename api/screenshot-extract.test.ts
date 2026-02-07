import type { VercelRequest, VercelResponse } from '@vercel/node';
import { describe, expect, it, vi } from 'vitest';
import handler from './screenshot-extract.js';
import { mockFetchOnce, resetFetchMock } from '../src/test/utils/mockFetch.js';

function createResponse(): VercelResponse {
  return {
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
  } as unknown as VercelResponse;
}

const validBody = {
  destination: 'Tokyo',
  images: [
    {
      filename: 'shot-1.png',
      mimeType: 'image/png',
      base64Data: 'ZmFrZQ==',
    },
    {
      filename: 'shot-2.png',
      mimeType: 'image/png',
      base64Data: 'ZmFrZQ==',
    },
  ],
};

describe('screenshot-extract', () => {
  it('returns failed status when provider is not configured', async () => {
    const previousApiKey = process.env.GOOGLE_API_KEY;
    const previousTextApiKey = process.env.GOOGLE_API_KEY_TEXT_EXTRACT;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GOOGLE_API_KEY_TEXT_EXTRACT;

    const req = {
      method: 'POST',
      body: validBody,
    } as VercelRequest;
    const res = createResponse();

    try {
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(payload.status).toBe('failed');
      expect(payload.failedCount).toBe(2);
    } finally {
      process.env.GOOGLE_API_KEY = previousApiKey;
      process.env.GOOGLE_API_KEY_TEXT_EXTRACT = previousTextApiKey;
    }
  });

  it('returns ready status when all images are processed', async () => {
    const previousApiKey = process.env.GOOGLE_API_KEY;
    process.env.GOOGLE_API_KEY = 'test-key';

    mockFetchOnce({
      json: {
        candidates: [{ content: { parts: [{ text: JSON.stringify({ text: 'Day 1 Tokyo' }) }] } }],
      },
    });
    mockFetchOnce({
      json: {
        candidates: [{ content: { parts: [{ text: JSON.stringify({ text: 'Day 2 Asakusa' }) }] } }],
      },
    });

    const req = {
      method: 'POST',
      body: validBody,
    } as VercelRequest;
    const res = createResponse();

    try {
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(payload.status).toBe('ready');
      expect(payload.processedCount).toBe(2);
      expect(payload.failedCount).toBe(0);
      expect(payload.mergedText).toContain('Day 1 Tokyo');
      expect(payload.mergedText).toContain('Day 2 Asakusa');
    } finally {
      process.env.GOOGLE_API_KEY = previousApiKey;
      resetFetchMock();
    }
  });

  it('returns partial status when one image fails provider extraction', async () => {
    const previousApiKey = process.env.GOOGLE_API_KEY;
    process.env.GOOGLE_API_KEY = 'test-key';

    mockFetchOnce({
      json: {
        candidates: [{ content: { parts: [{ text: JSON.stringify({ text: 'Day 1 Tokyo' }) }] } }],
      },
    });
    mockFetchOnce({
      status: 429,
      json: { error: 'rate limit' },
    });

    const req = {
      method: 'POST',
      body: validBody,
    } as VercelRequest;
    const res = createResponse();

    try {
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(payload.status).toBe('partial');
      expect(payload.processedCount).toBe(1);
      expect(payload.failedCount).toBe(1);
      expect(payload.warnings[0]).toContain('failed OCR extraction');
    } finally {
      process.env.GOOGLE_API_KEY = previousApiKey;
      resetFetchMock();
    }
  });
});
