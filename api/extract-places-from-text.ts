import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGeminiUrl, getGeminiUrlWithModel, parseGeminiJson } from './_shared/gemini.js';
import { parseItineraryText } from './lib/itinerary-parser.js';

const EMOJI_REGEX = /[\p{Extended_Pictographic}]/gu;
const VARIATION_SELECTOR_REGEX = /[\uFE0E\uFE0F]/g;
const LEADING_MARKERS_REGEX = /^[•\-*]+\s*/;
const TRAILING_ASTERISK_REGEX = /\s*\*+$/;
const DATE_RANGE_REGEX = /\b\d{1,2}\/\d{1,2}(?:\s*[-–]\s*\d{1,2}\/\d{1,2})\b/;
const DAY_HEADER_REGEX = /^day\s*\d+\b/i;
const DAY_HEADER_COMPACT_REGEX = /^day\d+\b/i;
const META_LINE_PATTERNS = [
  /^places from my itinerary\b/i,
  /^i(?:'|’)m planning a trip to\b/i,
  /^i am planning a trip to\b/i,
];

function normalizeLabel(value: string) {
  return value
    .replace(EMOJI_REGEX, '')
    .replace(VARIATION_SELECTOR_REGEX, '')
    .replace(LEADING_MARKERS_REGEX, '')
    .replace(TRAILING_ASTERISK_REGEX, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function shouldExcludePlaceName(name: string, dayLabels?: Set<string>) {
  const normalized = normalizeLabel(name);
  if (!normalized) return true;
  if (dayLabels?.has(normalized)) return true;
  if (DAY_HEADER_REGEX.test(normalized) || DAY_HEADER_COMPACT_REGEX.test(normalized)) return true;
  if (META_LINE_PATTERNS.some(pattern => pattern.test(normalized))) return true;
  if (normalized.includes('trip') && DATE_RANGE_REGEX.test(normalized)) return true;
  return false;
}

interface ExtractedPlace {
  name: string;
  nameLocal?: string;
  category: string;
  description?: string;
  tips?: string[];
  latitude?: number;
  longitude?: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, destination } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY_TEXT_EXTRACT || process.env.GOOGLE_API_KEY;
    if (!GOOGLE_API_KEY) {
      console.error('GOOGLE_API_KEY is not configured');
      return res.status(500).json({ error: 'AI service not configured' });
    }

    const textExtractionModel = process.env.GEMINI_TEXT_EXT_MODEL;

    console.log('Extracting places from text itinerary');

    const parsed = parseItineraryText(text, destination || null);
    const fallbackPlaces: ExtractedPlace[] = parsed.days
      .flatMap(day => day.places)
      .map(place => ({
        name: place.name,
        category: 'attraction',
      }));

    const systemPrompt = `You are a travel assistant that extracts place names and destinations from messy itinerary text.

When given raw itinerary notes, first infer the primary destination city/region and country. Then extract places that belong to that destination.

When given raw itinerary notes, extract:
1. Place names (restaurants, attractions, hotels, shops, temples, etc.)
2. Local names if included
3. Category (food, culture, nature, shop, night, photo, accommodation, transport)
4. Brief description if context is available
5. Any tips or recommendations mentioned
6. Geographic coordinates (latitude and longitude in decimal degrees)
7. If coordinates are unknown, set latitude and longitude to null
8. A concise destination label with city/region and country if clear

Only include places that are located in the inferred destination or its immediate area. If a place is ambiguous or outside the destination, exclude it.

You MUST respond with a valid JSON object in this exact format:
{
  "places": [
    {
      "name": "Place name in English",
      "nameLocal": "Local name if known",
      "category": "one of: food, culture, nature, shop, night, photo, accommodation, transport",
      "description": "Brief description",
      "tips": ["tip1", "tip2"],
      "latitude": 35.0116,
      "longitude": 135.7681
    }
  ],
  "summary": "Brief summary of what was found",
  "destination": "City or region name if clear"
}`;

    const userPrompt = `Extract travel places from this itinerary text:

${text}

${destination ? `The user is planning a trip to ${destination}.` : ''}

Focus on specific named locations and ignore dates/times unless they clarify the place. Use the destination to disambiguate and ensure places belong to the same location/country.

Respond ONLY with valid JSON, no markdown or extra text.`;

    const response = await fetch(
      textExtractionModel
        ? getGeminiUrlWithModel(GOOGLE_API_KEY, textExtractionModel)
        : getGeminiUrl(GOOGLE_API_KEY),
      {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: systemPrompt + '\n\n' + userPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json'
        }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
      }
      const errorText = await response.text();
      console.error('Google AI error:', response.status, errorText);
      return res.status(500).json({ error: 'Failed to analyze itinerary text' });
    }

    const data = await response.json();

    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      console.error('Unexpected response format:', JSON.stringify(data));
      return res.status(200).json({
        error: 'Failed to extract places from text',
        places: fallbackPlaces,
        summary: `Found ${fallbackPlaces.length} places`,
        destination: parsed.destination || '',
        cleanedRequest: parsed.cleanedRequest,
        previewText: parsed.previewText,
        cleaned_request: parsed.cleanedRequest,
        preview_text: parsed.previewText,
        days: parsed.days,
        warnings: parsed.warnings,
        success: true,
      });
    }

    let result: { places?: ExtractedPlace[]; summary?: string; destination?: string };
    try {
      result = parseGeminiJson(responseText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      return res.status(200).json({
        error: 'Failed to parse AI response',
        places: fallbackPlaces,
        summary: `Found ${fallbackPlaces.length} places`,
        destination: parsed.destination || '',
        cleanedRequest: parsed.cleanedRequest,
        previewText: parsed.previewText,
        cleaned_request: parsed.cleanedRequest,
        preview_text: parsed.previewText,
        days: parsed.days,
        warnings: parsed.warnings,
        success: true,
      });
    }

    const dayLabelSet = new Set(parsed.days.map(day => normalizeLabel(day.label)));
    const rawPlaces: ExtractedPlace[] = result.places && result.places.length > 0
      ? result.places
      : fallbackPlaces;
    const places = rawPlaces.filter(place => !shouldExcludePlaceName(place.name, dayLabelSet));

    console.log(`Extracted ${places.length} places from text`);

    return res.status(200).json({
      places,
      summary: result.summary || `Found ${places.length} places`,
      destination: result.destination || parsed.destination || '',
      cleanedRequest: parsed.cleanedRequest,
      previewText: parsed.previewText,
      cleaned_request: parsed.cleanedRequest,
      preview_text: parsed.previewText,
      days: parsed.days,
      warnings: parsed.warnings,
      success: true
    });
  } catch (error) {
    console.error('Error processing itinerary text:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
