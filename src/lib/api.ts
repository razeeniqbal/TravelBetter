// API helper for calling Vercel serverless functions

import type {
  ItineraryDraftSaveRequest,
  ItineraryDraftSaveResponse,
  MapLinkResponse,
  ParseItineraryResponse,
  ParsedDayGroup,
  PlacementCommitRequest,
  PlacementCommitResponse,
  PlacementPreviewRequest,
  PlacementPreviewResponse,
  PlaceReviewsResponse,
  ResolvePlacesRequest,
  ResolvePlacesResponse,
  RouteLinkRequest,
  RouteLinkResponse,
  ScreenshotExtractRequest,
  ScreenshotExtractResponse,
  ScreenshotSubmitRequest,
  ScreenshotSubmitResponse,
  StopTimingUpdateRequest,
  StopTimingUpdateResponse,
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

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type QueryParams = Record<string, string | number | boolean | null | undefined>;

interface FetchApiOptions {
  method?: HttpMethod;
  body?: Record<string, unknown>;
  query?: QueryParams;
}

function isFetchOptions(value: unknown): value is FetchApiOptions {
  return Boolean(
    value
    && typeof value === 'object'
    && ('method' in (value as Record<string, unknown>)
      || 'query' in (value as Record<string, unknown>)
      || 'body' in (value as Record<string, unknown>))
  );
}

function buildApiUrl(endpoint: string, query?: QueryParams): string {
  const base = `${API_BASE}/${endpoint}`;
  if (!query) return base;

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    params.append(key, String(value));
  });

  const queryString = params.toString();
  return queryString ? `${base}?${queryString}` : base;
}

async function fetchApi<T>(
  endpoint: string,
  bodyOrOptions: Record<string, unknown> | FetchApiOptions = {}
): Promise<ApiResponse<T>> {
  const options = isFetchOptions(bodyOrOptions)
    ? bodyOrOptions
    : { method: 'POST' as const, body: bodyOrOptions };

  const method = options.method ?? 'POST';
  const url = buildApiUrl(endpoint, options.query);
  const hasBody = options.body && method !== 'GET';

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: hasBody ? JSON.stringify(options.body) : undefined,
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
  const result = await fetchApi<T>(endpoint, { method: 'POST', body });

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

  saveItineraryDraft: (tripId: string, request: ItineraryDraftSaveRequest) =>
    fetchApi<ItineraryDraftSaveResponse>('itinerary-draft', {
      method: 'PUT',
      body: {
        tripId,
        ...request,
      },
    }),

  previewSuggestionPlacement: (tripId: string, request: PlacementPreviewRequest) =>
    fetchApi<PlacementPreviewResponse>('suggestion-placement-preview', {
      method: 'POST',
      body: {
        tripId,
        ...request,
      },
    }),

  commitSuggestionPlacement: (tripId: string, request: PlacementCommitRequest) =>
    fetchApi<PlacementCommitResponse>('suggestion-placement-commit', {
      method: 'POST',
      body: {
        tripId,
        ...request,
      },
    }),

  updateStopTiming: (tripId: string, stopId: string, request: StopTimingUpdateRequest) =>
    fetchApi<StopTimingUpdateResponse>('stop-timing', {
      method: 'PATCH',
      body: {
        tripId,
        stopId,
        ...request,
      },
    }),

  getPlaceReviews: (placeId: string, limit = 5) =>
    fetchApi<PlaceReviewsResponse>('place-reviews', {
      method: 'GET',
      query: { placeId, limit },
    }),

  getPlaceMapLink: (placeId: string) =>
    fetchApi<MapLinkResponse>('place-map-link', {
      method: 'GET',
      query: { placeId },
    }),

  buildRouteLink: (request: RouteLinkRequest) =>
    fetchApi<RouteLinkResponse>('route-link', {
      method: 'POST',
      body: request as unknown as Record<string, unknown>,
    }),

  extractScreenshots: (request: ScreenshotExtractRequest) =>
    fetchApi<ScreenshotExtractResponse>('screenshot-extract', {
      method: 'POST',
      body: request as unknown as Record<string, unknown>,
    }),

  submitScreenshotText: (request: ScreenshotSubmitRequest) =>
    fetchApi<ScreenshotSubmitResponse>('screenshot-submit', {
      method: 'POST',
      body: request as unknown as Record<string, unknown>,
    }),

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
