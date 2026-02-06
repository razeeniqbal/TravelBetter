export type ParsedPlaceSource = 'user' | 'ai';

export interface ParsedPlace {
  name: string;
  source: ParsedPlaceSource;
  displayName?: string | null;
  placeId?: string | null;
  notes?: string;
  timeText?: string;
}

export interface ParsedDayGroup {
  label: string;
  date?: string | null;
  places: ParsedPlace[];
}

export interface ParseItineraryResponse {
  cleanedRequest: string;
  previewText: string;
  destination?: string | null;
  days: ParsedDayGroup[];
  warnings?: string[];
}

export interface ExtractPlacesFromTextRequest {
  text: string;
  destination?: string;
  durationDays?: number;
}

export interface ResolvePlacesRequest {
  destinationContext?: string;
  places: Array<{
    name: string;
    dayLabel?: string;
    hint?: string;
  }>;
}

export interface ResolvedPlaceResult {
  name: string;
  resolved: boolean;
  displayName?: string | null;
  placeId?: string | null;
  formattedAddress?: string | null;
  addressComponents?: {
    city?: string | null;
    region?: string | null;
    country?: string | null;
  };
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  bestGuess?: boolean;
  confidence?: 'high' | 'medium' | 'low';
  source?: string;
}

export interface ResolvePlacesResponse {
  places: ResolvedPlaceResult[];
}
