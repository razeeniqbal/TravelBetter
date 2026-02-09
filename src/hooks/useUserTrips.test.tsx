import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAddPlaceToItinerary } from './useUserTrips';

const toastMock = vi.hoisted(() => vi.fn());
const geocodePlaceCoordinatesMock = vi.hoisted(() => vi.fn());

const itinerarySelectLimitMock = vi.hoisted(() => vi.fn());
const placesMaybeSingleMock = vi.hoisted(() => vi.fn());
const placesInsertSingleMock = vi.hoisted(() => vi.fn());
const itineraryInsertMock = vi.hoisted(() => vi.fn());

const supabaseFromMock = vi.hoisted(() => vi.fn((table: string) => {
  if (table === 'itinerary_places') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: itinerarySelectLimitMock,
          })),
        })),
      })),
      insert: itineraryInsertMock,
    };
  }

  if (table === 'places') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: placesMaybeSingleMock,
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: placesInsertSingleMock,
        })),
      })),
    };
  }

  return {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/lib/geocode', () => ({
  geocodePlaceCoordinates: geocodePlaceCoordinatesMock,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: supabaseFromMock,
  },
}));

vi.mock('@/lib/flags', () => ({
  AUTH_DISABLED: false,
}));

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

describe('useAddPlaceToItinerary', () => {
  beforeEach(() => {
    toastMock.mockReset();
    geocodePlaceCoordinatesMock.mockReset();
    geocodePlaceCoordinatesMock.mockResolvedValue({ lat: 3.14, lng: 101.69 });

    itinerarySelectLimitMock.mockReset();
    placesMaybeSingleMock.mockReset();
    placesInsertSingleMock.mockReset();
    itineraryInsertMock.mockReset();
    supabaseFromMock.mockClear();

    itinerarySelectLimitMock.mockResolvedValue({ data: [{ position: 2 }], error: null });
    placesMaybeSingleMock.mockResolvedValue({ data: null, error: null });
    placesInsertSingleMock.mockResolvedValue({ data: { id: 'created-place-id' }, error: null });
    itineraryInsertMock.mockResolvedValue({ error: null });
  });

  it('appends to selected day with metadata in source_note', async () => {
    const { result } = renderHook(() => useAddPlaceToItinerary(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        dayItineraryId: 'day-2-id',
        placeId: 'provider-place-1',
        placeName: 'The Exchange TRX',
        displayName: 'The Exchange TRX',
        providerPlaceId: 'provider-place-1',
        formattedAddress: 'Kuala Lumpur, Malaysia',
        destination: 'Kuala Lumpur',
      });
    });

    expect(itineraryInsertMock).toHaveBeenCalledWith(expect.objectContaining({
      day_itinerary_id: 'day-2-id',
      place_id: 'created-place-id',
      position: 3,
      source: 'user',
    }));

    const payload = itineraryInsertMock.mock.calls[0][0] as { source_note?: string };
    const sourceNote = payload.source_note ? JSON.parse(payload.source_note) : null;
    expect(sourceNote).toMatchObject({
      providerPlaceId: 'provider-place-1',
      displayName: 'The Exchange TRX',
      formattedAddress: 'Kuala Lumpur, Malaysia',
    });
  });
});
