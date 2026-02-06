type GooglePlaceCandidate = {
  placeId?: string | null;
  displayName?: string | null;
  name?: string | null;
};

export function getGoogleMapsReviewUrl(place: GooglePlaceCandidate): string {
  if (place.placeId) {
    return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(place.placeId)}`;
  }

  const query = (place.displayName || place.name || '').trim();
  if (!query) {
    return 'https://www.google.com/maps';
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
