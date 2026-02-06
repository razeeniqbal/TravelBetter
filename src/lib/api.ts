// API helper for calling Vercel serverless functions

import type {
  ParsedDayGroup,
  ParseItineraryResponse,
  ResolvePlacesRequest,
  ResolvePlacesResponse,
} from '@/types/itinerary';

const API_BASE = '/api';

interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

// Simple in-memory cache for AI suggestions to reduce API calls
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const aiSuggestionsCache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes cache TTL

function getCacheKey(endpoint: string, body: Record<string, unknown>): string {
  // Create a stable cache key from the request parameters
  const keyData = {
    endpoint,
    destination: body.destination,
    userPrompt: body.userPrompt,
    cleanedRequest: body.cleanedRequest,
    quickSelections: body.quickSelections,
    duration: body.duration,
    dayGroups: body.dayGroups,
  };
  return JSON.stringify(keyData);
}

function getFromCache<T>(key: string): T | null {
  const entry = aiSuggestionsCache.get(key);
  if (!entry) return null;

  // Check if cache entry has expired
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    aiSuggestionsCache.delete(key);
    return null;
  }

  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  // Limit cache size to prevent memory issues
  if (aiSuggestionsCache.size > 50) {
    // Remove oldest entries
    const sortedEntries = [...aiSuggestionsCache.entries()]
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < 10; i++) {
      aiSuggestionsCache.delete(sortedEntries[i][0]);
    }
  }

  aiSuggestionsCache.set(key, { data, timestamp: Date.now() });
}

// Export for clearing cache when needed (e.g., user signs out)
export function clearApiCache(): void {
  aiSuggestionsCache.clear();
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

// Cached version of fetchApi for AI suggestions
async function fetchApiWithCache<T>(endpoint: string, body: Record<string, unknown>): Promise<ApiResponse<T>> {
  const cacheKey = getCacheKey(endpoint, body);

  // Check cache first
  const cachedData = getFromCache<T>(cacheKey);
  if (cachedData) {
    console.log('Returning cached AI suggestions');
    return { data: cachedData, error: null };
  }

  // Fetch from API
  const result = await fetchApi<T>(endpoint, body);

  // Cache successful responses
  if (result.data && !result.error) {
    setCache(cacheKey, result.data);
  }

  return result;
}

export interface ExtractedPlace {
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

export interface ExtractPlacesFromTextResponse {
  places: ExtractedPlace[];
  summary: string;
  destination?: string;
  cleanedRequest?: string;
  previewText?: string;
  days?: ParsedDayGroup[];
  warnings?: string[];
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
  latitude?: number;
  longitude?: number;
}

export interface GenerateAISuggestionsResponse {
  suggestions: AISuggestion[];
  resolvedDestination?: string; // The actual destination identified by AI
  success: boolean;
}

export interface GeocodePlaceResponse {
  coordinates: { lat: number; lng: number } | null;
  success: boolean;
}

export interface ParseItineraryTextResponse extends ParseItineraryResponse {
  success: boolean;
}

export interface ItineraryRecommendationsResponse {
  suggestions: AISuggestion[];
  resolvedDestination?: string;
  success: boolean;
}

export const api = {
  extractPlacesFromUrl: (url: string, destination?: string) =>
    fetchApi<ExtractPlacesFromUrlResponse>('extract-places-from-url', { url, destination }),

  extractPlacesFromImage: (image: string, destination?: string) =>
    fetchApi<ExtractPlacesFromImageResponse>('extract-places-from-image', { image, destination }),

  extractPlacesFromText: (text: string, destination?: string, durationDays?: number) =>
    fetchApi<ExtractPlacesFromTextResponse>('extract-places-from-text', {
      text,
      destination,
      duration_days: durationDays,
    }),

  parseItineraryText: (rawText: string, destinationHint?: string) =>
    fetchApi<ParseItineraryTextResponse>('parse-itinerary-text', { raw_text: rawText, destination_hint: destinationHint }),

  itineraryRecommendations: (params: {
    cleanedRequest: string;
    destination?: string;
    durationDays?: number;
    days: ParsedDayGroup[];
  }) => fetchApiWithCache<ItineraryRecommendationsResponse>('itinerary-recommendations', {
    cleaned_request: params.cleanedRequest,
    destination: params.destination,
    duration_days: params.durationDays,
    days: params.days,
  }),

  geocodePlace: (query: string, destination?: string) =>
    fetchApi<GeocodePlaceResponse>('geocode-place', { query, destination }),

  resolvePlaces: (request: ResolvePlacesRequest) =>
    fetchApi<ResolvePlacesResponse>('resolve-places', request as unknown as Record<string, unknown>),

  // Uses caching to reduce duplicate API calls for the same destination/prompt
  generateAISuggestions: (params: {
    destination: string;
    userPrompt: string;
    quickSelections: Record<string, unknown>;
    importedPlaces: string[];
    duration: number;
    existingPlaces: { name: string }[];
    preferences: Record<string, unknown>;
    travelStyle: string[];
    cleanedRequest?: string;
    dayGroups?: ParsedDayGroup[];
  }) => fetchApiWithCache<GenerateAISuggestionsResponse>('generate-ai-suggestions', params),
};
