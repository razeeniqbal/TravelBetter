import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ExtractedPlace {
  name: string;
  nameLocal?: string;
  category: string;
  description?: string;
  tips?: string[];
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
    const { url, destination } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    if (!GOOGLE_API_KEY) {
      console.error('GOOGLE_API_KEY is not configured');
      return res.status(500).json({ error: 'AI service not configured' });
    }

    console.log('Extracting places from URL:', url);

    // Determine the type of URL
    const urlLower = url.toLowerCase();
    const isYouTube = urlLower.includes('youtube.com') || urlLower.includes('youtu.be');
    const isInstagram = urlLower.includes('instagram.com');
    const isTikTok = urlLower.includes('tiktok.com');
    const isRedNote = urlLower.includes('xiaohongshu.com') || urlLower.includes('xhslink.com');

    let sourceType = 'website';
    if (isYouTube) sourceType = 'YouTube video';
    else if (isInstagram) sourceType = 'Instagram post';
    else if (isTikTok) sourceType = 'TikTok video';
    else if (isRedNote) sourceType = 'RedNote/Xiaohongshu post';

    const systemPrompt = `You are a travel assistant that extracts place names and travel information from URLs.

When given a URL to a travel-related content (YouTube videos, Instagram posts, blog articles, etc.), analyze the URL and extract:
1. Place names mentioned (restaurants, attractions, hotels, shops, temples, etc.)
2. Local names if available
3. Category for each place (food, culture, nature, shop, night, photo, accommodation, transport)
4. Brief description based on context
5. Any tips or recommendations

For social media URLs, infer what places might be featured based on the URL structure and common patterns.
For YouTube, try to identify the destination and common attractions.

You MUST respond with a valid JSON object in this exact format:
{
  "places": [
    {
      "name": "Place name in English",
      "nameLocal": "Local name if known",
      "category": "one of: food, culture, nature, shop, night, photo, accommodation, transport",
      "description": "Brief description",
      "tips": ["tip1", "tip2"]
    }
  ],
  "summary": "Brief summary of findings",
  "sourceType": "Type of content"
}`;

    const userPrompt = `Analyze this ${sourceType} URL and extract travel places and recommendations: ${url}

${destination ? `The user is planning a trip to ${destination}.` : ''}

Based on the URL structure and platform, identify likely places, attractions, restaurants, or experiences that would be featured in this content. Focus on specific, named locations that a traveler could visit.

If this is a travel vlog or guide about a specific city, include the most popular attractions and hidden gems typically covered in such content.

Respond ONLY with valid JSON, no markdown or extra text.`;

    // Call Google Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`, {
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
      return res.status(500).json({ error: 'Failed to analyze URL' });
    }

    const data = await response.json();
    console.log('AI response received');

    // Extract the response text from Gemini format
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      console.error('Unexpected response format:', JSON.stringify(data));
      return res.status(200).json({ error: 'Failed to extract places from URL', places: [] });
    }

    // Parse the JSON response
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      return res.status(200).json({ error: 'Failed to parse AI response', places: [] });
    }

    const places: ExtractedPlace[] = result.places || [];

    console.log(`Extracted ${places.length} places from URL`);

    return res.status(200).json({
      places,
      summary: result.summary || `Found ${places.length} places from ${sourceType}`,
      sourceType: result.sourceType || sourceType,
      success: true
    });

  } catch (error) {
    console.error('Error processing URL:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
