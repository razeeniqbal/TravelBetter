import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TripPlaceDetailsPage from './TripPlaceDetailsPage';

const navigateMock = vi.hoisted(() => vi.fn());
const refetchMock = vi.hoisted(() => vi.fn());

const searchParamsState = vi.hoisted(() => ({
  value: new URLSearchParams('providerPlaceId=provider-place-1&queryText=KLCC&destinationContext=Kuala Lumpur&displayName=KLCC'),
}));

type PlaceDetailsQueryState = {
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: typeof refetchMock;
  data: {
    details: {
      providerPlaceId: string;
      canonicalName: string;
      formattedAddress: string;
      rating?: number;
      userRatingCount?: number;
      photos?: Array<{
        photoName: string;
        photoUri: string;
      }>;
      resolvedBy: 'provider_place_id' | 'text_query';
      source: 'google';
    };
    reviews: Array<{
      reviewId: string;
      authorName: string;
      rating: number;
      text: string;
      createdAt: string;
      relativeTimeText: string;
      source: 'google';
    }>;
    reviewState: 'available' | 'empty';
  };
};

const placeDetailsState = vi.hoisted(() => ({
  isLoading: false,
  isError: false,
  isFetching: false,
  error: null as Error | null,
  refetch: refetchMock,
  data: {
    details: {
      providerPlaceId: 'provider-place-1',
      canonicalName: 'Kuala Lumpur City Centre (KLCC)',
      formattedAddress: 'Kuala Lumpur City Centre, Kuala Lumpur, Malaysia',
      rating: 4.6,
      userRatingCount: 1200,
      resolvedBy: 'provider_place_id' as const,
      source: 'google' as const,
    },
    reviews: [
      {
        reviewId: 'review-1',
        authorName: 'Alice',
        rating: 5,
        text: 'Amazing view and skyline.',
        createdAt: '2026-01-01T00:00:00.000Z',
        relativeTimeText: 'a month ago',
        source: 'google' as const,
      },
    ],
    reviewState: 'available' as const,
  },
})) as PlaceDetailsQueryState;

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ tripId: 'trip-1', placeId: 'place-1' }),
    useSearchParams: () => [searchParamsState.value, vi.fn()],
  };
});

vi.mock('@/hooks/usePlaces', () => ({
  usePlaceDetails: () => placeDetailsState,
}));

describe('TripPlaceDetailsPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    refetchMock.mockReset();
    searchParamsState.value = new URLSearchParams('providerPlaceId=provider-place-1&queryText=KLCC&destinationContext=Kuala Lumpur&displayName=KLCC');
    placeDetailsState.isLoading = false;
    placeDetailsState.isError = false;
    placeDetailsState.isFetching = false;
    placeDetailsState.error = null;
    placeDetailsState.data = {
      details: {
        providerPlaceId: 'provider-place-1',
        canonicalName: 'Kuala Lumpur City Centre (KLCC)',
        formattedAddress: 'Kuala Lumpur City Centre, Kuala Lumpur, Malaysia',
        rating: 4.6,
        userRatingCount: 1200,
        resolvedBy: 'provider_place_id',
        source: 'google',
      },
      reviews: [
        {
          reviewId: 'review-1',
          authorName: 'Alice',
          rating: 5,
          text: 'Amazing view and skyline.',
          createdAt: '2026-01-01T00:00:00.000Z',
          relativeTimeText: 'a month ago',
          source: 'google',
        },
      ],
      reviewState: 'available',
    };
  });

  it('shows loading state while place details are fetched', () => {
    placeDetailsState.isLoading = true;

    render(
      <MemoryRouter>
        <TripPlaceDetailsPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading place details/i)).toBeInTheDocument();
  });

  it('renders canonical name, formatted address, and review content', () => {
    render(
      <MemoryRouter>
        <TripPlaceDetailsPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Kuala Lumpur City Centre (KLCC)')).toBeInTheDocument();
    expect(screen.getByText(/kuala lumpur city centre, kuala lumpur, malaysia/i)).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText(/amazing view and skyline/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /go back/i }));
    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it('renders google place photos when available', () => {
    placeDetailsState.data.details.photos = [
      {
        photoName: 'places/provider-place-1/photos/1',
        photoUri: 'https://example.com/place-photo.jpg',
      },
    ];

    render(
      <MemoryRouter>
        <TripPlaceDetailsPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('img', { name: /kuala lumpur city centre/i })).toBeInTheDocument();
  });

  it('renders explicit no-reviews state when reviews are empty', () => {
    placeDetailsState.data = {
      details: {
        providerPlaceId: 'provider-place-1',
        canonicalName: 'Kuala Lumpur City Centre (KLCC)',
        formattedAddress: 'Kuala Lumpur City Centre, Kuala Lumpur, Malaysia',
        resolvedBy: 'provider_place_id',
        source: 'google',
      },
      reviews: [],
      reviewState: 'empty',
    };

    render(
      <MemoryRouter>
        <TripPlaceDetailsPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/no reviews available/i)).toBeInTheDocument();
  });

  it('renders retryable error state when details fetch fails', () => {
    placeDetailsState.isError = true;
    placeDetailsState.error = new Error('Provider unavailable');

    render(
      <MemoryRouter>
        <TripPlaceDetailsPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/unable to load place details/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(refetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows unavailable state when lookup identifiers are missing', () => {
    searchParamsState.value = new URLSearchParams();

    render(
      <MemoryRouter>
        <TripPlaceDetailsPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/place details unavailable/i)).toBeInTheDocument();
  });
});
