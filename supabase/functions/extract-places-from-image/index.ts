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
    const { image, destination } = await req.json();
    
    if (!image) {
      return new Response(
        JSON.stringify({ error: 'Image data is required' }),
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

    console.log('Extracting places from image for destination:', destination);

    // Call Lovable AI Gateway with vision capabilities
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
            content: `You are a travel assistant that extracts place names and travel information from images.
            
When analyzing travel-related images (screenshots of itineraries, maps, social media posts, etc.), extract:
1. Place names (restaurants, attractions, hotels, shops, temples, etc.)
2. Local names if visible (in original script)
3. Category (food, culture, nature, shop, night, photo, accommodation, transport)
4. Brief description if context is available
5. Any tips or recommendations mentioned

Return your findings using the extract_places function.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract all places and travel recommendations from this image.${destination ? ` The destination is ${destination}.` : ''} Focus on identifying specific named locations, restaurants, attractions, and any travel tips visible.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_places',
              description: 'Extract and return a list of places from the analyzed image',
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
                          description: 'Name in local language/script if visible' 
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
                    description: 'Brief summary of what was found in the image'
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
        JSON.stringify({ error: 'Failed to analyze image' }),
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
        JSON.stringify({ error: 'Failed to extract places from image', places: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    const places: ExtractedPlace[] = result.places || [];
    
    console.log(`Extracted ${places.length} places from image`);

    return new Response(
      JSON.stringify({ 
        places,
        summary: result.summary || `Found ${places.length} places`,
        success: true 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing image:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
