// API helper for calling Vercel serverless functions

const API_BASE = '/api';

interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

async function fetchApi<T>(endpoint: string, body: Record<string, unknown>): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

export interface ExtractedPlace {
  name: string;
  nameLocal?: string;
  category: string;
  description?: string;
  tips?: string[];
}

export interface ExtractPlacesFromUrlResponse {
  places: ExtractedPlace[];
  summary: string;
  sourceType: string;
  success: boolean;
}

export interface ExtractPlacesFromImageResponse {
  places: ExtractedPlace[];
  summary: string;
  success: boolean;
}

export interface AISuggestion {
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

export interface GenerateAISuggestionsResponse {
  suggestions: AISuggestion[];
  promptInterpretation: string;
  success: boolean;
}

export const api = {
  extractPlacesFromUrl: (url: string, destination?: string) =>
    fetchApi<ExtractPlacesFromUrlResponse>('extract-places-from-url', { url, destination }),

  extractPlacesFromImage: (image: string, destination?: string) =>
    fetchApi<ExtractPlacesFromImageResponse>('extract-places-from-image', { image, destination }),

  generateAISuggestions: (params: {
    destination: string;
    userPrompt: string;
    quickSelections: Record<string, unknown>;
    importedPlaces: string[];
    duration: number;
    existingPlaces: { name: string }[];
    preferences: Record<string, unknown>;
    travelStyle: string[];
  }) => fetchApi<GenerateAISuggestionsResponse>('generate-ai-suggestions', params),
};
