import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGeminiUrl, parseGeminiJson } from './_shared/gemini.js';

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
    const { image, destination } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    if (!GOOGLE_API_KEY) {
      console.error('GOOGLE_API_KEY is not configured');
      return res.status(500).json({ error: 'AI service not configured' });
    }

    console.log('Extracting places from image for destination:', destination);

    // STEP 1: Visual Feature Extraction + OCR (+Cross-Validation
    // Implementing Gemini's multi-modal filtering logic
    const step1Prompt = `You are a travel data extractor with vision capabilities analyzing a travel itinerary screenshot.

**STEP 1: Modal Initialization & Visual Entity Mapping**

Use BOTH visual recognition AND text reading:

1. **Visual Identification (The "Eyes")**:
   - Recognize landmarks by architectural features (e.g., pink dome = Masjid Putra, twin towers = Petronas)
   - Identify locations visible in photos within the screenshot
   - Look for recognizable buildings, monuments, or places

2. **OCR Extraction (The "Reading")**:
   - Read ALL text: headers, labels, descriptions, captions
   - Note text hierarchy (is it a header like "KL travel" or a place name like "Masjid Putra"?)
   - Extract text from different visual containers

3. **Cross-Validation (The "Brain")**:
   - Match text labels with visual features to confirm locations
   - Example: "Masjid Putra" text + pink dome photo = CONFIRMED location
   - Distinguish between place names vs. UI elements/categories

**CRITICAL - DO NOT EXTRACT:**
- Headers/Categories: "KL travel", "must go", "don't go", "travel tips", "Urban Village" (when used as category header)
- UI Elements: "Home", "Search", "Profile", "Back", "Share", "Save", "Edit", "yes", "no"
- Usernames: Any "@something" text
- Descriptions: "unique architecture", "disturbing residents", "best to avoid" (these describe places but are NOT place names)
- Sentiment words: "yes", "no", "maybe"
- Instructions: "tap here", "click", "swipe"

**ONLY EXTRACT IF:**
1. It's a proper noun naming a SPECIFIC place
2. You can either SEE it in a photo OR it would appear on Google Maps
3. Not a UI element, category header, or description

Return JSON:
{
  "validated_locations": [
    {
      "name": "Exact place name",
      "visually_confirmed": true/false,
      "reasoning": "why this is a location",
      "confidence": "high/medium/low"
    }
  ],
  "filtered_out": [
    {
      "text": "rejected text",
      "reason": "why filtered (e.g., category header, description)"
    }
  ]
}`;

    const contextPrompt = `${destination ? `Destination context: ${destination}` : ''}

Respond with valid JSON only, no markdown.`;

    // Prepare image data
    const imageData = image.startsWith('data:')
      ? image.split(',')[1]
      : image;

    const mimeType = image.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';

    // Call Gemini with multimodal filtering
    console.log('Step 1: Visual validation + OCR filtering...');
    const step1Response = await fetch(getGeminiUrl(GOOGLE_API_KEY), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: step1Prompt + '\n\n' + contextPrompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: imageData
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json'
        }
      }),
    });

    if (!step1Response.ok) {
      if (step1Response.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
      }
      const errorText = await step1Response.text();
      console.error('Google AI error:', step1Response.status, errorText);
      return res.status(500).json({ error: 'Failed to analyze image' });
    }

    const step1Data = await step1Response.json();
    console.log('Step 1 AI response received');

    // Extract response
    const step1ResponseText = step1Data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!step1ResponseText) {
      console.error('Unexpected response format:', JSON.stringify(step1Data));
      return res.status(200).json({
        error: 'Failed to extract places from image',
        places: [],
        status: 'failed',
        processedCount: 0,
        failedCount: 1,
        items: [
          {
            filename: 'upload-image',
            status: 'failed',
            error: 'Failed to extract places from image',
          },
        ],
      });
    }

    // Parse Step 1 results
    let step1Result: { validated_locations?: any[]; filtered_out?: any[] };
    try {
      step1Result = parseGeminiJson(step1ResponseText);
      console.log('Step 1 validated:', step1Result.validated_locations?.length || 0);
      console.log('Step 1 filtered:', step1Result.filtered_out?.length || 0);
      if (step1Result.filtered_out && step1Result.filtered_out.length > 0) {
        console.log('Filtered items:', step1Result.filtered_out.map((item: any) => `"${item.text}" - ${item.reason}`).join(', '));
      }
    } catch (parseError) {
      console.error('Failed to parse Step 1 response:', step1ResponseText);
      return res.status(200).json({
        error: 'Failed to parse AI response',
        places: [],
        status: 'failed',
        processedCount: 0,
        failedCount: 1,
      });
    }

    // STEP 2: Semantic Reasoning & Final Validation
    console.log('Step 2: Applying semantic filters...');
    const validatedLocations = (step1Result.validated_locations || []).filter((loc: any) => {
      const name = loc.name.toLowerCase();
      
      const invalidPatterns = [
        /^(yes|no|maybe)$/i,
        /^@/,
        /^(must go|don't go|don't|avoid|visit)$/i,
        /^(kl travel|travel|itinerary|tips)$/i,
        /^(good|bad|best|worst)$/i,
        /^(unique architecture|intricate details|best to avoid|disturbing|residents)$/i,
        /^(urban village)$/i,
      ];
      
      for (const pattern of invalidPatterns) {
        if (pattern.test(name)) {
          console.log(`Step 2 filtered: "${loc.name}" - pattern ${pattern}`);
          return false;
        }
      }
      
      if (!loc.visually_confirmed && loc.confidence === 'low') {
        console.log(`Step 2 filtered: "${loc.name}" - low confidence without visual`);
        return false;
      }
      
      if (name.length < 2 || /^\d+$/.test(name)) {
        console.log(`Step 2 filtered: "${loc.name}" - too short/numeric`);
        return false;
      }
      
      return true;
    });

    console.log(`Final validated: ${validatedLocations.length}`);

    const places: ExtractedPlace[] = validatedLocations.map((loc: any) => ({
      name: loc.name,
      category: 'attraction',
      description: loc.reasoning || undefined,
      latitude: undefined,
      longitude: undefined,
    }));

    console.log(`Extracted ${places.length} places after multi-step filtering`);

    return res.status(200).json({
      places,
      summary: `Found ${places.length} validated locations`,
      success: true,
      status: 'ready',
      processedCount: 1,
      failedCount: 0,
      items: [
        {
          filename: 'upload-image',
          status: 'processed',
          extractedText: `Found ${places.length} validated locations`,
        },
      ],
    });

  } catch (error) {
    console.error('Error processing image:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
