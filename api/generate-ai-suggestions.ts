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
      quickSelections = {},
      importedPlaces = [],
      existingPlaces = [],
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
    if (userPrompt) {
      contextParts.push(`User's request: "${userPrompt}"`);
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

    // Smart prompt that can interpret user's freeform input including multi-city trips
    const systemPrompt = `Expert travel planner. Identify ALL destinations from user input and suggest places for EACH location.

IMPORTANT: If input mentions multiple places (e.g., "melaka to johor", "tokyo and kyoto", "from paris to rome"):
- Include places from ALL mentioned destinations
- Split suggestions between the destinations
- In resolvedDestination, list all destinations (e.g., "Melaka & Johor" or "Melaka to Johor")

Categories: food, culture, nature, shop, night, photo, accommodation, transport

Response format (JSON only):
{"promptInterpretation":"What you understood - list ALL destinations identified","resolvedDestination":"All destinations (e.g. 'Melaka to Johor' or 'Tokyo & Kyoto')","suggestions":[{"name":"English name","nameLocal":"Local name","category":"category","description":"description","duration":60,"cost":"price","tips":["tip"],"confidence":0-100,"reason":"why it matches","neighborhood":"area/city name"}]}`;

    const promptText = `USER INPUT: "${destination}" (${duration} days trip). ${contextParts.join(' ')}

IMPORTANT: If multiple destinations are mentioned (like "X to Y" or "X and Y"), suggest places from ALL of them, not just one. Include the city/area name in the "neighborhood" field so users know which destination each place belongs to.

Suggest 5-8 places total. JSON only, no markdown.`;

    // Call Google Gemini API
    const response = await fetch(getGeminiUrl(GOOGLE_API_KEY), {
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
      if (response.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
      }
      const errorText = await response.text();
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
    let result: { suggestions?: SuggestedPlace[]; promptInterpretation?: string; resolvedDestination?: string };
    try {
      result = parseGeminiJson(responseText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      return res.status(200).json({ error: 'Failed to parse AI response', suggestions: [] });
    }

    const suggestions: SuggestedPlace[] = result.suggestions || [];
    const promptInterpretation: string = result.promptInterpretation || '';
    const resolvedDestination: string = result.resolvedDestination || destination;

    // Sort by confidence
    suggestions.sort((a, b) => b.confidence - a.confidence);

    console.log(`Generated ${suggestions.length} suggestions`);
    console.log('Prompt interpretation:', promptInterpretation);
    console.log('Resolved destination:', resolvedDestination);

    return res.status(200).json({
      suggestions,
      promptInterpretation,
      resolvedDestination,
      success: true
    });

  } catch (error) {
    console.error('Error generating suggestions:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
