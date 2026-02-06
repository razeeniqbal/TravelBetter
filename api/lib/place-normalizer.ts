export interface NormalizedAddressComponents {
  city?: string | null;
  region?: string | null;
  country?: string | null;
}

export interface NormalizedPlaceResult {
  name: string;
  resolved: boolean;
  displayName?: string | null;
  placeId?: string | null;
  formattedAddress?: string | null;
  address?: string | null;
  addressComponents?: NormalizedAddressComponents;
  lat?: number | null;
  lng?: number | null;
  source?: 'places' | 'geocoding' | 'nominatim';
  bestGuess?: boolean;
  confidence?: 'high' | 'medium' | 'low';
}

function normalizeText(value: string) {
  return value.toLowerCase().trim();
}

function matchesDestination(
  result: Record<string, unknown>,
  destination: string,
  mode: 'all' | 'any' = 'all'
) {
  const destinationParts = destination
    .split(',')
    .map(part => normalizeText(part))
    .filter(Boolean);
  if (destinationParts.length === 0) return true;

  const haystacks: string[] = [];
  const displayName = typeof result.display_name === 'string'
    ? normalizeText(result.display_name)
    : '';
  if (displayName) haystacks.push(displayName);

  const name = typeof result.name === 'string'
    ? normalizeText(result.name)
    : '';
  if (name) haystacks.push(name);

  const formattedAddress = typeof result.formatted_address === 'string'
    ? normalizeText(result.formatted_address)
    : '';
  if (formattedAddress) haystacks.push(formattedAddress);

  const address = result.address && typeof result.address === 'object'
    ? Object.values(result.address as Record<string, unknown>)
        .filter((value): value is string => typeof value === 'string')
        .map(value => normalizeText(value))
    : [];
  haystacks.push(...address);

  const addressComponents = Array.isArray(result.address_components)
    ? result.address_components
    : [];
  for (const component of addressComponents) {
    if (!component || typeof component !== 'object') continue;
    const record = component as Record<string, unknown>;
    const longName = typeof record.long_name === 'string'
      ? normalizeText(record.long_name)
      : '';
    const shortName = typeof record.short_name === 'string'
      ? normalizeText(record.short_name)
      : '';
    if (longName) haystacks.push(longName);
    if (shortName) haystacks.push(shortName);
  }

  if (mode === 'any') {
    return destinationParts.some(part => haystacks.some(value => value.includes(part)));
  }

  return destinationParts.every(part => haystacks.some(value => value.includes(part)));
}

function extractGoogleComponents(components?: unknown[]): NormalizedAddressComponents | undefined {
  if (!Array.isArray(components)) return undefined;

  let city: string | null = null;
  let region: string | null = null;
  let country: string | null = null;

  for (const component of components) {
    if (!component || typeof component !== 'object') continue;
    const record = component as Record<string, unknown>;
    const types = Array.isArray(record.types) ? record.types : [];
    const longName = typeof record.long_name === 'string' ? record.long_name : null;
    if (!longName) continue;

    if (types.includes('locality') || types.includes('postal_town')) {
      city = longName;
    }
    if (types.includes('administrative_area_level_1')) {
      region = longName;
    }
    if (types.includes('country')) {
      country = longName;
    }
  }

  if (!city && !region && !country) return undefined;
  return { city, region, country };
}

function extractNominatimComponents(address?: Record<string, unknown>): NormalizedAddressComponents | undefined {
  if (!address) return undefined;
  const city = typeof address.city === 'string'
    ? address.city
    : typeof address.town === 'string'
      ? address.town
      : typeof address.village === 'string'
        ? address.village
        : null;
  const region = typeof address.state === 'string' ? address.state : null;
  const country = typeof address.country === 'string' ? address.country : null;

  if (!city && !region && !country) return undefined;
  return { city, region, country };
}

