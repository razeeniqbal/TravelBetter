import type { Trip } from '@/types/trip';

export const TRIP_DETAIL_FIXTURE_IDS = {
  tripId: 'trip-1',
  ownerId: 'user-1',
  placeOneId: 'place-1',
  placeTwoId: 'place-2',
} as const;

export function createTripDetailMapSheetFixture(): Trip {
  return {
    id: TRIP_DETAIL_FIXTURE_IDS.tripId,
    title: 'Test Trip',
    destination: 'Hatyai',
    country: 'Thailand',
    coverImage: '',
    duration: 1,
    itinerary: [
      {
        day: 1,
        title: 'Day 1',
        places: [
          {
            id: TRIP_DETAIL_FIXTURE_IDS.placeOneId,
            name: 'Raw Place Name',
            displayName: 'Canonical Place Name',
            placeId: 'place-1-id',
            category: 'culture',
            source: 'user',
            stayDurationMinutes: 60,
            coordinates: { lat: 1.23, lng: 4.56 },
          },
          {
            id: TRIP_DETAIL_FIXTURE_IDS.placeTwoId,
            name: 'Second Stop',
            displayName: 'Second Stop Canonical',
            placeId: 'place-2-id',
            category: 'food',
            source: 'ai',
            stayDurationMinutes: 90,
            commuteDurationMinutes: 15,
            commuteDistanceMeters: 1200,
            coordinates: { lat: 1.25, lng: 4.58 },
          },
        ],
      },
    ],
    author: {
      id: TRIP_DETAIL_FIXTURE_IDS.ownerId,
      name: 'Test User',
      username: 'test',
    },
    tags: [],
    remixCount: 0,
    viewCount: 0,
    createdAt: '2026-02-07T00:00:00.000Z',
  };
}
