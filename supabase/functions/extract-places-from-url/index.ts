import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedPlace {
  name: string;
  nameLocal?: string;
  category: string;
  description?: string;
  tips?: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, destination } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    // Call Lovable AI Gateway to analyze the URL content
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `You are a travel assistant that extracts place names and travel information from URLs.

When given a URL to a travel-related content (YouTube videos, Instagram posts, blog articles, etc.), analyze the URL and extract:
1. Place names mentioned (restaurants, attractions, hotels, shops, temples, etc.)
2. Local names if available
3. Category for each place (food, culture, nature, shop, night, photo, accommodation, transport)
4. Brief description based on context
5. Any tips or recommendations

For social media URLs, infer what places might be featured based on the URL structure and common patterns.
For YouTube, try to identify the destination and common attractions.

Return your findings using the extract_places function.`
          },
          {
            role: 'user',
            content: `Analyze this ${sourceType} URL and extract travel places and recommendations: ${url}

${destination ? `The user is planning a trip to ${destination}.` : ''}

Based on the URL structure and platform, identify likely places, attractions, restaurants, or experiences that would be featured in this content. Focus on specific, named locations that a traveler could visit.

If this is a travel vlog or guide about a specific city, include the most popular attractions and hidden gems typically covered in such content.`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_places',
              description: 'Extract and return a list of places from the analyzed URL',
              parameters: {
                type: 'object',
                properties: {
                  places: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { 
                          type: 'string', 
                          description: 'Name of the place in English' 
                        },
                        nameLocal: { 
                          type: 'string', 
                          description: 'Name in local language/script if known' 
                        },
                        category: { 
                          type: 'string', 
                          enum: ['food', 'culture', 'nature', 'shop', 'night', 'photo', 'accommodation', 'transport'],
                          description: 'Category of the place' 
                        },
                        description: { 
                          type: 'string', 
                          description: 'Brief description of the place' 
                        },
                        tips: { 
                          type: 'array', 
                          items: { type: 'string' },
                          description: 'Any tips or recommendations for visiting' 
                        }
                      },
                      required: ['name', 'category'],
                      additionalProperties: false
                    }
                  },
                  summary: {
                    type: 'string',
                    description: 'Brief summary of what was found in the URL content'
                  },
                  sourceType: {
                    type: 'string',
                    description: 'Type of content source identified'
                  }
                },
                required: ['places'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_places' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to analyze URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('AI response received');

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'extract_places') {
      console.error('Unexpected response format:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: 'Failed to extract places from URL', places: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    const places: ExtractedPlace[] = result.places || [];
    
    console.log(`Extracted ${places.length} places from URL`);

    return new Response(
      JSON.stringify({ 
        places,
        summary: result.summary || `Found ${places.length} places from ${sourceType}`,
        sourceType: result.sourceType || sourceType,
        success: true 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing URL:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
