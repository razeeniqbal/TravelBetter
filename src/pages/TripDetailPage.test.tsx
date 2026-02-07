import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
          stayDurationMinutes: 60,
          coordinates: { lat: 1.23, lng: 4.56 },
        },
        {
          id: 'place-2',
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

const mapHandlers = vi.hoisted(() => ({
  markerTap: undefined as undefined | (() => void),
}));

const navigateMock = vi.hoisted(() => vi.fn());

const editState = vi.hoisted(() => ({
  isEditMode: false,
  hasUnsavedChanges: false,
  toggleEditMode: vi.fn(),
  reorderPlaces: vi.fn(),
  movePlaceBetweenDays: vi.fn(),
  removePlace: vi.fn(),
  setAsAnchor: vi.fn(),
  saveChanges: vi.fn(),
  discardChanges: vi.fn(),
}));

const tripQueryState = vi.hoisted(() => ({
  data: mockTrip as Trip | null,
  isLoading: false,
}));

vi.mock('@/components/trip/MapPlaceholder', () => ({
  MapPlaceholder: ({
    places,
    onMarkerClick,
  }: {
    places?: Array<{ id: string; name: string }>;
    onMarkerClick?: (place: { id: string; name: string }) => void;
  }) => {
    mapHandlers.markerTap = () => {
      const first = places?.[0];
      if (first) {
        onMarkerClick?.(first);
      }
    };

    return (
      <button type="button" onClick={() => mapHandlers.markerTap?.()}>
        Mock marker tap
      </button>
    );
  },
}));

vi.mock('@/components/shared/ShareModal', () => ({
  ShareModal: ({
    open,
    onOpenChange,
  }: {
    open: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (open ? <button type="button" onClick={() => onOpenChange?.(false)}>Share modal open</button> : null),
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
  TimelinePlace: ({
    place,
    onClick,
    isHighlighted,
  }: {
    place: { name: string; commuteDurationMinutes?: number };
    onClick?: () => void;
    isHighlighted?: boolean;
  }) => {
    clickHandlers.timeline = onClick;
    return (
      <div>
        <button type="button" onClick={onClick}>
          {place.name}
        </button>
        {place.commuteDurationMinutes ? (
          <span>{`Commute from previous: ${place.commuteDurationMinutes} min`}</span>
        ) : null}
        {isHighlighted ? <span>Highlighted</span> : null}
      </div>
    );
  },
}));

vi.mock('@/components/trip/DraggableTimeline', () => ({
  DraggableTimeline: ({
    days,
    activeDay,
    onReorder,
    onMoveBetweenDays,
    onPlaceClick,
  }: {
    days: Array<{ day: number; places: { id: string; name: string }[] }>;
    activeDay: number;
    onReorder: (dayIndex: number, sourceIndex: number, destinationIndex: number) => void;
    onMoveBetweenDays: (
      sourceDayIndex: number,
      destinationDayIndex: number,
      sourceIndex: number,
      destinationIndex: number
    ) => void;
    onPlaceClick?: (place: { id: string; name: string }) => void;
  }) => {
    const day = days.find(item => item.day === activeDay) || days[0];
    if (day?.places[0]) {
      clickHandlers.draggable = () => onPlaceClick?.(day.places[0]);
    }
    return (
      <div data-testid="draggable-timeline">
        <button type="button" onClick={() => onReorder(0, 0, 0)}>
          Mock reorder
        </button>
        <button type="button" onClick={() => onMoveBetweenDays(0, 1, 0, 0)}>
          Mock cross-day move
        </button>
      </div>
    );
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
  useTripDetail: () => ({ data: tripQueryState.data, isLoading: tripQueryState.isLoading }),
}));

vi.mock('@/hooks/useTripEdit', () => ({
  useTripEdit: () => ({
    isEditMode: editState.isEditMode,
    hasUnsavedChanges: editState.hasUnsavedChanges,
    toggleEditMode: editState.toggleEditMode,
    itinerary: mockTrip.itinerary,
    reorderPlaces: editState.reorderPlaces,
    movePlaceBetweenDays: editState.movePlaceBetweenDays,
    removePlace: editState.removePlace,
    anchorPlaceId: null,
    setAsAnchor: editState.setAsAnchor,
    saveChanges: editState.saveChanges,
    discardChanges: editState.discardChanges,
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
    useNavigate: () => navigateMock,
  };
});

describe('TripDetailPage', () => {
  beforeEach(() => {
    tripQueryState.data = mockTrip;
    tripQueryState.isLoading = false;
    editState.isEditMode = false;
    editState.hasUnsavedChanges = false;
    editState.toggleEditMode.mockReset();
    editState.reorderPlaces.mockReset();
    editState.movePlaceBetweenDays.mockReset();
    editState.removePlace.mockReset();
    editState.setAsAnchor.mockReset();
    editState.saveChanges.mockReset();
    editState.discardChanges.mockReset();
    navigateMock.mockReset();
    mapHandlers.markerTap = undefined;
  });

  it('shows consistent loading and empty states', async () => {
    tripQueryState.isLoading = true;
    const { default: TripDetailPage } = await import('./TripDetailPage');

    const { unmount } = render(
      <MemoryRouter>
        <TripDetailPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading trip/i)).toBeInTheDocument();

    unmount();
    tripQueryState.isLoading = false;
    tripQueryState.data = null;

    render(
      <MemoryRouter>
        <TripDetailPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/trip not found/i)).toBeInTheDocument();
  });

  it('prompts before sharing with unsaved edits and opens share after confirm', async () => {
    editState.isEditMode = true;
    editState.hasUnsavedChanges = true;
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { default: TripDetailPage } = await import('./TripDetailPage');

    render(
      <MemoryRouter>
        <TripDetailPage />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: /share trip/i }));
    expect(confirmSpy).toHaveBeenCalledWith('You have unsaved edits. Share without saving your itinerary changes?');
    expect(screen.queryByRole('button', { name: /share modal open/i })).not.toBeInTheDocument();

    confirmSpy.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: /share trip/i }));
    expect(await screen.findByRole('button', { name: /share modal open/i })).toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  it('shows save controls in edit mode and triggers save', async () => {
    editState.isEditMode = true;
    const { default: TripDetailPage } = await import('./TripDetailPage');

    render(
      <MemoryRouter>
        <TripDetailPage />
      </MemoryRouter>
    );

    const saveButton = await screen.findByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);
    expect(editState.saveChanges).toHaveBeenCalledTimes(1);
  });

  it('triggers discard when cancel is clicked in edit mode', async () => {
    editState.isEditMode = true;
    const { default: TripDetailPage } = await import('./TripDetailPage');

    render(
      <MemoryRouter>
        <TripDetailPage />
      </MemoryRouter>
    );

    editState.discardChanges.mockClear();

    const cancelButton = await screen.findByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    expect(editState.discardChanges).toHaveBeenCalledTimes(1);
  });

  it('wires reorder and cross-day move callbacks into the timeline', async () => {
    editState.isEditMode = true;
    const { default: TripDetailPage } = await import('./TripDetailPage');

    render(
      <MemoryRouter>
        <TripDetailPage />
      </MemoryRouter>
    );

    const continueEditingButton = await screen.findByRole('button', { name: /continue editing/i });
    fireEvent.click(continueEditingButton);

    const reorderButton = await screen.findByRole('button', { name: /mock reorder/i });
    fireEvent.click(reorderButton);

    const moveButton = await screen.findByRole('button', { name: /mock cross-day move/i });
    fireEvent.click(moveButton);

    expect(editState.reorderPlaces).toHaveBeenCalledWith(0, 0, 0);
    expect(editState.movePlaceBetweenDays).toHaveBeenCalledWith(0, 1, 0, 0);
  });

  it('prompts before leaving when unsaved edits exist', async () => {
    editState.isEditMode = true;
    editState.hasUnsavedChanges = true;
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { default: TripDetailPage } = await import('./TripDetailPage');

    render(
      <MemoryRouter>
        <TripDetailPage />
      </MemoryRouter>
    );

    const backButton = await screen.findByRole('button', { name: /go back/i });
    fireEvent.click(backButton);

    expect(confirmSpy).toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('handles marker-to-card focus, commute details, and open route action', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const { default: TripDetailPage } = await import('./TripDetailPage');

    render(
      <MemoryRouter>
        <TripDetailPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /mock marker tap/i }));
    expect(await screen.findByText('Commute from previous: 15 min')).toBeInTheDocument();
    expect(screen.getByText('Highlighted')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /open route/i }));
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('google.com/maps/dir'),
      '_blank',
      'noopener,noreferrer'
    );

    openSpy.mockRestore();
  });

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
