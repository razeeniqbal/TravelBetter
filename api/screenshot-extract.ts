import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGeminiUrl, getGeminiUrlWithModel, parseGeminiJson } from './_shared/gemini.js';
import { validateScreenshotExtractPayload } from './lib/itinerary-validator.js';

type ExtractResult = {
  filename: string;
  status: 'processed' | 'failed';
  extractedText?: string;
  error?: string;
};

function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function buildBatchId() {
  return `ocr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function extractTextFromImage(
  imageData: string,
  mimeType: string,
  googleApiKey: string,
  model?: string
) {
  const systemPrompt = `You extract visible itinerary text from screenshots.
Return JSON only in this format: {"text": "<extracted text>"}.
Do not add markdown.`;

  const response = await fetch(
    model ? getGeminiUrlWithModel(googleApiKey, model) : getGeminiUrl(googleApiKey),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: systemPrompt },
              {
                inlineData: {
                  mimeType,
                  data: imageData,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OCR request failed (${response.status}): ${errorText}`);
  }

  const payload = await response.json();
  const responseText = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof responseText !== 'string' || !responseText.trim()) {
    throw new Error('OCR response missing text output');
  }

  try {
    const parsed = parseGeminiJson<{ text?: string }>(responseText);
    return (parsed.text || '').trim();
  } catch {
    return responseText.trim();
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const parsed = validateScreenshotExtractPayload(req.body);
    if (!parsed.ok) {
      return res.status(400).json({ error: parsed.error });
    }

    const { images } = parsed.data;
    const googleApiKey = process.env.GOOGLE_API_KEY_TEXT_EXTRACT || process.env.GOOGLE_API_KEY;
    const model = process.env.GEMINI_TEXT_EXT_MODEL;
    const batchId = buildBatchId();

    if (!googleApiKey) {
      return res.status(200).json({
        batchId,
        status: 'failed',
        processedCount: 0,
        failedCount: images.length,
        items: images.map(image => ({
          filename: image.filename,
          status: 'failed',
          error: 'AI service not configured',
        })),
        mergedText: '',
        warnings: ['AI service not configured'],
      });
    }

    const items: ExtractResult[] = [];
    for (const image of images) {
      try {
        const extractedText = await extractTextFromImage(
          image.base64Data,
          image.mimeType,
          googleApiKey,
          model
        );
        if (!extractedText) {
          items.push({
            filename: image.filename,
            status: 'failed',
            error: 'No text detected',
          });
          continue;
        }

        items.push({
          filename: image.filename,
          status: 'processed',
          extractedText,
        });
      } catch (error) {
        items.push({
          filename: image.filename,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown extraction error',
        });
      }
    }

    const processedItems = items.filter(item => item.status === 'processed');
    const failedItems = items.filter(item => item.status === 'failed');
    const mergedText = processedItems
      .map(item => item.extractedText || '')
      .filter(Boolean)
      .join('\n\n');

    const status = failedItems.length === 0
      ? 'ready'
      : processedItems.length === 0
        ? 'failed'
        : 'partial';

    return res.status(200).json({
      batchId,
      status,
      processedCount: processedItems.length,
      failedCount: failedItems.length,
      items,
      mergedText,
      warnings: failedItems.length > 0
        ? [`${failedItems.length} image(s) failed OCR extraction`] : [],
    });
  } catch (error) {
    console.error('Error extracting screenshot batch:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
