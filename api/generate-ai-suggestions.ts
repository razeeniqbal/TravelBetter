import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGeminiUrl, parseGeminiJson } from './_shared/gemini.js';

interface SuggestedPlace {
  name: string;
  nameLocal?: string;
  category: string;
  description: string;
  duration?: number;
  cost?: string;
  tips?: string[];
  confidence: number;
  reason: string;
  neighborhood?: string;
  latitude?: number;
  longitude?: number;
}

const RETRY_STATUS_CODES = new Set([429, 500, 503]);
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 400;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, options: RequestInit) {
  let attempt = 0;

  while (true) {
    const response = await fetch(url, options);
    if (response.ok || !RETRY_STATUS_CODES.has(response.status) || attempt >= MAX_RETRIES) {
      return response;
    }

    const jitter = Math.floor(Math.random() * 200);
    const delay = BASE_DELAY_MS * Math.pow(2, attempt) + jitter;
    await wait(delay);
    attempt += 1;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
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
    const {
      destination,
      userPrompt,
      cleanedRequest,
      dayGroups,
      quickSelections = {},
      importedPlaces = [],
      existingPlaces = [],
      preferences = {},
      travelStyle = [],
      dayNumber = 1,
      duration = 3
    } = req.body;

    if (!destination) {
      return res.status(400).json({ error: 'Destination is required' });
    }

    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    if (!GOOGLE_API_KEY) {
      console.error('GOOGLE_API_KEY is not configured');
      return res.status(500).json({ error: 'AI service not configured' });
    }

    console.log('Generating AI suggestions for:', destination);
    console.log('User prompt:', userPrompt);
    console.log('Quick selections:', quickSelections);

    // Build context from existing places
    const existingPlaceNames = existingPlaces.map((p: { name: string }) => p.name).join(', ');
    const importedPlaceNames = importedPlaces.join(', ');

    // Build preference context from quick selections
    const preferenceContext: string[] = [];
    if (quickSelections.purposes?.length > 0) {
      preferenceContext.push(`Interests: ${quickSelections.purposes.join(', ')}`);
    }
    if (quickSelections.travelers) {
      preferenceContext.push(`Travelers: ${quickSelections.travelers}`);
    }
    if (quickSelections.budget) {
      preferenceContext.push(`Budget: ${quickSelections.budget}`);
    }
    if (quickSelections.pace) {
      preferenceContext.push(`Pace: ${quickSelections.pace}`);
    }

    // Build the prompt
    const contextParts: string[] = [];
    const effectivePrompt = cleanedRequest || userPrompt;

    if (effectivePrompt) {
      contextParts.push(`User's request: "${effectivePrompt}"`);
    }
    if (Array.isArray(dayGroups) && dayGroups.length > 0) {
      const daySummaries = dayGroups
        .map((day: { label: string; places: { name: string }[] }) => {
          const names = day.places?.map(place => place.name).filter(Boolean).join(', ');
          return names ? `${day.label}: ${names}` : day.label;
        })
        .join(' | ');
      if (daySummaries) {
        contextParts.push(`Places by day: ${daySummaries}`);
      }
    }
    if (preferenceContext.length > 0) {
      contextParts.push(`Preferences: ${preferenceContext.join('. ')}`);
    }
    if (importedPlaceNames) {
      contextParts.push(`Already planning to visit: ${importedPlaceNames}`);
    }
    if (existingPlaceNames) {
      contextParts.push(`Already in itinerary: ${existingPlaceNames}`);
    }

    const systemPrompt = `You are an expert travel planner that suggests personalized places to visit.

Your suggestions should:
1. Complement the user's existing itinerary without duplicating places
2. Never suggest a place listed as already planned or already in the itinerary
3. Match the user's stated interests and preferences closely
4. Consider the travel style, budget, and pace preferences
5. Include a mix of popular and hidden gem spots
6. Be logistically practical (nearby to existing places when possible)
7. Include local favorites and authentic experiences

For each suggestion, provide:
- A confidence score (0-100) based on how well it matches the user's specific preferences
- A personalized reason explaining WHY this place matches their request
- Include the neighborhood/area for context
- Provide geographic coordinates (latitude and longitude in decimal degrees)
- If coordinates are unknown, set latitude and longitude to null

Categories: food, culture, nature, shop, night, photo, accommodation, transport

You MUST respond with a valid JSON object in this exact format:
{
  "promptInterpretation": "Brief summary of what you understood from the user request",
  "suggestions": [
    {
      "name": "Place name in English",
      "nameLocal": "Local name if known",
      "category": "one of: food, culture, nature, shop, night, photo, accommodation, transport",
      "description": "Engaging description of the place",
      "duration": 60,
      "cost": "¥500 or Free",
      "tips": ["tip1", "tip2"],
      "confidence": 85,
      "reason": "Personalized explanation of why this matches their request",
      "neighborhood": "Area name",
      "latitude": 35.0116,
      "longitude": 135.7681
    }
  ]
}`;

    const promptText = `Suggest 5-8 additional places to visit in ${destination} for a ${duration}-day trip.

${contextParts.join('\n\n')}

Generate personalized suggestions that directly address what the user is looking for. If places are already listed, treat them as required stops and only suggest new complementary options. Be specific about why each place matches their preferences.

Respond ONLY with valid JSON, no markdown or extra text.`;

    // Call Google Gemini API
    const response = await fetchWithRetry(getGeminiUrl(GOOGLE_API_KEY), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: systemPrompt + '\n\n' + promptText }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json'
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      if (response.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
      }
      if (response.status === 503) {
        res.setHeader('Retry-After', '2');
        return res.status(503).json({ error: 'AI service is overloaded. Please try again in a moment.' });
      }

      console.error('Google AI error:', response.status, errorText);
      return res.status(500).json({ error: 'Failed to generate suggestions' });
    }

    const data = await response.json();
    console.log('AI response received');

    // Extract the response text from Gemini format
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      console.error('Unexpected response format:', JSON.stringify(data));
      return res.status(200).json({ error: 'Failed to generate suggestions', suggestions: [] });
    }

    // Parse the JSON response
    let result: { suggestions?: SuggestedPlace[]; promptInterpretation?: string };
    try {
      result = parseGeminiJson(responseText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      return res.status(200).json({ error: 'Failed to parse AI response', suggestions: [] });
    }

    const suggestions: SuggestedPlace[] = result.suggestions || [];
    const promptInterpretation: string = result.promptInterpretation || '';

    // Sort by confidence
    suggestions.sort((a, b) => b.confidence - a.confidence);

    console.log(`Generated ${suggestions.length} suggestions`);
    console.log('Prompt interpretation:', promptInterpretation);

    return res.status(200).json({
      suggestions,
      promptInterpretation,
      success: true
    });

  } catch (error) {
    console.error('Error generating suggestions:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