async function resolveWithPlaces(query: string, destination?: string): Promise<NormalizedPlaceResult | null> {
  const placesApiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY;
  if (!placesApiKey) return null;

  const searchQuery = destination ? `${query}, ${destination}` : query;
  const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${placesApiKey}&language=en`;
  const searchResponse = await fetch(searchUrl);
  if (!searchResponse.ok) return null;
  const searchData = await searchResponse.json();
  const results = Array.isArray(searchData?.results) ? searchData.results : [];
  const match = destination
    ? results.find(result => matchesDestination(result as Record<string, unknown>, destination, 'all'))
      || results.find(result => matchesDestination(result as Record<string, unknown>, destination, 'any'))
    : results[0];

  if (!match) return null;

  const placeId = typeof match.place_id === 'string' ? match.place_id : null;
  let detailsResult: Record<string, unknown> | null = null;

  if (placeId) {
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=address_component,formatted_address,name,geometry&key=${placesApiKey}&language=en`;
    const detailsResponse = await fetch(detailsUrl);
    if (detailsResponse.ok) {
      const detailsData = await detailsResponse.json();
      if (detailsData?.result && typeof detailsData.result === 'object') {
        detailsResult = detailsData.result as Record<string, unknown>;
      }
    }
  }

  const geometry = (detailsResult?.geometry ?? match.geometry) as Record<string, unknown> | undefined;
  const coords = geometry?.location as Record<string, unknown> | undefined;
  const lat = typeof coords?.lat === 'number' ? coords.lat : null;
  const lng = typeof coords?.lng === 'number' ? coords.lng : null;
  const displayName = typeof detailsResult?.name === 'string'
    ? detailsResult.name
    : typeof match.name === 'string'
      ? match.name
      : query;
  const formattedAddress = typeof detailsResult?.formatted_address === 'string'
    ? detailsResult.formatted_address
    : typeof match.formatted_address === 'string'
      ? match.formatted_address
      : null;
  const addressComponents = extractGoogleComponents(
    Array.isArray(detailsResult?.address_components)
      ? detailsResult?.address_components
      : Array.isArray(match.address_components)
        ? match.address_components
        : undefined
  );

  return {
    name: query,
    resolved: Boolean(lat && lng),
    displayName,
    placeId,
    formattedAddress,
    address: formattedAddress,
    addressComponents,
    lat,
    lng,
    source: 'places',
    bestGuess: !destination,
    confidence: destination ? 'high' : 'medium',
  };
}

async function resolveWithGeocoding(query: string, destination?: string): Promise<NormalizedPlaceResult | null> {
  const searchQuery = destination ? `${query}, ${destination}` : query;
  const googleApiKey = process.env.GOOGLE_GEOCODING_API_KEY || process.env.GOOGLE_API_KEY;

  if (googleApiKey) {
    const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${googleApiKey}&language=en`;
    const googleResponse = await fetch(googleUrl);
    if (googleResponse.ok) {
      const googleData = await googleResponse.json();
      const googleResults = Array.isArray(googleData?.results)
        ? googleData.results
        : [];
      const googleMatch = destination
        ? googleResults.find(result => matchesDestination(result as Record<string, unknown>, destination, 'all'))
          || googleResults.find(result => matchesDestination(result as Record<string, unknown>, destination, 'any'))
        : googleResults[0];
      const geometry = googleMatch && typeof googleMatch === 'object'
        ? (googleMatch as Record<string, unknown>)?.geometry
        : null;
      const coords = geometry && typeof geometry === 'object'
        ? (geometry as Record<string, unknown>)?.location
        : null;
      const lat = coords && typeof coords === 'object'
        ? (coords as Record<string, unknown>)?.lat
        : null;
      const lng = coords && typeof coords === 'object'
        ? (coords as Record<string, unknown>)?.lng
        : null;

      if (typeof lat === 'number' && typeof lng === 'number') {
        const formattedAddress = typeof googleMatch?.formatted_address === 'string'
          ? googleMatch.formatted_address
          : null;
        const addressComponents = extractGoogleComponents(
          Array.isArray(googleMatch?.address_components)
            ? googleMatch.address_components
            : undefined
        );

        return {
          name: query,
          resolved: true,
          displayName: formattedAddress || query,
          formattedAddress,
          address: formattedAddress,
          addressComponents,
          lat,
          lng,
          source: 'geocoding',
          bestGuess: !destination,
          confidence: destination ? 'high' : 'medium',
        };
      }
    }
  }

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(searchQuery)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'TravelBetterAI/1.0',
      'Accept-Language': 'en',
    },
  });
  if (!response.ok) {
    return null;
  }

  const results = await response.json();
  const list = Array.isArray(results) ? results : [];
  const matched = destination
    ? list.find(result => matchesDestination(result as Record<string, unknown>, destination, 'all'))
      || list.find(result => matchesDestination(result as Record<string, unknown>, destination, 'any'))
      || list[0]
    : list[0];

  if (matched?.lat && matched?.lon) {
    return {
      name: query,
      resolved: true,
      displayName: typeof matched.display_name === 'string' ? matched.display_name : query,
      formattedAddress: typeof matched.display_name === 'string' ? matched.display_name : null,
      address: typeof matched.display_name === 'string' ? matched.display_name : null,
      addressComponents: extractNominatimComponents(
        matched.address && typeof matched.address === 'object'
          ? (matched.address as Record<string, unknown>)
          : undefined
      ),
      lat: Number(matched.lat),
      lng: Number(matched.lon),
      source: 'nominatim',
      bestGuess: true,
      confidence: 'low',
    };
  }

  return null;
}

export async function resolvePlaceCandidate(query: string, destination?: string): Promise<NormalizedPlaceResult> {
  const placesResult = await resolveWithPlaces(query, destination);
  if (placesResult) return placesResult;

  const geocodeResult = await resolveWithGeocoding(query, destination);
  if (geocodeResult) return geocodeResult;

  return { name: query, resolved: false };
}
