export type GooglePlaceCandidate = {
  placeId?: string | null;
  displayName?: string | null;
  name?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type GoogleRouteStop = {
  label: string;
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type GoogleTravelMode = 'walk' | 'drive' | 'transit' | 'bike';

export type RouteLinkResult = {
  url: string;
  segmented: boolean;
  segments: string[];
};

const MAX_WAYPOINTS = 8;

function normalizeStopQuery(stop: GoogleRouteStop): string {
  if (stop.placeId) return `place_id:${stop.placeId}`;
  if (typeof stop.lat === 'number' && typeof stop.lng === 'number') {
    return `${stop.lat},${stop.lng}`;
  }
  return stop.label;
}

export function getGoogleMapsPlaceUrl(place: GooglePlaceCandidate): string {
  if (place.placeId) {
    const query = (place.displayName || place.name || place.placeId || '').trim();
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}&query_place_id=${encodeURIComponent(place.placeId)}`;
  }

  if (typeof place.lat === 'number' && typeof place.lng === 'number') {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.lat},${place.lng}`)}`;
  }

  const query = (place.displayName || place.name || '').trim();
  if (!query) return 'https://www.google.com/maps';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function getGoogleMapsReviewUrl(place: GooglePlaceCandidate): string {
  // Use the same URL format as getGoogleMapsPlaceUrl to avoid displaying place_ID text
  // This ensures the location opens correctly instead of showing the raw place ID
  return getGoogleMapsPlaceUrl(place);
}

function buildDirectionsSegment(stops: GoogleRouteStop[], mode: GoogleTravelMode): string {
  const origin = normalizeStopQuery(stops[0]);
  const destination = normalizeStopQuery(stops[stops.length - 1]);
  const waypoints = stops.slice(1, -1).map(normalizeStopQuery);

  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('origin', origin);
  url.searchParams.set('destination', destination);
  url.searchParams.set('travelmode', mode);
  if (waypoints.length > 0) {
    url.searchParams.set('waypoints', waypoints.join('|'));
  }
  return url.toString();
}

export function getGoogleMapsRouteUrl(
  stops: GoogleRouteStop[],
  mode: GoogleTravelMode = 'walk'
): RouteLinkResult {
  if (stops.length < 2) {
    return {
      url: 'https://www.google.com/maps',
      segmented: false,
      segments: [],
    };
  }

  if (stops.length <= MAX_WAYPOINTS + 2) {
    const url = buildDirectionsSegment(stops, mode);
    return { url, segmented: false, segments: [] };
  }

  const segments: string[] = [];
  for (let i = 0; i < stops.length - 1; i += MAX_WAYPOINTS + 1) {
    const chunk = stops.slice(i, i + MAX_WAYPOINTS + 2);
    if (chunk.length >= 2) {
      segments.push(buildDirectionsSegment(chunk, mode));
    }
  }

  return {
    url: segments[0] || buildDirectionsSegment(stops.slice(0, 2), mode),
    segmented: true,
    segments,
  };
}
