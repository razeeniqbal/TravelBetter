import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGeminiUrl, getGeminiUrlWithModel, parseGeminiJson } from './_shared/gemini.js';
import { buildRequest, parseItineraryText } from './lib/itinerary-parser.js';
import { resolvePlaceCandidate } from './lib/place-normalizer.js';

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

function hasExplicitDayHeaders(text: string) {
  return text
    .split(/\r?\n/)
    .map(line => normalizeLabel(line))
    .some(line => DAY_HEADER_REGEX.test(line) || DAY_HEADER_COMPACT_REGEX.test(line));
}

function collectNormalizationWarnings(placeNames: string[]) {
  const warnings: string[] = [];
  const seen = new Set<string>();
  let hasDuplicate = false;
  let hasAmbiguous = false;

  for (const placeName of placeNames) {
    const normalized = normalizeLabel(placeName);
    if (!normalized) continue;
    if (seen.has(normalized)) {
      hasDuplicate = true;
    } else {
      seen.add(normalized);
    }
    if (/\?|\b(tbd|unknown|maybe)\b/i.test(placeName)) {
      hasAmbiguous = true;
    }
  }

  if (hasDuplicate) warnings.push('DUPLICATE_PLACE_NAMES');
  if (hasAmbiguous) warnings.push('AMBIGUOUS_PLACE_NAME');
  return warnings;
}

function buildDayGroupsFromPlaces(
  places: ExtractedPlace[],
  durationDays: number | null
) {
  const totalDays = durationDays && durationDays > 1
    ? Math.floor(durationDays)
    : 1;
  const chunkSize = Math.max(1, Math.ceil(places.length / totalDays));
  const dayGroups = [] as Array<{ label: string; date: null; places: ExtractedPlace[] }>;

  for (let i = 0; i < totalDays; i += 1) {
    const start = i * chunkSize;
    const end = start + chunkSize;
    dayGroups.push({
      label: `Day ${i + 1}`,
      date: null,
      places: places.slice(start, end),
    });
  }

  return dayGroups;
}

interface ExtractedPlace {
  name: string;
  nameLocal?: string;
  category: string;
  description?: string;
  tips?: string[];
  latitude?: number;
  longitude?: number;
  displayName?: string;
  placeId?: string | null;
  formattedAddress?: string | null;
  addressComponents?: {
    city?: string | null;
    region?: string | null;
    country?: string | null;
  };
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
    const { text, destination, duration_days } = req.body;

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

    const durationDays = typeof duration_days === 'number' && duration_days > 0
      ? Math.floor(duration_days)
      : null;
    const parsed = parseItineraryText(text, destination || null, durationDays);
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

    const destinationContext = typeof result.destination === 'string' && result.destination.trim()
      ? result.destination.trim()
      : typeof destination === 'string' && destination.trim()
        ? destination.trim()
        : parsed.destination || '';

    const normalizationResults = [] as Array<Awaited<ReturnType<typeof resolvePlaceCandidate>>>;
    for (const place of places) {
      normalizationResults.push(await resolvePlaceCandidate(place.name, destinationContext || undefined));
    }

    const normalizedPlaces = places.map((place, index) => {
      const normalized = normalizationResults[index];
      const displayName = normalized.displayName || place.name;
      return {
        ...place,
        name: displayName,
        displayName,
        placeId: normalized.placeId || null,
        formattedAddress: normalized.formattedAddress || null,
        addressComponents: normalized.addressComponents,
      };
    });

    const destinationLabel = (() => {
      const destinationValue = destinationContext.trim();
      const normalizedDestination = normalizeLabel(destinationValue);
      const matchesPlace = places.some(place => normalizeLabel(place.name) === normalizedDestination);
      const shouldInfer = !destinationValue || matchesPlace;

      if (!shouldInfer) return destinationValue;

      const cityCounts = new Map<string, number>();
      for (const normalized of normalizationResults) {
        const city = normalized.addressComponents?.city || normalized.addressComponents?.region;
        if (!city) continue;
        cityCounts.set(city, (cityCounts.get(city) || 0) + 1);
      }

      let bestCity: string | null = null;
      let bestCount = 0;
      for (const [city, count] of cityCounts.entries()) {
        if (count > bestCount) {
          bestCity = city;
          bestCount = count;
        }
      }

      return bestCity || destinationValue;
    })();

    const parsedPlaceCount = parsed.days.reduce((total, day) => total + day.places.length, 0);
    const shouldAutoGroup = parsedPlaceCount === 0
      && normalizedPlaces.length > 0
      && !hasExplicitDayHeaders(text);

    const normalizedDays = shouldAutoGroup
      ? buildDayGroupsFromPlaces(normalizedPlaces, durationDays)
      : (() => {
        const normalizedMap = new Map(
          places.map((place, index) => [normalizeLabel(place.name), normalizedPlaces[index].name])
        );

        return parsed.days.map(day => ({
          ...day,
          places: day.places.map(place => {
            const key = normalizeLabel(place.name);
            return {
              ...place,
              name: normalizedMap.get(key) || place.name,
            };
          }),
        }));
      })();

    const normalizedDayGroups = normalizedDays.map(day => ({
      label: day.label,
      date: day.date ?? null,
      places: day.places.map(place => ({
        name: place.name,
        source: 'source' in place && place.source ? place.source : 'user',
        notes: 'notes' in place ? place.notes : undefined,
        timeText: 'timeText' in place ? place.timeText : undefined,
      })),
    }));

    const cleanedRequest = buildRequest(normalizedDayGroups, destinationLabel || null);
    const normalizationWarnings = collectNormalizationWarnings(rawPlaces.map(place => place.name));
    const warnings = [...new Set([...(parsed.warnings || []), ...normalizationWarnings])];

    console.log(`Extracted ${places.length} places from text`);

    return res.status(200).json({
      places: normalizedPlaces,
      summary: result.summary || `Found ${normalizedPlaces.length} places`,
      destination: destinationLabel || '',
      cleanedRequest,
      previewText: cleanedRequest,
      cleaned_request: cleanedRequest,
      preview_text: cleanedRequest,
      days: normalizedDayGroups,
      warnings,
      success: true
    });
  } catch (error) {
    console.error('Error processing itinerary text:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
