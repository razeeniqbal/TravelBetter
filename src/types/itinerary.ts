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

export interface CommuteInfo {
  distanceMeters?: number | null;
  durationMinutes?: number | null;
}

export interface ItineraryStopDraft {
  stopId: string;
  position: number;
  arrivalTime?: string | null;
  stayDurationMinutes: number;
}

export interface ItineraryDayDraft {
  dayNumber: number;
  anchorStopId?: string | null;
  stops: ItineraryStopDraft[];
}

export interface ItineraryDraftSaveRequest {
  editSession: {
    draftId: string;
    baselineHash: string;
  };
  days: ItineraryDayDraft[];
}

export interface ItineraryDraftSaveResponse {
  tripId: string;
  savedAt: string;
  days: ItineraryDayDraft[];
}

export type PlacementMode = 'manual' | 'ai';
export type PlacementConfidence = 'high' | 'medium' | 'low';

export interface SelectedSuggestionInput {
  suggestionId: string;
  displayName: string;
  manualDayNumber?: number | null;
}

export interface PlacementPreviewRequest {
  mode: PlacementMode;
  selectedSuggestions: SelectedSuggestionInput[];
  destinationContext?: string | null;
}

export interface PlacementDecision {
  suggestionId: string;
  displayName: string;
  proposedDayNumber: number;
  confidence: PlacementConfidence;
}

export interface PlacementPreviewResponse {
  mode: PlacementMode;
  placements: PlacementDecision[];
}

export interface PlacementCommitRequest {
  placements: Array<{
    suggestionId: string;
    confirmedDayNumber: number;
  }>;
}

export interface PlacementCommitResponse {
  tripId: string;
  addedCount: number;
  affectedDays?: number[];
}

export interface StopTimingUpdateRequest {
  arrivalTime?: string | null;
  stayDurationMinutes: number;
}

export interface StopTimingUpdateResponse {
  stopId: string;
  arrivalTime?: string | null;
  stayDurationMinutes: number;
  commuteFromPrevious?: CommuteInfo;
}

export interface PlaceReview {
  reviewId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  rating: number;
  text: string;
  createdAt: string;
  relativeTimeText?: string | null;
  source: 'google';
  sourceUrl?: string | null;
}

export interface PlaceReviewsResponse {
  placeId: string;
  totalReturned: number;
  reviews: PlaceReview[];
}

export interface MapLinkResponse {
  url: string;
}

export type RouteTravelMode = 'walk' | 'drive' | 'transit' | 'bike';

export interface RouteStopInput {
  label: string;
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface RouteLinkRequest {
  mode?: RouteTravelMode;
  stops: RouteStopInput[];
}

export interface RouteLinkResponse {
  url: string;
  segmented: boolean;
  segments?: string[];
}

export type ScreenshotMimeType = 'image/jpeg' | 'image/png' | 'image/webp';
export type ScreenshotItemStatus = 'processed' | 'failed';
export type ScreenshotBatchStatus = 'ready' | 'partial' | 'failed';

export interface ScreenshotImageInput {
  filename: string;
  mimeType: ScreenshotMimeType;
  base64Data: string;
}

export interface ScreenshotExtractRequest {
  destination?: string | null;
  images: ScreenshotImageInput[];
}

export interface ScreenshotExtractItem {
  filename: string;
  status: ScreenshotItemStatus;
  extractedText?: string | null;
  error?: string | null;
}

export interface ScreenshotExtractResponse {
  batchId: string;
  status: ScreenshotBatchStatus;
  processedCount: number;
  failedCount: number;
  items: ScreenshotExtractItem[];
  mergedText: string;
  warnings?: string[];
}

export interface ScreenshotSubmitRequest {
  batchId: string;
  text: string;
  destination?: string | null;
  durationDays?: number | null;
}

export interface ScreenshotSubmitResponse {
  cleanedRequest: string;
  previewText: string;
  destination?: string | null;
  days: ParsedDayGroup[];
  warnings?: string[];
  success: boolean;
}
