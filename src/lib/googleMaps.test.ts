import { describe, expect, it } from 'vitest';
import { getGoogleMapsReviewUrl, getGoogleMapsRouteUrl } from './googleMaps';

describe('getGoogleMapsReviewUrl', () => {
  it('builds a reviews URL when placeId is available', () => {
    const url = getGoogleMapsReviewUrl({ placeId: 'place-123' });
    // Updated to use the search API format which properly opens locations instead of showing place_ID text
    expect(url).toBe('https://www.google.com/maps/search/?api=1&query=place-123&query_place_id=place-123');
  });

  it('falls back to a Maps search query when placeId is missing', () => {
    const url = getGoogleMapsReviewUrl({ displayName: 'Neo Grand Hatyai' });
    expect(url).toBe('https://www.google.com/maps/search/?api=1&query=Neo%20Grand%20Hatyai');
  });

  it('uses the name when displayName is missing', () => {
    const url = getGoogleMapsReviewUrl({ name: 'Krua Pa Yad' });
    expect(url).toBe('https://www.google.com/maps/search/?api=1&query=Krua%20Pa%20Yad');
  });

  it('returns a generic Maps URL when no labels exist', () => {
    const url = getGoogleMapsReviewUrl({});
    expect(url).toBe('https://www.google.com/maps');
  });
});

describe('getGoogleMapsRouteUrl', () => {
  it('uses directions place_id parameters instead of raw place_id labels', () => {
    const { url } = getGoogleMapsRouteUrl([
      { label: 'Kuala Lumpur City Centre', placeId: 'ChIJ14gJ49NJzDERmsAj2n9LSkY' },
      { label: 'The Exchange TRX', placeId: 'ChIJP3e35y82zDERtMlTjdDsXTg' },
    ]);

    const parsed = new URL(url);
    expect(parsed.searchParams.get('origin')).toBe('Kuala Lumpur City Centre');
    expect(parsed.searchParams.get('origin_place_id')).toBe('ChIJ14gJ49NJzDERmsAj2n9LSkY');
    expect(parsed.searchParams.get('destination')).toBe('The Exchange TRX');
    expect(parsed.searchParams.get('destination_place_id')).toBe('ChIJP3e35y82zDERtMlTjdDsXTg');
    expect(parsed.search).not.toContain('place_id%3A');
  });
});
