import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { useTripEdit } from './useTripEdit';
import type { DayItinerary } from '@/types/trip';

const initialItinerary: DayItinerary[] = [
  {
    day: 1,
    places: [
      { id: 'p1', name: 'A', category: 'culture', source: 'user' },
      { id: 'p2', name: 'B', category: 'food', source: 'ai' },
    ],
  },
  {
    day: 2,
    places: [
      { id: 'p3', name: 'C', category: 'nature', source: 'user' },
    ],
  },
];

function createWrapper() {
  const queryClient = new QueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('useTripEdit', () => {
  it('reorders places within the same day', () => {
    const { result } = renderHook(
      () => useTripEdit({ tripId: 'trip-1', initialItinerary, isOwner: true }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.toggleEditMode();
      result.current.reorderPlaces(0, 0, 1);
    });

    expect(result.current.itinerary[0].places.map(place => place.id)).toEqual(['p2', 'p1']);
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('moves places across days', () => {
    const { result } = renderHook(
      () => useTripEdit({ tripId: 'trip-1', initialItinerary, isOwner: true }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.toggleEditMode();
      result.current.movePlaceBetweenDays(0, 1, 1, 1);
    });

    expect(result.current.itinerary[0].places.map(place => place.id)).toEqual(['p1']);
    expect(result.current.itinerary[1].places.map(place => place.id)).toEqual(['p3', 'p2']);
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('discards edits and resets anchor state', () => {
    const { result } = renderHook(
      () => useTripEdit({ tripId: 'trip-1', initialItinerary, isOwner: true }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.toggleEditMode();
      result.current.setAsAnchor('p2');
      result.current.reorderPlaces(0, 0, 1);
      result.current.discardChanges();
    });

    expect(result.current.isEditMode).toBe(false);
    expect(result.current.anchorPlaceId).toBeNull();
    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.itinerary[0].places.map(place => place.id)).toEqual(['p1', 'p2']);
    expect(result.current.itinerary[1].places.map(place => place.id)).toEqual(['p3']);
  });
});
