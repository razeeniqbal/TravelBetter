import { api } from '@/lib/api';

export interface ResolvablePlaceInput {
  name: string;
  coordinates?: { lat: number; lng: number };
  dayIndex?: number;
  dayLabel?: string;
}

export async function resolvePlacesForTrip<T extends ResolvablePlaceInput>(
  places: T[],
  destinationContext?: string
): Promise<T[]> {
  const unresolved = places.filter(place => !place.coordinates);
  if (unresolved.length === 0) return places;

  const { data, error } = await api.resolvePlaces({
    destinationContext,
    places: unresolved.map(place => ({
      name: place.name,
      dayLabel: place.dayLabel || (place.dayIndex ? `Day ${place.dayIndex}` : undefined),
      hint: destinationContext,
    })),
  });

  if (error || !data?.places) {
    return places;
  }

  const resolvedMap = new Map(
    data.places
      .filter(place => place.resolved && typeof place.lat === 'number' && typeof place.lng === 'number')
      .map(place => [place.name.toLowerCase(), { lat: place.lat as number, lng: place.lng as number }])
  );

  return places.map(place => {
    if (place.coordinates) return place;
    const match = resolvedMap.get(place.name.toLowerCase());
    return match ? { ...place, coordinates: match } : place;
  });
}
