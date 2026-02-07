import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PlaceDetailPage from './PlaceDetailPage';

const navigateMock = vi.hoisted(() => vi.fn());
const placeQueryState = vi.hoisted(() => ({
  isLoading: false,
  data: {
    place: {
      id: 'place-1',
      name: 'Petronas Twin Towers',
      category: 'culture',
      description: 'Iconic city landmark',
      imageUrl: 'https://example.com/place.jpg',
    },
    tripInfo: null,
  } as {
    place: {
      id: string;
      name: string;
      category: string;
      description: string;
      imageUrl: string;
    };
    tripInfo: null;
  } | null,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ placeId: 'place-1' }),
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/components/shared/ShareModal', () => ({
  ShareModal: () => null,
}));

vi.mock('@/components/trip/AddToItineraryDialog', () => ({
  AddToItineraryDialog: () => null,
}));

vi.mock('@/hooks/useSavedPlaces', () => ({
  useSavedPlaces: () => ({ data: [] }),
  useToggleSavePlace: () => ({ mutate: vi.fn() }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/hooks/usePlaces', () => ({
  usePlaceWithTripInfo: () => ({
    data: placeQueryState.data,
    isLoading: placeQueryState.isLoading,
  }),
  usePlaceReviews: () => ({ data: [] }),
}));

describe('PlaceDetailPage', () => {
  beforeEach(() => {
    placeQueryState.isLoading = false;
    placeQueryState.data = {
      place: {
        id: 'place-1',
        name: 'Petronas Twin Towers',
        category: 'culture',
        description: 'Iconic city landmark',
        imageUrl: 'https://example.com/place.jpg',
      },
      tripInfo: null,
    };
    navigateMock.mockReset();
  });

  it('shows loading and empty states consistently', () => {
    placeQueryState.isLoading = true;
    const { unmount } = render(
      <MemoryRouter>
        <PlaceDetailPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading place details/i)).toBeInTheDocument();

    unmount();
    placeQueryState.isLoading = false;
    placeQueryState.data = null;

    render(
      <MemoryRouter>
        <PlaceDetailPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/place not found/i)).toBeInTheDocument();
  });

  it('removes redundant saved button and shows review shortfall state', () => {
    render(
      <MemoryRouter>
        <PlaceDetailPage />
      </MemoryRouter>
    );

    expect(screen.queryByText(/saved ✓/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument();
    expect(screen.getByText('Reviews (0/5)')).toBeInTheDocument();
    expect(screen.getByText('5 more unavailable')).toBeInTheDocument();
  });
});
