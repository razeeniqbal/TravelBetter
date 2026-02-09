import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Trip } from '@/types/trip';
import { dragSheetToExpanded, dragSheetToPreview, tapMockMarker } from '@/test/utils/sheetInteractionHelpers';

const mockTrip = vi.hoisted((): Trip => ({
  id: 'trip-1',
  title: 'Test Trip',
  destination: 'Hatyai',
  country: 'Thailand',
  coverImage: '',
  duration: 2,
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
    {
      day: 2,
      title: 'Day 2',
      places: [],
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

const tripDaysState = vi.hoisted(() => ([
  {
    id: 'day-1-id',
    trip_id: 'trip-1',
    day_number: 1,
    title: 'Day 1',
    notes: null,
  },
  {
    id: 'day-2-id',
    trip_id: 'trip-1',
    day_number: 2,
    title: 'Day 2',
    notes: null,
  },
]));

const addPlaceMutationState = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
}));

const clickHandlers = vi.hoisted(() => ({
  timeline: undefined as undefined | (() => void),
  draggable: undefined as undefined | (() => void),
}));

const mapHandlers = vi.hoisted(() => ({
  markerTap: undefined as undefined | (() => void),
  markerTapAt: undefined as undefined | ((index: number) => void),
}));

const navigateMock = vi.hoisted(() => vi.fn());

const editState = vi.hoisted(() => ({
  isEditMode: false,
  hasUnsavedChanges: false,
  toggleEditMode: vi.fn(),
  reorderPlaces: vi.fn(),
  movePlaceBetweenDays: vi.fn(),
  removePlace: vi.fn(),
  removeDay: vi.fn(),
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
    mapHandlers.markerTapAt = (index: number) => {
      const selectedPlace = places?.[index];
      if (selectedPlace) {
        onMarkerClick?.(selectedPlace);
      }
    };
    mapHandlers.markerTap = () => mapHandlers.markerTapAt?.(0);

    return (
      <div>
        <button type="button" onClick={() => mapHandlers.markerTap?.()}>
          Mock marker tap
        </button>
        <button type="button" onClick={() => mapHandlers.markerTapAt?.(1)}>
          Mock marker tap second
        </button>
      </div>
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
  AddPlacesOptionsDialog: ({
    open,
    dayNumber,
    onAddManually,
  }: {
    open: boolean;
    dayNumber?: number;
    onAddManually?: () => void;
  }) => (open ? (
    <button type="button" onClick={onAddManually}>
      {`Mock manual add day ${dayNumber || 1}`}
    </button>
  ) : null),
}));

vi.mock('@/components/trip/DayPlaceSearchDialog', () => ({
  DayPlaceSearchDialog: ({
    open,
    dayNumber,
    onAddPlace,
    onOpenChange,
  }: {
    open: boolean;
    dayNumber: number;
    onAddPlace?: (result: {
      displayName: string;
      providerPlaceId?: string;
      formattedAddress?: string;
      coordinates?: { lat: number; lng: number };
    }) => void;
    onOpenChange?: (open: boolean) => void;
  }) => (open ? (
    <div>
      <button
        type="button"
        onClick={() => onAddPlace?.({
          displayName: 'The Exchange TRX',
          providerPlaceId: 'provider-place-1',
          formattedAddress: 'Kuala Lumpur, Malaysia',
          coordinates: { lat: 3.139, lng: 101.687 },
        })}
      >
        {`Mock confirm add place day ${dayNumber}`}
      </button>
      <button type="button" onClick={() => onOpenChange?.(false)}>
        Mock no results retry
      </button>
    </div>
  ) : null),
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
        {isHighlighted ? <span>{`Highlighted: ${place.name}`}</span> : null}
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
    onPlaceInfoClick,
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
    onPlaceInfoClick?: (place: { id: string; name: string }) => void;
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
        <button type="button" onClick={() => day?.places[0] && onPlaceInfoClick?.(day.places[0])}>
          Mock place info
        </button>
      </div>
    );
  },
}));

