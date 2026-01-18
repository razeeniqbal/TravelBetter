import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      destination,
      existingPlaces = [],
      preferences = {},
      travelStyle = [],
      dayNumber = 1,
      duration = 3
    } = await req.json();
    
    if (!destination) {
      return new Response(
        JSON.stringify({ error: 'Destination is required' }),
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

    console.log('Generating AI suggestions for:', destination);

    // Build context from existing places
    const existingPlaceNames = existingPlaces.map((p: { name: string }) => p.name).join(', ');
    const styleContext = travelStyle.length > 0 ? `Travel style: ${travelStyle.join(', ')}.` : '';
    const prefContext = Object.keys(preferences).length > 0 
      ? `Preferences: ${JSON.stringify(preferences)}.` 
      : '';

    // Call Lovable AI Gateway
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
            content: `You are an expert travel planner that suggests personalized places to visit.

Your suggestions should:
1. Complement the user's existing itinerary without duplicating places
2. Consider the travel style and preferences
3. Include a mix of popular and hidden gem spots
4. Be logistically practical (nearby to existing places when possible)
5. Include local favorites and authentic experiences

For each suggestion, provide:
- A confidence score (0-100) based on how well it matches preferences
- A clear reason why this place is suggested

Categories: food, culture, nature, shop, night, photo, accommodation, transport`
          },
          {
            role: 'user',
            content: `Suggest 5 places to visit in ${destination} for Day ${dayNumber} of a ${duration}-day trip.

${existingPlaceNames ? `Already planned: ${existingPlaceNames}` : 'No places planned yet.'}
${styleContext}
${prefContext}

Suggest places that would complement the existing itinerary. Include a mix of must-see attractions and local favorites. For each place, explain why it's a good fit.`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'suggest_places',
              description: 'Suggest personalized places based on the trip context',
              parameters: {
                type: 'object',
                properties: {
                  suggestions: {
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
                          description: 'Name in local language/script' 
                        },
                        category: { 
                          type: 'string', 
                          enum: ['food', 'culture', 'nature', 'shop', 'night', 'photo', 'accommodation', 'transport'],
                          description: 'Category of the place' 
                        },
                        description: { 
                          type: 'string', 
                          description: 'Engaging description of the place' 
                        },
                        duration: { 
                          type: 'number', 
                          description: 'Recommended visit duration in minutes' 
                        },
                        cost: { 
                          type: 'string', 
                          description: 'Approximate cost (e.g., "¥500", "Free")' 
                        },
                        tips: { 
                          type: 'array', 
                          items: { type: 'string' },
                          description: 'Insider tips for visiting' 
                        },
                        confidence: { 
                          type: 'number', 
                          description: 'Confidence score 0-100 based on match to preferences' 
                        },
                        reason: { 
                          type: 'string', 
                          description: 'Why this place is suggested' 
                        }
                      },
                      required: ['name', 'category', 'description', 'confidence', 'reason'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['suggestions'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'suggest_places' } }
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
        JSON.stringify({ error: 'Failed to generate suggestions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('AI response received');

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'suggest_places') {
      console.error('Unexpected response format:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: 'Failed to generate suggestions', suggestions: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    const suggestions: SuggestedPlace[] = result.suggestions || [];
    
    // Sort by confidence
    suggestions.sort((a, b) => b.confidence - a.confidence);
    
    console.log(`Generated ${suggestions.length} suggestions`);

    return new Response(
      JSON.stringify({ 
        suggestions,
        success: true 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating suggestions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
