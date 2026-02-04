export type ParsedPlaceSource = 'user' | 'ai';

export interface ParsedPlace {
  name: string;
  source: ParsedPlaceSource;
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
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  bestGuess?: boolean;
  confidence?: 'high' | 'medium' | 'low';
}

export interface ResolvePlacesResponse {
  places: ResolvedPlaceResult[];
}
