import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGeminiUrl, getGeminiUrlWithModel, parseGeminiJson } from './_shared/gemini.js';

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

    const systemPrompt = `You are a travel assistant that extracts place names and destinations from messy itinerary text.

When given raw itinerary notes, extract:
1. Place names (restaurants, attractions, hotels, shops, temples, etc.)
2. Local names if included
3. Category (food, culture, nature, shop, night, photo, accommodation, transport)
4. Brief description if context is available
5. Any tips or recommendations mentioned
6. Geographic coordinates (latitude and longitude in decimal degrees)
7. If coordinates are unknown, set latitude and longitude to null
8. A concise destination label if the city or region is obvious

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

Focus on specific named locations and ignore dates/times unless they clarify the place.

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
      return res.status(200).json({ error: 'Failed to extract places from text', places: [] });
    }

    let result: { places?: ExtractedPlace[]; summary?: string; destination?: string };
    try {
      result = parseGeminiJson(responseText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      return res.status(200).json({ error: 'Failed to parse AI response', places: [] });
    }

    const places: ExtractedPlace[] = result.places || [];

    console.log(`Extracted ${places.length} places from text`);

    return res.status(200).json({
      places,
      summary: result.summary || `Found ${places.length} places`,
      destination: result.destination || '',
      success: true
    });
  } catch (error) {
    console.error('Error processing itinerary text:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
