import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import type { Trip } from '@/types/trip';

const mockTrip = vi.hoisted((): Trip => ({
  id: 'trip-1',
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
          id: 'place-1',
          name: 'Raw Place Name',
          displayName: 'Canonical Place Name',
          placeId: 'place-1-id',
          category: 'culture',
          source: 'user',
          coordinates: { lat: 1.23, lng: 4.56 },
        },
      ],
    },
  ],
  author: {
    id: 'user-1',
    name: 'Test User',
    username: 'test',
  },
  tags: [],
  remixCount: 0,
  viewCount: 0,
  createdAt: '2026-02-07T00:00:00.000Z',
}));

const clickHandlers = vi.hoisted(() => ({
  timeline: undefined as undefined | (() => void),
  draggable: undefined as undefined | (() => void),
}));

vi.mock('@/components/trip/MapPlaceholder', () => ({
  MapPlaceholder: () => <div data-testid="map" />,
}));

vi.mock('@/components/shared/ShareModal', () => ({
  ShareModal: () => null,
}));

vi.mock('@/components/trip/AddToItineraryDialog', () => ({
  AddToItineraryDialog: () => null,
}));

vi.mock('@/components/trip/AnchorSelector', () => ({
  AnchorSelector: () => null,
}));

vi.mock('@/components/trip/AddPlacesOptionsDialog', () => ({
  AddPlacesOptionsDialog: () => null,
}));

vi.mock('@/components/trip/TimelinePlace', () => ({
  TimelinePlace: ({ place, onClick }: { place: { name: string }; onClick?: () => void }) => {
    clickHandlers.timeline = onClick;
    return (
      <button type="button" onClick={onClick}>
        {place.name}
      </button>
    );
  },
}));

vi.mock('@/components/trip/DraggableTimeline', () => ({
  DraggableTimeline: ({ places, onPlaceClick }: { places: { id: string; name: string }[]; onPlaceClick?: (place: { id: string; name: string }) => void }) => {
    if (places[0]) {
      clickHandlers.draggable = () => onPlaceClick?.(places[0]);
    }
    return <div data-testid="draggable-timeline" />;
  },
}));

vi.mock('@/components/ui/bottom-sheet', () => ({
  BottomSheet: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  BottomSheetContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  BottomSheetDescription: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  BottomSheetTitle: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      update: () => ({ eq: () => ({ error: null }) }),
    }),
  },
}));

vi.mock('@/hooks/useTripDetail', () => ({
  useTripDetail: () => ({ data: mockTrip, isLoading: false }),
}));

vi.mock('@/hooks/useTripEdit', () => ({
  useTripEdit: () => ({
    isEditMode: false,
    toggleEditMode: vi.fn(),
    itinerary: mockTrip.itinerary,
    reorderPlaces: vi.fn(),
    removePlace: vi.fn(),
    anchorPlaceId: null,
    setAsAnchor: vi.fn(),
    saveChanges: vi.fn(),
    discardChanges: vi.fn(),
    isSaving: false,
  }),
}));

vi.mock('@/hooks/useRemixTrip', () => ({
  useRemixTrip: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/hooks/useUserTrips', () => ({
  useCreateDayItinerary: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ tripId: 'trip-1' }),
    useNavigate: () => vi.fn(),
  };
});

describe('TripDetailPage', () => {
  it.skip('opens Google Maps reviews when a place is clicked', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const { default: TripDetailPage } = await import('./TripDetailPage');

    render(
      <MemoryRouter>
        <TripDetailPage />
      </MemoryRouter>
    );

    const handler = clickHandlers.timeline ?? clickHandlers.draggable;
    if (handler) {
      handler();
    } else {
      const placeName = await screen.findByText('Raw Place Name');
      fireEvent.click(placeName);
    }

    expect(openSpy).toHaveBeenCalledWith(
      'https://www.google.com/maps/place/?q=place_id:place-1-id',
      '_blank',
      'noopener,noreferrer'
    );

    openSpy.mockRestore();
  });
});