vi.mock('@/components/ui/bottom-sheet', () => ({
  BottomSheet: ({
    children,
    activeSnapPoint,
    setActiveSnapPoint,
    snapPoints,
  }: {
    children?: ReactNode;
    activeSnapPoint?: number | string | null;
    setActiveSnapPoint?: (value: number | string | null) => void;
    snapPoints?: (number | string)[];
  }) => {
    const numericSnapPoints = (snapPoints || []) as number[];

    return (
      <div data-testid="mock-bottom-sheet" data-active-snap-point={String(activeSnapPoint)}>
        <button
          type="button"
          onClick={() => setActiveSnapPoint?.(numericSnapPoints[2] ?? 0.94)}
        >
          Mock drag sheet to expanded
        </button>
        <button
          type="button"
          onClick={() => setActiveSnapPoint?.(numericSnapPoints[1] ?? 0.72)}
        >
          Mock drag sheet to preview
        </button>
        {children}
      </div>
    );
  },
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
    removeDay: editState.removeDay,
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
  useTripDays: () => ({ data: tripDaysState }),
  useAddPlaceToItinerary: () => addPlaceMutationState,
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
    editState.removeDay.mockReset();
    editState.setAsAnchor.mockReset();
    editState.saveChanges.mockReset();
    editState.discardChanges.mockReset();
    navigateMock.mockReset();
    mapHandlers.markerTap = undefined;
    mapHandlers.markerTapAt = undefined;
    addPlaceMutationState.mutateAsync.mockReset();
    addPlaceMutationState.mutateAsync.mockResolvedValue({ dayItineraryId: 'day-1-id', placeId: 'place-1' });
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

    const saveButtons = await screen.findAllByRole('button', { name: /save changes/i });
    fireEvent.click(saveButtons[0]);
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

    dragSheetToExpanded();

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

  it('keeps baseline summary and actions visible for the preview-capable sheet states', async () => {
    const { default: TripDetailPage } = await import('./TripDetailPage');

    render(
      <MemoryRouter>
        <TripDetailPage />
      </MemoryRouter>
    );

    const sheet = await screen.findByTestId('trip-itinerary-sheet');
    expect(sheet).toHaveAttribute('data-sheet-state', 'minimized');
    expect(screen.getByTestId('itinerary-primary-actions')).toBeInTheDocument();

    tapMockMarker();

    expect(sheet).toHaveAttribute('data-sheet-state', 'preview');
    expect(screen.getByRole('button', { name: /modify itinerary/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open route/i })).toBeInTheDocument();
  });

  it('opens action-ready preview immediately after marker tap without requiring drag', async () => {
    const { default: TripDetailPage } = await import('./TripDetailPage');

    render(
      <MemoryRouter>
        <TripDetailPage />
      </MemoryRouter>
    );

    tapMockMarker();

    const sheet = await screen.findByTestId('trip-itinerary-sheet');
    expect(sheet).toHaveAttribute('data-sheet-state', 'preview');
    expect(screen.getByText(/day 1 • hatyai/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /modify itinerary/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view on map/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open route/i })).toBeInTheDocument();
  });

  it('preserves primary itinerary actions while dragging between preview and expanded states', async () => {
    const { default: TripDetailPage } = await import('./TripDetailPage');

    render(
      <MemoryRouter>
        <TripDetailPage />
      </MemoryRouter>
    );

    tapMockMarker();
    dragSheetToExpanded();

    const sheet = await screen.findByTestId('trip-itinerary-sheet');
    expect(sheet).toHaveAttribute('data-sheet-state', 'expanded');
    expect(screen.getByRole('button', { name: /modify itinerary/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open route/i })).toBeInTheDocument();

    dragSheetToPreview();

    expect(sheet).toHaveAttribute('data-sheet-state', 'preview');
    expect(screen.getByRole('button', { name: /modify itinerary/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view on map/i })).toBeInTheDocument();
  });

  it('keeps marker-tap behavior stable on small and standard viewport heights', async () => {
    const previousInnerHeight = window.innerHeight;
    const { default: TripDetailPage } = await import('./TripDetailPage');

    for (const viewportHeight of [640, 844]) {
      Object.defineProperty(window, 'innerHeight', {
        configurable: true,
        value: viewportHeight,
      });
      window.dispatchEvent(new Event('resize'));

      const { unmount } = render(
        <MemoryRouter>
          <TripDetailPage />
        </MemoryRouter>
      );

      tapMockMarker();

      expect(await screen.findByRole('button', { name: /modify itinerary/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /open route/i })).toBeInTheDocument();

      unmount();
    }

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: previousInnerHeight,
    });
  });

  it('uses latest marker selection when map markers are tapped rapidly', async () => {
    const { default: TripDetailPage } = await import('./TripDetailPage');

    render(
      <MemoryRouter>
        <TripDetailPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /^mock marker tap$/i }));
    fireEvent.click(screen.getByRole('button', { name: /mock marker tap second/i }));

    expect(await screen.findByText('Highlighted: Second Stop')).toBeInTheDocument();
    expect(screen.queryByText('Highlighted: Raw Place Name')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /modify itinerary/i })).toBeInTheDocument();
  });

  it('opens detailed place timing view when map marker is tapped', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const { default: TripDetailPage } = await import('./TripDetailPage');

    render(
      <MemoryRouter>
        <TripDetailPage />
      </MemoryRouter>
    );

    tapMockMarker();

    expect(await screen.findByText('Commute from previous: 15 min')).toBeInTheDocument();
    expect(screen.getByText('Highlighted: Raw Place Name')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /open route/i }));
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('google.com/maps/dir'),
      '_blank',
      'noopener,noreferrer'
    );

    openSpy.mockRestore();
  });

  it('adds a selected search result to the currently selected day', async () => {
    const { default: TripDetailPage } = await import('./TripDetailPage');

    render(
      <MemoryRouter>
        <TripDetailPage />
      </MemoryRouter>
    );

    dragSheetToExpanded();

    fireEvent.click(await screen.findByRole('button', { name: /day 2/i }));
    fireEvent.click(screen.getByRole('button', { name: /add new place/i }));
    expect(screen.getByTestId('trip-itinerary-sheet')).toHaveAttribute('data-sheet-state', 'minimized');
    fireEvent.click(await screen.findByRole('button', { name: /mock confirm add place day 2/i }));

    expect(addPlaceMutationState.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      dayItineraryId: 'day-2-id',
      displayName: 'The Exchange TRX',
      providerPlaceId: 'provider-place-1',
    }));
  });

  it('does not mutate itinerary when add flow closes without a selected result', async () => {
    const { default: TripDetailPage } = await import('./TripDetailPage');

    render(
      <MemoryRouter>
        <TripDetailPage />
      </MemoryRouter>
    );

    dragSheetToExpanded();

    fireEvent.click(await screen.findByRole('button', { name: /add new place/i }));
    fireEvent.click(await screen.findByRole('button', { name: /mock no results retry/i }));

    expect(addPlaceMutationState.mutateAsync).not.toHaveBeenCalled();
  });

  it('opens in-app place details when info action is clicked', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const { default: TripDetailPage } = await import('./TripDetailPage');

    render(
      <MemoryRouter>
        <TripDetailPage />
      </MemoryRouter>
    );

    dragSheetToExpanded();
    fireEvent.click(await screen.findByRole('button', { name: /mock place info/i }));

    expect(openSpy).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(String(navigateMock.mock.calls[0][0])).toContain('/trip/trip-1/place/place-1');
    expect(String(navigateMock.mock.calls[0][0])).toContain('providerPlaceId=place-1-id');

    openSpy.mockRestore();
  });
});
